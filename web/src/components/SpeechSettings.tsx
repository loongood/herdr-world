import { useEffect, useId, useState } from "react";
import { useT } from "../i18n";
import {
  updateSpeechPreferences,
  useSpeechPreferences,
} from "../speechPreferences";
import "./SpeechSettings.css";

export function SpeechSettings() {
  const t = useT();
  const id = useId();
  const preferences = useSpeechPreferences();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synthesis =
    typeof window === "undefined" ? null : window.speechSynthesis;
  const supported =
    Boolean(synthesis) && typeof window.SpeechSynthesisUtterance === "function";
  useEffect(() => {
    if (!synthesis || !supported) return;
    const refresh = () => setVoices(synthesis.getVoices());
    refresh();
    synthesis.addEventListener("voiceschanged", refresh);
    return () => synthesis.removeEventListener("voiceschanged", refresh);
  }, [synthesis, supported]);
  const missingVoice =
    preferences.voiceURI !== "" &&
    !voices.some((voice) => voice.voiceURI === preferences.voiceURI);
  return (
    <fieldset className="speech-settings">
      <legend>{t("components.speech.title")}</legend>
      <p id={`${id}-description`}>{t("components.speech.description")}</p>
      {!supported ? (
        <p role="status">{t("components.speech.unsupported")}</p>
      ) : null}
      <label htmlFor={`${id}-voice`}>{t("components.speech.voice")}</label>
      <select
        id={`${id}-voice`}
        disabled={!supported}
        aria-describedby={`${id}-description`}
        value={preferences.voiceURI}
        onChange={(event) =>
          updateSpeechPreferences({ voiceURI: event.target.value })
        }
      >
        <option value="">{t("components.speech.onDeviceDefault")}</option>
        {missingVoice ? (
          <option value={preferences.voiceURI}>
            {t("components.speech.savedVoiceUnavailable")}
          </option>
        ) : null}
        {voices.map((voice) => (
          <option key={voice.voiceURI} value={voice.voiceURI}>
            {voice.name} ({voice.lang})
            {voice.localService ? "" : t("components.speech.networkNote")}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-rate`}>
        {t("components.speech.speakingRate", {
          rate: preferences.rate.toFixed(1),
        })}
      </label>
      <input
        id={`${id}-rate`}
        type="range"
        min="0.5"
        max="2"
        step="0.1"
        disabled={!supported}
        value={preferences.rate}
        aria-valuetext={t("components.speech.rateTimesNormal", {
          rate: preferences.rate.toFixed(1),
        })}
        onChange={(event) =>
          updateSpeechPreferences({ rate: Number(event.target.value) })
        }
      />
    </fieldset>
  );
}
