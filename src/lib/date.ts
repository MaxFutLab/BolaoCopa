export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeDuration(diffMs: number): string {
  const minutes = Math.floor(diffMs / 60000);

  if (minutes <= 0) return "agora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function formatRelativeLock(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();

  if (diffMs <= 0) return "jogo iniciado";
  return formatRelativeDuration(diffMs);
}

export function formatRelativePredictionOpen(value: string): string {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffMs = new Date(value).getTime() - Date.now() - oneDayMs;
  return formatRelativeDuration(diffMs);
}
