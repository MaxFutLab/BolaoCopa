export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeLock(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes <= 0) return "jogo iniciado";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}
