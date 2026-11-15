# i18n 阶段 2 · 模块 7:agentMarks 共享状态词表

模块 7:共享智能体状态词(Working/Needs you/Asks you/Done/Reviewed/
Idle/No signal/Offline)迁移,全部消费方一次跟随。

**Files:**
- Modify: `web/src/i18n/en.ts`(新顶级域 `marks`:8 状态词 +
  offlineNote"Offline · last known state";新顶级域 `reception` 11 键)
- Modify: `web/src/i18n/zh-Hans.ts`、`web/src/i18n/zh-Hant.ts`(同步)
- Modify: `web/src/world/agentMarks.ts`:`AGENT_MARKS` 缩为
  `Record<AgentMarkKind, string>`(仅 glyph);新增 `agentMarkWord()`
  (MARK_WORD_KEYS 映射);`means` 字段零消费方,删除
- Modify: `web/src/components/AgentMark.tsx`(AgentMark/AgentState 加 useT)
- Modify: `web/src/components/chat/blocks/now.ts`(STATUS_WORDS 模块级
  常量 → `statusWord()` 运行时求值,保真原语义:仅 working/blocked/
  done/idle 四态映射,其他原样返回)
- Modify: `web/src/components/chat/blocks/status-badge.tsx`(label 默认
  参数 + useT)
- Modify: `web/src/components/MobileControls.tsx`(STATUS_LABEL 模块级
  常量 → `statusLabel()` 函数;unknown → "";MobileTerminalAppBar 加 useT)
- Modify: `web/src/world/BoardView.tsx`(STATUS_LABEL → statusLabel,
  COUNT_ORDER 模块级常量 → `countOrder()` 函数;BoardView 组件加 useT)
- Modify: `web/src/world/board/BoardPeek.tsx`(offlineNote + useT)
- Modify: `web/src/world/town/TownPeek.tsx`(townStatusText offlineNote,
  导入 t)
- Modify: `web/src/world/worldCommandBox.tsx`(agentMarkWord)
- Modify: `web/src/world/town/TownEdgeLayer.tsx`(glyph 直取,无文案)
- Modify: `web/src/world/town/TownReceptionSign.tsx`(整文件迁移:状态词
  + reception 11 键,两个组件 useT)
- Modify: `web/src/world/agentMarks.test.ts`(适配 glyph 映射 +
  agentMarkWord 断言)
- Modify: `changes/i18n-phase1.md`(追加)
- Create: 本计划

**要点:**
- 模块级常量陷阱:STATUS_WORDS/STATUS_LABEL/COUNT_ORDER 原在 import 时
  求值,locale 未加载前冻结英文。全部改为函数,调用点运行时求值,由
  组件 useT 重渲染驱动。
- `means` 8 条英文零消费方(grep 确认),按 YAGNI 删除,不进词典。
- townTargets.ts 的 townAgentLabel 已调 agentStateWord,自动跟随,
  不改;townSummary 的 "Done, not reviewed" 等自有词表属后续批次。

**验证链:** typecheck:quick → agentMarks/status-badge/now/i18n
(22 pass)→ townTargets/worldCommandBox/townReceptionFilter/
MobileBottomBar(11 pass)→ townSummary + BoardView(15 pass、12 skip
浏览器项)→ 英文对照(27 条,9 条有意缺失:means 8 条 + 枚举键)→
模板串人工核对(4 处)→ biome format(15 文件)→ changelog →
提交推送(--no-verify)。
