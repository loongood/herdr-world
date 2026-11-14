# i18n 阶段 2 · 模块 1:应用菜单(ConfigMenu)翻译实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将应用菜单(ConfigMenu.tsx)与 Herdr 升级菜单条目(store/updates.ts)的全部用户可见文案接入阶段 1 的 i18n 框架,提供英文/简体/繁体三语。

**Architecture:** 复用 `web/src/i18n/` 既有框架(`useT()` / `t()` / 三语词典 / 编译期键校验)。新增顶级 `menu` 域;`store/updates.ts` 为纯逻辑模块,直接用 `t()`(非 hook)。状态值与动态键一律用显式映射表(阶段 1 的 `TAB_LABEL_KEYS` 模式),避免模板拼接拓宽字面量类型。

**Tech Stack:** Bun 1.4.4、React 19、自研 i18n(零依赖)、bun test + happy-dom。

## Global Constraints

- 不引入任何运行时依赖;中文无复数,`{count}` 插值即可。
- 术语遵循规格术语表:agent=智能体/智慧代理、terminal=终端/終端機、plugin=插件/外掛、session=会话/工作階段、Town=小镇/小鎮、Board=看板/看板。World 特有定名:Town master=镇长/鎮長、Zen mode=专注模式/專注模式、Inspector=检查器/檢查器。
- 简繁词典必须满足 `Dictionary` 类型(`WidenLeaves<typeof en>`),缺键/多键由 `bun run typecheck:quick` 拦截。
- 动态键禁止模板拼接(`t(`menu.${x}`)` 拓宽为 `menu.${string}`),必须 `as const satisfies Record<..., TranslationKey>` 显式映射。
- 浏览器套件(configuration.browser.tsx、paneJump.browser.tsx)按英文 aria-label 查找元素;它们运行于默认环境(navigator 英文、无存储偏好 → auto → en),翻译不得破坏其断言——迁移后运行这两个套件确认。
- 服务端来源文本(`s.updateInfo?.reason`、`herdrUpgrade` 之外的 API 文案)不在本批;`herdrUpgradeMenuEntry` 的文案生成于客户端(`web/src/store/updates.ts`),属于本批。
- 分支 `feat/i18n-phase1` 延续使用;changelog 更新既有 `changes/i18n-phase1.md` fragment(同一 PR)。
- 提交消息末尾附 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`;Windows 上 pre-push 钩子可能 ENAMETOOLONG,推送用 `git push --no-verify`(CI Delivery checks 兜底)。

---

### Task 1:三语词典新增 `menu` 域

**Files:**
- Modify: `web/src/i18n/en.ts`(status 域后新增)
- Modify: `web/src/i18n/zh-Hans.ts`(status 域后新增)
- Modify: `web/src/i18n/zh-Hant.ts`(status 域后新增)

**Interfaces:**
- Produces: `TranslationKey` 新增 `menu.*` 全部键(下方完整键表);Task 2、Task 3 按 `t("menu.xxx")` 消费。

- [ ] **Step 1:在 en.ts 的 `status` 域之后、`} as const` 之前插入 menu 域**

```ts
  menu: {
    trigger: "Menu",
    triggerUpdateAvailable: "Menu, update available",
    applicationMenu: "Application menu",
    showFewer: "Show fewer menu options",
    showMore: "Show more menu options",
    version: "Version {version}",
    build: "Build {build}",
    loadedBuild: "Loaded build",
    servedBy: "server serves {served}",
    statusPaused: "Paused",
    statusConnecting: "Connecting",
    statusConnected: "Connected",
    statusDisconnected: "Disconnected",
    clients: "{count} clients",
    clientsOne: "1 client",
    configuration: "Configuration",
    configurationDescription:
      "Appearance, behavior, connections, and agent integrations",
    shortcuts: "Shortcut cheat sheet",
    shortcutsDescription: "Read-only overview · {keys}",
    zenMode: "Zen mode",
    zenEnabled: "Enabled",
    zenDisabled: "Disabled",
    viewsTitle: "Views",
    inspectorOpening: "Inspector opening",
    inspectorOpeningDescription:
      "How a newly opened entity's Inspector appears",
    inspectorFloating: "Floating",
    inspectorDocked: "Snap right",
    agentsOpen: "Agents open",
    agentsOpenDescription:
      "What opening an agent shows: its Chat, or its terminal",
    agentsOpenChat: "Chat",
    agentsOpenTerminal: "Terminal",
    townMaster: "Town master",
    townMasterDescription:
      "The agent whose chat Town docks from the start; empty docks none",
    townCalm: "Town calm motion",
    townCalmDescription: "Less ambient motion and shorter camera moves",
    greeting: "Town Master greeting",
    greetingDescription:
      "Hello and what changed since you left, on each visit (Show this on start)",
    tabBadge: "Count on tab and app icon",
    tabBadgeDescription:
      "The browser tab and installed app show how many things need you (this browser)",
    eventTrace: "Town event trace",
    eventTraceDescription: "Development builds: record Town's input",
    agentProfiles: "Agent profiles",
    agentProfilesDescription:
      "Name, brain, skills, brief and look for new agents",
    sounds: "Sounds",
    soundsDescription:
      "Chimes for agents that need you, and the Town master",
    sources: "Sources",
    sourcesDescription:
      "GitHub pull requests and Jira tickets beside your agents",
    otelMetrics: "OTEL economy metrics",
    otelMetricsDescription:
      "Connect Prometheus to show cost on the Town board",
    helpTitle: "Help & updates",
    tutorial: "Tutorial",
    tutorialDescription: "Learn local work and private remote access",
    features: "Features and shortcuts",
    featuresDescription: "Browse features and keyboard bindings",
    troubleshooting: "Troubleshooting",
    troubleshootingDescription:
      "Resolve connection and deployment problems",
    reportIssue: "Report an issue",
    reportIssueDescription:
      "Report bugs or request improvements on GitHub",
    changelog: "Changelog",
    changelogDescription: "Recent changes on GitHub",
    reloadPage: "Reload page",
    reloadPageDescription: "Refresh the application",
    checkForUpdates: "Check for updates",
    checkForUpdatesDescription: "Refresh release availability",
    updating: "Updating...",
    upgradeTo: "Upgrade to {version}",
    installAndRestart: "Install and restart",
    checkReleaseServer: "Check the release server",
    updateUnavailable:
      "Automatic installation is unavailable. Use this installation's update channel.",
    runtimeTitle: "Runtime",
    herdrServer: "Herdr server",
    serverVersion: "Version {version}",
    serverUnavailable: "Unavailable",
    serverLoading: "Loading server information",
    protocol: "Protocol {protocol}",
    herdrUpdating: "Updating Herdr...",
    connectionDetails: "Connection details",
    url: "URL",
    socket: "Socket",
    loggingOut: "Logging out...",
    logOut: "Log out",
    logOutDescription: "End this browser session only",
    logoutError: "Could not log out. Check your connection and try again.",
    quickSettings: "Quick settings",
    upgrades: {
      herdrOutdated: "Upgrade Herdr to {version}",
      herdrOutdatedDescription:
        "Herdr {from} is installed or running; this release verified {version}",
      integrations: "Update Herdr integrations",
      integrationsDescription: "For this release: {names}",
      worldPlugin: "Herdr World plugin",
      harnessIntegration: "{name} harness integration",
    },
  },
```

- [ ] **Step 2:在 zh-Hans.ts 同位置插入简体(menu 域)**

```ts
  menu: {
    trigger: "菜单",
    triggerUpdateAvailable: "菜单,有可用更新",
    applicationMenu: "应用菜单",
    showFewer: "显示更少菜单项",
    showMore: "显示更多菜单项",
    version: "版本 {version}",
    build: "构建 {build}",
    loadedBuild: "已加载的构建",
    servedBy: "服务器实际提供 {served}",
    statusPaused: "已暂停",
    statusConnecting: "连接中",
    statusConnected: "已连接",
    statusDisconnected: "已断开",
    clients: "{count} 个客户端",
    clientsOne: "1 个客户端",
    configuration: "设置",
    configurationDescription: "外观、行为、连接与智能体集成",
    shortcuts: "快捷键速查表",
    shortcutsDescription: "只读总览 · {keys}",
    zenMode: "专注模式",
    zenEnabled: "已启用",
    zenDisabled: "已停用",
    viewsTitle: "视图",
    inspectorOpening: "检查器打开方式",
    inspectorOpeningDescription: "新打开实体的检查器如何显示",
    inspectorFloating: "浮动",
    inspectorDocked: "停靠右侧",
    agentsOpen: "智能体打开内容",
    agentsOpenDescription: "打开智能体时显示它的聊天还是终端",
    agentsOpenChat: "聊天",
    agentsOpenTerminal: "终端",
    townMaster: "镇长",
    townMasterDescription: "小镇启动时停靠其聊天的智能体;留空则不停靠",
    townCalm: "小镇平静动态",
    townCalmDescription: "减少环境动画并缩短镜头移动",
    greeting: "镇长问候",
    greetingDescription: "每次访问时问候并提示离开期间的变化(启动时显示)",
    tabBadge: "标签页与应用图标计数",
    tabBadgeDescription:
      "浏览器标签页和已安装应用显示待你处理的事项数(仅本浏览器)",
    eventTrace: "小镇事件跟踪",
    eventTraceDescription: "开发构建:记录小镇的输入",
    agentProfiles: "智能体档案",
    agentProfilesDescription: "为新智能体设置名字、大脑、技能、简介与外观",
    sounds: "声音",
    soundsDescription: "智能体需要你以及镇长时的提示音",
    sources: "来源",
    sourcesDescription: "智能体旁边的 GitHub 拉取请求与 Jira 工单",
    otelMetrics: "OTEL 经济指标",
    otelMetricsDescription: "连接 Prometheus 以在看板上显示成本",
    helpTitle: "帮助与更新",
    tutorial: "教程",
    tutorialDescription: "了解本地工作与私有远程访问",
    features: "功能与快捷键",
    featuresDescription: "浏览功能与按键绑定",
    troubleshooting: "故障排除",
    troubleshootingDescription: "解决连接与部署问题",
    reportIssue: "报告问题",
    reportIssueDescription: "在 GitHub 上报告缺陷或提出改进建议",
    changelog: "更新日志",
    changelogDescription: "GitHub 上的近期变更",
    reloadPage: "重新加载页面",
    reloadPageDescription: "刷新应用",
    checkForUpdates: "检查更新",
    checkForUpdatesDescription: "刷新发布可用性",
    updating: "更新中...",
    upgradeTo: "升级到 {version}",
    installAndRestart: "安装并重启",
    checkReleaseServer: "查询发布服务器",
    updateUnavailable: "无法自动安装。请使用此安装的更新渠道。",
    runtimeTitle: "运行时",
    herdrServer: "Herdr 服务器",
    serverVersion: "版本 {version}",
    serverUnavailable: "不可用",
    serverLoading: "正在加载服务器信息",
    protocol: "协议 {protocol}",
    herdrUpdating: "正在更新 Herdr...",
    connectionDetails: "连接详情",
    url: "URL",
    socket: "套接字",
    loggingOut: "正在退出登录...",
    logOut: "退出登录",
    logOutDescription: "仅结束此浏览器会话",
    logoutError: "无法退出登录。请检查连接后重试。",
    quickSettings: "快捷设置",
    upgrades: {
      herdrOutdated: "将 Herdr 升级到 {version}",
      herdrOutdatedDescription:
        "已安装或正在运行 Herdr {from};此发布已验证 {version}",
      integrations: "更新 Herdr 集成",
      integrationsDescription: "此发布包含:{names}",
      worldPlugin: "Herdr World 插件",
      harnessIntegration: "{name} harness 集成",
    },
  },
```

- [ ] **Step 3:在 zh-Hant.ts 同位置插入繁体(menu 域)**

```ts
  menu: {
    trigger: "選單",
    triggerUpdateAvailable: "選單,有可用更新",
    applicationMenu: "應用程式選單",
    showFewer: "顯示更少選單項目",
    showMore: "顯示更多選單項目",
    version: "版本 {version}",
    build: "建置 {build}",
    loadedBuild: "已載入的建置",
    servedBy: "伺服器實際提供 {served}",
    statusPaused: "已暫停",
    statusConnecting: "連線中",
    statusConnected: "已連線",
    statusDisconnected: "已中斷連線",
    clients: "{count} 個用戶端",
    clientsOne: "1 個用戶端",
    configuration: "設定",
    configurationDescription: "外觀、行為、連線與智慧代理整合",
    shortcuts: "快速鍵速查表",
    shortcutsDescription: "唯讀總覽 · {keys}",
    zenMode: "專注模式",
    zenEnabled: "已啟用",
    zenDisabled: "已停用",
    viewsTitle: "檢視",
    inspectorOpening: "檢查器開啟方式",
    inspectorOpeningDescription: "新開啟實體的檢查器如何顯示",
    inspectorFloating: "浮動",
    inspectorDocked: "停靠右側",
    agentsOpen: "智慧代理開啟內容",
    agentsOpenDescription: "開啟智慧代理時顯示它的聊天還是終端機",
    agentsOpenChat: "聊天",
    agentsOpenTerminal: "終端機",
    townMaster: "鎮長",
    townMasterDescription: "小鎮啟動時停靠其聊天的智慧代理;留空則不停靠",
    townCalm: "小鎮平靜動態",
    townCalmDescription: "減少環境動態並縮短鏡頭移動",
    greeting: "鎮長問候",
    greetingDescription: "每次造訪時問候並提示離開期間的變化(啟動時顯示)",
    tabBadge: "分頁與應用程式圖示計數",
    tabBadgeDescription:
      "瀏覽器分頁和已安裝應用程式顯示待你處理的事項數(僅此瀏覽器)",
    eventTrace: "小鎮事件追蹤",
    eventTraceDescription: "開發建置:記錄小鎮的輸入",
    agentProfiles: "智慧代理檔案",
    agentProfilesDescription: "為新智慧代理設定名字、大腦、技能、簡介與外觀",
    sounds: "音效",
    soundsDescription: "智慧代理需要你以及鎮長時的提示音",
    sources: "來源",
    sourcesDescription: "智慧代理旁邊的 GitHub Pull Request 與 Jira 工單",
    otelMetrics: "OTEL 經濟指標",
    otelMetricsDescription: "連接 Prometheus 以在看板上顯示成本",
    helpTitle: "說明與更新",
    tutorial: "教學",
    tutorialDescription: "了解本地工作與私有遠端存取",
    features: "功能與快速鍵",
    featuresDescription: "瀏覽功能與按鍵綁定",
    troubleshooting: "疑難排解",
    troubleshootingDescription: "解決連線與部署問題",
    reportIssue: "回報問題",
    reportIssueDescription: "在 GitHub 回報缺陷或提出改進建議",
    changelog: "更新日誌",
    changelogDescription: "GitHub 上的近期變更",
    reloadPage: "重新載入頁面",
    reloadPageDescription: "重新整理應用程式",
    checkForUpdates: "檢查更新",
    checkForUpdatesDescription: "重新整理發布可用性",
    updating: "更新中...",
    upgradeTo: "升級到 {version}",
    installAndRestart: "安裝並重新啟動",
    checkReleaseServer: "查詢發布伺服器",
    updateUnavailable: "無法自動安裝。請使用此安裝的更新通道。",
    runtimeTitle: "執行環境",
    herdrServer: "Herdr 伺服器",
    serverVersion: "版本 {version}",
    serverUnavailable: "無法使用",
    serverLoading: "正在載入伺服器資訊",
    protocol: "協定 {protocol}",
    herdrUpdating: "正在更新 Herdr...",
    connectionDetails: "連線詳情",
    url: "URL",
    socket: "通訊端",
    loggingOut: "正在登出...",
    logOut: "登出",
    logOutDescription: "僅結束此瀏覽器工作階段",
    logoutError: "無法登出。請檢查連線後再試。",
    quickSettings: "快速設定",
    upgrades: {
      herdrOutdated: "將 Herdr 升級到 {version}",
      herdrOutdatedDescription:
        "已安裝或正在執行 Herdr {from};此發布已驗證 {version}",
      integrations: "更新 Herdr 整合",
      integrationsDescription: "此發布包含:{names}",
      worldPlugin: "Herdr World 外掛",
      harnessIntegration: "{name} harness 整合",
    },
  },
```

- [ ] **Step 4:typecheck 验证三份词典键结构一致**

Run: `bun run typecheck:quick 2>&1 | tail -5`
Expected: 通过(缺键/多键会在此失败)。

---

### Task 2:迁移 ConfigMenu.tsx

**Files:**
- Modify: `web/src/components/ConfigMenu.tsx`

**Interfaces:**
- Consumes: Task 1 的 `menu.*` 键、阶段 1 的 `config.tabs.*` 键、`useT()`(web/src/i18n)、`ConnectionStatus`(web/src/api)、`TranslationKey`(web/src/i18n/en)。

- [ ] **Step 1:新增导入与模块级映射表**

导入区(第 48 行 `useConnectionClient` 之后)加:

```ts
import { type ConnectionStatus } from "../api";
import { t, useT } from "../i18n";
import type { TranslationKey } from "../i18n/en";
```

`CONFIG_MENU_ID` 定义(第 74 行)之后加模块级常量:

```ts
/** Connection status values shown verbatim in the menu summary. */
const STATUS_LABEL_KEYS = {
  connecting: "menu.statusConnecting",
  connected: "menu.statusConnected",
  disconnected: "menu.statusDisconnected",
} as const satisfies Record<ConnectionStatus, TranslationKey>;

/** Quick settings open the matching Configuration tab; labels reuse its keys. */
const QUICK_SETTING_LABEL_KEYS = {
  Appearance: "config.tabs.appearance",
  Behavior: "config.tabs.behavior",
  Connection: "config.tabs.connection",
  Integrations: "config.tabs.integrations",
} as const satisfies Record<
  "Appearance" | "Behavior" | "Connection" | "Integrations",
  TranslationKey
>;
```

注意:Quick settings 数组不含 `Instance` 标签页,键联合显式列出这四个(不能在 `satisfies` 里引用 `typeof` 自身,会循环报错)。

- [ ] **Step 2:组件体内取 `t`**

`ConfigMenu` 函数体开头(`const build = useBuildFreshness();` 之后)加:

```ts
  const t = useT();
```

- [ ] **Step 3:触发按钮与抽屉壳**

替换第 262 行 aria-label 与第 268 行按钮文本:

```tsx
          aria-label={
            updateAvailable ? t("menu.triggerUpdateAvailable") : t("menu.trigger")
          }
```

```tsx
          <span className="menu-button-label">{t("menu.trigger")}</span>
```

替换第 278 行 `aria-label="Application menu"`:

```tsx
            aria-label={t("menu.applicationMenu")}
```

替换第 280-289 行 MobileSheetHandle 的 label:

```tsx
            <MobileSheetHandle
              label={expanded ? t("menu.showFewer") : t("menu.showMore")}
```

- [ ] **Step 4:摘要区(Version / Build / 状态 / 客户端数)**

替换第 293-312 行 `<strong>Herdr World</strong>` 到状态 span 的内容(产品名 Herdr World 不译):

```tsx
                  <strong>Herdr World</strong>
                  <span>{t("menu.version", { version: APP_VERSION })}</span>
                  {build.loaded ? (
                    <span className="config-build" title={t("menu.loadedBuild")}>
                      {t("menu.build", { build: build.loaded })}
                      {isStaleBuild(build)
                        ? ` · ${t("menu.servedBy", { served: build.served })}`
                        : ""}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`config-connection-summary status-${s.connectionPaused ? "paused" : s.status}`}
                >
                  <span className="status-dot" />
                  {s.connectionPaused
                    ? t("menu.statusPaused")
                    : t(STATUS_LABEL_KEYS[s.status])}
                  {typeof clientCount === "number"
                    ? ` · ${
                        clientCount === 1
                          ? t("menu.clientsOne")
                          : t("menu.clients", { count: clientCount })
                      }`
                    : ""}
                </span>
```

- [ ] **Step 5:Configuration / Shortcut / Zen 行**

替换第 315-335 行两个 ConfigMenuItem 的 label/description:

```tsx
                <ConfigMenuItem
                  icon={<Settings size={15} />}
                  label={t("menu.configuration")}
                  description={t("menu.configurationDescription")}
                  className="config-menu-item-row"
                  onClick={() => {
                    setOpen(false);
                    setConfigurationTab("Appearance");
                  }}
                />
                {layout.mobile ? null : (
                  <ConfigMenuItem
                    icon={<Keyboard size={15} />}
                    label={t("menu.shortcuts")}
                    description={t("menu.shortcutsDescription", {
                      keys: shortcutLabel("shortcuts.show"),
                    })}
                    className="config-menu-item-row"
                    onClick={() => {
                      setOpen(false);
                      onShowShortcuts();
                    }}
                  />
                )}
```

替换第 343-354 行 Zen mode 行的文案:

```tsx
                      <strong>{t("menu.zenMode")}</strong>
                      <span>
                        {zenMode ? t("menu.zenEnabled") : t("menu.zenDisabled")}
                        {layout.mobile
                          ? ""
                          : ` · ${shortcutLabel("zen.toggle")}`}
                      </span>
```

和第 354 行 `aria-label="Zen mode"` → `aria-label={t("menu.zenMode")}`。

- [ ] **Step 6:Views 区(标题 + 七个偏好行 + 三个入口)**

第 368 行 `<div className="config-title">Views</div>` → `<div className="config-title">{t("menu.viewsTitle")}</div>`。

Inspector opening 行(第 374-390 行):

```tsx
                    <strong>{t("menu.inspectorOpening")}</strong>
                    <span>{t("menu.inspectorOpeningDescription")}</span>
                  </span>
                  <select
                    className="config-preference-select"
                    aria-label={t("menu.inspectorOpening")}
                    value={officePreferences.inspectorPresentation}
                    onChange={(event) =>
                      updateOfficePreferences({
                        inspectorPresentation: event.target
                          .value as OfficePreferences["inspectorPresentation"],
                      })
                    }
                  >
                    <option value="floating">{t("menu.inspectorFloating")}</option>
                    <option value="docked">{t("menu.inspectorDocked")}</option>
                  </select>
```

Agents open 行(第 397-415 行):`<strong>{t("menu.agentsOpen")}</strong>`、`<span>{t("menu.agentsOpenDescription")}</span>`、`aria-label={t("menu.agentsOpen")}`、`<option value="chat">{t("menu.agentsOpenChat")}</option>`、`<option value="terminal">{t("menu.agentsOpenTerminal")}</option>`。

Town master 行(第 422-430 行):`<strong>{t("menu.townMaster")}</strong>`、`<span>{t("menu.townMasterDescription")}</span>`、`aria-label={t("menu.townMaster")}`(input 的 value 是智能体名,不译)。

Town calm motion 行(第 450-456 行):`<strong>{t("menu.townCalm")}</strong>`、`<span>{t("menu.townCalmDescription")}</span>`、`aria-label={t("menu.townCalm")}`。

Town Master greeting 行(第 476-485 行):`<strong>{t("menu.greeting")}</strong>`、`<span>{t("menu.greetingDescription")}</span>`、`aria-label={t("menu.greeting")}`。

Count on tab 行(第 505-514 行):`<strong>{t("menu.tabBadge")}</strong>`、`<span>{t("menu.tabBadgeDescription")}</span>`、`aria-label={t("menu.tabBadge")}`。

Town event trace 行(第 535-541 行):`<strong>{t("menu.eventTrace")}</strong>`、`<span>{t("menu.eventTraceDescription")}</span>`、`aria-label={t("menu.eventTrace")}`。

三个入口(Agent profiles / Sounds / Sources / OTEL,第 556-602 行):label/description 分别换为 `t("menu.agentProfiles")` / `t("menu.agentProfilesDescription")`、`t("menu.sounds")` / `t("menu.soundsDescription")`、`t("menu.sources")` / `t("menu.sourcesDescription")`、`t("menu.otelMetrics")` / `t("menu.otelMetricsDescription")`。

- [ ] **Step 7:Help & updates 区**

第 606 行标题 → `{t("menu.helpTitle")}`。替换第 607-640 行链接数组为键引用结构(`as const satisfies` 保证键存在,避免模板拼接拓宽):

```tsx
                {[
                  {
                    labelKey: "menu.tutorial",
                    descriptionKey: "menu.tutorialDescription",
                    url: "https://herdr.world/tutorial/",
                  },
                  {
                    labelKey: "menu.features",
                    descriptionKey: "menu.featuresDescription",
                    url: "https://github.com/IvoryHeart/herdr-world/blob/main/FEATURES.md",
                  },
                  {
                    labelKey: "menu.troubleshooting",
                    descriptionKey: "menu.troubleshootingDescription",
                    url: "https://github.com/IvoryHeart/herdr-world/blob/main/docs/DEPLOYMENT.md#troubleshooting",
                  },
                  {
                    labelKey: "menu.reportIssue",
                    descriptionKey: "menu.reportIssueDescription",
                    url: "https://github.com/IvoryHeart/herdr-world/issues",
                  },
                ].map(({ labelKey, descriptionKey, url }) => (
                  <ConfigMenuItem
                    key={labelKey}
                    icon={<ExternalLink size={15} />}
                    label={t(labelKey)}
                    description={t(descriptionKey)}
                    onClick={() => {
                      setOpen(false);
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  />
                ))}
```

Changelog(第 643-644 行):`label={t("menu.changelog")}`、`description={t("menu.changelogDescription")}`。
Reload page(第 652-653 行):`label={t("menu.reloadPage")}`、`description={t("menu.reloadPageDescription")}`。

更新项(第 659-702 行)三元文案:

```tsx
                  label={
                    updateAvailable
                      ? s.updateInstalling
                        ? t("menu.updating")
                        : t("menu.upgradeTo", { version: updateVersion ?? "" })
                      : t("menu.checkForUpdates")
                  }
                  description={
                    canInstallUpdate
                      ? t("menu.installAndRestart")
                      : updateAvailable
                        ? undefined
                        : t("menu.checkReleaseServer")
                  }
```

updateVersion 为 `string | undefined`,插值按原 `${updateVersion}` 行为用 `?? ""` 兜底(该分支仅在 updateAvailable 时渲染,实际总有值)。
第二个 "Check for updates"(第 688-689 行):`label={t("menu.checkForUpdates")}`、`description={t("menu.checkForUpdatesDescription")}`。
更新原因兜底(第 700 行):`s.updateInfo?.reason ?? t("menu.updateUnavailable")`(reason 是服务端文本,保持原文显示)。

- [ ] **Step 8:Runtime 区与登出**

第 705 行标题 → `{t("menu.runtimeTitle")}`。
Herdr server 行(第 711-724 行):

```tsx
                    <strong>{t("menu.herdrServer")}</strong>
                    <span>
                      {herdrInfo?.version
                        ? t("menu.serverVersion", { version: herdrInfo.version })
                        : herdrUnavailable
                          ? t("menu.serverUnavailable")
                          : t("menu.serverLoading")}
                    </span>
                  </div>
                  <code>
                    {typeof herdrInfo?.protocol === "number"
                      ? t("menu.protocol", { protocol: herdrInfo.protocol })
                      : "-"}
                  </code>
```

Herdr 升级项(第 730-734 行):`label={s.herdrUpgrading ? t("menu.herdrUpdating") : herdrUpgrade.label}`(herdrUpgrade.label/description 来自 Task 3 的 t() 生成,此处不动)。
Connection details(第 762 行):`<span>{t("menu.connectionDetails")}</span>`。
ConfigRow(第 771-772 行):`<ConfigRow label={t("menu.url")} value={location.origin} />`、`<ConfigRow label={t("menu.socket")} value={health?.socket ?? "-"} />`。
登出项(第 780-794 行):`label={loggingOut ? t("menu.loggingOut") : t("menu.logOut")}`、`description={t("menu.logOutDescription")}`、catch 中 `setLogoutError(t("menu.logoutError"))`。

- [ ] **Step 9:Quick settings 复用 config.tabs 键**

替换第 809-826 行:

```tsx
                      {(
                        [
                          ["Appearance", Palette],
                          ["Behavior", SlidersHorizontal],
                          ["Connection", Server],
                          ["Integrations", Plug],
                        ] as const
                      ).map(([name, Icon]) => (
                        <ConfigMenuItem
                          key={name}
                          icon={<Icon size={15} />}
                          label={t(QUICK_SETTING_LABEL_KEYS[name])}
                          onClick={() => {
                            setOpen(false);
                            setConfigurationTab(name);
                          }}
                        />
                      ))}
```

第 808 行 `<div className="config-title">Quick settings</div>` → `{t("menu.quickSettings")}`。

- [ ] **Step 10:验证**

Run: `bun run typecheck:quick 2>&1 | tail -5` → 通过。
Run: `bun run test web/src/components/ConfigMenu.test.ts 2>&1 | tail -6` → 通过(只测 reloadApplicationPage,不受文案影响)。
Run: `bun run test web/src/configuration.browser.tsx 2>&1 | tail -15` → 通过(默认英文 locale,aria-label 断言不变)。

- [ ] **Step 11:提交**

```bash
git add web/src/i18n/en.ts web/src/i18n/zh-Hans.ts web/src/i18n/zh-Hant.ts web/src/components/ConfigMenu.tsx
git commit -m "feat(web): translate the application menu into Chinese"
```

(附 Co-Authored-By 尾行。)

---

### Task 3:Herdr 升级菜单条目(store/updates.ts)

**Files:**
- Modify: `web/src/store/updates.ts:130-153`

**Interfaces:**
- Consumes: Task 1 的 `menu.upgrades.*` 键、`t()`(web/src/i18n)。
- Produces: `herdrUpgradeMenuEntry` 返回值仍为 `{ label: string; description: string }`,签名不变;ConfigMenu 无需改动。

- [ ] **Step 1:导入 t 并翻译两个返回分支**

文件顶部导入区加 `import { t } from "../i18n";`。替换 `herdrUpgradeMenuEntry` 函数体:

```ts
export function herdrUpgradeMenuEntry(status: {
  version?: string;
  verified_version?: string;
  upgrade?: HerdrStatusUpgrade;
}): { label: string; description: string } {
  const upgrade = status.upgrade;
  if (upgrade?.state === "outdated" || upgrade?.server_outdated) {
    const from =
      upgrade.state === "outdated" ? upgrade.version : status.version;
    return {
      label: t("menu.upgrades.herdrOutdated", {
        version: status.verified_version ?? "",
      }),
      description: t("menu.upgrades.herdrOutdatedDescription", {
        from: from ?? "",
        version: status.verified_version ?? "",
      }),
    };
  }
  const names = (upgrade?.pending ?? []).map((item) =>
    item === WORLD_PLUGIN_ID
      ? t("menu.upgrades.worldPlugin")
      : t("menu.upgrades.harnessIntegration", { name: item }),
  );
  return {
    label: t("menu.upgrades.integrations"),
    description: t("menu.upgrades.integrationsDescription", {
      names: names.join(", "),
    }),
  };
}
```

`?? ""` 与原模板对 undefined 的行为略有差异(`undefined` → 空),由调用方 `herdrUpgradeOffered` 保证该分支 verified_version 存在,不影响实际显示。

- [ ] **Step 2:验证并提交**

Run: `bun run typecheck:quick 2>&1 | tail -5` → 通过。
Run: `bun run test web/src/store 2>&1 | tail -6` → 通过。

```bash
git add web/src/store/updates.ts
git commit -m "feat(web): translate the Herdr upgrade menu entry"
```

---

### Task 4:changelog、文档评估与整体验证

**Files:**
- Modify: `changes/i18n-phase1.md`(同一 PR 的既有 fragment,追加菜单条目)

- [ ] **Step 1:扩展 changelog fragment**

在既有 bullet 后追加:

```markdown
- The application menu (Zen mode, view preferences, help links, runtime and
  logout) and the Herdr upgrade entry follow the selected language as well.
```

- [ ] **Step 2:文档评估**

无新控件、无行为变化——FEATURES.md 的菜单控件描述(键位、开关语义)保持准确,不更新;教程步骤未变,`build:site` 不需重跑。在交付说明中写明此结论。

- [ ] **Step 3:整体验证**

Run: `bun run test web/src/i18n 2>&1 | tail -6` → 通过。
Run: `bun run test web/src/components/ConfigMenu.test.ts 2>&1 | tail -6` → 通过。
Run: `bun run test web/src/configuration.browser.tsx 2>&1 | tail -15` → 通过。
Run: `bun run test web/src/paneJump.browser.tsx 2>&1 | tail -15` → 通过(断言 `aria-label="Shortcut cheat sheet"` 的元素消失路径,默认英文)。
Run: `bun run typecheck:quick 2>&1 | tail -5` → 通过。
Run: `bunx biome check web/src/i18n web/src/components/ConfigMenu.tsx web/src/store/updates.ts changes/i18n-phase1.md 2>&1 | tail -10` → 无错误(必要时 `biome format --write`)。

- [ ] **Step 4:提交并推送**

```bash
git add changes/i18n-phase1.md docs/superpowers/plans/2026-11-14-i18n-phase2-config-menu.md
git commit -m "docs: note the translated application menu in the changelog fragment"
git push --no-verify origin feat/i18n-phase1
```

- [ ] **Step 5:用户浏览器验证**

在 http://localhost:5174 硬刷新,切换语言,确认菜单(Zen mode、Views 偏好行、帮助链接、Runtime、登出)随语言切换。
