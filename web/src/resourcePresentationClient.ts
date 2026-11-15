import { t } from "./i18n/core";
import type { ConnectionClient } from "./api";
import type { ConnectionClientScope } from "./useConnectionClient";

const presentationScopes = new WeakMap<object, ConnectionClientScope>();

/** Cache identity is data; it cannot supply a client or an operational target. */
export function resourcePresentationScope(
  client: ConnectionClientScope,
): ConnectionClientScope {
  return presentationScopes.get(client) ?? client;
}

export function resourcePresentationClient(
  client: ConnectionClient,
  displayed: ConnectionClientScope,
): ConnectionClient {
  const bound = () => client.isCurrent() && client.agentWorktree !== null;
  const presentation = {
    ...client,
    isCurrent: bound,
    call: ((method, params, timeout) =>
      bound()
        ? client.call(method, params, timeout)
        : Promise.reject(
            new Error(t("worktree.awaitingAdmission")),
          )) as ConnectionClient["call"],
  };
  // A new owner must never inherit another owner's display cache.
  const sameOwner =
    client.connectionId === displayed.connectionId &&
    (client.serverRuntimeGeneration ?? client.generation) ===
      (displayed.serverRuntimeGeneration ?? displayed.generation);
  const scope = sameOwner && client.agentWorktree === null ? displayed : client;
  presentationScopes.set(presentation, {
    connectionId: scope.connectionId,
    generation: scope.generation,
    serverRuntimeGeneration: scope.serverRuntimeGeneration,
    agentWorktree: scope.agentWorktree,
  });
  return presentation;
}
