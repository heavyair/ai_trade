# Codex Handoff - 2026-09-05

## Context

User asked Codex to change AI-generated model naming and to make sure the change does not affect the running batch job on the old server `172.105.9.107`.

Codex only changed local frontend code, committed it, and pushed to GitHub. Codex did not deploy, restart, SSH into the old server for deployment, stop jobs, or touch production containers.

## Change Order

1. Inspected current repo state.
   - Branch: `main`
   - Untracked files already present and intentionally left alone:
     - `.claude/`
     - `scripts/universe/qualifiedRecheck.log`
     - `scripts/universe/validatedSearch.log`

2. Located the naming paths in `public/app.js`.
   - `buildAutoSaveLabel()`
   - AI generated / validated-search parameter viewer save defaults
   - model action menu "save as" path
   - `resolveRealPresetIdForContext()` path used before "建立盯盘" and "扫描市场"

3. Updated AI model default naming.
   - New format:
     - `AI <股票代码> 验证1年 <收益%> <交易次数> 验证2年 <收益%> <交易次数>`
   - Example shape:
     - `AI NET 验证1年 +56.4% 12笔 验证2年 +53.1% 9笔`
   - The label builder now uses both validation years instead of the prior worse-year/min-return shorthand.

4. Passed validation fields into model action contexts.
   - Added:
     - `testYear1AnnualizedReturn`
     - `testYear1Trades`
     - `testYear2AnnualizedReturn`
     - `testYear2Trades`
   - Applied to AI/generated validated-search rows and admin scan rows where the generic model action menu can be opened.

5. Removed "副本" from AI candidate watch setup defaults.
   - For AI candidates, `resolveRealPresetIdForContext(context, "建立盯盘")` now uses the new AI label directly.
   - Non-AI regular model copy/save behavior still keeps the old `副本` suffix where appropriate.

6. Also aligned related AI candidate save paths.
   - AI candidate "模型操作菜单 -> 另存为模型" uses the new AI label.
   - AI candidate "查看参数 -> 保存为新模型" uses the new AI label without appending `副本`.
   - Non-AI read-only/public/internal model save-as paths still append `副本`.

7. Verified locally.
   - `node --check public/app.js` passed.
   - `git diff --check` passed.
   - Existing local instance at `http://127.0.0.1:3000/app.js` served the updated JS and contained `验证1年`.

8. Committed and pushed.
   - Commit: `7d44be5 调整AI模型默认命名`
   - HEAD and `origin/main` both resolve to:
     - `7d44be50689a4040fe0b94382b487f6b9808f748`

## Files Changed

- `public/app.js`
  - Changed only frontend default naming / context propagation.
  - No server API changes.
  - No database schema changes.
  - No batch-script changes.

## Operational Notes

- Do not deploy/restart `172.105.9.107` while the validated-search batch job is running unless the user explicitly approves.
- This push only updates GitHub. It does not change the running old-server batch process.
- If deploying later, deploy to the intended app server only after checking whether the user still wants the old server left untouched.

## 139 Deployment Update

After the GitHub push, the user asked to push the naming change to `139.177.195.223`.

Order performed:

1. Checked `139.177.195.223` only.
   - Confirmed app HTTP was `200`.
   - Confirmed `ai-trade-db-tunnel` was `active`.
   - Confirmed running container: `ai_trade`.

2. Inspected `/opt/ai_trade/releases_repo`.
   - The repo is not a clean checkout; HEAD is older and several files have local deployment changes.
   - Did not run `git pull` because that could overwrite or conflict with those local changes.

3. Applied only commit `7d44be5`'s `public/app.js` patch to `/opt/ai_trade/releases_repo`.
   - Used `git apply --check` first.
   - Then applied the patch.

4. Built a new image on 139.
   - Tagged rollback image first:
     - `ai_trade:klines-cache-before-codex-20260905`
   - Built:
     - `ai_trade:klines-cache`
   - Verified new image:
     - `docker run --rm ai_trade:klines-cache node --check public/app.js`

5. Did not recreate the container after a remote shell quoting issue in the first recreate attempt.
   - The failed command did not remove the running container.
   - Confirmed `ai_trade` remained up and HTTP stayed `200`.

6. Hot-copied the updated frontend file into the running container.
   - Source:
     - `/opt/ai_trade/releases_repo/public/app.js`
   - Target:
     - `ai_trade:/app/public/app.js`
   - Verified inside the running container that `验证1年` and `buildAutoSaveLabelFromContext` exist.

7. Checked old server batch task afterward.
   - `172.105.9.107` validated-search was still `running`.
   - No deployment/restart was done on `172.105.9.107`.

State after this update:

- 139 running container has the naming change in `/app/public/app.js`.
- 139 image tag `ai_trade:klines-cache` also has the naming change for future recreates.
- 139 container still shows old image id in `docker ps` because it was not recreated; its filesystem has the updated file.

## Model List Update

The user then asked to replace the main "模型排行" page with "模型列表" and show two sections:

1. `我的模型`
2. `跟盘模型`

Required behavior:

- My models: delete, rename, set watch, historical simulation.
- Followed models: historical simulation, cancel following.
- Each model should show one validation record.
- Each model should show its watch-account simulation/trading state underneath.
- Local AI scan is running; do not disturb it.

Order performed locally:

1. Updated the main page labels in `public/index.html`.
   - Main entry now says `模型列表`.
   - Page aria label and H2 now say `模型列表`.
   - Subtitle now describes the two sections and the per-model validation/watch status.
   - Static asset query strings now use `20260905-model-list` so browsers fetch the updated JS/CSS.

2. Added a read-only backend aggregate endpoint in `server.js`.
   - New route: `GET /api/model-list`
   - Requires the current logged-in user.
   - Returns:
     - `ownModels`: current user's non-hidden `strategy_presets`, with optional `preset_validation_snapshots` row and owned watch states.
     - `followedModels`: models from `watch_alert_followers`, grouped by preset, with optional validation row and followed watch states.
   - It does not start scans, revalidation, or watch execution.

3. Refactored frontend rendering in `public/app.js`.
   - Added `modelListCache`.
   - Main "ranking" page now fetches `/api/model-list` and renders two card sections.
   - Added fallback rendering through existing `/api/my-models` + `/api/watch-alerts` so the current local Node process can still show the new list before it is safely restarted.
   - Removed the second `renderMyModelsList()` definition that was overriding the dialog renderer.
   - Renamed the dialog renderer to `renderMyModelsDialogList()`.
   - Existing historical ranking table helpers were left in place for compatibility with older/internal calls, but the main page no longer renders the old Public/个人 ranking tables.

4. Added frontend actions in `public/app.js`.
   - My model:
     - `重命名` -> existing `renameOwnedPreset()`
     - `删除` -> existing `hideOwnedPreset()`
     - `设置盯盘` -> existing `/api/watch-alerts` create flow, default hourly check
     - `历史模拟` -> switches to existing simulation page and loads the model's primary symbol for the last 5 years
   - Followed model:
     - `历史模拟` -> creates an in-memory temporary preset from the followed model config and runs existing simulation flow
     - `取消跟盘` -> existing `/api/watch-alerts/follow` DELETE flow

5. Added styling in `public/styles.css`.
   - Two-section model list layout.
   - Model cards.
   - Validation summary badges.
   - Watch simulation status blocks.
   - Mobile card/action wrapping.

Verification performed:

- `node --check server.js` passed.
- `node --check public/app.js` passed.
- `git diff --check` passed.

Operational notes:

- Did not restart the local Node server.
- Did not stop or touch the local AI scan process.
- Did not SSH/deploy to `172.105.9.107`.
- Did not deploy this model-list change to `139.177.195.223` yet.

## Local Deployment Update

The user explicitly approved stopping the local AI scan, deploying the local model-list change, then restarting the scan.

Order performed:

1. Identified the running scan group.
   - 10 `node scripts/universe/search-validated-best.js` processes.
   - Each was started by `run_local10_chunk.sh 0..9` under:
     - `C:/Users/victor/AppData/Local/Temp/claude/c--Users-victor-dev-gitbase-ai-trade/13782029-02c1-4067-af6b-eb2dfaf9cb9c/scratchpad`

2. Stopped only the local scan group.
   - Stopped the 10 scan node processes and their bash wrappers.
   - Left unrelated Codex/runtime node processes alone.

3. Deployed locally by restarting the Web instance on port `3000`.
   - Stopped old Web PIDs:
     - `36064` (`npm run dev:local`)
     - `6536` (`node --env-file=.env.local server.js`)
   - Started:
     - `npm run dev:local`
   - New listener on port `3000` is PID `36168`.

4. Verified local Web deployment.
   - `GET http://127.0.0.1:3000/` returned `200`.
   - `GET http://127.0.0.1:3000/app.js?v=20260905-model-list` returned `200` and contains `/api/model-list`.
   - `GET http://127.0.0.1:3000/api/model-list` returned `401`, which confirms the new route is loaded and requires login rather than falling through to the old 404.

5. Restarted the local scan using the original 10 chunk scripts.
   - `run_local10_chunk.sh 0`
   - `run_local10_chunk.sh 1`
   - `run_local10_chunk.sh 2`
   - `run_local10_chunk.sh 3`
   - `run_local10_chunk.sh 4`
   - `run_local10_chunk.sh 5`
   - `run_local10_chunk.sh 6`
   - `run_local10_chunk.sh 7`
   - `run_local10_chunk.sh 8`
   - `run_local10_chunk.sh 9`

6. Verified scan restoration.
   - 10 fresh `search-validated-best.js` node processes are running.
   - Restart timestamp: `2026-09-05 10:44:08`.
   - `local10_run_*.log` files are being updated again.

Notes:

- This was a local deployment only.
- No deploy/restart was done on `172.105.9.107`.
- No deploy/restart was done on `139.177.195.223`.

## Server Deployment Attempt - Commit ed101f9

The user asked to push the model-list change to both servers.

Local git:

- Committed and pushed to GitHub:
  - `ed101f9 调整模型列表页面`
- Files in the commit:
  - `.claude/CODEX_HANDOFF_2026-09-05.md`
  - `public/app.js`
  - `public/index.html`
  - `public/styles.css`
  - `server.js`

`172.105.9.107`:

1. Checked status.
   - Docker container `ai_trade` was running.
   - No `search-validated-best.js` batch process was visible on the host at deploy time.
2. Backed up current container files to:
   - `/tmp/ai_trade_backup_before_ed101f9`
3. Copied updated files to:
   - `/tmp/ai_trade_deploy_ed101f9`
4. Validated inside container with:
   - `node --check /tmp/server.js`
   - `node --check /tmp/app.js`
5. Copied updated files into the running container:
   - `/app/server.js`
   - `/app/public/app.js`
   - `/app/public/index.html`
   - `/app/public/styles.css`
6. Validated deployed files inside container:
   - `node --check /app/server.js`
   - `node --check /app/public/app.js`
7. Restarted only the `ai_trade` container.
8. Verified:
   - `http://127.0.0.1/` returned `200`
   - `http://127.0.0.1/api/model-list` returned `401`
   - `/app/server.js` contains `/api/model-list`
   - `/app/public/index.html` contains `20260905-model-list`
   - `/app/public/app.js` contains `fetchModelListFallback`

`139.177.195.223`:

- Deployment was not completed because SSH on port 22 timed out repeatedly.
- Confirmed:
  - Ping succeeds.
  - HTTP `http://139.177.195.223/` returns `200`.
  - HTTP `http://139.177.195.223/api/model-list` returns `404`, so it is still on old backend code.
  - TCP test for port 22 fails.
  - SSH from this machine fails.
  - SSH from `172.105.9.107` to `139.177.195.223` also fails.
- Next step when SSH is restored: deploy the same four files and restart only the `ai_trade` container/service on 139.

## Watch Create UX Update

The user asked: when adding a watch, first check whether that watch already exists. If it exists, open the watch dialog and show the existing watch detail. If not, create it and then open the new watch detail.

Local changes:

- `public/app.js`
  - `loadMyWatchAlerts()` now can return the current watch cache without rendering.
  - Added `prepareWatchAlertsDialog()`.
  - Added `revealWatchAlertDetails()` to open the watch dialog, switch to the owned tab, expand the matching `<details>` row, scroll it into view, and load the chart if available.
  - Added `createOrOpenWatchAlert()`:
    - Reads existing `/api/watch-alerts`.
    - Matches by current owner + `presetId` + symbol/market or index code.
    - Existing match: does not POST; opens the existing detail row.
    - No match: POSTs `/api/watch-alerts`, reloads watches, opens the created detail row.
  - Rewired these entry points to use the helper:
    - model action menu `建立盯盘`
    - watch dialog create button
    - Public model `关注/建立盯盘`
    - model list `设置盯盘`
- `public/index.html`
  - JS asset query string bumped to `20260905-watch-detail`.

Verification:

- `node --check public/app.js` passed.
- `git diff --check` passed.

## Admin Watchable AI Model Picker

User asked for an admin interface that can quickly pick AI search models suitable for creating watch alerts, sorted by the analysis logic just reported, and automatically marks which models already have watches.

Local changes:

- `server.js`
  - Added admin-only `GET /api/admin/watchable-ai-models`.
  - Source scope is `optimization_scan_results.source = 'validated-search'`.
  - Filters out rows that are not `reached_target`, rows with zero combined validation trades, and rows whose daily validation state is `invalid`.
  - Keeps `watching` rows visible but marks them as `观察中`.
  - Computes recommendation score from:
    - daily validation status
    - validation trade-count bucket
    - strategy type auditability (`block-rules`/`wave`/`local-high-ladder` favored)
    - weaker validation year return
    - train/validation annualized diff penalty
    - year-to-year trade-count diff penalty
  - Marks existing watches by joining saved `strategy_presets` whose `original_model_id` equals the AI scan result id, then `watch_alerts` under those saved presets.
  - Supports query params:
    - `market=0|1|US`
    - `hideWatched=1`
- `public/index.html`
  - Added admin tab `可建盯盘模型`.
  - Added market filter, hide-existing-watch checkbox, refresh button, summary, and result list.
  - Bumped `styles.css`/`app.js` cache version to `20260907-watchable-ai`.
- `public/app.js`
  - Added DOM bindings and admin tab handling for `watchableAi`.
  - Added loader/rendering for `/api/admin/watchable-ai-models`.
  - Rows show recommendation tier/score, market, symbol, model name, strategy, two validation years, trade sample, daily validation state, and existing watch count/targets.
  - Model name uses the existing unified model action menu; because these are AI candidates, building a watch still goes through the established "另存为正式模型 first" flow.
  - After creating a watch from this context, the new admin list refreshes so the watch marker updates immediately.
- `public/styles.css`
  - Added small layout rules for the new table.

Verification:

- `node --check public/app.js` passed.
- `node --check server.js` passed.
- `git diff --check` passed.
- Local HTTP smoke could not start because local Postgres rejected user `postgres`; production uses container env and is not affected.

## Model Action Optimize Button

User asked to add an optimization-parameter entry to each model's popup action window, and asked whether optimization overwrites the original model.

Local changes:

- `public/index.html`
  - Added `优化参数` button to `#modelActionDialog`.
  - Bumped static asset query strings to `20260907-model-action-optimize`.
- `public/app.js`
  - Added `modelActionOptimizeButton` binding.
  - Enabled the button only when the model context has a symbol and model authoring is allowed.
  - Added `ensureOptimizablePresetFromContext(context)`:
    - existing owned/saved presets reuse their real preset key
    - AI candidates/read-only contexts get a temporary front-end preset key `__optimize_<source id>`
    - temporary preset metadata preserves `originalModelId`, `originalModelLabel`, and `originalModelNumericId`
  - Added `openModelActionOptimization(context)`:
    - switches to simulation page
    - loads 5 years of history for the model's own symbol
    - opens the existing parameter optimization range editor
  - The final save still goes through the existing `saveOptimizationPreset()` path, which creates a new saved model via `saveGeneratedPreset()`.

Behavioral guarantee:

- Optimization does not overwrite the original AI scan row or the source preset.
- The optimized result is only persisted when the user clicks `保存优化参数`, and it is saved as a new model.

## Fixed-Start Daily Model Validation

User accepted the recommendation to stop using rolling windows as the decisive model-validity
test, and asked to deploy the improvement.

Implementation order:

1. Added the persistent validation state table helper.
2. Added the daily validation script.
3. Wired server startup and admin scheduled-job registry.
4. Exposed daily validation state in watch/model-list API responses.
5. Updated the 15-minute watch-alert script so it no longer auto-disables watches from a rolling
   252-day validity check.
6. Added frontend model-list display for cumulative/new validation state.

Local changes:

- `scripts/shared/model-validation-state.js`
  - New `model_validation_states` table.
  - One row per subject: `ai_scan`, `owned_preset`, or `watch`.
  - Stores immutable original validation dates plus latest cumulative and incremental metrics.
- `scripts/universe/run-model-validation-daily.js`
  - New cron/manual script.
  - Targets:
    - all AI qualified models from `optimization_scan_results` where `source='validated-search'`
      and `reached_target=true`;
    - all owned qualified presets with `preset_validation_snapshots.reached_target=true`;
    - all active non-index symbol watches.
  - Uses fixed-start cumulative validation from the original validation start date through the
    latest trade date.
  - Separately records incremental validation for rows after the original validation end date.
  - Does not call AI, search new parameters, edit model configs, delete models, or stop watches.
  - For `subject_type='watch'`, also mirrors `status='invalid'` into the legacy
    `watch_alerts.is_invalid/invalid_reason` fields and clears those fields when daily validation
    returns non-invalid, so older watch UI state does not keep showing a stale invalid flag.
- `server.js`
  - Ensures `model_validation_states` exists at startup.
  - Adds admin scheduled job `modelValidationDaily` with display schedule `每天 18:30`.
  - `/api/model-list` now returns `dailyValidation` for owned models, followed watches, and watch
    rows when available.
  - `/api/watch-alerts` now also returns each watch's daily validation state.
- `scripts/universe/run-watch-alerts.js`
  - Loads `model_validation_states` at startup.
  - Joins daily validation state for active symbol watches.
  - Keeps signal detection and account simulation unchanged.
  - No longer runs the old trailing-window validity test as a decisive check.
  - No longer auto-stops a watch simply because validity is invalid; it only mirrors the daily
    status into compatibility fields.
- `public/app.js`
  - Adds model-list UI for `dailyValidation`: status, latest trade date, cumulative days,
    cumulative annualized return, cumulative drawdown/trades, incremental days/annualized/trades,
    and reason.
  - Also shows each watch row's own daily validation state.
- `public/styles.css`
  - Adds responsive wrapping for the daily validation reason.
- `public/index.html`
  - Bumps `app.js` cache string to `20260906-fixed-validation`.

Status logic:

- `valid`: cumulative fixed-start validation still clears the annualized target, or new evidence
  is still too small to overturn the original validation.
- `watching`: cumulative annualized has slipped below target, but the newly-added period does not
  yet have enough days/trades to decide.
- `warning`: enough new evidence exists and either cumulative return, incremental return, or
  drawdown is weak, but not enough combined evidence to mark invalid.
- `invalid`: enough new evidence exists and cumulative annualized is below target plus either the
  incremental return is materially weak or drawdown broke the original drawdown reference.
- No buy-and-hold comparison is used in this daily validity decision.

Verification:

- `node --check scripts/universe/run-model-validation-daily.js` passed.
- `node --check scripts/universe/run-watch-alerts.js` passed.
- `node --check server.js` passed.
- `node --check public/app.js` passed.
- `git diff --check` passed.
- Local dry-run could not connect because local Postgres on `localhost:15432` refused the
  connection; run the database dry-run inside the production container after deploy.

## Trade Record Trigger Indicator Evidence

User asked for trade records to show the actual indicator value behind rules such as:

- `8日未创新低天数==5`
- `6日未创新高天数==3`

Local changes:

- `scripts/universe/engine.js`
  - Added rule-evidence helpers for block/score rule conditions.
  - Block-rule buy/sell trade reasons now append the actual trigger-day indicator values, e.g.
    `买入规则1触发：8日未创新低天数==5（指标：8日未创新低天数=5天） → 调仓到1000股`.
  - Score-rule hit descriptions also include each matched rule's indicator values.
- `public/app.js`
  - Mirrored the same evidence helpers into the browser-side backtest engine so local/history
    simulations show the same trade-record text as server-side saved runs.
- `public/index.html`
  - Bumped `app.js` cache string to `20260906-trade-indicators`.

Verification:

- `node --check scripts/universe/engine.js` passed.
- `node --check public/app.js` passed.
- `git diff --check` passed.
- A synthetic local backtest produced:
  - `买入规则1触发：8日未创新低天数==5（指标：8日未创新低天数=5天） → 调仓到1000股`
  - `卖出规则1触发：6日未创新高天数==3（指标：6日未创新高天数=3天） → 全部清仓`

## Trade Chart Indicator Reference Overlay

User wants the trade-record price curve to make the trigger indicators visually auditable, not
just show the final reason text.

Local changes:

- `public/app.js`
  - Added `daysSinceNewHigh` support to the model-trades streak-condition collector.
  - Added rolling high-point series using the same `computeRollingExtremeIndices(..., excludeCurrent=true)`
    convention as the engine, so "today" never counts as its own reference.
  - The model trade price chart now supports:
    - N-day low reference line for `daysSinceNewLow`;
    - N-day high reference line for `daysSinceNewHigh`;
    - per-candle tooltip/click detail showing reference price, reference date, today's high/low,
      whether the reference was broken, and the current streak count.
  - Latest rule stats now include both low and high reference date/price when those conditions
    exist.
- `public/index.html`
  - Added legend item for `N日最高价参考线`.
  - Bumped `app.js` cache string to `20260906-chart-indicators`.
- `public/styles.css`
  - Added high-reference-line and legend color styles.

Verification:

- `node --check public/app.js` passed.
- `git diff --check` passed.

## Local Validated Search - US Qualified + QQQ

User asked to start a new validated-search scan for the 9 currently qualified US symbols plus QQQ, using the same parameters as the previous scan.

Targets:

- `NET,TSLA,CRWD,ARM,AVGO,TSM,ASX,GOOG,AMD,QQQ`

Parameters copied from the previous `scripts/universe/validatedSearch.log` run:

- `targetPercent=50`
- `upsideThresholdPercent=30`
- `drawdownTolerancePercent=5`
- `attemptsPerSymbol=60`
- `maxAttempts=2000`
- `candidates=10000` (user changed this from the previous run's `400`)
- `pointCount=5`
- `trainYears=4`
- `testYears=2`
- `--save`

Operational notes:

- First attempted process did not load `.env.local`, so it had no `OPENAI_API_KEY`/`DEEPSEEK_API_KEY`, produced `summary: []`, and exited. No useful records were saved.
- A second process started with `candidates=400` as PID `34356`; user then requested `candidates=10000`. PID `34356` was stopped while still on `NET`.
- Restarted correctly with `node --env-file=.env.local` and `--candidates=10000`.
- Running process:
  - PID `40420`
  - stdout log `C:\Users\victor\AppData\Local\Temp\ai_trade_validatedSearch_us9_qqq_candidates10000_20260906_022140.log`
  - stderr log `C:\Users\victor\AppData\Local\Temp\ai_trade_validatedSearch_us9_qqq_candidates10000_20260906_022140.err`
  - started local time `2026-09-06 02:21:40 -04:00`
- Initial log confirmed `candidates=10000`, currently on `NET`, and no API-key error.
- Completion check:
  - PID `40420` is no longer running.
  - `data/validated-search-progress.json` reports `status=done`, `10/10` symbols processed, `600` AI calls, `15` saved, `0` data-skipped, `12` AI errors.
  - Server DB (`172.105.9.107`, container `ai_trade_postgres`) confirms `15` rows saved after `2026-09-06 02:21:40-04`, `10` reached target, covering `9` distinct symbols.
  - Target-met saved rows: `NET` 1, `CRWD` 7, `ARM` 1, `AMD` 1.
  - Best-so-far below-target rows: `TSLA`, `AVGO`, `ASX`, `GOOG`, `QQQ`.

Operational notes:

- No local scan process was stopped or restarted for this update.
- No server deployment was performed for this update yet.

## Watch Validity Logic Update

The user asked to remove this model-validity rule:

- `模型最近一年收益率必须高于同期买入持有收益率`

Local changes:

- `scripts/universe/run-watch-alerts.js`
  - Removed `beatsReturn` from `evaluateModelValidity()`.
  - Removed the invalid reason text `实际年化收益 ... 未跑赢同期买入持有 ...`.
  - A watch is now invalid only when it fails one of the remaining gates:
    - trailing-year annualized return must clear `30%` of that symbol's upside deviation
    - trailing-year max drawdown must stay below buy-and-hold max drawdown * `1.05`
  - Buy-and-hold is still calculated for the drawdown gate.
- `server.js`
  - Updated comments describing `is_invalid`.
- `public/app.js`
  - Updated the watch-list explanation comment for invalid watches.

Verification:

- `node --check scripts/universe/run-watch-alerts.js` passed.
- `node --check server.js` passed.
- `node --check public/app.js` passed.
- `git diff --check` passed.
- Recomputed local watch `watch_20d00957b54003372c46ecd57de723e5` (`002463`) with the new rule:
  - model return/annualized: `62.394%`
  - buy-hold return: `100.429%`
  - required annualized by upside gate: `15.141%`
  - passes upside gate: `true`
  - model max drawdown: `37.679%`
  - allowed drawdown: `39.591%`
  - passes drawdown gate: `true`
  - `invalidByNewLogic=false`

Operational notes:

- No local scan process was stopped or restarted for this update.
- No deployment was performed for this update yet.

## App Server Deployment Attempt - Commit 40d5e09

The user asked to push/deploy commit `40d5e09 调整盯盘创建和时效判断` to both app servers.

`172.105.9.107`:

1. Verified SSH connectivity and running Docker container `ai_trade`.
2. Backed up current container files to:
   - `/tmp/ai_trade_backup_before_40d5e09`
3. Uploaded deploy files to:
   - `/tmp/ai_trade_deploy_40d5e09`
4. Deployed these files into the `ai_trade` container:
   - `/app/server.js`
   - `/app/public/app.js`
   - `/app/public/index.html`
   - `/app/public/styles.css`
   - `/app/scripts/universe/run-watch-alerts.js`
5. Validated inside the container:
   - `node --check /app/server.js`
   - `node --check /app/public/app.js`
   - `node --check /app/scripts/universe/run-watch-alerts.js`
6. Restarted only `ai_trade`.
7. Verified:
   - `http://127.0.0.1/` returned `200` on the server.
   - `http://127.0.0.1/api/model-list` returned `401`.
   - Public `http://172.105.9.107/api/model-list` returned `401`.
   - `/app/public/index.html` contains `20260905-watch-detail`.
   - `/app/public/app.js` contains `createOrOpenWatchAlert`.
   - `/app/scripts/universe/run-watch-alerts.js` no longer contains `beatsReturn`.

`139.177.195.223`:

- Deployment still blocked.
- HTTP is reachable, but the backend is still old:
  - `http://139.177.195.223/api/model-list` returns `404`.
- SSH port 22 remains unreachable:
  - Local `Test-NetConnection 139.177.195.223 -Port 22`: `TcpTestSucceeded=False`, `PingSucceeded=True`.
  - Direct SSH from this machine times out.
  - SSH from `172.105.9.107` to `139.177.195.223` also times out.
- No files were changed on 139 during this attempt.

## Watch Dialog Mobile Scroll Update

The user reported that the watch-alerts dialog cannot scroll on mobile and asked how to share a watch.

Local changes:

- `public/index.html`
  - Added `watch-alerts-dialog` class to `#watchAlertsDialog`.
  - Updated the watch dialog hint to say users can expand their own watch and generate a share link.
  - Bumped CSS asset query string to `20260906-watch-scroll`.
- `public/styles.css`
  - Added watch-dialog-specific layout:
    - `height: 100dvh`
    - fixed grid rows with the watch list as `minmax(0, 1fr)`
    - `#watchAlertsList` / `.admin-ranking-list` scrolls inside the dialog
    - touch scrolling enabled via `-webkit-overflow-scrolling: touch`
  - Added mobile styles for the watch dialog:
    - full-width form controls/buttons
    - wrapped summary text
    - wrapped action buttons

User-facing share flow:

1. Open `设置盯盘提醒`.
2. Stay on `我的盯盘提醒`.
3. Expand the target watch row.
4. Click `生成分享链接` or `复制分享链接`.
5. Send that link to the other user.
6. The recipient opens the link and logs in; it follows the watch without exposing hidden model parameters.

Verification:

- `git diff --check` passed.

## Model List Validation Snapshot Backfill

User reported that models saved from "AI 已达标"/validated-search can still show "暂无验证记录" in the "模型列表" page, even after running "历史模拟".

Root cause:

- "模型列表" renders validation from `preset_validation_snapshots`.
- "历史模拟"/"重新加载历史模拟" runs an ad-hoc backtest for display and does not write `preset_validation_snapshots`.
- The normal "重新验证" API writes `preset_validation_snapshots` only when `presetId` is present and `trainYears + testYears >= 6`.
- AI validated-search rows already have their validation data in `optimization_scan_results`, but saving one as a personal `strategy_presets` row did not copy that data into `preset_validation_snapshots`.

Local fix:

- `server.js`
  - Added `backfillPresetValidationSnapshotsFromScanResults(ownerUserId, presetId = null)`.
  - Saving `/api/presets` now backfills a missing validation snapshot when the saved preset's `original_model_id` points to an `optimization_scan_results.id`.
  - Opening `/api/model-list` backfills existing saved personal models that already have that relationship but no snapshot yet.
  - Copying a public model now copies the source preset's validation snapshot to the new private copy.

Operational notes:

- No local scan process was stopped or restarted for this change.
- Read-only local DB check found 20 existing active personal models that can be backfilled from `optimization_scan_results`.
- `node --check server.js` passed.

## Model List "验证收益" Button

User asked to replace the per-card "历史模拟" button in "模型列表" with a revalidation button named "验证收益".

Local changes:

- `public/app.js`
  - In both "我的模型" and "跟盘模型" card actions, replaced the model-list `simulate` action button label/action with `revalidate` and display text "验证收益".
  - Added `openModelListRevalidate(model, role)` to open the existing "重新验证" dialog with the model-list row's symbol/config.
  - Revalidation snapshots are only saved when the current viewer owns the model; followed/public rows still show the verification result but do not claim it was saved.
- `public/index.html`
  - Bumped `app.js` cache version to `20260906-model-list-revalidate`.

Verification:

- `node --check public/app.js` passed.
- `git diff --check` passed.
