# i18n 阶段 2 · 模块 4:镇长卡与离开期间回顾

模块 4/6:Web 界面 i18n 迁移。范围:镇长问候卡(TownMasterCard.tsx)、
离开期间回顾(sinceYouLeft.ts + TownSinceYouLeft.tsx)。纯逻辑模块
townMasterGreeting.ts / TownMasterGreetingHost.tsx 无用户可见文案,不改。

**Files:**
- Modify: `web/src/i18n/en.ts`(新增顶级域 `master`,29 键)
- Modify: `web/src/i18n/zh-Hans.ts`、`web/src/i18n/zh-Hant.ts`
- Modify: `web/src/world/sinceYouLeft.ts`(文案函数 t() 化;leftAt 改用
  formatTime/formatWeekdayTime,跟随语言偏好而非浏览器 locale;删 plural)
- Modify: `web/src/world/TownMasterCard.tsx`(helloLine/updateLine 用导入 t;
  Layer/Card/Figure 加 useT)
- Modify: `web/src/world/town/TownSinceYouLeft.tsx`(chip/board/RecapLine 加 useT)
- Modify: `changes/i18n-phase1.md`(追加)
- Create: 本计划

**词典键(en 基准):**

```text
master.title             "Town Master"
master.hello             "Hello!"
master.helloLastHere     "Hello! You were last here at {time}."
master.updateAvailable   "Herdr World {version} is available."
master.back              "Back"
master.closeGreeting     "Close the greeting"
master.sinceYouLeft      "Since you left"
master.openInNeedsYou    "Open in Needs you"
master.nothingNew        "Nothing new since you left."
master.seeUpdate         "See update"
master.showOnStart       "Show this on start"
master.forYouShort       "{count} for you"
master.newForYou         "{count} new for you"
master.newQuestionOne    "1 new question"
master.newQuestionFromOne      "1 new question from {name}"
master.newQuestionsMany        "{count} new questions"
master.newQuestionsFromOne     "{count} new questions from {name}"
master.newQuestionsFromOthers  "{count} new questions from {name} and others"
master.finished          "{count} finished"
master.mergedPrOne       "1 PR merged"
master.mergedPrMany      "{count} PRs merged"
master.mergedShort       "{count} merged"
master.awayMinutes       "{count} min"
master.awayHours         "{count} h"
master.awayDays          "{count} d"
master.recapSince        "Since {time}: {lines}"
master.recapChipAria     "{text}. Open Needs you."
master.recapHeader       "Since {time} · away {away}"
master.clearRecap        "Clear since you left"
```

**验证链:** typecheck:quick → `bun run test web/src/world/sinceYouLeft.test.ts
web/src/world/TownMasterCard.test.ts web/src/world/townMasterGreeting.test.ts`
→ i18n 套件 → town 套件 → 英文对照 → biome format(仅手改文件)→
更新 changes/i18n-phase1.md → 提交推送(--no-verify)。
en 为默认 locale,既有英文断言应原样通过。
