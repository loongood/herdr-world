# i18n 阶段 2 · 模块 6:聊天交互卡片与任务日志

模块 6/6(阶段 2 聊天部分):范围:`web/src/components/chat/blocks/`
(ask/menu/after/trust/steps/command)、`web/src/components/chat/
ChatComposerTools.tsx`、`web/src/components/QuestLog.tsx` 与
`web/src/world/agentQuests.ts`。agentMarks.ts 共享状态词表(10 个消费方)
留模块 7;ChatComposer.tsx 零文案(委托 TerminalComposer,属终端批次);
now.ts 的 elapsed("45s"/"3m 05s")数字单位语言无关,不改。

**Files:**
- Modify: `web/src/i18n/en.ts`(chat 域追加约 60 键;新增顶级域
  `quest` 16 键)
- Modify: `web/src/i18n/zh-Hans.ts`、`web/src/i18n/zh-Hant.ts`(同步)
- Modify: `web/src/world/agentQuests.ts`(`QUEST_SOURCE_LABELS` 导出删除,
  改 `QUEST_SOURCE_KEYS` + `questSourceLabel()`;`questProgressText` 用
  t(),Town pennant 自动跟随)
- Modify: `web/src/components/chat/blocks/ask.tsx`(`UNCONFIRMED` →
  `UNCONFIRMED_KEYS` 映射,AskCard/AskedQuestions 全键化)
- Modify: `web/src/components/chat/blocks/menu.tsx`(MenuCard 全键化;
  菜单选项/控件标签是服务端文本,保留)
- Modify: `web/src/components/chat/blocks/after.tsx`(回执行、tooSmall、
  Open Terminal 按钮)
- Modify: `web/src/components/chat/blocks/trust.tsx`(chooseTrust 纯函数
  用导入的 t();TrustCard 全键化)
- Modify: `web/src/components/chat/blocks/steps.tsx`(测试徽章/条、diff
  aria、截断行)
- Modify: `web/src/components/chat/blocks/command.tsx`(回执状态词、Dismiss)
- Modify: `web/src/components/chat/ChatComposerTools.tsx`(更多控件浮层)
- Modify: `web/src/components/QuestLog.tsx`(`STATUS_WORDS` →
  `STATUS_KEYS`;chip/log/origin/进度条 aria)
- Modify: `changes/i18n-phase1.md`(追加)
- Create: 本计划

**要点:**
- 组件一律 `useT()`;`chooseTrust`、`questSourceLabel`、`questOrigin`
  是模块级纯函数,用导入的 `t()`(运行时读当前 locale)。
- 键映射模式:`as const satisfies Record<Type, TranslationKey>`
  (QUEST_SOURCE_KEYS、UNCONFIRMED_KEYS、STATUS_KEYS)。
- menuNote 的 `<q>{footer}</q>` 结构改为参数化(footer 作为 {footer}
  占位,引号在译文里保留);英文原文 footer 带 `<q>` 元素,参数化后
  译文用中文引号包裹(简“”繁「」)。
- trustSentUnconfirmed 同理带 {label},简体花引号、繁体「」。

**验证链:** typecheck:quick → QuestLog/agentQuests/townQuestPennant/
askAttachments 测试(30 pass)→ chat 目录纯逻辑(24 pass)→ i18n 套件 →
英文对照(check-en3.ts 改 chat/blocks 等目标,54 条全部在 en.ts;6 条
CSS 类名/枚举值加入 skip)→ 模板串人工核对(8 处)→ biome format
(仅手改 9 文件)→ changelog → 提交推送(--no-verify)。
