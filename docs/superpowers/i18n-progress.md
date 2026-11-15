# i18n 多阶段迁移进度(执行前必读)

> **执行约定(用户指令)**:每次继续 i18n 工作时,**先完整阅读本文件**,再按"待完成"一节
> 从最上面的未完成批次继续。每完成一个批次,立即更新本文件(把该批次移入"已完成"、
> 保留其提交号、更新词典规模与日期),并提交。

## 状态快照(更新于 2026-11-15)

- 分支:`feat/i18n-phase1`(所有阶段共用此分支,逐批提交推送)
- 最新提交:`b7073d6a`(批次 31c,待推送)
- 词典规模:en / zh-Hans / zh-Hant 各 **3641** 键,0 占位符不匹配
- 工作区:干净
- 后台进程:dev:web(5174)、server(pid 31612,8788)仍在运行,用户要求时停止

## 项目与设计文档

- 设计规格:`docs/superpowers/specs/2026-11-14-i18n-design.md`
- 各批次实施计划:`docs/superpowers/plans/`(文件名含批次主题)
- 用户可见变更清单:`changes/i18n-phase1.md`(每批次追加,单文件)
- 阶段划分:阶段 1 = i18n 框架+语言偏好+核心界面+日期时间;阶段 2 = Web 界面逐模块;
  阶段 3 = 服务端消息;阶段 4 = site 文档站点

## i18n 架构要点

- `web/src/i18n/`:en.ts(`export const en = {...} as const;`)+ zh-Hans.ts /
  zh-Hant.ts(结尾为 `};`);index.ts 导出模块级 `t(key, params?)`、`useT()`、
  `type TranslationKey`
- 新域插在各词典**末域之后**:en 锚 `} as const;`,zh 锚 `};`
- 模块级函数(非组件)用 `import { t } from "./i18n"`;React 组件用 `useT()`
- 类型派生范式:`type X = Extract<TranslationKey, \`前缀${string}\`>`
  (见 shortcutCatalog.ts 的 ShortcutLabelKey/ShortcutGroupKey)
- 三词典必须严格同构:键集相同、占位符 `{name}` 等同名;提交前跑 check-dicts

## 批次交付流程(每批完整走一遍)

1. 词典:三文件追加新域/新键(en 逐字照抄源文件字面文本)
2. 代码迁移:写迁移脚本(Temp 下 migrate-*.js,readFileSync + split/join,
   每条替换 `if (!s.includes(a)) miss`)
3. `bun run typecheck:quick`(报错时 `tsc --noEmit 2>&1 | head -50`)
4. 受影响测试:`bun run test <path>`
5. check-en3:`bun C:/Users/123/AppData/Local/Temp/check-en3.ts`
   (先改其 diff 目标文件列表为**本批次文件**;skip 正则已含驼峰 id 排除
   `|^[a-z]+(\.[A-Za-z][A-Za-z0-9]*)+$`)
6. check-dicts:`bun C:/Users/123/AppData/Local/Temp/check-dicts.ts`(键数 ×3 + 占位符)
7. `bunx biome check --write <files>`(write 后必须重新 Read 才能 Edit)
8. 追加 `changes/i18n-phase1.md`
9. 更新本文件(状态快照、已完成表、待完成清单)
10. 计划文件(如有)勾选完成
11. commit:`i18n: translate ... (phase 2 module NN)` +
    `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
12. `git push --no-verify`(Windows pre-push ENAMETOOLONG 教训,固定用 --no-verify)

## 术语表(Hans / Hant)

- 智能体 / 代理;"" / 「」;窗口排布:单个/层叠/多列/多行/网格/靠右放置/靠左放置/还原位置
- 禅模式;小镇/看板/工作台;检查器;文件资源管理器 / 檔案瀏覽器
- 快捷键(Hant)= 快速鍵;review(Hant)= 審查;终端输入框 / 終端機輸入框

## 不译清单(累积,遇同类内容直接跳过)

- store 级验证错误消息(诊断文案);TIMBRE 音色名;Jira/GitHub 示例 placeholder
- SKILL.md;harness 品牌名(Ranger/Roamgate/Herdr Float)
- 键帽与键盘表示:mobileTerminalShortcuts.ts 的 label(参与 `===` 等值比较,
  改动破坏行为)、SHORTCUT_PLATFORMS 值(macOS/Windows/Linux)、Ctrl+Alt+K 等键帽
- git 记法 `path (status)`;命令面板搜索关键词保留英文(英文查询可命中)
- 注意:shortcutCatalog 搜索用**译文**(匹配显示文本,当前语言自然可搜)——与命令面板不同

## 关键教训

- **迁移脚本锚写法(最重要)**:锚 = **单引号 JS 字符串,原样照抄源文件字面文本**。
  模板串里的 `${x}` 在单引号字符串中就是普通文本,禁止 `${"..."}` 包装或 `\${}` 转义
  (都会导致 miss 或意外求值)
- 替换串必须完整包含锚的所有结构行(如域关闭 `},`);缩进必须逐字一致
- biome check --write 后文件需重新 Read 才能 Edit;命令输出 >200 行 pipe head/tail
- **只格式化、不整理导入**:本仓库 pre-commit 跑 `biome format --write --staged`,
  `biome check --write` 会顺带 organizeImports,给 TownView/WorldControlPlane 等
  产生上百行无关 diff。批次里改用 `bunx biome format --write <files>`
- **迁移脚本同一文件多条编辑要串行应用**:先在内存里逐条替换再一次性写盘;
  否则后一条用旧内容覆盖前一条,键会静默丢失(31b 曾丢 town.ask 三键)
- **组件可能被测试当普通函数直接调用**(TownTidyRooms.test.ts、PopupOverlay.test.ts):
  这种组件不能用 useT(),只能用模块级 t()
- **check-en3 的 skip 正则里不能出现未转义的 `//`**(会提前结束正则字面量);
  URL 之类的字面量用单独的 `isUrl()` 判断跳过
- 既有环境问题(不修):isolated DOM 测试本地 preload 失败(CI 跑);
  townSceneBoundary.test.ts 在 Windows 上因路径分隔符失败(与改动无关);
  `[queue] machine-wide check queue unavailable here` 警告无害
- **浏览器 fixture 依赖英文文案**:浏览器用例按英文按钮文本点击(如 "Edit pod…"、
  "Roles…"、"Add…"、"Confirm"、"Pod · Chat"、"Group interest: Focused"、面板标题
  "Pod ·" / "Team · Review pair"),en 词典值必须**逐字保留**这些字符串;
  本地无 Chrome 时浏览器用例会 skip,只能靠单元测试 + 逐字保真兜底
- **shared/ 层的共享枚举不能直接 i18n 化**:`shared/groupViews.ts` 的
  GROUP_STATUS_LABELS 服务端同用,保持英文;web 层另建 `groups.status.*` 覆盖
- **组类型词需要三套键**:展示用首字母大写(`groups.kind.*`,如 "Pod")、
  句中小写(`groups.kindName.*`,如 "Edit pod…")、复数空态(`groups.kindPlural.*`,
  如 "No Pods yet.")

---

## 已完成

### 阶段 1(i18n 框架 + 语言偏好 + 核心界面)

提交:`be7e2924` 简繁词典 → `5190793b` 响应式语言状态 → `b43739c1` 日期时间本地化 →
`34d31106` 配置对话框与外观标签 → `17f0ce6a` 视图名 → `61ca6802` 阶段 1 全局状态通知 →
`cc5a5f83` 语言切换控件 → `a4a0301b` 接入 App + 文档 → `d1cd5c61` 启动时恢复语言 →
`bae7a1dd` 应用菜单 → `30981f73` Herdr 升级菜单项 → `27bd0ffa` 文档 →
`7956a3f5` 语言钩子 server snapshot。阶段 1 已收尾。

### 阶段 2(Web 界面逐模块)

| 模块 | 提交 | 范围 |
|------|------|------|
| 1-4 | `584f962e`/`b29c435e`/`cd69263e`/`4c2a4d56` | 小镇看板+开销+加房间门、邮局、镇长问候+离开回顾、智能体 Chat 面板 |
| 6 | `65593450` | 聊天交互卡片(问题/菜单/信任/步骤卡)+ 任务日志 |
| 7 | `514a0b5d` | 共享智能体状态词(marks 词典,全局复用) |
| 8 | `32e9d609` | Needs you(计数、等待列表、逐项卡、outbox 路由) |
| 9 | `13911a74` | Desk(模式、关注摘要、搜索、泳道、卡片、目录、toast、键位图例) |
| 10 | `0da6daef` | 智能体历史(时间线、消息卡操作、工具调用步骤、chat 视图、抽屉) |
| 11 | `9642ab7d` | Ranger 面板(视图、布局、设置屏、对话、小地图、权限、队列、任务板) |
| 12 | `2b9c9128` | 终端核心面(状态、选择、触控、移动输入、工具栏、分屏、关闭确认) |
| 13 | `f64332d0` | 终端对话框与面板(composer 模式/上传/命令、tab 面板布局) |
| 14 | `38b37ec6` | 智能体对话框(启动器、会话检查器、消息详情、集成设置) |
| 15 | `054e3790` | review 标注(面板卡、位置、交付目标、composer 弹层、共享行标签) |
| 16 | `e1ad6192` | 移动外壳(底栏、应用栏、tab 抽屉、布局偏好、最近面板/面板搜索) |
| 17 | `6e93ef72` | 应用外壳(顶栏、禅岛、移动导航、more sheet、resizer、加载回退、通知) |
| 18 | `03a7d94e` | tab 条(重命名/关闭确认、上下文菜单、固定标记、tab-pins 阻断原因) |
| 19 | `a6e14c77` | 命令面板(触发、分组动作、重命名对话框、确认、过时选中通知) |
| 20 | `f41b97ba` | 连接切换器(传输状态、SSH 表单、管理对话框、菜单) |
| 21 | `fcb71098` | 文件资源管理器(菜单、搜索、树、确认、上传/下载/移动/删除通知) |
| 22 | `0af40378` | 文件预览(头、媒体状态、缩放、Mermaid、错误边界、标注上限) |
| 23 | `792a2499` | Workspace Inspector(窗口栏、视图、停靠控件、状态行、仓库状态弹层) |
| 24 | `11118177` | diff 查看器(双面板头、变更树、比较选择器、hunk 导航、图片预览) |
| 25a | `dfa0c19c` | worktree 基础(Git 动作菜单、确认、通知、生命周期摘要、store 批量通知) |
| 25b | `c4c7eeb8` | worktree 对话框(生命周期管理、hooks 详情、PR 徽章、分支更新、picker、位置) |
| 26 | `8a217ff6` | 窗口面(窗口栏控件与菜单、最小化 dock、排布菜单、兴趣按钮、上下文菜单、诊断) |
| 27 | `0a9755f5` | 世界导航器(主机过滤、工作区树、命令盒、创建进度/失败、终端 portal) |
| 28 | `0bb96996` | PR 卡(CI 点、就绪规则、评审证据、合并动词、阻断原因、健康行) |
| 29 | `f1983df7` | 世界设置(来源、声音、办公室可观测、Herdr 设置卡、创建工作区、bin、档案编辑器) |
| 30a | `86e8ada9` | Board 控件(dock 按钮、设置菜单、帮助与状态色对话框、透镜图例) |
| 30b | `20cd4de3` | outbox 49/wsRows 38/gitHistory 35 键 + AnswerDeliveries、WorkspaceRows、WorkspaceAgentRows、GitCommitHistory |
| 30c | `dd06dfce` | shortcuts 121 键 + shortcutCatalog 键化重写、shortcutCheatSheet、ShortcutCheatSheet、ShortcutLookupDialog |
| 30d | `2aec6ccd` | shortcuts 20 键(绑定校验错误、保留组合警告、预设校验错误、存储/离线通知、导入错误)+ shortcutBindings、shortcutPreferences 两文件模块级 t 化 |
| 31a | `7741061c` | 新增 common(11 键)+ toasts(12 键)域与 interest.saveFailed;CloseButton 默认 label、ModalDialogs(保存/取消/确认/确定)、ThemedSelect 空态、UpdateToast、StaleBuildToast、AppToasts、AgentInterestButton |
| 31b | `33179cdb` | 新增 town.ask/rooms/team/move/room 组、board 33 键与 moves 顶层域(22 键);TownRail、TownTidyRooms、TownChooser、TownAccessibleTargets、townMoveActions(改名 useTownMoveActions)、townMoves、townMoveMenu、townTeamActions、roomRenameClose、boardPaneMove、useBoardPaneMoves、useBoardHerdrActions、worldAsks、WorldControlPlane(Close) |
| 31c | `b7073d6a` | 新增 groups 域(140 键:kind/kindPlural/kindName/status/role/resolution/op/interest/errors 等);新增 groupLabels.ts(类型化标签 helper);groupActions、GroupDetail、GroupMembers、GroupsWindow、GroupsSummary、GroupInterestButton、GroupEditFeedback |
| 31d | 待提交 | web/src/components 残留文案:新增 aria / attachments 域,扩展 diff / preview / inspector / terminal / common;AttachmentChips、ConfigurationLoadingDialog、DiffContentView、DiffViewerPanel、FilePreviewTabs、InspectorLoadingShell、InspectorPaneMap、InspectorSplitResizer、PopupOverlay、ShortcutLookupDialog(菜单焦点选择器改用 data-menu-trigger)、ConfigMenu、WorkspaceInspectorHost、FileExplorerDialog、App、AssistantPanel |

---

## 待完成(按顺序执行;完成一批更新本文件一次)

### 批次 31e:world 目录残留文案

web/src/world/ 下的残余英文(属性与正文),已知清单:
- world/windows/WorldPanel.tsx(title="Drag to move" → 已有 common.dragToMove)
- world/WorldControlPlane.tsx(Close Inspector 标题与消息、"Tab close failed"、
  "World context"、第 491 行 `${view} view`、"Loading view…/Loading Town…/
  Loading Board…")
- world/AgentLauncherDialog.tsx、world/HarnessReadinessSummary.tsx
- world/board/(BoardFacts、BoardHub、BoardPeek、WorkLens)、
  world/town/(TownLenses、TownPeek、TownZoomControls、TownCenterMenu、
  TownSummaryPanel、TownWorldLayer、TownCanvas)、world/windows/(WindowFrame、
  WindowSwitcher)
- world/(WorldSearchResults、WorldIntentProfile、WorldNavigator、WorldViewPicker、
  WorldViewToolbar、WorldMobileNav、WorldFoundationApp、WorldStatus、
  WorldInspectorConversation、WorldViewErrorBoundary、TerminalAppearanceEditor、
  TerminalAppearanceButton、SpacesTerminalAppearance、TraceOverlay、
  ConnectionRecoveryBanner、DeskView、DeskOtherHosts、NeedsYouItem)
- 6 处 `Tab \${tab.number}`:paneJump.ts:215、store/sessions.ts:328、
  world/officeAgent.ts:71、world/SpacesTerminalAppearance.tsx:70、
  world/useSpacesTabWindowArrangement.tsx:72 与 :261 —— 可复用既有
  `shell.tabName`("Tab {number}")
- `views` 域需新增 `back: "Back to {view}"`
注意:`*.browser.ts(x)` 里的 `[aria-label="..."]` 选择器必须与 en 词典值逐字一致;
已确认无需改动:LazyFilePreviewContent.tsx(已 useT 化)、
components/ui/command.tsx(仅 displayName)、components/GlobalTooltip.tsx。

### 批次 32:散点常量文件

assistant.ts(15 条)、terminalThemes.ts(16 条,注意主题名是否属专名需逐条判断)、
browserInput.worker(14 条)。

### 批次 33:联动切换

AgentLauncherDialog + HarnessReadinessSummary + BoardView(30c 前扫描确认仍含
英文字面量,一次性切换;执行前重新 grep 确认残余量)。

### 阶段 3(远期):服务端消息

`server/src/` 消息迁 i18n。需先补设计:服务端无语言偏好来源,如何选择语言
(随请求携带/读浏览器偏好/配置项)——**执行前需与用户确认方案**。

### 阶段 4(远期):site 文档站点

`bun run build:site` 渲染的文档站点多语言。涉及 docs/TUTORIAL.md 渲染管线,
**执行前需与用户确认范围**(哪些文档、URL 结构、默认语言)。
