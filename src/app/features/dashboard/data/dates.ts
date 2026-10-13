const DAY_MONTH = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Hoy", "Ayer" or "8 de octubre". */
export function dayLabel(iso: string, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return DAY_MONTH.format(new Date(iso));
}

export function timeLabel(iso: string): string {
  return TIME.format(new Date(iso));
}
