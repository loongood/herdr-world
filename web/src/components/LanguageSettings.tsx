import { Languages } from "lucide-react";
import { setLanguage, t, useLanguage } from "../i18n";
import { LANGUAGE_OPTIONS, type LanguagePreference } from "../i18n/locales";

/**
 * The interface language control in Configuration's Appearance tab. Options
 * name themselves in their own language; the auto entry uses the current
 * language's word for it.
 */
export function LanguageSettings() {
  const preference = useLanguage();
  return (
    <div className="config-preference-row">
      <span className="config-item-icon">
        <Languages size={15} />
      </span>
      <div className="config-item-copy">
        <strong>{t("config.language")}</strong>
        <span>{t("config.languageHint")}</span>
      </div>
      <select
        className="config-preference-select"
        aria-label={t("config.language")}
        value={preference}
        onChange={(event) =>
          void setLanguage(event.target.value as LanguagePreference)
        }
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value === "auto" ? t("config.languageAuto") : option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
