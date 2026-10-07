// Area de atendimento da busca/entrega. Mesmos valores de frontend/js/checkout.js:
// a interface avisa o cliente, e a API garante a regra mesmo se chamada direto.
// R. Gramados, 46 - Jardim Conceicao, Hortolandia - SP, 13185-780
export const STORE_LAT = -22.8660981;
export const STORE_LON = -47.1586768;
export const MAX_DISTANCE_KM = 6;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

// Distancia em linha reta (formula de Haversine), em km.
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Consultas do Nominatim em ordem de precisao. O bairro fica de fora: o OSM nao
// conhece a maioria dos bairros do ViaCEP ("Jardim ...") e, com ele na busca,
// o Nominatim nao encontra nada. Mesma ordem de frontend/js/checkout.js.
export function geocodeQueries({ street, number, city, state }) {
  return [
    [street, number, city, state, "Brasil"],
    [street, city, state, "Brasil"],
  ].map((parts) => parts.filter(Boolean).join(", "));
}

// Geocodifica o endereco no Nominatim (OpenStreetMap). Retorna { lat, lon } ou
// null se nao encontrar/der erro — nesse caso a API, como o front, nao bloqueia.
export async function geocode(address) {
  for (const q of geocodeQueries(address)) {
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`,
        { headers: { "User-Agent": "cafofo-do-pet-api" }, signal: AbortSignal.timeout(5000) }
      );
      const results = await res.json();
      if (results?.[0]) return { lat: Number(results[0].lat), lon: Number(results[0].lon) };
    } catch {
      return null;
    }
  }
  return null;
}
