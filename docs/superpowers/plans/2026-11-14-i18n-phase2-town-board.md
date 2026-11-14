# i18n 阶段 2 · 模块 2:Town 看板与门牌实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Town 看板(TownBoard 树:计数、经济、燃料额度)、Add room 门牌的全部用户可见文案接入 i18n;重置时间跟随界面语言。

**Architecture:** 复用 `web/src/i18n/` 框架。新增顶级 `town` 域(含 `town.caveat.*`、`town.fuel.*` 子域)。纯逻辑模块(townLimits.ts、townExpenses.ts)直接用 `t()`(同 store/updates.ts 模式);组件用 `useT()`。`townResetTime` 改走 format.ts 新增的 `formatWeekdayTime()`(跟随界面语言)。英文复数句用四键人口句 + One/Many 名词键;中文各键同型(无复数)。

**Tech Stack:** Bun、React 19、自研 i18n、bun test。

## Global Constraints

- 英文文案从源文件逐字保留(迁移后用 `git diff main -- <file>` 提取被删字符串对照 en.ts 验证)。
- 术语:agent=智能体/智慧代理、host=主机/主機、fuel(订阅额度)=额度/額度、Town=小镇/小鎮、Board=看板/看板、room=房间/房間。
- 标识牌风格文本(TOWN BOARD、FUEL、ECONOMY TODAY)译为中文词组,保持短横大写风格在中文中自然(小镇看板、额度、今日经济)。
- `usageStopText`(shared/usageStop)是共享层文本,属阶段 3,本批不动;`townUsd`/`formatOfficeUsage` 数字格式化不动。
- 动态键禁模板拼接;复数选择在调用代码显式分支。
- 分支 `feat/i18n-phase1`;changelog 更新 `changes/i18n-phase1.md`。
- 提交附 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`;推送 `--no-verify`。

---

### Task 1:`town` 域三语词典 + formatWeekdayTime

**Files:**
- Modify: `web/src/i18n/en.ts`、`web/src/i18n/zh-Hans.ts`、`web/src/i18n/zh-Hant.ts`(menu 域后追加 town 域)
- Modify: `web/src/i18n/format.ts`(新增 formatWeekdayTime)

**Interfaces:**
- Produces: `town.*` 全部键(Task 2-4 消费);`formatWeekdayTime(timestamp)`(Task 2 消费)。

- [ ] **Step 1:format.ts 末尾新增**(formatDateTime 之后)

```ts
/** "Tue 14:00" in the interface language: a limit window's reset moment. */
export function formatWeekdayTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return dateTimeFormatter({
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
```

- [ ] **Step 2:en.ts 的 menu 域后插入 town 域**

```ts
  town: {
    board: "Town board",
    summary: "Town summary",
    openSummaryTitle: "Open the Town summary",
    hideBoardTitle: "Hide the Town board",
    showBoardTitle: "Show the Town board",
    boardTitle: "TOWN BOARD",
    summaryButton: "Summary",
    countBusy: "Busy",
    countWaiting: "Waiting",
    countDone: "Done",
    countQuiet: "Quiet",
    summaryCounts:
      "{working} working, {needsYou} need you, {finished} done, {quiet} quiet",
    outOfFuelTail: ", {count} out of fuel",
    unknownTail: " · {count} unknown",
    agentsOne: "1 agent",
    agentsMany: "{agents} agents",
    populationOneOne: "1 agent in 1 building",
    populationOneMany: "1 agent in {buildings} buildings",
    populationManyOne: "{agents} agents in 1 building",
    populationManyMany: "{agents} agents in {buildings} buildings",
    economyLabel: "ECONOMY",
    economyToday: "ECONOMY TODAY",
    economyTodayUtcTest: "ECONOMY TODAY · UTC · TEST DATA",
    economyTodayUtcHarness: "ECONOMY TODAY · UTC · HARNESS LOGS",
    tokensCount: "{tokens} tokens",
    tokensWithCost: "{tokens} tokens · {cost}",
    readingUsage: "Reading usage…",
    usageStale: "Usage is out of date.",
    noHostUsage: "No usage data from hosts.",
    usageUnavailable: "Usage unavailable",
    placeLoading: "Reading today's usage…",
    placeUnavailable: "Usage is unavailable right now.",
    placeStale: "Usage is out of date: it could not be refreshed.",
    placeNone: "No usage recorded here today.",
    placeNoData: "No usage data from this host.",
    placeLimited:
      "Place detail limited; usage is included in city and building totals.",
    estCost: "{usd} est.",
    noneRecorded: "none recorded",
    priceNoteNoTable: "no price table",
    priceNoteUnpriced: "some models unpriced",
    unattributedNote: "{tokens} unattributed (included)",
    notesDetailsLimited:
      "detail list limited; totals include all collected usage",
    notesStaleLeftOut: "stale data left out",
    notesNoDataHostsOne: "no data from 1 host",
    notesNoDataHosts: "no data from {count} hosts",
    aboutFigures: "About these figures",
    windowToday: "Today",
    window7d: "7 days",
    hostsOne: "1 host",
    hostsMany: "{count} hosts",
    addRoom: "Add room",
    addRoomTo: "Add room to {host}",
    caveat: {
      testDataShort: "TEST DATA",
      testDataExplain:
        "Test data: a synthetic economy for this preview, not your harness logs.",
      partialShort: "partial",
      partialExplain:
        "Partial: a harness was read only in part, or the read was cut short, so the figures may be low.",
      staleShort: "stale left out",
      staleExplain:
        "Stale data left out: numbers that could not be refreshed are not in the totals.",
      hostsMissingShort: "{hosts} missing",
      hostsMissingExplain:
        "No data from {hosts}: harness logs could not be read there. Missing, not zero.",
      unattributedExplainPane:
        "{tokens} tokens unattributed: usage not tied to an agent's pane. Already included in the total, not another charge.",
      unattributedExplainRoom:
        "{tokens} tokens unattributed: usage not tied to one of its rooms. Already included in the total, not another charge.",
      detailsLimitedExplain:
        "Detail list limited: fewer entries were listed, but the totals include all collected usage.",
    },
    fuel: {
      groupLabel: "Subscription limits",
      title: "FUEL",
      week: "week",
      day: "day",
      days: "{count} d",
      hours: "{count} h",
      minutes: "{count} min",
      limitReached: "limit reached",
      windowLimitReached: "{label} limit reached",
      percentLeft: "{label} {left} % left",
      percentLeftLow: "{label} {left} % left, low",
      resets: "resets {time}",
      resetsTail: ", resets {time}",
      resetUnknown: "{label} reset unknown",
      stale: "stale",
      staleWindow: "{label} stale",
      staleDetail: "stale: last {levels}",
      seen: "seen {age}",
      seenJustNow: "just now",
      seenMinutes: "{count} min ago",
      seenHours: "{count} h ago",
      seenDays: "{count} d ago",
      nameLimits: "{name} limits: {windows}",
      notAvailable: "not available",
      limitsNotAvailable: "{name} limits not available: {reason}",
      limitsNotAvailableDetail: "Limits not available: {reason}",
      reached: "reached",
      lowTail: ", low",
      percentValue: "{left}%",
    },
  },
```

- [ ] **Step 3:zh-Hans.ts 同位置插入简体**

```ts
  town: {
    board: "小镇看板",
    summary: "小镇总览",
    openSummaryTitle: "打开小镇总览",
    hideBoardTitle: "收起小镇看板",
    showBoardTitle: "展开小镇看板",
    boardTitle: "小镇看板",
    summaryButton: "总览",
    countBusy: "忙碌",
    countWaiting: "等待",
    countDone: "完成",
    countQuiet: "空闲",
    summaryCounts:
      "{working} 个工作中,{needsYou} 个需要你,{finished} 个已完成,{quiet} 个空闲",
    outOfFuelTail: ",{count} 个额度耗尽",
    unknownTail: " · {count} 未知",
    agentsOne: "1 个智能体",
    agentsMany: "{agents} 个智能体",
    populationOneOne: "1 个智能体在 1 栋建筑中",
    populationOneMany: "1 个智能体在 {buildings} 栋建筑中",
    populationManyOne: "{agents} 个智能体在 1 栋建筑中",
    populationManyMany: "{agents} 个智能体在 {buildings} 栋建筑中",
    economyLabel: "经济",
    economyToday: "今日经济",
    economyTodayUtcTest: "今日经济 · UTC · 测试数据",
    economyTodayUtcHarness: "今日经济 · UTC · 智能体日志",
    tokensCount: "{tokens} token",
    tokensWithCost: "{tokens} token · {cost}",
    readingUsage: "正在读取用量…",
    usageStale: "用量已过期。",
    noHostUsage: "主机没有用量数据。",
    usageUnavailable: "用量不可用",
    placeLoading: "正在读取今日用量…",
    placeUnavailable: "用量目前不可用。",
    placeStale: "用量已过期:无法刷新。",
    placeNone: "此处今日无用量记录。",
    placeNoData: "此主机没有用量数据。",
    placeLimited: "场所明细受限;用量已计入城市与建筑总计。",
    estCost: "{usd} 估算",
    noneRecorded: "无记录",
    priceNoteNoTable: "无价格表",
    priceNoteUnpriced: "部分模型未定价",
    unattributedNote: "{tokens} 未归属(已计入)",
    notesDetailsLimited: "明细列表受限;总计包含全部已采集用量",
    notesStaleLeftOut: "已排除过期数据",
    notesNoDataHostsOne: "1 台主机无数据",
    notesNoDataHosts: "{count} 台主机无数据",
    aboutFigures: "关于这些数字",
    windowToday: "今日",
    window7d: "7 天",
    hostsOne: "1 台主机",
    hostsMany: "{count} 台主机",
    addRoom: "添加房间",
    addRoomTo: "为 {host} 添加房间",
    caveat: {
      testDataShort: "测试数据",
      testDataExplain: "测试数据:此预览用合成经济数据,并非你的智能体日志。",
      partialShort: "部分读取",
      partialExplain:
        "部分读取:某个智能体只读取了一部分,或读取被中断,数字可能偏低。",
      staleShort: "已排除过期数据",
      staleExplain: "已排除过期数据:无法刷新的数字不计入总计。",
      hostsMissingShort: "缺少 {hosts}",
      hostsMissingExplain:
        "{hosts} 无数据:无法读取其智能体日志。是缺失,不是零。",
      unattributedExplainPane:
        "{tokens} token 未归属:用量未关联到某个智能体的窗格。已计入总计,不是额外计费。",
      unattributedExplainRoom:
        "{tokens} token 未归属:用量未关联到它的某个房间。已计入总计,不是额外计费。",
      detailsLimitedExplain:
        "明细列表受限:列出的条目较少,但总计包含全部已采集用量。",
    },
    fuel: {
      groupLabel: "订阅额度",
      title: "额度",
      week: "周",
      day: "天",
      days: "{count} 天",
      hours: "{count} 小时",
      minutes: "{count} 分钟",
      limitReached: "已达上限",
      windowLimitReached: "{label}已达上限",
      percentLeft: "{label}剩余 {left}%",
      percentLeftLow: "{label}剩余 {left}%,偏低",
      resets: "{time} 重置",
      resetsTail: ",{time} 重置",
      resetUnknown: "{label}重置时间未知",
      stale: "已过期",
      staleWindow: "{label}已过期",
      staleDetail: "已过期:最近 {levels}",
      seen: "观测于 {age}",
      seenJustNow: "刚刚",
      seenMinutes: "{count} 分钟前",
      seenHours: "{count} 小时前",
      seenDays: "{count} 天前",
      nameLimits: "{name}额度:{windows}",
      notAvailable: "不可用",
      limitsNotAvailable: "{name}额度不可用:{reason}",
      limitsNotAvailableDetail: "额度不可用:{reason}",
      reached: "已达上限",
      lowTail: ",偏低",
      percentValue: "{left}%",
    },
  },
```

- [ ] **Step 4:zh-Hant.ts 同位置插入繁体**

```ts
  town: {
    board: "小鎮看板",
    summary: "小鎮總覽",
    openSummaryTitle: "開啟小鎮總覽",
    hideBoardTitle: "收起小鎮看板",
    showBoardTitle: "展開小鎮看板",
    boardTitle: "小鎮看板",
    summaryButton: "總覽",
    countBusy: "忙碌",
    countWaiting: "等待",
    countDone: "完成",
    countQuiet: "閒置",
    summaryCounts:
      "{working} 個工作中,{needsYou} 個需要你,{finished} 個已完成,{quiet} 個閒置",
    outOfFuelTail: ",{count} 個額度耗盡",
    unknownTail: " · {count} 未知",
    agentsOne: "1 個智慧代理",
    agentsMany: "{agents} 個智慧代理",
    populationOneOne: "1 個智慧代理在 1 棟建築中",
    populationOneMany: "1 個智慧代理在 {buildings} 棟建築中",
    populationManyOne: "{agents} 個智慧代理在 1 棟建築中",
    populationManyMany: "{agents} 個智慧代理在 {buildings} 棟建築中",
    economyLabel: "經濟",
    economyToday: "今日經濟",
    economyTodayUtcTest: "今日經濟 · UTC · 測試資料",
    economyTodayUtcHarness: "今日經濟 · UTC · 智慧代理日誌",
    tokensCount: "{tokens} token",
    tokensWithCost: "{tokens} token · {cost}",
    readingUsage: "正在讀取用量…",
    usageStale: "用量已過期。",
    noHostUsage: "主機沒有用量資料。",
    usageUnavailable: "用量無法使用",
    placeLoading: "正在讀取今日用量…",
    placeUnavailable: "用量目前無法使用。",
    placeStale: "用量已過期:無法重新整理。",
    placeNone: "此處今日無用量記錄。",
    placeNoData: "此主機沒有用量資料。",
    placeLimited: "場所明細受限;用量已計入城市與建築總計。",
    estCost: "{usd} 估算",
    noneRecorded: "無記錄",
    priceNoteNoTable: "無價格表",
    priceNoteUnpriced: "部分模型未定價",
    unattributedNote: "{tokens} 未歸屬(已計入)",
    notesDetailsLimited: "明細列表受限;總計包含全部已蒐集用量",
    notesStaleLeftOut: "已排除過期資料",
    notesNoDataHostsOne: "1 台主機無資料",
    notesNoDataHosts: "{count} 台主機無資料",
    aboutFigures: "關於這些數字",
    windowToday: "今日",
    window7d: "7 天",
    hostsOne: "1 台主機",
    hostsMany: "{count} 台主機",
    addRoom: "新增房間",
    addRoomTo: "為 {host} 新增房間",
    caveat: {
      testDataShort: "測試資料",
      testDataExplain: "測試資料:此預覽用合成經濟資料,並非你的智慧代理日誌。",
      partialShort: "部分讀取",
      partialExplain:
        "部分讀取:某個智慧代理只讀取了一部分,或讀取被中斷,數字可能偏低。",
      staleShort: "已排除過期資料",
      staleExplain: "已排除過期資料:無法重新整理的數字不計入總計。",
      hostsMissingShort: "缺少 {hosts}",
      hostsMissingExplain:
        "{hosts} 無資料:無法讀取其智慧代理日誌。是缺失,不是零。",
      unattributedExplainPane:
        "{tokens} token 未歸屬:用量未關聯到某個智慧代理的窗格。已計入總計,不是額外計費。",
      unattributedExplainRoom:
        "{tokens} token 未歸屬:用量未關聯到它的某個房間。已計入總計,不是額外計費。",
      detailsLimitedExplain:
        "明細列表受限:列出的項目較少,但總計包含全部已蒐集用量。",
    },
    fuel: {
      groupLabel: "訂閱額度",
      title: "額度",
      week: "週",
      day: "天",
      days: "{count} 天",
      hours: "{count} 小時",
      minutes: "{count} 分鐘",
      limitReached: "已達上限",
      windowLimitReached: "{label}已達上限",
      percentLeft: "{label}剩餘 {left}%",
      percentLeftLow: "{label}剩餘 {left}%,偏低",
      resets: "{time} 重置",
      resetsTail: ",{time} 重置",
      resetUnknown: "{label}重置時間未知",
      stale: "已過期",
      staleWindow: "{label}已過期",
      staleDetail: "已過期:最近 {levels}",
      seen: "觀測於 {age}",
      seenJustNow: "剛剛",
      seenMinutes: "{count} 分鐘前",
      seenHours: "{count} 小時前",
      seenDays: "{count} 天前",
      nameLimits: "{name}額度:{windows}",
      notAvailable: "無法使用",
      limitsNotAvailable: "{name}額度無法使用:{reason}",
      limitsNotAvailableDetail: "額度無法使用:{reason}",
      reached: "已達上限",
      lowTail: ",偏低",
      percentValue: "{left}%",
    },
  },
```

- [ ] **Step 5:验证** — `bun run typecheck:quick 2>&1 | tail -5` 通过。

---

### Task 2:纯逻辑模块(townLimits.ts、townExpenses.ts)

**Files:**
- Modify: `web/src/world/town/townLimits.ts`
- Modify: `web/src/world/town/townExpenses.ts`

**Interfaces:**
- Consumes: `t()`(web/src/i18n)、`formatWeekdayTime`(web/src/i18n/format)、Task 1 的 `town.*` 键。
- Produces: 函数签名全部不变(townWindowLabel、townReachedText、townSeenAge、townFuelAge、townResetTime、townPriceNote、townCostText、townExpenseText、townCoverageNotes、townCoverageCaveats、townCaveatLine、TOWN_PARTIAL_CAVEAT、TOWN_WINDOW_LABEL)。

- [ ] **Step 1:townLimits.ts** — 顶部加 `import { t } from "../../i18n";` 与 `import { formatWeekdayTime } from "../../i18n/format";`,替换:

```ts
/** A window's length in words: 300 minutes is "5 h", 10,080 is "week". */
export function townWindowLabel(minutes: number) {
  if (minutes === 10080) return t("town.fuel.week");
  if (minutes === 1440) return t("town.fuel.day");
  if (minutes % 1440 === 0) return t("town.fuel.days", { count: minutes / 1440 });
  if (minutes % 60 === 0) return t("town.fuel.hours", { count: minutes / 60 });
  return t("town.fuel.minutes", { count: minutes });
}
```

`townFuelReached` 的 `"limit"` 是内部哨兵(与 `townReachedText` 的 `w.label === "limit"` 配对),保留英文哨兵不变。

```ts
/** "5 h limit reached", or "limit reached" when the window is unnamed. */
export const townReachedText = (w: TownFuelWindow) =>
  w.label === "limit"
    ? t("town.fuel.limitReached")
    : t("town.fuel.windowLimitReached", { label: w.label });
```

```ts
/** "Tue 14:00", in the interface language. */
export function townResetTime(at: number) {
  return formatWeekdayTime(at);
}
```

(删除模块级 `resetFormat` 常量。)

```ts
/** How long ago, in words that read after "seen". */
export function townSeenAge(at: number, now: number) {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return t("town.fuel.seenJustNow");
  if (minutes < 60) return t("town.fuel.seenMinutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? t("town.fuel.seenHours", { count: hours })
    : t("town.fuel.seenDays", { count: Math.floor(hours / 24) });
}
```

```ts
    : `seen ${townSeenAge(gauge.observedAt, now)}` →
    : t("town.fuel.seen", { age: townSeenAge(gauge.observedAt, now) });
```

`townFuelNotes` 的 `reason: limit.reason ?? "no source"` → `reason: limit.reason ?? t("town.fuel.noSource")`?——词典里没定 noSource 键!改用不加新键:reason 兜底保留 "no source"?不行,它是用户可见文本。补键 `fuel.noSource`("no source"/"无来源"/"無來源")到 Task 1 词典(fuel 子域末尾)。注意 `w.label === "limit"` 哨兵依赖 townFuelReached 产出的 label;哨兵值本身经 `windowLimitReached` 的 `{label}` 插值时若为 "limit" 不会出现(分支已排除)。但 `staleWindow`/`resetUnknown`/`windowLimitReached` 的 `{label}` 可能是 "limit" 吗?`townFuelReached` 设 label="limit" 且 reached=true → windowText 走 reached 分支(townReachedText)→ OK;`resets` 段 `${label} reset unknown` 在 reached 时用 label="limit" → "limit reset unknown" 原文如此(原有行为,保留:中文 "{label}重置时间未知" → "limit重置时间未知")。可接受(原文同样是拼接)。

- [ ] **Step 2:townExpenses.ts** — 顶部加 `import { t } from "../../i18n";`,替换:

```ts
export const townPriceNote = (price: Exclude<TownUsagePrice, "priced">) =>
  price === "no-table"
    ? t("town.priceNoteNoTable")
    : t("town.priceNoteUnpriced");
```

townCostText 的 `est.` 段:`${townUsd(total.costUsd)} est.` → `t("town.estCost", { usd: townUsd(total.costUsd) })`(读原文 305-310 行精确替换)。

```ts
export function townExpenseText(total: TownExpenseTotal) {
  ...
    ? t("town.noneRecorded")
    : t("town.tokensWithCost", {
        tokens: formatOfficeUsage(total.tokens),
        cost,
      });
}
```

townCoverageNotes 三处 push 换 t()(unattributed → `t("town.unattributedNote", { tokens: formatOfficeUsage(unattributed.tokens) })`;detailsLimited → `t("town.notesDetailsLimited")`;stale → `t("town.notesStaleLeftOut")`;no-data → `counts === 1 ? t("town.notesNoDataHostsOne") : t("town.notesNoDataHosts", { count: coverage.noDataHosts })`)。

townCoverageCaveats 整函数替换(返回结构不变):

```ts
export function townCoverageCaveats(
  coverage: TownExpenseCoverage,
  unattributed: TownExpenseTotal,
  scope: "pane" | "room",
) {
  const caveats: TownExpenseCaveat[] = [];
  if (coverage.testData)
    caveats.push({
      short: t("town.caveat.testDataShort"),
      explain: t("town.caveat.testDataExplain"),
    });
  if (coverage.partial) caveats.push(TOWN_PARTIAL_CAVEAT);
  if (coverage.stale)
    caveats.push({
      short: t("town.caveat.staleShort"),
      explain: t("town.caveat.staleExplain"),
    });
  if (coverage.noDataHosts) {
    const hosts =
      coverage.noDataHosts === 1
        ? t("town.hostsOne")
        : t("town.hostsMany", { count: coverage.noDataHosts });
    caveats.push({
      short: t("town.caveat.hostsMissingShort", { hosts }),
      explain: t("town.caveat.hostsMissingExplain", { hosts }),
    });
  }
  if (unattributed.records)
    caveats.push({
      short: null,
      explain:
        scope === "pane"
          ? t("town.caveat.unattributedExplainPane", {
              tokens: formatOfficeUsage(unattributed.tokens),
            })
          : t("town.caveat.unattributedExplainRoom", {
              tokens: formatOfficeUsage(unattributed.tokens),
            }),
    });
  if (coverage.detailsLimited)
    caveats.push({
      short: null,
      explain: t("town.caveat.detailsLimitedExplain"),
    });
  return caveats;
}
```

TOWN_PARTIAL_CAVEAT 是模块级常量(模块求值时生成一次)——语言切换后不更新!改为函数生成:`export const townPartialCaveat = (): TownExpenseCaveat => ({ short: t("town.caveat.partialShort"), explain: t("town.caveat.partialExplain") });` 并更新所有使用点(TownBoard.tsx 的 `caveats={economy.partial ? [TOWN_PARTIAL_CAVEAT] : []}` → `[townPartialCaveat()]`;townExpenses 内部 `caveats.push(TOWN_PARTIAL_CAVEAT)` → `caveats.push(townPartialCaveat())`)。grep 确认 TOWN_PARTIAL_CAVEAT 全部使用点后逐一替换,删除旧常量。

TOWN_WINDOW_LABEL(`today: "Today", "7d": "7 days"`)同为模块级常量——检查使用点;若在组件内按需取值,改为函数 `townWindowLabelText(window: TownUsageWindow)` 返回 `t("town.windowToday" | "town.window7d")`。grep 决定。

- [ ] **Step 3:验证** — `bun run typecheck:quick` 通过;`bun run test web/src/world/town/townLimits.test.ts web/src/world/town/townExpenses.test.ts 2>&1 | tail -6`(文件名以 ls 实际为准)通过——测试断言英文文本,词典英文逐字一致应通过;失败的断言按实际输出对照修正(测试环境 auto→en)。

---

### Task 3:TownFuelGauge.tsx、TownExpenseCaveats.tsx、TownAddRoom.tsx

**Files:**
- Modify: `web/src/world/town/TownFuelGauge.tsx`
- Modify: `web/src/world/town/TownExpenseCaveats.tsx`
- Modify: `web/src/world/town/TownAddRoom.tsx`

- [ ] **Step 1:TownFuelGauge.tsx** — 导入 `import { t, useT } from "../../i18n";`。模块级纯函数(levelText、townFuelDetails、windowText)用 `t()`;组件(TownFuelGaugeView、TownFuelNoteView、TownFuel)开头加 `const t = useT();`(注意组件内 t 遮蔽模块 t——组件内模板用组件级 t 保证响应切换;模块级函数用导入的 t)。替换:

```ts
const levelText = (w: TownFuelWindow) =>
  w.reached
    ? townReachedText(w)
    : t("town.fuel.percentLeft", { label: w.label, left: w.left });
```

```ts
export function townFuelDetails(gauge: TownFuelGauge, now: number) {
  const resets = gauge.windows.map((w) =>
    w.resetsAt === null
      ? t("town.fuel.resetUnknown", { label: w.label })
      : w.reached && !gauge.stale
        ? `${townReachedText(w)}${t("town.fuel.resetsTail", { time: townResetTime(w.resetsAt) })}`
        : `${gauge.windows.length > 1 ? `${w.label} ` : ""}${t("town.fuel.resets", { time: townResetTime(w.resetsAt) })}`,
  );
  return [
    ...(gauge.stale
      ? [
          t("town.fuel.staleDetail", {
            levels: gauge.windows.map(levelText).join(", "),
          }),
        ]
      : []),
    ...resets,
    t("town.fuel.seen", { age: townSeenAge(gauge.observedAt, now) }),
    gauge.source,
  ].join(" · ");
}
```

```ts
const windowText = (gauge: TownFuelGauge, w: TownFuelWindow) =>
  gauge.stale
    ? t("town.fuel.staleWindow", { label: w.label })
    : w.reached
      ? `${townReachedText(w)}${w.resetsAt === null ? "" : t("town.fuel.resetsTail", { time: townResetTime(w.resetsAt) })}`
      : w.low
        ? t("town.fuel.percentLeftLow", { label: w.label, left: w.left })
        : t("town.fuel.percentLeft", { label: w.label, left: w.left });
```

TownFuelGaugeView 的 label 与内嵌文案:

```ts
      label={`${gauge.name} ${t("town.fuel.nameLimits", { windows: gauge.windows.map((w) => windowText(gauge, w)).join("; ") })}${age ? `; ${age}` : ""}`}
```

——原英文是 `${gauge.name} limits: ${...}`;中文键 nameLimits="「{name}额度:{windows}」" 已含 name,则这里不能重复拼 name。修正:键 `fuel.nameLimits` 定义为 **"limits: {windows}"**/「额度:{windows}」(不含 name),拼接 `${gauge.name} ${t(...)}`;TownFuelNoteView 同理。**采用此方案**:Task 1 词典 nameLimits 值改为 "limits: {windows}";limitsNotAvailable 保持含 {name}(原文整句)。同步修改三语词典(Task 1 执行时落实)。

```ts
            <span className="town-fuel-reached">
              {t("town.fuel.reached")}
              {w.resetsAt === null
                ? ""
                : t("town.fuel.resetsTail", { time: townResetTime(w.resetsAt) })}
            </span>
```

```ts
                {gauge.stale ? t("town.fuel.stale") : t("town.fuel.percentValue", { left: w.left })}
                {!gauge.stale && w.low ? t("town.fuel.lowTail") : ""}
```

TownFuelNoteView:

```ts
      label={`${note.name} ${t("town.fuel.limitsNotAvailableShort", { reason: note.reason })}`}
      unavailable
      details={t("town.fuel.limitsNotAvailableDetail", { reason: note.reason })}
```

——原 `${note.name} limits not available: ${reason}`;拆两键:`limitsNotAvailableShort: "limits not available: {reason}"`/「额度不可用:{reason}」+ 保留 `limitsNotAvailable`(整句含 name,供别处)——实际只有一处用整句。简化:**只留 `limitsNotAvailableShort`**(拼接 name)与 `limitsNotAvailableDetail`;删除词典中 `limitsNotAvailable` 整句键(Task 1 执行时落实:键名 `limitsNotAvailableShort`)。

```tsx
        <span className="town-fuel-unavailable">{t("town.fuel.notAvailable")}</span>
```

TownFuel 组件:`aria-label={t("town.fuel.groupLabel")}`、`<span className="town-fuel-title">{t("town.fuel.title")}</span>`。

townFuelLowestText:

```ts
  return `${gauge.name} ${
    w.reached
      ? townReachedText(w)
      : w.low
        ? t("town.fuel.percentLeftLow", { label: w.label, left: w.left })
        : t("town.fuel.percentLeft", { label: w.label, left: w.left })
  }${age ? `; ${age}` : ""}`;
```

TownFuelChip:`{lowest.window.reached ? t("town.fuel.reached") : t("town.fuel.percentValue", { left: lowest.window.left })}`。

- [ ] **Step 2:TownExpenseCaveats.tsx** — `import { t, useT } from "../../i18n";`,组件内 `const t = useT();`,两处 aria-label 与 title 不变(数据来自 caveat 对象),只换 `"About these figures"` → `t("town.aboutFigures")`(两处)。

- [ ] **Step 3:TownAddRoom.tsx** — `import { t, useT } from "../../i18n";`,组件内 `const t = useT();`:

```ts
  const label = t("town.addRoomTo", { host: hostLabel });
```

`<span>{t("town.addRoom")}</span>`。

- [ ] **Step 4:验证** — typecheck;`bun run test web/src/world/town 2>&1 | tail -6`(town 目录单元测试);失败断言按实际输出修正。

---

### Task 4:TownBoard.tsx

**Files:**
- Modify: `web/src/world/town/TownBoard.tsx`

- [ ] **Step 1:** 导入 `import { t, useT } from "../../i18n";`(注意它同时 import 了 townExpenses 的改名字/函数)。组件 TownBoard 开头 `const t = useT();`。population 与 summary:

```ts
  const population =
    counts.agents === 1
      ? counts.buildings === 1
        ? t("town.populationOneOne")
        : t("town.populationOneMany", { buildings: counts.buildings })
      : counts.buildings === 1
        ? t("town.populationManyOne", { agents: counts.agents })
        : t("town.populationManyMany", {
            agents: counts.agents,
            buildings: counts.buildings,
          });
```

```ts
  const summary = `${t("town.summaryCounts", {
    working: counts.working,
    needsYou: counts.needsYou,
    finished: counts.finished,
    quiet: counts.quiet,
  })}${counts.outOfFuel ? t("town.outOfFuelTail", { count: counts.outOfFuel }) : ""}; ${population}${lowest ? `; ${townFuelLowestText(lowest, now)}` : ""}`;
```

aria-label/title(76-94 行 button):`aria-label={`${onOpenSummary ? t("town.summary") : t("town.board")}: ${summary}`}`、title 三元换 `t("town.openSummaryTitle")` / `t("town.hideBoardTitle")` / `t("town.showBoardTitle")`。

看板体:`TOWN BOARD` → `{t("town.boardTitle")}`;`Summary` 按钮 → `{t("town.summaryButton")}`;`aria-label="Town board"` → `t("town.board")`。

population 行:

```tsx
        <p className="town-board-population">
          {population}
          {counts.unknown ? t("town.unknownTail", { count: counts.unknown }) : ""}
          {counts.outOfFuel ? t("town.outOfFuelTail", { count: counts.outOfFuel }) : ""}
        </p>
```

——注意 outOfFuelTail 以逗号开头,这里原文是 ` · ${...}`(间隔符不同!population 行用 ` · `)。Tail 键只含尾部文字:拆两键:`outOfFuelTail`(", {count} out of fuel",summary 用)与 `outOfFuelNote`(" · {count} out of fuel",board 行用)?过度。统一:定义 `outOfFuelShort: "{count} out of fuel"`/「{count} 个额度耗尽」,由调用处自加前缀(", " / " · ")。**执行时**:summary 用 `, ${t("town.outOfFuelShort", {...})}`,board 行用 ` · ${t(...)}`。词典键名 `outOfFuelShort`(无前缀)。unknown 同理 `unknownShort: "{count} unknown"`。

TownBoardEconomy 调用(129-161 行):label 三元换 `t("town.economyTodayUtcTest")` / `t("town.economyTodayUtcHarness")`;detail 三元:

```ts
              ? t("town.tokensCount", { tokens: formatOfficeUsage(expenses.total.tokens) })
              : townExpenseText(expenses.total)
              ...
                ? t("town.readingUsage")
                : expenses.status === "stale"
                  ? t("town.usageStale")
                  : expenses.status === "no-data"
                    ? t("town.noHostUsage")
                    : t("town.usageUnavailable")
```

TownBoardEconomy 默认参 `label = "ECONOMY"` → `label?: string` 调用处传入;默认值改在组件内 `label ?? t("town.economyLabel")`?保持简单:TownBoardEconomy 无 t(useT 不可用于非组件顶层?它是组件,可以 useT)。TownBoardEconomy 加 `const t = useT();`,默认参改 `label` 省略时 `label = undefined` → `<span>{label ?? t("town.economyLabel")}</span>`。两处调用 label="ECONOMY TODAY" → `t("town.economyToday")`。

TownBoardCounts(组件,useT):`<dt>{t("town.countBusy")}</dt>` 等 4 处。

TownPlaceSummaryCard(组件,useT):place population 行 `${counts.agents} ${agents === 1 ? "agent" : "agents"}` → `counts.agents === 1 ? t("town.agentsOne") : t("town.agentsMany", { agents: counts.agents })`;unknown/outOfFuel 尾同上;fuel 行 label 来自数据(`place.fuel[].label` 是窗口标签,已由 townWindowLabel 本地化);`label="ECONOMY TODAY"` → t;detail 模板:

```ts
          detail={`${t("town.tokensCount", { tokens: formatOfficeUsage(economy.tokens) })}${
            economy.models.length
              ? ` · ${formatOfficeModelNames(economy.models.map((model) => ({ model })))}`
              : ""
          }${economy.price === "priced" ? "" : ` · ${townPriceNote(economy.price)}`}`}
```

PLACE_ECONOMY 常量(Record<status,string>)→ 改为函数 `placeEconomyText(status)` switch 返回 t(键:placeLoading/placeUnavailable/placeStale/placeNone/placeNoData/placeLimited);调用处 `detail={placeEconomyText(economy.status)}`。`caveats={economy.partial ? [TOWN_PARTIAL_CAVEAT] : []}` → `[townPartialCaveat()]`。

- [ ] **Step 2:验证** — typecheck;`bun run test web/src/world/town 2>&1 | tail -6`;英文文案对照(git diff 法)。

---

### Task 5:changelog、验证、提交

- [ ] **Step 1:** `changes/i18n-phase1.md` 追加:"The Town board sign (counts, economy, fuel limits), place cards and the Add room doorway translate; limit reset times follow the language."
- [ ] **Step 2:** `bun run test web/src/i18n`、`bun run test web/src/world/town`、typecheck、biome(check --write 修正)、changelog:check。
- [ ] **Step 3:** 提交(词典/逻辑/组件分两或三个功能提交)、`git push --no-verify origin feat/i18n-phase1`。
- [ ] **Step 4:** 用户浏览器验证:小镇看板计数/经济/额度、Add room 门牌随语言切换。
