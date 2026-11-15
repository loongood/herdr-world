import { BellOff, Crosshair, Eye } from "lucide-react";
import { useState } from "react";
import type { Interest } from "../../../shared/interest";
import { t, useT } from "../i18n";
import { cn } from "../utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import "./InterestButton.css";

/**
 * An agent's interest (shared/interest.ts) as a small header button that opens
 * the three choices. Interest only gates chimes: a muted agent's questions and
 * results still reach reception.
 */

export type InterestChoice = {
  current: Interest;
  onInterest(next: Interest): void;
  /** Another agent is focused, so a watched agent stays quiet for now. */
  quiet?: boolean;
  /** Agent choices distinguish a forced Watch from inherited Default. */
  override?: Interest | null;
  onDefault?(): void;
  description?: string;
};

export const INTEREST_CHOICES: readonly Interest[] = [
  "watching",
  "muted",
  "focused",
];

export function interestLabel(choice: Interest): string {
  switch (choice) {
    case "watching":
      return t("interest.watching");
    case "muted":
      return t("interest.muted");
    case "focused":
      return t("interest.focused");
  }
}

export function interestHint(choice: Interest): string {
  switch (choice) {
    case "watching":
      return t("interest.watchingHint");
    case "muted":
      return t("interest.mutedHint");
    case "focused":
      return t("interest.focusedHint");
  }
}

const ICONS = { watching: Eye, muted: BellOff, focused: Crosshair };

export function InterestButton({
  current,
  onInterest,
  quiet = false,
  override,
  onDefault,
  description,
  className,
}: InterestChoice & { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const Icon = ICONS[current];
  const held = quiet && current === "watching";
  const label = `${description ?? interestLabel(current)}${held ? t("interest.quietSuffix") : ""}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("interest-button", className)}
          data-interest={current}
          data-quiet={held || undefined}
          aria-label={t("interest.interestAria", { label })}
          aria-haspopup="dialog"
          title={t("interest.interestAria", { label })}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="interest-popover"
        align="start"
        collisionPadding={8}
      >
        <div
          className="interest-choices"
          role="group"
          aria-label={t("interest.ariaLabel")}
        >
          {onDefault && (
            <button
              type="button"
              className="interest-choice"
              aria-pressed={override === null}
              onClick={() => {
                setOpen(false);
                onDefault();
              }}
            >
              <Eye size={15} aria-hidden="true" />
              <span>
                <b>{t("interest.default")}</b>
                <small>{t("interest.defaultHint")}</small>
              </span>
            </button>
          )}
          {INTEREST_CHOICES.map((choice) => {
            const ChoiceIcon = ICONS[choice];
            return (
              <button
                key={choice}
                type="button"
                className="interest-choice"
                aria-pressed={
                  onDefault ? override === choice : current === choice
                }
                onClick={() => {
                  setOpen(false);
                  if (choice !== current || (onDefault && override !== choice))
                    onInterest(choice);
                }}
              >
                <ChoiceIcon size={15} aria-hidden="true" />
                <span>
                  <b>
                    {onDefault && choice === "watching"
                      ? t("interest.watch")
                      : interestLabel(choice)}
                  </b>
                  <small>
                    {quiet && choice === "watching"
                      ? t("interest.quietHint")
                      : interestHint(choice)}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
