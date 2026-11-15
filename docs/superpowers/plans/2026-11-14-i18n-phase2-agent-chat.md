# i18n 阶段 2 · 模块 5:聊天主窗格(AgentChat)

模块 5/6:Web 界面 i18n 迁移。范围:`web/src/components/AgentChat.tsx`
(911 行,聊天窗格主体)。chat/blocks/(问题卡、状态徽章内部)、
ChatComposer、QuestLog、AgentHistoryDrawer 留后续批次。

**Files:**
- Modify: `web/src/i18n/en.ts`(新增顶级域 `chat`,约 38 键)
- Modify: `web/src/i18n/zh-Hans.ts`、`web/src/i18n/zh-Hant.ts`
- Modify: `web/src/components/AgentChat.tsx`(全部可见文案 t()/useT() 化)
- Modify: `changes/i18n-phase1.md`(追加)
- Create: 本计划

**术语决定**:conversation = 对话/對話;session(智能体 CLI)= 会话/會話;
pane = 窗格。消息文本 `↳ #{number} Please fix the findings…` 也键化(它进入
聊天记录,用户可见)。英文保留花引号 “ ” 与 ↳。

**要点:**
- 组件用 `useT()`(AgentChat 主体),发送路径的 throw/setNotice 用导入的
  `t()`(运行时调用,不进 useCallback 依赖)。
- 兜底名三键:`agentName`("Agent",transcript/recipient)、`theAgent`
  ("the agent",句中)、`theAgentSentence`("The agent",句首)。
- `preview()` 截断文本作为 `{text}` 参数;`delivery.detail` 保持服务端文本,
  由 `{detail}` 占位(shared 层文案属阶段 3)。

**验证链:** typecheck:quick → `bun run test
web/src/components/AgentChat.browser.tsx`(需 Chrome;Windows 既有失败以
CI 兜底)→ i18n 套件 → 英文对照 → biome format(仅手改文件)→
changes/i18n-phase1.md → 提交推送(--no-verify)。en 默认,既有英文断言不变。
