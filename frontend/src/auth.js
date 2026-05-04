export function getAuth() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  return { token, role, userId };
}

export function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized));
    return json;
  } catch {
    return null;
  }
}

export function saveAuth(token) {
  const payload = decodeJwt(token);
  localStorage.setItem("token", token);
  if (payload?.role) localStorage.setItem("role", payload.role);
  if (payload?.userId) localStorage.setItem("userId", String(payload.userId));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
}
