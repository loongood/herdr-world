// Application-generated dates follow the interface language chosen in
// Configuration. Compact numeric stamps stay language-neutral; relative
// labels and locale-sensitive formats localize through ./i18n/format.
import { formatRelativeTime } from "./i18n/format";

export { uiLocale } from "./i18n/format";

export function formatUiDateTime(timestamp: string, now = new Date()) {
  const time = new Date(timestamp);
  if (Number.isNaN(time.getTime())) return timestamp;
  const pad = (value: number) => String(value).padStart(2, "0");
  const year =
    time.getFullYear() === now.getFullYear() ? "" : `${time.getFullYear()}-`;
  return `${year}${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`;
}

export function formatUiRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
) {
  return formatRelativeTime(value, unit);
}
