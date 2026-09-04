import { API_BASE_URL } from "./config.js";

const TOKEN_KEY = "cafofo_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!res.ok) {
    throw new Error(data?.error || "Algo deu errado. Tente novamente.");
  }
  return data;
}

export const api = {
  requestOtp: (phone) => request("/auth/request-otp", { method: "POST", body: { phone } }),
  verifyOtp: (phone, code, name) =>
    request("/auth/verify-otp", { method: "POST", body: { phone, code, name } }),
  me: () => request("/auth/me"),

  getPets: () => request("/pets"),
  createPet: (formData) => request("/pets", { method: "POST", body: formData, isFormData: true }),
  deletePet: (id) => request(`/pets/${id}`, { method: "DELETE" }),

  getServices: () => request("/services"),
  getSlots: (serviceId, date) => request(`/services/${serviceId}/slots?date=${date}`),

  getAddresses: () => request("/addresses"),
  createAddress: (address) => request("/addresses", { method: "POST", body: address }),

  getAppointments: () => request("/appointments"),
  createAppointment: (payload) => request("/appointments", { method: "POST", body: payload }),
  cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: "PATCH" }),
};
