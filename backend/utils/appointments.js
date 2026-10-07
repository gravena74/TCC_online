export const APPOINTMENT_TRANSITIONS = {
  em_analise: ["agendado", "recusado", "cancelado"],
  agendado: ["concluido", "cancelado"],
  concluido: [],
  cancelado: [],
  recusado: [],
};

export function serviceMatchesPet(service, pet) {
  return ["Pequeno", "Médio", "Grande"].includes(pet.size) &&
    service.name.startsWith(`${pet.size} -`);
}
