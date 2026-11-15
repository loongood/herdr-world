import { getCurrentLocale, t } from "./i18n";
import type { TranslationKey } from "./i18n/en";
import type { Locale } from "./i18n/locales";

export type ComposerCommand = {
  name: string;
  description: string;
  arguments?: string;
};

/** A catalog entry: the description is a dictionary key, read when shown. */
type ComposerCommandEntry = {
  name: string;
  descriptionKey: TranslationKey;
  arguments?: string;
};

// Built-in input-assistance catalogs, not live capability lists or validators.
// Availability depends on agent version/configuration. Argument hints are
// display-only; plugins and unlisted commands remain freely editable/sendable.
const catalogs: Record<string, readonly ComposerCommandEntry[]> = {
  // https://code.claude.com/docs/en/commands
  claude: [
    { name: "/help", descriptionKey: "composerCommands.claude.help" },
    {
      name: "/compact",
      descriptionKey: "composerCommands.claude.compact",
      arguments: "[instructions]",
    },
    {
      name: "/clear",
      descriptionKey: "composerCommands.claude.clear",
      arguments: "[name]",
    },
    {
      name: "/model",
      descriptionKey: "composerCommands.claude.model",
      arguments: "[model]",
    },
    {
      name: "/resume",
      descriptionKey: "composerCommands.claude.resume",
      arguments: "[session]",
    },
    {
      name: "/status",
      descriptionKey: "composerCommands.claude.status",
    },
    { name: "/config", descriptionKey: "composerCommands.claude.config" },
    {
      name: "/add-dir",
      descriptionKey: "composerCommands.claude.addDir",
      arguments: "<path>",
    },
    {
      name: "/context",
      descriptionKey: "composerCommands.claude.context",
    },
    {
      name: "/usage",
      descriptionKey: "composerCommands.claude.usage",
    },
    { name: "/memory", descriptionKey: "composerCommands.claude.memory" },
    {
      name: "/permissions",
      descriptionKey: "composerCommands.claude.permissions",
    },
    { name: "/mcp", descriptionKey: "composerCommands.claude.mcp" },
    { name: "/skills", descriptionKey: "composerCommands.claude.skills" },
    { name: "/plugin", descriptionKey: "composerCommands.claude.plugin" },
    {
      name: "/reload-plugins",
      descriptionKey: "composerCommands.claude.reloadPlugins",
    },
    {
      name: "/reload-skills",
      descriptionKey: "composerCommands.claude.reloadSkills",
    },
    { name: "/init", descriptionKey: "composerCommands.claude.init" },
    {
      name: "/plan",
      descriptionKey: "composerCommands.claude.plan",
      arguments: "[description]",
    },
    { name: "/review", descriptionKey: "composerCommands.claude.review" },
    { name: "/diff", descriptionKey: "composerCommands.claude.diff" },
    {
      name: "/rewind",
      descriptionKey: "composerCommands.claude.rewind",
    },
    {
      name: "/rename",
      descriptionKey: "composerCommands.claude.rename",
      arguments: "[name]",
    },
    {
      name: "/copy",
      descriptionKey: "composerCommands.claude.copy",
    },
    {
      name: "/export",
      descriptionKey: "composerCommands.claude.export",
      arguments: "[filename]",
    },
    { name: "/hooks", descriptionKey: "composerCommands.claude.hooks" },
    { name: "/tasks", descriptionKey: "composerCommands.claude.tasks" },
    { name: "/doctor", descriptionKey: "composerCommands.claude.doctor" },
    { name: "/theme", descriptionKey: "composerCommands.claude.theme" },
    {
      name: "/keybindings",
      descriptionKey: "composerCommands.claude.keybindings",
    },
    {
      name: "/release-notes",
      descriptionKey: "composerCommands.claude.releaseNotes",
    },
    { name: "/login", descriptionKey: "composerCommands.claude.login" },
    { name: "/logout", descriptionKey: "composerCommands.claude.logout" },
    {
      name: "/btw",
      descriptionKey: "composerCommands.claude.btw",
      arguments: "[question]",
    },
    {
      name: "/branch",
      descriptionKey: "composerCommands.claude.branch",
      arguments: "[name]",
    },
    { name: "/effort", descriptionKey: "composerCommands.claude.effort" },
    {
      name: "/exit",
      descriptionKey: "composerCommands.claude.exit",
    },
  ],
  // https://github.com/openai/codex/blob/main/codex-rs/tui/src/slash_command.rs
  codex: [
    { name: "/model", descriptionKey: "composerCommands.codex.model" },
    { name: "/new", descriptionKey: "composerCommands.codex.new" },
    { name: "/resume", descriptionKey: "composerCommands.codex.resume" },
    {
      name: "/compact",
      descriptionKey: "composerCommands.codex.compact",
    },
    { name: "/diff", descriptionKey: "composerCommands.codex.diff" },
    {
      name: "/status",
      descriptionKey: "composerCommands.codex.status",
    },
    {
      name: "/permissions",
      descriptionKey: "composerCommands.codex.permissions",
    },
    { name: "/review", descriptionKey: "composerCommands.codex.review" },
    { name: "/plan", descriptionKey: "composerCommands.codex.plan" },
    { name: "/init", descriptionKey: "composerCommands.codex.init" },
    { name: "/skills", descriptionKey: "composerCommands.codex.skills" },
    { name: "/mcp", descriptionKey: "composerCommands.codex.mcp" },
    { name: "/plugins", descriptionKey: "composerCommands.codex.plugins" },
    { name: "/fork", descriptionKey: "composerCommands.codex.fork" },
    {
      name: "/rename",
      descriptionKey: "composerCommands.codex.rename",
      arguments: "[name]",
    },
    { name: "/copy", descriptionKey: "composerCommands.codex.copy" },
    { name: "/export", descriptionKey: "composerCommands.codex.export" },
    { name: "/mention", descriptionKey: "composerCommands.codex.mention" },
    { name: "/ps", descriptionKey: "composerCommands.codex.ps" },
    { name: "/stop", descriptionKey: "composerCommands.codex.stop" },
    { name: "/clear", descriptionKey: "composerCommands.codex.clear" },
    { name: "/theme", descriptionKey: "composerCommands.codex.theme" },
    {
      name: "/statusline",
      descriptionKey: "composerCommands.codex.statusline",
    },
    {
      name: "/debug-config",
      descriptionKey: "composerCommands.codex.debugConfig",
    },
    { name: "/feedback", descriptionKey: "composerCommands.codex.feedback" },
    { name: "/logout", descriptionKey: "composerCommands.codex.logout" },
    {
      name: "/cd",
      descriptionKey: "composerCommands.codex.cd",
      arguments: "<path>",
    },
    { name: "/pwd", descriptionKey: "composerCommands.codex.pwd" },
    { name: "/usage", descriptionKey: "composerCommands.codex.usage" },
    { name: "/hooks", descriptionKey: "composerCommands.codex.hooks" },
    { name: "/quit", descriptionKey: "composerCommands.codex.quit" },
  ],
  // https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/slash-commands.md
  pi: [
    {
      name: "/model",
      descriptionKey: "composerCommands.pi.model",
      arguments: "[provider/model]",
    },
    { name: "/settings", descriptionKey: "composerCommands.pi.settings" },
    { name: "/new", descriptionKey: "composerCommands.pi.new" },
    { name: "/resume", descriptionKey: "composerCommands.pi.resume" },
    {
      name: "/compact",
      descriptionKey: "composerCommands.pi.compact",
      arguments: "[instructions]",
    },
    {
      name: "/session",
      descriptionKey: "composerCommands.pi.session",
    },
    { name: "/tree", descriptionKey: "composerCommands.pi.tree" },
    {
      name: "/thinking",
      descriptionKey: "composerCommands.pi.thinking",
      arguments: "[level]",
    },
    {
      name: "/scoped-models",
      descriptionKey: "composerCommands.pi.scopedModels",
    },
    {
      name: "/login",
      descriptionKey: "composerCommands.pi.login",
      arguments: "[provider]",
    },
    { name: "/logout", descriptionKey: "composerCommands.pi.logout" },
    {
      name: "/llama",
      descriptionKey: "composerCommands.pi.llama",
    },
    {
      name: "/name",
      descriptionKey: "composerCommands.pi.name",
      arguments: "[name]",
    },
    {
      name: "/fork",
      descriptionKey: "composerCommands.pi.fork",
    },
    {
      name: "/clone",
      descriptionKey: "composerCommands.pi.clone",
    },
    {
      name: "/import",
      descriptionKey: "composerCommands.pi.import",
      arguments: "<path>",
    },
    { name: "/copy", descriptionKey: "composerCommands.pi.copy" },
    {
      name: "/export",
      descriptionKey: "composerCommands.pi.export",
      arguments: "[path]",
    },
    {
      name: "/share",
      descriptionKey: "composerCommands.pi.share",
    },
    {
      name: "/bug",
      descriptionKey: "composerCommands.pi.bug",
      arguments: "[description]",
    },
    { name: "/trust", descriptionKey: "composerCommands.pi.trust" },
    {
      name: "/reload",
      descriptionKey: "composerCommands.pi.reload",
    },
    { name: "/hotkeys", descriptionKey: "composerCommands.pi.hotkeys" },
    { name: "/changelog", descriptionKey: "composerCommands.pi.changelog" },
    { name: "/quit", descriptionKey: "composerCommands.pi.quit" },
  ],
  // https://moonshotai.github.io/kimi-cli/en/reference/slash-commands.html
  kimi: [
    {
      name: "/help",
      descriptionKey: "composerCommands.kimi.help",
    },
    { name: "/model", descriptionKey: "composerCommands.kimi.model" },
    { name: "/new", descriptionKey: "composerCommands.kimi.new" },
    { name: "/sessions", descriptionKey: "composerCommands.kimi.sessions" },
    { name: "/clear", descriptionKey: "composerCommands.kimi.clear" },
    {
      name: "/compact",
      descriptionKey: "composerCommands.kimi.compact",
      arguments: "[instructions]",
    },
    { name: "/usage", descriptionKey: "composerCommands.kimi.usage" },
    { name: "/version", descriptionKey: "composerCommands.kimi.version" },
    { name: "/changelog", descriptionKey: "composerCommands.kimi.changelog" },
    {
      name: "/feedback",
      descriptionKey: "composerCommands.kimi.feedback",
    },
    { name: "/login", descriptionKey: "composerCommands.kimi.login" },
    { name: "/logout", descriptionKey: "composerCommands.kimi.logout" },
    {
      name: "/editor",
      descriptionKey: "composerCommands.kimi.editor",
      arguments: "[command]",
    },
    {
      name: "/theme",
      descriptionKey: "composerCommands.kimi.theme",
      arguments: "[dark|light]",
    },
    { name: "/reload", descriptionKey: "composerCommands.kimi.reload" },
    {
      name: "/debug",
      descriptionKey: "composerCommands.kimi.debug",
    },
    { name: "/mcp", descriptionKey: "composerCommands.kimi.mcp" },
    { name: "/hooks", descriptionKey: "composerCommands.kimi.hooks" },
    {
      name: "/title",
      descriptionKey: "composerCommands.kimi.title",
      arguments: "[text]",
    },
    {
      name: "/undo",
      descriptionKey: "composerCommands.kimi.undo",
    },
    { name: "/fork", descriptionKey: "composerCommands.kimi.fork" },
    {
      name: "/export",
      descriptionKey: "composerCommands.kimi.export",
      arguments: "[path]",
    },
    {
      name: "/import",
      descriptionKey: "composerCommands.kimi.import",
      arguments: "<file_path|session_id>",
    },
    {
      name: "/add-dir",
      descriptionKey: "composerCommands.kimi.addDir",
      arguments: "[path]",
    },
    {
      name: "/btw",
      descriptionKey: "composerCommands.kimi.btw",
      arguments: "<question>",
    },
    { name: "/init", descriptionKey: "composerCommands.kimi.init" },
    {
      name: "/plan",
      descriptionKey: "composerCommands.kimi.plan",
      arguments: "[on|off|view|clear]",
    },
    { name: "/task", descriptionKey: "composerCommands.kimi.task" },
    { name: "/web", descriptionKey: "composerCommands.kimi.web" },
    { name: "/vis", descriptionKey: "composerCommands.kimi.vis" },
    { name: "/exit", descriptionKey: "composerCommands.kimi.exit" },
  ],
  // https://docs.x.ai/build/modes-and-commands
  grok: [
    { name: "/help", descriptionKey: "composerCommands.grok.help" },
    {
      name: "/model",
      descriptionKey: "composerCommands.grok.model",
      arguments: "<name>",
    },
    { name: "/settings", descriptionKey: "composerCommands.grok.settings" },
    { name: "/new", descriptionKey: "composerCommands.grok.new" },
    { name: "/resume", descriptionKey: "composerCommands.grok.resume" },
    {
      name: "/sessions",
      descriptionKey: "composerCommands.grok.sessions",
    },
    {
      name: "/compact",
      descriptionKey: "composerCommands.grok.compact",
      arguments: "[context]",
    },
    { name: "/context", descriptionKey: "composerCommands.grok.context" },
    {
      name: "/session-info",
      descriptionKey: "composerCommands.grok.sessionInfo",
    },
    {
      name: "/rename",
      descriptionKey: "composerCommands.grok.rename",
      arguments: "<title>",
    },
    { name: "/fork", descriptionKey: "composerCommands.grok.fork" },
    { name: "/rewind", descriptionKey: "composerCommands.grok.rewind" },
    {
      name: "/copy",
      descriptionKey: "composerCommands.grok.copy",
      arguments: "[N]",
    },
    {
      name: "/export",
      descriptionKey: "composerCommands.grok.export",
    },
    { name: "/share", descriptionKey: "composerCommands.grok.share" },
    { name: "/find", descriptionKey: "composerCommands.grok.find" },
    {
      name: "/transcript",
      descriptionKey: "composerCommands.grok.transcript",
    },
    {
      name: "/effort",
      descriptionKey: "composerCommands.grok.effort",
    },
    {
      name: "/plan",
      descriptionKey: "composerCommands.grok.plan",
      arguments: "[description]",
    },
    { name: "/view-plan", descriptionKey: "composerCommands.grok.viewPlan" },
    {
      name: "/btw",
      descriptionKey: "composerCommands.grok.btw",
      arguments: "<question>",
    },
    {
      name: "/tasks",
      descriptionKey: "composerCommands.grok.tasks",
    },
    { name: "/queue", descriptionKey: "composerCommands.grok.queue" },
    { name: "/dashboard", descriptionKey: "composerCommands.grok.dashboard" },
    {
      name: "/theme",
      descriptionKey: "composerCommands.grok.theme",
      arguments: "[name]",
    },
    {
      name: "/config-agents",
      descriptionKey: "composerCommands.grok.configAgents",
    },
    { name: "/plugins", descriptionKey: "composerCommands.grok.plugins" },
    { name: "/skills", descriptionKey: "composerCommands.grok.skills" },
    { name: "/mcps", descriptionKey: "composerCommands.grok.mcps" },
    { name: "/hooks", descriptionKey: "composerCommands.grok.hooks" },
    {
      name: "/marketplace",
      descriptionKey: "composerCommands.grok.marketplace",
    },
    {
      name: "/create-workflow",
      descriptionKey: "composerCommands.grok.createWorkflow",
      arguments: "[description]",
    },
    {
      name: "/workflow",
      descriptionKey: "composerCommands.grok.workflow",
      arguments: "<name> [args]",
    },
    { name: "/workflows", descriptionKey: "composerCommands.grok.workflows" },
    { name: "/usage", descriptionKey: "composerCommands.grok.usage" },
    {
      name: "/privacy",
      descriptionKey: "composerCommands.grok.privacy",
    },
    {
      name: "/feedback",
      descriptionKey: "composerCommands.grok.feedback",
    },
    {
      name: "/release-notes",
      descriptionKey: "composerCommands.grok.releaseNotes",
    },
    { name: "/login", descriptionKey: "composerCommands.grok.login" },
    { name: "/logout", descriptionKey: "composerCommands.grok.logout" },
    { name: "/quit", descriptionKey: "composerCommands.grok.quit" },
  ],
  // https://antigravity.google/docs/cli/reference
  agy: [
    { name: "/help", descriptionKey: "composerCommands.agy.help" },
    { name: "/model", descriptionKey: "composerCommands.agy.model" },
    { name: "/config", descriptionKey: "composerCommands.agy.config" },
    {
      name: "/clear",
      descriptionKey: "composerCommands.agy.clear",
    },
    { name: "/resume", descriptionKey: "composerCommands.agy.resume" },
    {
      name: "/fork",
      descriptionKey: "composerCommands.agy.fork",
    },
    { name: "/rewind", descriptionKey: "composerCommands.agy.rewind" },
    {
      name: "/rename",
      descriptionKey: "composerCommands.agy.rename",
      arguments: "<name>",
    },
    { name: "/context", descriptionKey: "composerCommands.agy.context" },
    { name: "/planning", descriptionKey: "composerCommands.agy.planning" },
    { name: "/fast", descriptionKey: "composerCommands.agy.fast" },
    { name: "/diff", descriptionKey: "composerCommands.agy.diff" },
    { name: "/artifact", descriptionKey: "composerCommands.agy.artifact" },
    {
      name: "/agents",
      descriptionKey: "composerCommands.agy.agents",
    },
    { name: "/tasks", descriptionKey: "composerCommands.agy.tasks" },
    { name: "/mcp", descriptionKey: "composerCommands.agy.mcp" },
    { name: "/skills", descriptionKey: "composerCommands.agy.skills" },
    { name: "/hooks", descriptionKey: "composerCommands.agy.hooks" },
    { name: "/plugin", descriptionKey: "composerCommands.agy.plugin" },
    {
      name: "/permissions",
      descriptionKey: "composerCommands.agy.permissions",
    },
    {
      name: "/keybindings",
      descriptionKey: "composerCommands.agy.keybindings",
    },
    { name: "/statusline", descriptionKey: "composerCommands.agy.statusline" },
    {
      name: "/title",
      descriptionKey: "composerCommands.agy.title",
      arguments: "[on|off]",
    },
    {
      name: "/add-dir",
      descriptionKey: "composerCommands.agy.addDir",
      arguments: "<path>",
    },
    {
      name: "/open",
      descriptionKey: "composerCommands.agy.open",
      arguments: "<path>",
    },
    {
      name: "/btw",
      descriptionKey: "composerCommands.agy.btw",
      arguments: "<query>",
    },
    { name: "/copy", descriptionKey: "composerCommands.agy.copy" },
    { name: "/usage", descriptionKey: "composerCommands.agy.usage" },
    { name: "/feedback", descriptionKey: "composerCommands.agy.feedback" },
    {
      name: "/logout",
      descriptionKey: "composerCommands.agy.logout",
    },
    { name: "/exit", descriptionKey: "composerCommands.agy.exit" },
  ],
};

const aliases = new Map([
  ["claude", "claude"],
  ["claude-code", "claude"],
  ["claude code", "claude"],
  ["codex", "codex"],
  ["codex-cli", "codex"],
  ["codex cli", "codex"],
  ["pi", "pi"],
  ["pi-agent", "pi"],
  ["pi-coding-agent", "pi"],
  ["kimi", "kimi"],
  ["kimi-code", "kimi"],
  ["kimi code", "kimi"],
  ["kimi-cli", "kimi"],
  ["grok", "grok"],
  ["grok-build", "grok"],
  ["grok build", "grok"],
  ["agy", "agy"],
  ["antigravity", "agy"],
  ["antigravity-cli", "agy"],
  ["antigravity cli", "agy"],
]);

/**
 * The catalogs in the reader's language. The result is kept per locale, so
 * two calls in one language hand out the same commands.
 */
let localizedLocale: Locale | null = null;
let localized: Record<string, readonly ComposerCommand[]> = {};

function localizedCatalogs(): Record<string, readonly ComposerCommand[]> {
  const locale = getCurrentLocale();
  if (locale === localizedLocale) return localized;
  localizedLocale = locale;
  localized = {};
  for (const [agent, entries] of Object.entries(catalogs)) {
    localized[agent] = entries.map((entry) => ({
      name: entry.name,
      description: t(entry.descriptionKey),
      ...(entry.arguments === undefined ? {} : { arguments: entry.arguments }),
    }));
  }
  return localized;
}

export function terminalComposerCommands(
  agent?: string,
): readonly ComposerCommand[] {
  const identity = aliases.get(agent?.trim().toLowerCase() ?? "");
  if (!identity) return [];
  return localizedCatalogs()[identity] ?? [];
}

export function filterComposerCommands(
  commands: readonly ComposerCommand[],
  query: string,
): readonly ComposerCommand[] {
  const prefix = query.trim().toLowerCase().replace(/^\//, "");
  return commands.filter((command) => command.name.slice(1).startsWith(prefix));
}

/** Only complete the first token, and only while the selection is inside it. */
export function composerCommandPrefix(
  text: string,
  start: number,
  end = start,
): string | null {
  const token = /^\/[^\s]*/.exec(text)?.[0];
  return token && start > 0 && start <= token.length && end <= token.length
    ? token
    : null;
}

/** Replace only the leading token; preserve whitespace, arguments, and caret offsets. */
export function completeComposerCommand(
  text: string,
  command: ComposerCommand,
  start: number,
  end = start,
): { text: string; start: number; end: number } | null {
  const token = /^\/[^\s]*/.exec(text)?.[0];
  if (!token) return null;
  const suffix = text.slice(token.length);
  const next = command.name + (suffix || " ");
  const position = (offset: number) =>
    Math.min(
      next.length,
      offset > token.length
        ? offset + command.name.length - token.length
        : command.name.length + (suffix ? 0 : 1),
    );
  return { text: next, start: position(start), end: position(end) };
}
