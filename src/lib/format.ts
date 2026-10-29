const fmt = (tz: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { timeZone: tz, ...opts });

export function formatDate(iso: string, tz: string) {
  return fmt(tz, { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

export function formatDateTime(iso: string, tz: string) {
  return fmt(tz, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function nights(checkIn: string, checkOut: string) {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

export function portalUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/stay/${token}`;
}

export function formatMoney(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}
