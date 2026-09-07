// Substitua esta URL pelo link público exato do seu backend no Render
const DEFAULT_API_ORIGIN = "https://tcc-backend.onrender.com";

// Origem (sem "/api") usada para resolver caminhos relativos vindos da API,
// como as fotos de pet (/uploads/xxx.jpg).
export const API_ORIGIN = window.CAFOFO_API_ORIGIN || DEFAULT_API_ORIGIN;

export const API_BASE_URL = window.CAFOFO_API_URL || `${API_ORIGIN}/api`;