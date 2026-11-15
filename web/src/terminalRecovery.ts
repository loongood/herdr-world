import { t } from "./i18n/core";
/** Exhausted local attach recovery keeps the app and last frame available. */
export function terminalNoFrameMessage(): string {
  return t("terminal.noOutput");
}

/** Three acknowledged attaches without output exhaust one local recovery budget. */
export class TerminalRecoveryBudget {
  private failures = 0;

  fail(): "retry" | "unavailable" {
    return ++this.failures < 3 ? "retry" : "unavailable";
  }

  reset(): void {
    this.failures = 0;
  }
}
