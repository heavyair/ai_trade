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
