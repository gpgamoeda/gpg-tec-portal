const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "falha de autenticacao");
  }

  return data;
}

export async function login(email, password) {
  const session = await request("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return session.user;
}

export async function loadSession() {
  try {
    const session = await request("/api/session");
    return session.authenticated ? session.user : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  try {
    await request("/api/logout", { method: "POST" });
  } catch {
    // A tela local tambem sera limpa quando o backend estiver indisponivel.
  }
}
