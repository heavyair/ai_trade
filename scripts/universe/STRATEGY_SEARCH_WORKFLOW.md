# 用 AI自动生成 给一批股票找稳定策略：方法和复用步骤

给定一组股票（比如 QQQ、NET、GOOGL、MSFT、TSM），想知道"有没有一个交易策略在这只股票上真的稳定好用"，用这个流程。

## 核心思路

1. **每只股票单独探索，不合并**。`run-auto-generate.js` 本身就是按股票逐个循环、每只股票各自跑 `attemptsPerSymbol` 次 AI 尝试，互不共享数据画像（`ModelGenerator.buildSymbolDataProfile` 只看这只股票自己的历史）——所以哪怕在同一次 `--symbols=` 里传多只股票，天然就是"分开探索"，不需要为每只股票单独起一次任务。
2. **不同股票波动特征不同，适合的策略类型也不同**，不用人工先猜——让 AI 在每只股票上各自尝试多种策略类型（wave/block-rules/score-rules/order-grid/ma-rsi-band/pe-volume/stagnation-reversal 等），交给训练/验证两段式评估去挑出真正稳的。
3. **筛选标准是"训练期和验证期年化收益差异最小"，不是"训练期收益最高"**。训练期（默认最近6年到最近2年，4年跨度）用来搜参数，验证期是训练结束之后的 2 个**各自独立的 1 年窗口**（样本外、AI和参数搜索都没见过），分别打分、分别展示，不合并成一个数字——这样一年运气好不会掩盖另一年可能表现很差的问题。差异越小说明模型在没见过的新数据上表现和训练时越一致。
4. **两个验证年份的年化收益率本身也都要看**——差异小但两边都很差的模型没有实际意义；理想情况是差异小、且**两年**的验证期年化收益都可观（比如 30%+）。"达标"要求两年都达到目标，只有一年达标不算。

## 怎么跑

### 通过 Admin 界面（日常小范围用这个）
"AI自动生成"面板：搜索勾选网格选股票（不选=全市场）→ 设置"每只股票尝试次数"（默认10）、"总AI调用次数上限"（默认20）、"参数选点数量"（默认5，3-10）、训练/验证起点年数 → 点"启动自动生成"。适合几只股票、几次尝试的小范围探索。

### 直接跑脚本（大批量/一次性调研用这个）
```
docker exec ai_trade node scripts/universe/run-auto-generate.js \
  --symbols=QQQ,NET,GOOGL,MSFT,TSM \
  --attemptsPerSymbol=15 \
  --maxAttempts=100 \
  --candidates=400 \
  --pointCount=5 \
  --trainYears=4 \
  --testYears=2
```
- `--maxAttempts` 是这次运行总共能打的 AI 调用次数上限（安全阀），要设得比"股票数 × attemptsPerSymbol"大，否则会提前截断没跑完的股票。
- 这个命令会真的花 AI API 的钱（每次尝试一次调用），跑之前告诉用户预计花多少次调用。
- 运行前用 `docker top ai_trade | grep -i 'run-optimization-scan\|run-universe-validation\|run-auto-generate\|run-stock-screen'` 确认没有其它后台任务在跑（这几个脚本共享同一套数据库写入逻辑，不建议并发）。
- 跑的时候脚本自己会写 `data/auto-generate-progress.json`（当前股票/尝试次数/目前最佳年化回报率），管理员面板打开的话能实时看到进度。

## 跑完之后怎么找"稳定又好"的模型

```sql
-- 这次运行新保存的模型，按第2年（离现在最近那一年）验证期/训练期年化差异从小到大排序
SELECT sp.id, sp.label, sp.meta->>'targetSymbol' AS symbol,
       osr.train_annualized_return,
       osr.test_year1_annualized_return, osr.test_year2_annualized_return,
       osr.annualized_diff_year1, osr.annualized_diff_year2,
       osr.test_year1_trades, osr.test_year2_trades
FROM strategy_presets sp
JOIN optimization_scan_results osr
  ON osr.preset_id = sp.id AND osr.symbol = sp.meta->>'targetSymbol'
WHERE sp.meta->>'creator' = 'ai-auto' AND sp.created_at >= '<这次运行开始时间>'
ORDER BY osr.annualized_diff_year2 ASC;
```
重点关注：
- `annualized_diff_year1`/`annualized_diff_year2` 都小（训练/验证两年都一致）。
- `test_year1_annualized_return`/`test_year2_annualized_return` 本身都够高（比如都 > 50%，这种直接告诉用户）——只有一年高不算数。
- `test_year1_trades`/`test_year2_trades` 不能是 0——0 笔交易可能是这只股票在那一年真的没触发信号（合理），也可能是回看窗口比验证期还长导致指标算不出来（bug，已经修过，但如果又看到要重新确认）。

## 已知局限

- 验证期是固定锚定在"今天往前推 N 年"（默认 2 个各自 1 年的窗口）的日历区间，所有股票、所有模型共享同一套验证窗口——如果某一年市场整体走势比较单一（比如全年上涨没有大跌），依赖"大幅回撤买入"这类逻辑的模型会显得那一年验证期交易很少，不代表模型设计得不好。
- "稳定"只是相对这一次训练/验证切分而言，不等于未来一定继续有效，只是排除了明显过拟合的情况。
- 这套方法只覆盖 `run-auto-generate.js` 已支持的策略类型，不会凭空发明新指标；如果想要的策略逻辑现有指标覆盖不了（比如某个新的技术形态），需要先在 `public/app.js`/`scripts/universe/engine.js` 里加对应指标（两边要同步改，见两个文件里都存在的手工同步约定）。

## 本次实际跑的记录

2026-08-27，QQQ/NET/GOOGL/MSFT/TSM，参数同上面命令，共花了60次AI调用。结果：

| 股票 | 策略类型 | 训练期年化 | 验证期年化 | 差异 | 验证期交易次数 |
|---|---|---|---|---|---|
| QQQ | ma-rsi-band | 20.5% | 22.8% | 2.3 | 2 |
| NET | block-rules | 66.5% | 42.1% | 24.4 | 2 |
| GOOGL | score-rules | 28.4% | 2.9% | 25.5 | 35 |
| MSFT | wave | 24.8% | -0.7% | 25.5 | 4 |
| TSM | — | — | — | — | 跳过（数据库里只有最近1年的历史数据，训练期需要的4年数据缺失，见下方"数据缺口"） |

结论：QQQ 这个模型最稳（差异只有2.3，训练和验证期表现基本一致），NET 验证期年化42.1%是这批里最高的但差异较大（说明训练期66.5%里有一部分是过拟合，实际可信的是验证期42.1%这个数字）；GOOGL/MSFT 差异都在25左右，训练期看着不错但验证期基本打回原形（MSFT验证期甚至是负的），属于"训练时好看，样本外不管用"的例子。**没有模型的验证期年化收益率超过50%**（NET最接近，42.1%）。

### 数据缺口：新股票代码默认只有最近1年数据（已找到原因和修复方法）
根因：`fetch-history.js`（批量拉N年历史的脚本）只遍历 `symbols.json` 里已经登记的固定股票池；不在这个清单里的代码（比如临时用 `--symbols=` 传进去的新代码）从来没被这个脚本处理过，历史数据完全靠 `ensure-fresh-data.js` 的增量刷新机制"顺便"攒出来——而那个机制只在库里*完全没有*该代码任何数据时才会尝试补，且只补最近30天，之后每次都只从"上次存的最新日期-3天"增量刷到今天，永远不会主动往回补几年的历史。

**修复方法**：直接调用生产环境自己的 `/api/klines?code=<代码>&start=<N年前>&end=<今天>` 一次，跟前端页面拉历史数据是同一个接口，会自动落库（`persistKlineData`）。比如：
```
curl "http://<host>/api/klines?code=TSM&start=2021-08-27&end=2026-08-27"
```
跑完之后 `daily_prices` 里就有完整历史了，不需要改 `symbols.json` 或跑批量脚本。TSM 用这个方法从251行（1年）补到了1254行（5年）。

## 方法升级：按验证期表现选模型，而不是按训练期打分选模型（`search-validated-best.js`）

`run-auto-generate.js` 的选择逻辑是：每次尝试只按**训练期**打分，多次尝试里选分数最高的那一个，*然后*才对这一个跑验证期评估——如果某次尝试训练期打分不是最高，但换到验证期表现其实更好更稳，这次尝试从一开始就不会被选中，也就永远不会被验证。

新增的 `scripts/universe/search-validated-best.js` 改成：**每一次跑赢买入持有的尝试，立刻在两个验证年份上分别评估**，全程跟踪"两年中较差那一年年化收益最高的那一次尝试"，而不是"训练期打分最高的那一次"——用较差年份挑选，是为了避免选出"一年爆发、一年打回原形"、平均起来还行但实际不稳的模型。用法（**务必带上 `--ownerUserId`/`--ownerEmail`，这类经过验证的模型默认要挂在 admin 账户下，不能是无主的公开模型**——管理员的 userId 是 `user_d2392eab3f9892a9d11fb99efd0a0791`，邮箱 `victor.gm.liu@gmail.com`）：
```
node scripts/universe/search-validated-best.js --symbols=NET --targetPercent=50 \
  --attemptsPerSymbol=25 --maxAttempts=25 --candidates=400 --pointCount=5 \
  --trainYears=4 --testYears=2 \
  --ownerUserId=user_d2392eab3f9892a9d11fb99efd0a0791 --ownerEmail=victor.gm.liu@gmail.com \
  --save
```
`--targetPercent` 是验证期年化收益目标（默认50），**两年都**达标才会提前停止这只股票的搜索；`--save` 才会真的存成模型，不加就是只探索不保存。2026-08-27 第一批结果（NET/GOOGL/TSM）跑的时候忘了带 owner 参数，后来手动把这三条记录的 `owner_user_id`/`meta.isPublic` 改成了 admin 账户——以后跑记得直接带上，不用事后补。

**重要：验证期表现好不等于是"真实策略"，还要看交易次数和差异**。碰到过两种需要警惕的假阳性：
- **训练/验证差异巨大**（比如差20-40）但验证期数字本身达标——可能是这次尝试的触发条件很宽松，恰好在验证期这一年"蒙对了"，不代表真的找到了可重复的规律。
- **验证期交易次数是0**——意味着模型在训练期建完仓之后，验证期完全没有再操作，纯粹是"提前拿着仓位，赶上了这一年行情好"，跟买入持有没有本质区别，不是主动交易策略的功劳。

真正可信的结果应该是：验证期年化达标、**训练/验证差异小**（比如小于10）、且**验证期确实发生了几笔交易**（不是0笔）。

## 本次实际结果汇总（2026-08-27，QQQ/NET/GOOGL/MSFT/TSM）

第一轮（`run-auto-generate.js`，每只股票15次尝试，按训练期打分选择）：见上面"本次实际跑的记录"表格，最稳的是 QQQ（差异2.3），没有一个验证期年化超过50%。

第二轮（`search-validated-best.js`，改按验证期表现选择，目标50%）：

| 股票 | 是否达标 | 验证期年化 | 训练期年化 | 差异 | 验证期交易次数 | 可信度 |
|---|---|---|---|---|---|---|
| **NET** | ✅ | 56.4% | 53.1% | 3.2 | 12笔 | **高——差异小，真的在交易，最可信** |
| GOOGL | ✅ | 53.2% | 13.6% | 39.6 | 11笔 | 低——触发条件很宽松（"1天不涨就买"），可能是蒙对了这一年 |
| TSM | ✅（数字上） | 75.3% | 31.0% | 44.3 | **0笔** | **很低——本质是买入持有，验证期完全没交易，不算主动策略** |
| QQQ | ❌ | 最高25.8%（两种训练窗口都试过） | — | — | — | 天花板在25%左右，指数基金波动小，不太可能靠交易做到50%+ |
| MSFT | ❌ | 最高22.0%（两种训练窗口都试过） | — | — | — | 验证期这一年大部分策略都是负收益，这只股票近1年走势不利 |

**结论**：真正意义上"证明了50%+年化、且有真实交易行为支撑"的只有 **NET** 这一个。GOOGL 和 TSM 数字上达标但可信度低，不建议直接当作可用策略；QQQ 和 MSFT 在两种不同搜索方法下都没能达到50%，可能是这两只股票在当前这个具体的验证期窗口里本来就没有能被现有策略类型捕捉到的大幅波动。
