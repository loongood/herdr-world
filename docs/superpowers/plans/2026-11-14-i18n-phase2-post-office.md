# i18n 阶段 2 · 模块 3:邮局实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将邮局(TownPostOffice.tsx)与其读模型(townPost.ts)的全部用户可见文案接入 i18n。

**Architecture:** 复用 `web/src/i18n/` 框架,新增 `town.post` 子域(~36 键)。townPost.ts 是纯逻辑模块( parcels 的 `why`/`detail`/计数词在数据层生成),直接 `t()` 化;组件用 `useT()`。动态键禁模板拼接——`townPostCountParts` 用显式 `COUNT_KEYS` 映射。

**Tech Stack:** Bun、React 19、自研 i18n、bun test。

## Global Constraints

- 英文文案从源文件逐字保留(验收:git diff 提取被删串与 en.ts 对照)。英文计数无复数("2 draft"),与原文一致。
- 术语:pull request=拉取请求/提取請求(GitHub 官方;规格术语表未定名);host=主机/主機;Sources=来源/來源(沿用既有词典)。
- 测试断言英文(TownPostOffice.dom.test.ts:"Post office: 1 ready to merge, 0 failing, 0 waiting, 1 draft. Open" 等),词典英文值必须逐字一致。
- 折叠牌 "…"、"n/a" 类符号保留;"Open" 尾巴复用 `town.open`;"old" 复用 `town.signOld`。
- 分支 `feat/i18n-phase1`;changelog 更新 `changes/i18n-phase1.md`;提交附 Co-Authored-By;推送 --no-verify。

---

### Task 1:`town.post` 子域三语词典

**Files:** Modify: `web/src/i18n/en.ts`、`zh-Hans.ts`、`zh-Hant.ts`(town 域内、fuel 之后)

- [ ] en.ts 插入(fuel 域后):office: "Post office"、officeTitle: "POST OFFICE"、yard: "Post office yard"、openPullRequest: "Open pull request"、pullRequest: "Pull request {ref}"、pullRequests: "Pull requests"、morePullRequests: "{count} more pull requests"、morePullRequestsTitle: "More pull requests"、merged: "merged"、left: "left the post office"、noneOpen: "No open pull requests."、setUpSources: "Set up GitHub in Sources"、closed: "closed"、spokenReady: "{count} ready to merge"、countReady: "{count} ready"、countFailing: "{count} failing"、countWaiting: "{count} waiting"、countUnknown: "{count} unknown"、countDraft: "{count} draft"、signOpening: "Opening…"、signOff: "Closed · GitHub source is off"、signClosed: "Closed · connect GitHub in Sources"、signStale: "GitHub out of date · {count} unknown"、detailNoSource: "World has no GitHub source."、whyReady: "ready to merge"、whyDraft: "draft"、whyFindings: "review findings open"、whyChecksFail: "CI failing on its head"、whyConflicts: "conflicts with its base"、whyScreenshots: "UI change without screenshots"、whyReviewRequested: "your review requested"、whyAssigned: "assigned to you"、whyWaitingCi: "waiting for CI"、whyChangesRequested: "changes requested"、whyDetailsStale: "details out of date"、whyWaitingReview: "waiting for review"、whyGitHubChecking: "GitHub still checking for conflicts"、whyFilesUnread: "changed files not read"、whyGitHubStale: "GitHub out of date"
- [ ] zh-Hans.ts:邮局/邮局/邮局分拣场/打开拉取请求/拉取请求 {ref}/拉取请求/另外 {count} 个拉取请求/更多拉取请求/已合并/离开了邮局/没有进行中的拉取请求。/在「来源」中设置 GitHub/已关闭/{count} 个可合并/{count} 可合并/{count} 失败/{count} 等待/{count} 未知/{count} 草稿/正在打开…/已关闭 · GitHub 来源已停用/已关闭 · 在「来源」中连接 GitHub/GitHub 数据已过期 · {count} 未知/World 没有 GitHub 来源。/可合并/草稿/有审查意见未处理/分支上 CI 失败/与基线有冲突/UI 改动缺少截图/等待你的审查/已指派给你/等待 CI/已请求修改/详情已过期/等待审查/GitHub 仍在检查冲突/未读取改动文件/GitHub 数据已过期
- [ ] zh-Hant.ts:郵局/郵局/郵局分揀場/開啟提取請求/提取請求 {ref}/提取請求/另外 {count} 個提取請求/更多提取請求/已合併/離開了郵局/沒有進行中的提取請求。/在「來源」中設定 GitHub/已關閉/{count} 個可合併/{count} 可合併/{count} 失敗/{count} 等待/{count} 未知/{count} 草稿/正在開啟…/已關閉 · GitHub 來源已停用/已關閉 · 在「來源」中連接 GitHub/GitHub 資料已過期 · {count} 未知/World 沒有 GitHub 來源。/可合併/草稿/有審查意見未處理/分支上 CI 失敗/與基線有衝突/UI 變更缺少截圖/等待你的審查/已指派給你/等待 CI/已請求修改/詳情已過期/等待審查/GitHub 仍在檢查衝突/未讀取變更檔案/GitHub 資料已過期
- [ ] 验证:`bun run typecheck:quick`

### Task 2:townPost.ts 纯逻辑 t() 化

**Files:** Modify: `web/src/world/town/townPost.ts`

- [ ] 加 `import { t } from "../../i18n"; import type { TranslationKey } from "../../i18n/en";`
- [ ] `RULE_FAILS` 值改为 TranslationKey(draft→whyDraft、findings→whyFindings、checks→whyChecksFail、mergeable→whyConflicts、screenshots→whyScreenshots),使用处 `t(RULE_FAILS[failed.id])`
- [ ] `townPostState` 各分支 why → t()(whyReady/whyDraft/whyChecksFail/whyConflicts/whyReviewRequested/whyAssigned/whyWaitingCi/whyChangesRequested/whyDetailsStale/whyWaitingReview/whyGitHubChecking/whyFilesUnread;重复字面量共用一键)
- [ ] `townPostOffice`:detailNoSource、whyGitHubStale
- [ ] `COUNT_KEYS` 显式映射 + `townPostCountParts` 的 text = `t(COUNT_KEYS[state], { count })`;删除 COUNT_WORDS
- [ ] `townPostSignText`:signOpening/signOff/signClosed/signStale({count: office.parcels.length})
- [ ] 验证:`bun run test web/src/world/town/townPost.test.ts` 全过(英文断言)

### Task 3:TownPostOffice.tsx 组件迁移

**Files:** Modify: `web/src/world/town/TownPostOffice.tsx`

- [ ] 导入 `import { t, useT } from "../../i18n";`;`spoken()` 用 `t("town.post.spokenReady", { count: part.count })`;`FOLDED_WAITING` 改函数式(loading "…" 保留、off/closed → `t("town.post.closed")`)
- [ ] TownPostOffice(memo 组件)加 `const t = useT();`:card label `t("town.post.pullRequest", { ref: item.ref })`、sign aria `` `${t("town.post.office")}: ${spoken(office)}` ``、POST OFFICE → officeTitle、yard aria → t("town.post.yard")、parcel aria(×2 处,含 ParcelList)`` `${townPostLabel(parcel)}. ${t("town.post.openPullRequest")}` ``、announce 三元 merged/left
- [ ] Pile 加 useT:morePullRequests({count})、morePullRequestsTitle
- [ ] ParcelList 加 useT:pullRequests(ul aria)、parcel aria 同上
- [ ] FoldedSign 加 useT:aria `` `${t("town.post.office")}: ${spoken(office)}. ${t("town.open")}` ``、title → t("town.post.office")、"old" → t("town.signOld")、popover aria → t("town.post.office")、header → officeTitle、noneOpen、setUpSources
- [ ] 验证:typecheck + `bun run test web/src/world/town/townPost.test.ts`

### Task 4:changelog、验证、提交

- [ ] `changes/i18n-phase1.md` 追加邮局句;英文对照脚本(git diff 提取被删串 ⊆ en.ts);i18n+town 测试;biome format;提交(Co-Authored-By)并 `git push --no-verify`;请用户浏览器验证
