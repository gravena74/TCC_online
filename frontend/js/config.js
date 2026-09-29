// Sem build step (Vite) neste front-end estático: ajuste aqui a URL da API
// conforme o ambiente, no lugar da antiga variável VITE_API_URL.
// URL da API em produção (Render). Em desenvolvimento local (localhost ou
// IP da rede local, ex: acessando pelo celular), usa o mesmo host da página
// na porta 3333, onde o backend roda localmente.
const PRODUCTION_API_ORIGIN = "https://tcc-online.onrender.com";

const { protocol, hostname } = window.location;
const isLocalHost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);

const DEFAULT_API_ORIGIN = isLocalHost
  ? `${protocol}//${hostname}:3333`
  : PRODUCTION_API_ORIGIN;

// Origem (sem "/api") usada para resolver caminhos relativos vindos da API,
// como as fotos de pet (/uploads/xxx.jpg) — o frontend pode ser servido por
// uma origem diferente (ex: XAMPP), então esses caminhos precisam do host da API.
export const API_ORIGIN = window.CAFOFO_API_ORIGIN || DEFAULT_API_ORIGIN;

export const API_BASE_URL = window.CAFOFO_API_URL || `${API_ORIGIN}/api`;
