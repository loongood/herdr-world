### Added

- Configuration → Appearance gains a Language selector with English, 简体中文
  and 繁體中文. The browser's languages are detected on first use; an explicit
  choice persists in this browser and follows across its tabs. The Configuration
  dialog, view names and the phase-1 status notices translate, and dates, times
  and relative labels follow the language. The application menu (Zen mode, view
  preferences, help links, runtime and logout) and the Herdr upgrade entry
  follow the selected language as well. The Town board sign (counts, economy
  and fuel limits), its expense boards, place cards, Board's window labels and
  the Add room doorway translate too, and limit reset times follow the
  language. The post office follows it as well: its sign, counts, parcels'
  states, folded sign and pull request lists. The Town Master's greeting
  follows too: its card, the since-you-left recap on the board sign and its
  phone chip, with the away duration and return times in the selected
  language. The agent Chat pane follows as well: its toolbar, status and stop
  notes, delivery notices, errors, empty states and the fixed-findings
  message it sends. The chat interaction cards follow too: the question,
  menu, trust and step cards with their buttons, notes and screen-reader
  labels, sent-answer receipts, the composer's extra controls, and the
  mission-log quest chip and log with their status and source words. The
  shared agent state words (Working, Needs you, Asks you and the rest) now
  follow the language everywhere they appear — every mark title, Board rows
  and summaries, Town edges and peeks, reception's sign and filter, the
  mobile app bar and Chat's status badge — through one marks dictionary;
  the words' unused `means` descriptions were removed. The Needs you
  follows too: its counter and handle, waiting list, per-item cards
  (questions, quick replies, typed answers with attachment chips and
  progress), and the outbox route, including its screen-reader labels. The
  Desk follows as well: its modes, attention summary, search, lanes and
  cards (ages, facts, actions), directory, reviewed view, toast and key
  legend, plus the other-hosts summaries, the reveal notes, the desk name
  plates and their work badges' screen-reader labels. The agent history
  follows as well: its timeline labels and filters, message card actions
  (copy, speak, expand) and tool-call steps, the chat view's bubbles,
  composer (warnings, image uploads, send receipts and their stop-checking
  notes), the drawer's header, status notices, details overview and per-field
  labels, plus the shared prompt warnings. The Ranger panel follows as
  well: its header, view tabs, layout and window controls, settings screens
  (model, credentials, workspace access, saved chats), the conversation,
  minimap, permissions popover, queue and steer controls, the mention
  composer, thinking steps, model and auth forms, action cards and their
  proposal confirmations, and the task board (list, overview, details, run
  history, transcripts and task proposals). The terminal surfaces follow as
  well: the terminal pane (status, selection and touch actions, mobile input,
  pane toolbar, splits and close confirmation), the composer (modes, uploads,
  commands, notices and errors) and the tab pane layout (switcher, empty
  state and pane counter), including the close-warning sentence about
  unsent drafts. The terminal appearance dialog follows too: font and size
  controls with the installed-font picker, theme cards and the custom
  theme editor (color fields, limits and delete confirmation). The mobile
  shortcut editor, the incremental transport setting and the composer's
  command palette follow as well. The agent dialogs follow too: the
  terminal's agent launcher, the session inspector (overview stats, file
  row, timeline turns and step rows), the message detail dialog (roles,
  copy and view toggles) and the agent integrations settings (states,
  install/update/uninstall flows with their confirmations, versions and
  connection states). The review annotations follow too: the panel (cards,
  locations, delivery targets and the clear confirmation), the composer
  popover and the shared line-label helpers that also feed the compiled
  feedback message. The mobile shell follows as well: the bottom bar and
  app bar (tab counts, the attention summary, workspace switching), the tab
  sheet (titles, minimized and pinned rows, close and unpin labels, new
  tab), the layout preferences dialog (display mode, breakpoint, sidebar
  order and URL-override note), the recent-panes and pane-search overlay,
  and the agent status words it shows. The application shell follows too:
  the top bar (brand version title, shortcut cheat sheet and Ranger
  entries), Zen island, the mobile navigation and more sheet (view labels,
  tabs and type entries, drag hints), the sidebar resizer and navigator
  toggles, the inspector resizer label, terminal and Ranger loading
  fallbacks, the layout-save and history-open notices, review feedback
  delivery notices (copy, pre-fill and their retained-draft details), the
  terminal clipboard notices, and the workspace-resource and Ranger-source
  errors. The more sheet's popover anchor now targets a stable attribute
  instead of the translated button label, so it stays positioned in every
  language. The tab strip follows too: its rename and close confirmations,
  the tab context menu (focus, rename, pin, create and close with their
  block reasons), the pinned marker and close controls, the create-tab and
  new-agent buttons, the inspector and annotations toggles, agent status
  markers, and the shared tab-name helper that the mobile surfaces reuse;
  the tab-pins module now serves its block reasons through the same
  dictionary. The command palette follows as well: its trigger button,
  search box and empty state, grouped actions (current workspace, files,
  workspaces, worktrees, tabs, panes, agents, window arrangement and
  help), the rename-workspace/rename-tab/new-worktree dialogs, the
  close and remove-worktree confirmations, and the stale-selection
  notice — the palette's search keywords stay English so English
  queries keep matching. The connection switcher follows as well: its
  browser-transport status and pause controls, the local and SSH profile
  forms with their security notes, the manage-connections dialog (cards,
  badges, path labels, lifecycle and type words, test/edit/default/
  connect/reconnect/disconnect/remove actions with their notices and the
  remove confirmation), and the switcher menu with its selection notices.
  The file explorer follows too: its entry menu (new folder, download,
  copy path, reveal-on-host words and delete), search controls, hidden
  files and filesystem-browse toggles, the workspace tree (loading, empty
  and drop states), the new-folder and delete confirmations, and its
  upload/download/move/delete notices, plus the read-only filesystem
  browser (path bar, loaded-file search, entry actions) and the shared
  reveal helper. The file previews follow too: their headers (title,
  source/rendered mode, copy, refresh, close and new-workspace actions),
  media states (images, PDFs, audio, the static-HTML sandbox banner,
  truncation and match banners), zoom controls, Mermaid diagrams and the
  error boundary, including the annotation-limit notices. The Workspace
  Inspector follows too: its window bar (identity, location line, linked
  worktree badge), the view tabs and selector, the dock/float/maximize
  window controls, stale and unavailable status lines, the repository
  status popover and phone sheet, the agent's appearance popover, and its
  loading/empty states. The diff viewers round out the review flow: both
  panels' headers, changed-file trees and empty states, the comparison
  scope and branch selectors, the hunk navigation and file search
  controls, image previews, the copy-path and reveal context menus, and
  their copy confirmations. The worktree foundations follow: the shared
  Git action menus, stage/discard/delete confirmations and success
  notices (including the batch counts), the worktree lifecycle summaries
  (git status lines, auto-sync labels, removal errors) and the batch
  action notices in the store. The built-in
  slash-command catalog
  keeps its English descriptions: they document external CLIs, not World's
  own copy.
  Remaining surfaces keep English
  until their phase lands.
