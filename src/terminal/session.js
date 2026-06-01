const sessionKey = "gpg-terminal-session";

export function saveSession(user) {
  window.sessionStorage.setItem(
    sessionKey,
    JSON.stringify({ authenticated: true, user }),
  );
}

export function loadSession() {
  const savedSession = window.sessionStorage.getItem(sessionKey);

  if (!savedSession) {
    return null;
  }

  try {
    const session = JSON.parse(savedSession);

    if (!session.authenticated || !session.user) {
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  window.sessionStorage.removeItem(sessionKey);
}
