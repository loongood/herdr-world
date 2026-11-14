import { getCurrentLocale } from "./index";
import { INTL_TAGS } from "./locales";

/** The BCP 47 tag Intl formatters use: it follows the interface language. */
export function uiLocale(): string {
  return INTL_TAGS[getCurrentLocale()];
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function dateTimeFormatter(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const locale = uiLocale();
  const cacheKey = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateTimeFormatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatters.set(cacheKey, formatter);
  }
  return formatter;
}

export function formatDate(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return dateTimeFormatter({ dateStyle: "medium" }).format(date);
}

export function formatTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return dateTimeFormatter({ timeStyle: "short" }).format(date);
}

export function formatDateTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return dateTimeFormatter({ dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

/** "Tue 14:00" in the interface language: a limit window's reset moment. */
export function formatWeekdayTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return dateTimeFormatter({
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
): string {
  const locale = uiLocale();
  let formatter = relativeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relativeFormatters.set(locale, formatter);
  }
  return formatter.format(value, unit);
}
