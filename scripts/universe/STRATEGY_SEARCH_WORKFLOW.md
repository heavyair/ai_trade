# 用 AI自动生成 给一批股票找稳定策略：方法和复用步骤

给定一组股票（比如 QQQ、NET、GOOGL、MSFT、TSM），想知道"有没有一个交易策略在这只股票上真的稳定好用"，用这个流程。

## 核心思路

1. **每只股票单独探索，不合并**。`run-auto-generate.js` 本身就是按股票逐个循环、每只股票各自跑 `attemptsPerSymbol` 次 AI 尝试，互不共享数据画像（`ModelGenerator.buildSymbolDataProfile` 只看这只股票自己的历史）——所以哪怕在同一次 `--symbols=` 里传多只股票，天然就是"分开探索"，不需要为每只股票单独起一次任务。
2. **不同股票波动特征不同，适合的策略类型也不同**，不用人工先猜——让 AI 在每只股票上各自尝试多种策略类型（wave/block-rules/score-rules/order-grid/ma-rsi-band/pe-volume/stagnation-reversal 等），交给训练/验证两段式评估去挑出真正稳的。
3. **筛选标准是"训练期和验证期年化收益差异最小"，不是"训练期收益最高"**。训练期（最近5年到最近1年，4年跨度）用来搜参数，验证期（最近1年，样本外、AI和参数搜索都没见过）用来检验是否稳定。差异越小说明模型在没见过的新数据上表现和训练时越一致。
4. **验证期年化收益率本身也要看**——差异小但两边都很差的模型没有实际意义；理想情况是差异小、且验证期年化收益本身也可观（比如 30%+）。

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
  --trainYearsAgo=5 \
  --testYearsAgo=1
```
- `--maxAttempts` 是这次运行总共能打的 AI 调用次数上限（安全阀），要设得比"股票数 × attemptsPerSymbol"大，否则会提前截断没跑完的股票。
- 这个命令会真的花 AI API 的钱（每次尝试一次调用），跑之前告诉用户预计花多少次调用。
- 运行前用 `docker top ai_trade | grep -i 'run-optimization-scan\|run-universe-validation\|run-auto-generate\|run-stock-screen'` 确认没有其它后台任务在跑（这几个脚本共享同一套数据库写入逻辑，不建议并发）。
- 跑的时候脚本自己会写 `data/auto-generate-progress.json`（当前股票/尝试次数/目前最佳年化回报率），管理员面板打开的话能实时看到进度。

## 跑完之后怎么找"稳定又好"的模型

```sql
-- 这次运行新保存的模型，按验证期/训练期年化差异从小到大排序
SELECT sp.id, sp.label, sp.meta->>'targetSymbol' AS symbol,
       osr.train_annualized_return, osr.test_annualized_return, osr.annualized_diff, osr.test_trades
FROM strategy_presets sp
JOIN optimization_scan_results osr
  ON osr.preset_id = sp.id AND osr.symbol = sp.meta->>'targetSymbol'
WHERE sp.meta->>'creator' = 'ai-auto' AND sp.created_at >= '<这次运行开始时间>'
ORDER BY osr.annualized_diff ASC;
```
重点关注：
- `annualized_diff` 小（训练/验证一致）。
- `test_annualized_return` 本身够高（比如 > 50%，这种直接告诉用户）。
- `test_trades` 不能是 0——0 笔交易可能是这只股票在验证期真的没触发信号（合理），也可能是回看窗口比验证期还长导致指标算不出来（bug，已经修过，但如果又看到要重新确认）。

## 已知局限

- 验证期是固定锚定在"今天往前推1年"的日历区间，所有股票、所有模型共享同一个验证窗口——如果这一年市场整体走势比较单一（比如全年上涨没有大跌），依赖"大幅回撤买入"这类逻辑的模型会显得验证期交易很少，不代表模型设计得不好。
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

### 数据缺口：TSM 历史数据只有最近1年
`daily_prices` 表里 TSM 只有 2025-08-27 到 2026-08-26 这251行，往前完全没有数据，导致训练期（需要5年）拿不到任何数据被跳过。原因待查——可能是数据源（akshare/yfinance桥接）对这个代码的默认抓取窗口有限，或者代码格式需要调整（比如台积电美股 ADR 是 TSM，但也可能需要别的代码格式）。下次要跑 TSM 得先确认/修复历史数据能不能拉全，不能直接假设跟其它美股一样能一次性拿到多年数据。
