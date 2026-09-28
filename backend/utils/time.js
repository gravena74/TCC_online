// Data/hora "agora" no fuso do pet shop. O servidor (ex: Render) roda em UTC,
// entao nao da pra usar new Date().getHours() direto.
const TIMEZONE = process.env.TZ_SHOP || "America/Sao_Paulo";

export function nowInShop() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// true se o horario (YYYY-MM-DD + HH:MM) ja passou (ou e agora) no fuso do pet shop.
// Strings nesse formato comparam corretamente em ordem lexicografica.
export function isPast(date, time) {
  const now = nowInShop();
  if (date !== now.date) return date < now.date;
  return time <= now.time;
}
