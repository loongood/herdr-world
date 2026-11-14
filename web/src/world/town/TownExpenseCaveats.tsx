import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { useT } from "../../i18n";
import { type TownExpenseCaveat, townCaveatLine } from "./townExpenses";
import "./townExpenses.css";

/**
 * An expense figure's caveats (#811): one short line under it, at most a few
 * words each, with the full explanations on hover (its tooltip) or, on a
 * phone, a tap that opens them. Nothing is drawn when there is nothing to say.
 */
export function TownExpenseCaveats({
  caveats,
  className = "town-expenses-notes",
}: {
  caveats: readonly TownExpenseCaveat[];
  className?: string;
}) {
  const t = useT();
  if (!caveats.length) return null;
  const line = townCaveatLine(caveats);
  const explanations = caveats.map((caveat) => caveat.explain);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`town-expenses-caveats ${className}`}
          title={explanations.join("\n")}
          aria-label={`${line ? `${line}. ` : ""}${t("town.aboutFigures")}`}
        >
          {line ? <span>{line}</span> : null}
          <Info size={10} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="town-expenses-popover"
        collisionPadding={8}
        aria-label={t("town.aboutFigures")}
      >
        <ul className="town-expenses-panel town-expenses-explain">
          {explanations.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
