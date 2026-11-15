import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "../../components/ModalDialogs";
import { useT } from "../../i18n";
import { measuredFixedPositionScale } from "../../fixedPositionScale";
import { aimAtBin } from "../bin/binDrop";
import { townMoveNotice } from "../town/townMoves";
import type { GestureTarget, Point } from "./boardGesture";
import type { BoardModel, BoardPane, BoardTab } from "./boardModel";
import {
  boardPaneMoveReason,
  moveBoardPane,
  type BoardPaneMove,
  type BoardPaneMoveRequest,
} from "./boardPaneMove";
import "./boardPaneMoves.css";

type Job = { pane: BoardPane; source: BoardTab; target: BoardTab };
type Held = {
  pane: BoardPane;
  source: BoardTab;
  element: HTMLDivElement;
  origin: Element | null;
  over: string | null;
  overElement: Element | null;
  /** Over the bin: a drop puts the pane's agent in it. */
  bin: boolean;
};

/** Adapts the shared mouse/touch gesture to a single-pane move, leaving the card in place. */
export function useBoardPaneMoves(props: {
  model: BoardModel;
  move?: BoardPaneMove;
  notice(message: string): void;
  moved(): void;
  /** The pane was dropped on the bin. */
  bin?(panes: readonly BoardPane[]): void;
}) {
  const t = useT();
  const latest = useRef(props);
  latest.current = props;
  const held = useRef<Held | null>(null);
  const busy = useRef(false);
  const [confirm, setConfirm] = useState<Job | null>(null);
  const cancel = useCallback(() => {
    const drag = held.current;
    if (!drag) return false;
    held.current = null;
    drag.element.remove();
    aimAtBin(null);
    drag.origin?.classList.remove("board-pane-lifted");
    drag.overElement?.classList.remove("board-pane-move-target");
    return true;
  }, []);
  useEffect(
    () => () => {
      cancel();
    },
    [cancel],
  );

  const run = async (job: Job, allowClose: boolean) => {
    if (busy.current) return;
    setConfirm(null);
    const current = latest.current;
    const source = current.model.tabByKey.get(job.source.key);
    const target = current.model.tabByKey.get(job.target.key);
    const pane = source?.panes.find((entry) => entry.key === job.pane.key);
    const sourceWorkspace =
      source && current.model.workspaceByKey.get(source.workspaceKey);
    const targetWorkspace =
      target && current.model.workspaceByKey.get(target.workspaceKey);
    if (
      !source ||
      !target ||
      !pane ||
      !sourceWorkspace ||
      !targetWorkspace ||
      pane.leaf.terminalId !== job.pane.leaf.terminalId ||
      pane.leaf.generation !== job.pane.leaf.generation ||
      pane.leaf.agentSessionFingerprint !==
        job.pane.leaf.agentSessionFingerprint
    ) {
      current.notice(t("board.paneChanged"));
      return;
    }
    const request: BoardPaneMoveRequest = {
      pane,
      source,
      target,
      sourceWorkspace,
      targetWorkspace,
    };
    const reason = boardPaneMoveReason(request);
    if (reason) {
      current.notice(reason);
      return;
    }
    busy.current = true;
    current.notice(
      t("moves.movingTo", {
        what: pane.leaf.agentName ?? pane.leaf.label,
        where: target.label,
      }),
    );
    try {
      const outcome = await (current.move ?? moveBoardPane)(
        request,
        allowClose,
      );
      if (
        outcome.status === "refused" &&
        outcome.reason === "room_would_close" &&
        !allowClose
      ) {
        setConfirm(job);
      } else {
        latest.current.notice(
          townMoveNotice(
            pane.leaf.agentName ?? pane.leaf.label,
            outcome,
            source.nativeId,
          ),
        );
        if (outcome.status === "moved") latest.current.moved();
      }
    } catch (error) {
      latest.current.notice(
        t("board.locationUnconfirmed", { reason: String(error) }),
      );
    } finally {
      busy.current = false;
    }
  };
  const move = (at: Point) => {
    const drag = held.current;
    if (!drag) return false;
    const scale = measuredFixedPositionScale();
    drag.element.style.left = `${(at.x + 12) / scale}px`;
    drag.element.style.top = `${(at.y + 12) / scale}px`;
    drag.bin = Boolean(latest.current.bin) && aimAtBin(at);
    const under = drag.bin
      ? null
      : document
          .elementFromPoint(at.x, at.y)
          ?.closest<HTMLElement>(".board-tab");
    const over =
      under?.dataset.key && under.dataset.key !== drag.source.key
        ? under
        : null;
    drag.overElement?.classList.remove("board-pane-move-target");
    drag.overElement = over ?? null;
    drag.over = over?.dataset.key ?? null;
    drag.overElement?.classList.add("board-pane-move-target");
    return true;
  };
  const begin = (target: GestureTarget, at: Point) => {
    if (target.kind !== "card" || !target.paneKey) return false;
    const source = latest.current.model.tabByKey.get(target.key);
    const pane = source?.panes.find((entry) => entry.key === target.paneKey);
    if (!source || !pane) return true;
    if (busy.current || confirm) {
      latest.current.notice(t("board.pendingPaneMove"));
      return true;
    }
    cancel();
    const element = document.createElement("div");
    element.className = "board-pane-drag";
    element.textContent = pane.leaf.agentName ?? pane.leaf.label;
    document.body.appendChild(element);
    const origin = document.querySelector(
      `[data-pane="${CSS.escape(pane.key)}"]`,
    );
    origin?.classList.add("board-pane-lifted");
    held.current = {
      source,
      pane,
      element,
      origin,
      over: null,
      overElement: null,
      bin: false,
    };
    move(at);
    return true;
  };
  const drop = (at: Point) => {
    if (!move(at)) return false;
    const drag = held.current!;
    const target = drag.over && latest.current.model.tabByKey.get(drag.over);
    cancel();
    if (drag.bin) latest.current.bin?.([drag.pane]);
    else if (target)
      void run({ pane: drag.pane, source: drag.source, target }, false);
    return true;
  };
  return {
    begin,
    move,
    drop,
    cancel,
    dialog: confirm
      ? createPortal(
          <ConfirmDialog
            open
            title={t("board.moveLastPaneTitle")}
            message={t("board.moveLastPaneMessage")}
            confirmLabel={t("board.movePaneAndCloseRoom")}
            onConfirm={() => void run(confirm, true)}
            onClose={() => setConfirm(null)}
          />,
          document.body,
        )
      : null,
  };
}
