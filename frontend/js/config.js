// Sem build step (Vite) neste front-end estático: ajuste aqui a URL da API
// conforme o ambiente, no lugar da antiga variável VITE_API_URL.
// Usa o mesmo host que serviu a página (funciona em localhost e ao acessar
// pelo IP da máquina na rede, ex: pelo celular), assumindo a API na porta 3333.
export const API_BASE_URL =
  window.CAFOFO_API_URL || `${window.location.protocol}//${window.location.hostname}:3333/api`;
