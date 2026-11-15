import type { WorldObject } from "./worldObject";
import { subscribeCreations, type CreationEvent } from "../creationRequests";
import {
  admitCreatedTerminal,
  createdTerminalIdentity,
} from "./createdTerminalAdmission";
import { useEffect, useRef } from "react";
import { connectionSnapshot, store } from "../store";
import { worldRuntimeStore } from "./runtimeStore";
import { buildWorldObject } from "./worldObject";
import { t } from "../i18n";

type Input = {
  active: boolean;
  intentRequestRef: { current: number };
  openTerminalById: (
    id: string,
    signal?: AbortSignal,
    candidateWorld?: WorldObject,
  ) => Promise<void>;
};

export function useWorldCreatedTerminal({
  active,
  intentRequestRef,
  openTerminalById,
}: Input) {
  const creationFocus = useRef(new Map<number, { intent: number }>());
  const creationAdmissions = useRef(new Set<AbortController>());
  const creationOpener = useRef(openTerminalById);
  creationOpener.current = openTerminalById;
  const creationCompletion = useRef<(event: CreationEvent) => void>(() => {});
  creationCompletion.current = (event) => {
    if (event.phase === "started") {
      creationFocus.current.set(event.id, {
        intent: intentRequestRef.current,
      });
      return;
    }
    if (event.phase === "dispatching") return;
    const captured = creationFocus.current.get(event.id);
    creationFocus.current.delete(event.id);
    // Presentation follows the current view; ownership and intent stay captured.
    if (event.phase !== "created" || !captured || !active) return;
    const identity = createdTerminalIdentity(event.result);
    const paneId = identity?.paneId;
    const title =
      event.kind === "tab"
        ? t("worldInspector.tabTitle")
        : t("worldInspector.workspaceTitle");
    if (!identity || !paneId) {
      store.notify({
        kind: "error",
        message: t("worldInspector.createdFocusFailed", { title }),
        detail: t("worldInspector.createdIdentityMissing"),
      });
      return;
    }
    const preserveNamingNotice =
      store.get().notice?.message === t("worldInspector.createdNamingFailed");
    if (!preserveNamingNotice)
      store.notify({
        kind: "success",
        message: t("worldInspector.createdOpening", { title }),
        loading: true,
      });
    const noticeId = store.get().notice?.id;
    let expectedIntent = captured.intent;
    const admission = new AbortController();
    creationAdmissions.current.add(admission);
    const latestWorld = () =>
      buildWorldObject(
        worldRuntimeStore.get().connections,
        store.get().activeConnectionId,
      );
    const exactNode = () =>
      latestWorld().leaves.find(
        (node) =>
          node.connectionId === event.connectionId &&
          node.generation === event.runtimeGeneration &&
          node.nativeId === paneId &&
          node.terminalId === identity.terminalId &&
          node.workspaceId === identity.workspaceId &&
          node.tabId === identity.tabId,
      );
    void admitCreatedTerminal({
      signal: admission.signal,
      subscribe: (listener) => {
        const offWorld = worldRuntimeStore.subscribe(listener);
        const offStore = store.subscribe(listener);
        return () => {
          offWorld();
          offStore();
        };
      },
      current: () => {
        const snapshot = store.get();
        const host = snapshot.connections.find(
          (connection) => connection.id === event.connectionId,
        );
        const node = exactNode();
        return {
          available: Boolean(node?.actionable && !node.stale),
          observation: `${worldRuntimeStore.get().observedAt}:${connectionSnapshot(snapshot, event.connectionId).lastRefresh}`,
          invalidReason:
            intentRequestRef.current !== expectedIntent
              ? t("worldInspector.newerSelectionSuperseded")
              : snapshot.status !== "connected" ||
                  host?.state !== "ready" ||
                  host.generation !== event.runtimeGeneration
                ? t("worldInspector.ownerChangedBeforeAdmission")
                : undefined,
        };
      },
      open: async (signal) => {
        const node = exactNode();
        if (!node)
          throw new Error(t("worldInspector.createdTerminalUnavailable"));
        // The opener advances intent before synchronous browser navigation publishes.
        expectedIntent = intentRequestRef.current + 1;
        const opening = creationOpener.current(node.id, signal, latestWorld());
        expectedIntent = intentRequestRef.current;
        await opening;
      },
      observe: () => worldRuntimeStore.refresh(),
    })
      .then(() => {
        if (!preserveNamingNotice && store.get().notice?.id === noticeId)
          store.clearNotice();
      })
      .catch((error) => {
        if (!admission.signal.aborted)
          store.notify({
            kind: "error",
            message: t("worldInspector.createdFocusFailed", { title }),
            detail: String(error),
          });
      })
      .finally(() => creationAdmissions.current.delete(admission));
  };
  useEffect(() => {
    const unsubscribe = subscribeCreations((event) =>
      creationCompletion.current(event),
    );
    const focus = creationFocus.current;
    const admissions = creationAdmissions.current;
    return () => {
      unsubscribe();
      focus.clear();
      for (const admission of admissions) admission.abort();
      admissions.clear();
    };
  }, []);
}

export type WorldCreatedTerminal = ReturnType<typeof useWorldCreatedTerminal>;
