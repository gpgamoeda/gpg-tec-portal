const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function hashPassword(password, salt) {
  const encoded = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function routeNotImplemented(name) {
  return json({
    ok: false,
    route: name,
    message: "Contrato criado. Implementar persistencia/autenticacao no proximo passo.",
  }, 501);
}

async function handleLogin(request, env) {
  const body = await readJson(request);

  if (!body.email || !body.password) {
    return json({ ok: false, message: "email e password sao obrigatorios" }, 400);
  }

  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_SALT) {
    return json({
      ok: false,
      message: "ADMIN_PASSWORD_HASH e ADMIN_PASSWORD_SALT ainda nao configurados",
    }, 501);
  }

  const candidateHash = await hashPassword(body.password, env.ADMIN_PASSWORD_SALT);

  if (candidateHash !== env.ADMIN_PASSWORD_HASH) {
    return json({ ok: false, message: "credenciais invalidas" }, 401);
  }

  return json({
    ok: true,
    message: "login validado. emissao de cookie/sessao entra no proximo passo.",
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/login") {
      return handleLogin(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/logout") {
      return routeNotImplemented("logout");
    }

    if (request.method === "GET" && url.pathname === "/api/session") {
      return routeNotImplemented("session");
    }

    if (request.method === "GET" && url.pathname === "/api/projects") {
      return routeNotImplemented("projects:list");
    }

    if (request.method === "PUT" && url.pathname.startsWith("/api/projects/")) {
      return routeNotImplemented("projects:update");
    }

    if (request.method === "POST" && url.pathname === "/api/github/import") {
      return routeNotImplemented("github:import");
    }

    return json({ ok: false, message: "not found" }, 404);
  },
};
