// Estado do fluxo de agendamento, compartilhado entre páginas via sessionStorage
// (substitui o BookingContext do React, que vivia em memória durante a navegação da SPA).
const STORAGE_KEY = "cafofo_booking";

const initialBooking = {
  pet: null,
  service: null,
  date: null,
  time: null,
  checkinMode: null,
  checkoutMode: null,
  address: null,
};

export function getBooking() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialBooking, ...JSON.parse(raw) } : { ...initialBooking };
  } catch {
    return { ...initialBooking };
  }
}

export function updateBooking(partial) {
  const next = { ...getBooking(), ...partial };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetBooking() {
  sessionStorage.removeItem(STORAGE_KEY);
}
