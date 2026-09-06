// Sem build step (Vite) neste front-end estático: ajuste aqui a URL da API
// conforme o ambiente, no lugar da antiga variável VITE_API_URL.
// Usa o mesmo host que serviu a página (funciona em localhost e ao acessar
// pelo IP da máquina na rede, ex: pelo celular), assumindo a API na porta 3333.
const DEFAULT_API_ORIGIN = `${window.location.protocol}//${window.location.hostname}:3333`;

// Origem (sem "/api") usada para resolver caminhos relativos vindos da API,
// como as fotos de pet (/uploads/xxx.jpg) — o frontend pode ser servido por
// uma origem diferente (ex: XAMPP), então esses caminhos precisam do host da API.
export const API_ORIGIN = window.CAFOFO_API_ORIGIN || DEFAULT_API_ORIGIN;

export const API_BASE_URL = window.CAFOFO_API_URL || `${API_ORIGIN}/api`;
