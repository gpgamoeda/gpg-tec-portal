const encoder = new TextEncoder();
const passwordIterations = 100000;
const passwordAlgorithm = "PBKDF2-SHA256";
const sessionCookieName = "gpg_session";

function getCorsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowedOrigins = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigin = allowedOrigins.length
    ? allowedOrigins.find((item) => item === origin)
    : origin;

  if (!origin || !allowedOrigin || origin !== allowedOrigin) {
    return {};
  }

  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
    "access-control-allow-origin": origin,
  };
}

function json(request, env, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...getCorsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function base64UrlEncode(bytes) {
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

async function hashPassword(password, salt, iterations = passwordIterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64UrlDecode(salt),
      iterations,
    },
    key,
    256,
  );

  return base64UrlEncode(new Uint8Array(bits));
}

function timingSafeEqual(left, right) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }

  return diff === 0;
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

function createCookie(token, maxAge, env) {
  const sameSite = env.COOKIE_SAMESITE || "Lax";
  return [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
  ].join("; ");
}

function clearCookie(env) {
  return createCookie("", 0, env);
}

function publicUser(user) {
  return {
    email: user.email,
    id: user.id,
    role: user.role,
  };
}

function routeNotImplemented(name) {
  return {
    ok: false,
    route: name,
    message: "Contrato criado. Implementar persistencia/autenticacao no proximo passo.",
  };
}

function handleError(request, env, error) {
  console.error(error);

  return json(request, env, {
    ok: false,
    message: "erro interno da api",
    detail: env.DEBUG_ERRORS === "true" ? error.message : undefined,
  }, 500);
}

async function handleLogin(request, env) {
  const body = await readJson(request);

  if (!body.email || !body.password) {
    return json(request, env, { ok: false, message: "email e password sao obrigatorios" }, 400);
  }

  if (!env.DB) {
    return json(request, env, { ok: false, message: "DB nao configurado" }, 501);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, password_salt, password_iterations, role FROM users WHERE email = ?",
  ).bind(body.email.toLowerCase()).first();

  if (!user) {
    return json(request, env, { ok: false, message: "credenciais invalidas" }, 401);
  }

  const iterations = user.password_iterations || passwordIterations;
  const candidateHash = await hashPassword(body.password, user.password_salt, iterations);

  if (!timingSafeEqual(candidateHash, user.password_hash)) {
    return json(request, env, { ok: false, message: "credenciais invalidas" }, 401);
  }

  const token = randomToken();
  const sessionId = await sha256(token);
  const ttlSeconds = Number.parseInt(env.SESSION_TTL_SECONDS || "28800", 10);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  ).bind(sessionId, user.id, expiresAt).run();

  return json(request, env, {
    ok: true,
    user: publicUser(user),
  }, 200, {
    "set-cookie": createCookie(token, ttlSeconds, env),
  });
}

async function getSessionUser(request, env) {
  const token = getCookie(request, sessionCookieName);

  if (!token || !env.DB) {
    return null;
  }

  const sessionId = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.email, users.role, sessions.expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?`,
  ).bind(sessionId).first();

  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }

  return row;
}

async function handleSession(request, env) {
  const user = await getSessionUser(request, env);

  if (!user) {
    return json(request, env, { ok: false, authenticated: false }, 401);
  }

  return json(request, env, {
    ok: true,
    authenticated: true,
    user: publicUser(user),
  });
}

async function handleLogout(request, env) {
  const token = getCookie(request, sessionCookieName);

  if (token && env.DB) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(token)).run();
  }

  return json(request, env, { ok: true }, 200, {
    "set-cookie": clearCookie(env),
  });
}

async function handleSetupAdmin(request, env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!env.SETUP_TOKEN || !token || !timingSafeEqual(token, env.SETUP_TOKEN)) {
    return json(request, env, { ok: false, message: "setup nao autorizado" }, 401);
  }

  const body = await readJson(request);

  if (!body.email || !body.password || body.password.length < 12) {
    return json(request, env, {
      ok: false,
      message: "email e password com pelo menos 12 caracteres sao obrigatorios",
    }, 400);
  }

  const id = body.id || "admin";
  const salt = randomToken(16);
  const passwordHash = await hashPassword(body.password, salt);
  const email = body.email.toLowerCase();

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, password_salt, password_iterations, role)
     VALUES (?, ?, ?, ?, ?, 'admin')
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       password_hash = excluded.password_hash,
       password_salt = excluded.password_salt,
       password_iterations = excluded.password_iterations,
       role = 'admin'`,
  ).bind(id, email, passwordHash, salt, passwordIterations).run();

  return json(request, env, {
    ok: true,
    user: { email, id, role: "admin" },
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: getCorsHeaders(request, env),
        });
      }

      if (request.method === "POST" && url.pathname === "/api/setup/admin") {
        return handleSetupAdmin(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/login") {
        return handleLogin(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/logout") {
        return handleLogout(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/session") {
        return handleSession(request, env);
      }

      if (request.method === "GET" && url.pathname === "/api/projects") {
        return json(request, env, routeNotImplemented("projects:list"), 501);
      }

      if (request.method === "PUT" && url.pathname.startsWith("/api/projects/")) {
        return json(request, env, routeNotImplemented("projects:update"), 501);
      }

      if (request.method === "POST" && url.pathname === "/api/github/import") {
        return json(request, env, routeNotImplemented("github:import"), 501);
      }

      return json(request, env, { ok: false, message: "not found" }, 404);
    } catch (error) {
      return handleError(request, env, error);
    }
  },
};
