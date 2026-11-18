/** "20 de dezembro de 2026" */
export const formatDateLong = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
