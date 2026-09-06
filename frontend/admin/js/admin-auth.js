import { adminApi, getAdminToken, clearAdminToken } from "./admin-api.js";

// Confere o token de admin antes de mostrar a pagina. Chame no topo do
// script de cada pagina do portal admin.
export async function requireAdminAuth() {
  const token = getAdminToken();
  if (!token) {
    window.location.replace("login.html");
    return null;
  }
  try {
    const { admin } = await adminApi.me();
    return admin;
  } catch {
    clearAdminToken();
    window.location.replace("login.html");
    return null;
  }
}
