import {
  AGENT_MARKS,
  agentMarkKind,
  agentMarkWord,
  type AgentMarkKind,
} from "../world/agentMarks";
import { useT } from "../i18n";
import "./AgentMark.css";

/** An agent's state as its one glyph and colour; the word is its title. */
export function AgentMark({
  kind,
  label,
}: {
  kind: AgentMarkKind;
  /** Read instead of the word, such as the question an agent asks. */
  label?: string;
}) {
  // Subscribe to the locale so the title follows a language change.
  useT();
  const word = agentMarkWord(kind);
  return (
    <span
      className="agent-mark"
      data-mark={kind}
      title={label ?? word}
      aria-label={label ?? word}
      role="img"
    >
      {AGENT_MARKS[kind]}
    </span>
  );
}

/** An agent's mark followed by its word, for a row's status. */
export function AgentState(props: {
  status: string | null | undefined;
  asking?: boolean;
  reviewed?: boolean;
}) {
  // Subscribe to the locale so the word follows a language change.
  useT();
  const kind = agentMarkKind(props.status, props);
  return (
    <>
      <AgentMark kind={kind} />
      {agentMarkWord(kind)}
    </>
  );
}
