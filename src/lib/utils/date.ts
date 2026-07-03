export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

export function addDays(dateString: string, days: number): string {
  const date = parseLocalDateString(dateString);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}
