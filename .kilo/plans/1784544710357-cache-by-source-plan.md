# Plan: 按 source_tool 汇整各 provider 的 cache 用量（API + 前端展示）

## Context
用户想分析「provider 的 cache 用量」。在本仓库中，区分 session 来源的字段是
`sessions.source_tool`（取值如 `claude-code` / `kilo` / `codex` / `cursor` /
`copilot` / `copilot-cli` / `opencode` / `crush` / `antigravity` /
`hermes-agent` / `mistral-vibe`），而非 `provider`。
`sessions` 表已存有 `cache_creation_tokens` 和 `cache_read_tokens`
（`cli/src/db/schema.ts:58-59`），由各 provider 在 sync 时写入
（`cli/src/providers/*.ts`）。但现有 routes 只做全局汇总（
`server/src/routes/analytics.ts:54-55`），没有按 `source_tool` 分组。

目标：新增后端聚合路由，按 `source_tool` 返回各 provider 的 cache 用量汇总，
并在 dashboard 前端以图表+表格形式展示。

注意：当前 `AnalyticsPage.tsx:39` 的聚合基于 `useSessions({ limit: 500 })`，
最多 500 条 session，会导致 cache 用量在量大时被截断而不准。因此走后端聚合，
与现有 `/api/analytics/dashboard` 一致。

## 决策
- 维度：`source_tool`（用户已确认「session 去彙整」）。
- 交付：后端 API 路由 + 前端展示（用户已确认「API + 前端展示」）。
- 指标：`cache_creation_tokens`、`cache_read_tokens`，以及可派生的
  cache 命中率 = `cache_read / (cache_read + total_input_tokens)`（仅展示，不入库）。
- 过滤：复用现有 range / homeId / source 过滤约定（与 `analytics.ts` 对齐）。

## 实现步骤

### 1. 后端：新增聚合路由
文件：`server/src/routes/analytics.ts`（在现有 `app` 内追加）

新增 `GET /api/analytics/cache-by-source`，参数 `range`、`homeId`、`source`
（`source` 对应 `source_tool` 过滤，可选）。
- 复用 `periodStartFor(range)` 计算 `periodStart`（已有，line 9-15）。
- 构建 `conditions`：`deleted_at IS NULL`，可选 `started_at >= ?`、`home_id = ?`、
  `source_tool = ?`（参考 `analytics.ts:28-38` 与 `sessions.ts:35-42`）。
- 查询：
  ```sql
  SELECT source_tool,
         COUNT(*)                                  AS session_count,
         SUM(total_input_tokens)                   AS total_input_tokens,
         SUM(cache_creation_tokens)                AS cache_creation_tokens,
         SUM(cache_read_tokens)                    AS cache_read_tokens
  FROM sessions ${where}
  GROUP BY source_tool
  ORDER BY cache_read_tokens DESC
  ```
- 返回结构：`{ range, homeId, source, rows: [{ sourceTool, sessionCount,
  totalInputTokens, cacheCreationTokens, cacheReadTokens }] }`。
- 空结果返回 `rows: []`（不报错）。

验证点：cursor/copilot/copilot-cli 当前 cache 字段为 0（
`cli/src/providers/cursor.ts:536`、`copilot.ts:338`、`copilot-cli.ts:412`），
其 cache 行会显示 0，这是真实数据，无需改动 provider。

### 2. 前端：API 封装
文件：`dashboard/src/lib/api.ts`
- 新增 `fetchCacheBySource(params: { range?: string; homeId?: string; source?: string })`
  调用 `/api/analytics/cache-by-source`，返回 `{ rows: CacheBySourceRow[] }`。
- 类型：`CacheBySourceRow`（`dashboard/src/lib/types.ts` 内新增）。

### 3. 前端：hook
文件：`dashboard/src/hooks/useAnalytics.ts`
- 新增 `useCacheBySource(range, homeId?, source?)`，用 `useQuery`
  （queryKey `['analytics','cache-by-source', range, homeId, source]`，
  `refetchInterval: 60_000`，与现有 hook 对齐）。

### 4. 前端：展示组件
文件：新增 `dashboard/src/components/dashboard/CacheBySourceCard.tsx`
- 用现有 `Card` + `recharts` `BarChart`（参考 `AnalyticsPage.tsx:15-23`
  的 recharts 用法与 `CHART_COLORS`）。
- 展示：各 `sourceTool` 的 `cacheReadTokens`（主 bar），可加
  `cacheCreationTokens` 作为次 bar；tooltip 显示 session 数、input、creation、read。
- 用 `formatTokenCount`（`dashboard/src/lib/utils.ts`）格式化。
- 加载态用 `Skeleton`，错误态用 `ErrorCard`（参考 `AnalyticsPage.tsx:8-9`）。

### 5. 前端：挂载到 AnalyticsPage
文件：`dashboard/src/pages/AnalyticsPage.tsx`
- 引入 `useCacheBySource` 与 `CacheBySourceCard`。
- 传入当前 `range`、`homeId`、`source` 状态（page 已有这些 state，line 36-38），
  使卡片随过滤器联动。
- 在现有图表区（如 `InsightTypeChart` 附近）插入 `<CacheBySourceCard ... />`。

## 受影响文件
- `server/src/routes/analytics.ts`（新增路由）
- `dashboard/src/lib/api.ts`（新增 fetch 函数）
- `dashboard/src/lib/types.ts`（新增类型）
- `dashboard/src/hooks/useAnalytics.ts`（新增 hook）
- `dashboard/src/components/dashboard/CacheBySourceCard.tsx`（新组件）
- `dashboard/src/pages/AnalyticsPage.tsx`（挂载）

## 风险 / 注意
- 部分 provider（cursor/copilot/copilot-cli）cache 字段为 0，展示即反映真实情况；
  不在本任务范围内修正 provider 解析。
- 保持 range/homeId/source 过滤语义与现有 analytics 路由一致，避免口径分歧。

## 验证
- 后端：`server/src/routes/analytics.test.ts` 已有测试模式，新增用例验证
  `/cache-by-source` 按 source_tool 分组、受 range/homeId/source 过滤、空库返回空数组。
- 前端：`dashboard` 的 lint/typecheck（`npm run lint` / `npm run typecheck`，
  仓库若有；否则用 `tsc --noEmit`）。
- 手动：启动 server + dashboard，打开 Analytics 页，确认 CacheBySourceCard
  随 range / source / home 过滤联动，token 数值合理。
