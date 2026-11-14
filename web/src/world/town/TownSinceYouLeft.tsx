import { useNow } from "../handoffs";
import { useT } from "../../i18n";
import { itemName, needsYouItems, openNeedsYou } from "../needsYou";
import {
  sharedPresence,
  useOwnerPresence,
  type OwnerReturn,
} from "../presence";
import {
  awayFor,
  leftAt,
  sinceYouLeft,
  sinceYouLeftShort,
  type SinceYouLeftLine,
} from "../sinceYouLeft";
import { useReviewedWork } from "../useReviewedWork";
import { sharedAsksStore, useWorldAsks } from "../worldAsks";
import type { WorldObject } from "../worldObject";
import { useWorldSources } from "../worldSources";

/**
 * The board sign's "Since you left": the latest return not cleared with ✕,
 * and its lines (none without one). The Town Master's greeting shows the
 * same lines.
 */
export function useSinceYouLeft(
  world: Pick<WorldObject, "leaves" | "nodeById">,
): { away: OwnerReturn | null; lines: SinceYouLeftLine[]; now: number } {
  const presence = useOwnerPresence();
  const asks = useWorldAsks(sharedAsksStore());
  const work = useReviewedWork();
  const sources = useWorldSources();
  const now = useNow(30_000);
  const away = presence.dismissed ? null : presence.away;
  if (!away) return { away, lines: [], now };
  const lines = sinceYouLeft({
    window: away,
    items: needsYouItems(world, asks, (leaf) => work.toReview(leaf, now)),
    stoppedAt: work.stoppedAt,
    name: itemName,
    sources: sources.items,
  });
  return { away, lines, now };
}

/**
 * "Since you left" on the Town board sign (and, on phones, one line under
 * the summary chip) after a return of 30 minutes or more. Each line opens
 * Needs you at the item it names; ✕ clears only the recap.
 */
export function TownSinceYouLeft({
  world,
  variant,
}: {
  world: Pick<WorldObject, "leaves" | "nodeById">;
  variant: "board" | "chip";
}) {
  const { away, lines, now } = useSinceYouLeft(world);
  const t = useT();
  if (!away || !lines.length) return null;
  const left = leftAt(away.since, now);
  if (variant === "chip") {
    const first = lines.find((line) => line.itemKey);
    const text = t("master.recapSince", {
      time: left,
      lines: sinceYouLeftShort(lines),
    });
    return (
      <button
        type="button"
        className="town-recap-chip"
        aria-label={t("master.recapChipAria", { text })}
        onClick={() => openNeedsYou(first?.itemKey)}
      >
        <span>{text}</span>
        <span aria-hidden="true">›</span>
      </button>
    );
  }
  return (
    <section className="town-recap" aria-label={t("master.sinceYouLeft")}>
      <header>
        <span>
          {t("master.recapHeader", {
            time: left,
            away: awayFor(away.at - away.since),
          })}
        </span>
        <button
          type="button"
          className="town-recap-clear"
          aria-label={t("master.clearRecap")}
          title={t("master.clearRecap")}
          onClick={() => sharedPresence().dismiss()}
        >
          ✕
        </button>
      </header>
      <ul>
        {lines.map((line) => (
          <li key={line.kind}>
            <RecapLine line={line} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecapLine({ line }: { line: SinceYouLeftLine }) {
  // A merged line names no item, so it opens Needs you itself.
  const t = useT();
  return (
    <button
      type="button"
      title={t("master.openInNeedsYou")}
      onClick={() => openNeedsYou(line.itemKey)}
    >
      {line.text} <span aria-hidden="true">›</span>
    </button>
  );
}
