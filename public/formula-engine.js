// Safe arithmetic-formula engine for "formula" block-rule/score-rule conditions.
// Lets AI-generated (or hand-edited) models express indicator logic that isn't in the
// fixed indicator whitelist (drawdownFromHigh/maValue/maSlope/...), without eval/Function
// or any form of arbitrary code execution — only a small whitelisted grammar is parsed and
// interpreted. A formula always evaluates to ONE NUMBER per trading day; the existing
// comparator/value/sustainedDays/streak machinery in the block-rules condition evaluator
// does the boolean/threshold part, so this engine never needs and/or/not of its own.
// Example this was built for: "最低价跌破10日均线连续3天" (the day's LOW breaking below
// the 10-day MA for 3 straight days) has no dedicated indicator — but
// `formula: "low - sma(close, 10)"`, comparator "<", value 0, sustainedDays 3 expresses it
// exactly, without a new hand-written getXxxSeries function.
//
// Grammar (pure arithmetic, no boolean/logical operators — "and" is expressed by putting
// two formula conditions in the same rule block, which is already AND there):
//   Expression      := Additive
//   Additive        := Multiplicative (("+"|"-") Multiplicative)*
//   Multiplicative  := Unary (("*"|"/") Unary)*
//   Unary           := "-"? Primary
//   Primary         := Number | FieldRef | FunctionCall | "(" Expression ")"
//   FieldRef        := Identifier ("[" "-"? IntegerLiteral "]")?   // offset must be <= 0 (no future data)
//   FunctionCall    := Identifier "(" Expression ("," Expression)* ")"
//
// Fields: close open high low volume pe peTtm pb (static OHLCV/valuation data only —
// positionRatio/holdingDays are deliberately NOT supported here: they're account-state
// values only known incrementally as a backtest runs, so they can't be precomputed as a
// full series the way this engine works; they remain usable only as a plain top-level
// indicator, not inside a formula).
// Functions: sma/ema/stdev/max/min/sum(expr, n) — n is a 1-250 integer literal, first arg
// can be any sub-expression (so sma(high - low, 10) is a valid "10-day average range");
// rsi(n)/atr(n) — fixed single integer-literal window, standard close/high-low-close
// formulas (not generalized to an arbitrary field); abs(expr).

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FormulaEngine = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MAX_FORMULA_LENGTH = 200;
  const MAX_AST_NODES = 40;
  const MAX_DEPTH = 8;
  const MIN_WINDOW = 1;
  const MAX_WINDOW = 250;

  const FIELDS = new Set(["close", "open", "high", "low", "volume", "pe", "peTtm", "pb"]);
  const WINDOW_FUNCS = new Set(["sma", "ema", "stdev", "max", "min", "sum"]);
  const FIXED_FUNCS = new Set(["rsi", "atr"]);
  const UNARY_FUNCS = new Set(["abs"]);

  function tokenize(input) {
    const tokens = [];
    let i = 0;
    const n = input.length;
    const singleCharMap = {
      "+": "plus", "-": "minus", "*": "star", "/": "slash",
      "(": "lparen", ")": "rparen", "[": "lbracket", "]": "rbracket", ",": "comma",
    };
    while (i < n) {
      const ch = input[i];
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        i += 1;
        continue;
      }
      if ((ch >= "0" && ch <= "9") || (ch === "." && i + 1 < n && input[i + 1] >= "0" && input[i + 1] <= "9")) {
        let j = i;
        let sawDot = false;
        while (j < n && ((input[j] >= "0" && input[j] <= "9") || (input[j] === "." && !sawDot))) {
          if (input[j] === ".") sawDot = true;
          j += 1;
        }
        tokens.push({ type: "number", value: Number(input.slice(i, j)) });
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        let j = i + 1;
        while (j < n && /[A-Za-z0-9_]/.test(input[j])) j += 1;
        tokens.push({ type: "ident", value: input.slice(i, j) });
        i = j;
        continue;
      }
      if (singleCharMap[ch]) {
        tokens.push({ type: singleCharMap[ch] });
        i += 1;
        continue;
      }
      throw new Error(`公式包含非法字符: "${ch}"`);
    }
    tokens.push({ type: "eof" });
    return tokens;
  }

  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.nodeCount = 0;
  }
  Parser.prototype.peek = function peek() {
    return this.tokens[this.pos];
  };
  Parser.prototype.expect = function expect(type) {
    const t = this.tokens[this.pos];
    this.pos += 1;
    if (!t || t.type !== type) throw new Error(`公式语法错误，期望 ${type}`);
    return t;
  };
  Parser.prototype.makeNode = function makeNode(node) {
    this.nodeCount += 1;
    if (this.nodeCount > MAX_AST_NODES) throw new Error("公式过于复杂（节点数超限）");
    return node;
  };

  Parser.prototype.parseProgram = function parseProgram() {
    const node = this.parseExpression(0);
    this.expect("eof");
    return node;
  };

  Parser.prototype.parseExpression = function parseExpression(depth) {
    if (depth > MAX_DEPTH) throw new Error("公式嵌套过深");
    return this.parseAdditive(depth + 1);
  };

  Parser.prototype.parseAdditive = function parseAdditive(depth) {
    let node = this.parseMultiplicative(depth);
    while (this.peek().type === "plus" || this.peek().type === "minus") {
      const isPlus = this.tokens[this.pos].type === "plus";
      this.pos += 1;
      const right = this.parseMultiplicative(depth);
      node = this.makeNode({ type: "binop", op: isPlus ? "+" : "-", left: node, right });
    }
    return node;
  };

  Parser.prototype.parseMultiplicative = function parseMultiplicative(depth) {
    let node = this.parseUnary(depth);
    while (this.peek().type === "star" || this.peek().type === "slash") {
      const isStar = this.tokens[this.pos].type === "star";
      this.pos += 1;
      const right = this.parseUnary(depth);
      node = this.makeNode({ type: "binop", op: isStar ? "*" : "/", left: node, right });
    }
    return node;
  };

  Parser.prototype.parseUnary = function parseUnary(depth) {
    if (this.peek().type === "minus") {
      this.pos += 1;
      const arg = this.parseUnary(depth);
      return this.makeNode({ type: "unary", op: "-", arg });
    }
    return this.parsePrimary(depth);
  };

  Parser.prototype.parsePrimary = function parsePrimary(depth) {
    if (depth > MAX_DEPTH) throw new Error("公式嵌套过深");
    const t = this.peek();
    if (t.type === "number") {
      this.pos += 1;
      return this.makeNode({ type: "number", value: t.value });
    }
    if (t.type === "lparen") {
      this.pos += 1;
      const node = this.parseExpression(depth + 1);
      this.expect("rparen");
      return node;
    }
    if (t.type === "ident") {
      this.pos += 1;
      const name = t.value;
      if (this.peek().type === "lparen") {
        this.pos += 1;
        const args = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseExpression(depth + 1));
          while (this.peek().type === "comma") {
            this.pos += 1;
            args.push(this.parseExpression(depth + 1));
          }
        }
        this.expect("rparen");
        return this.makeNode(this.buildCallNode(name, args));
      }
      let offset = 0;
      if (this.peek().type === "lbracket") {
        this.pos += 1;
        let sign = 1;
        if (this.peek().type === "minus") {
          this.pos += 1;
          sign = -1;
        }
        const numTok = this.expect("number");
        if (!Number.isInteger(numTok.value)) throw new Error("偏移量必须是整数");
        offset = sign * numTok.value;
        if (offset > 0) throw new Error("公式不能引用未来的数据（偏移量不能是正数）");
        this.expect("rbracket");
      }
      if (!FIELDS.has(name)) throw new Error(`未知字段: ${name}`);
      return this.makeNode({ type: "field", name, offset });
    }
    throw new Error("公式语法错误");
  };

  Parser.prototype.buildCallNode = function buildCallNode(name, args) {
    if (WINDOW_FUNCS.has(name)) {
      if (args.length !== 2) throw new Error(`${name} 需要2个参数`);
      const windowArg = args[1];
      if (windowArg.type !== "number" || !Number.isInteger(windowArg.value)
        || windowArg.value < MIN_WINDOW || windowArg.value > MAX_WINDOW) {
        throw new Error(`${name} 的第二个参数必须是 ${MIN_WINDOW}-${MAX_WINDOW} 的整数`);
      }
      return { type: "call", name, args };
    }
    if (FIXED_FUNCS.has(name)) {
      if (args.length !== 1) throw new Error(`${name} 需要1个参数`);
      const windowArg = args[0];
      if (windowArg.type !== "number" || !Number.isInteger(windowArg.value)
        || windowArg.value < MIN_WINDOW || windowArg.value > MAX_WINDOW) {
        throw new Error(`${name} 的参数必须是 ${MIN_WINDOW}-${MAX_WINDOW} 的整数`);
      }
      return { type: "call", name, args };
    }
    if (UNARY_FUNCS.has(name)) {
      if (args.length !== 1) throw new Error(`${name} 需要1个参数`);
      return { type: "call", name, args };
    }
    throw new Error(`未知函数: ${name}`);
  };

  function parseFormula(formula) {
    if (typeof formula !== "string" || formula.length === 0) throw new Error("公式不能为空");
    if (formula.length > MAX_FORMULA_LENGTH) throw new Error(`公式长度不能超过 ${MAX_FORMULA_LENGTH} 字符`);
    const tokens = tokenize(formula);
    const parser = new Parser(tokens);
    return parser.parseProgram();
  }

  function rollWindow(series, n, kind) {
    const values = new Array(series.length).fill(null);
    if (kind === "ema") {
      const alpha = 2 / (n + 1);
      let prev = null;
      for (let i = 0; i < series.length; i += 1) {
        const v = series[i];
        if (v === null || !Number.isFinite(v)) {
          prev = null;
          values[i] = null;
          continue;
        }
        prev = prev === null ? v : alpha * v + (1 - alpha) * prev;
        values[i] = prev;
      }
      return values;
    }
    for (let i = 0; i < series.length; i += 1) {
      if (i - n + 1 < 0) {
        values[i] = null;
        continue;
      }
      let ok = true;
      let sum = 0;
      let maxV = -Infinity;
      let minV = Infinity;
      const windowVals = kind === "stdev" ? [] : null;
      for (let j = i - n + 1; j <= i; j += 1) {
        const v = series[j];
        if (v === null || !Number.isFinite(v)) {
          ok = false;
          break;
        }
        sum += v;
        if (v > maxV) maxV = v;
        if (v < minV) minV = v;
        if (windowVals) windowVals.push(v);
      }
      if (!ok) {
        values[i] = null;
        continue;
      }
      if (kind === "sma") values[i] = sum / n;
      else if (kind === "sum") values[i] = sum;
      else if (kind === "max") values[i] = maxV;
      else if (kind === "min") values[i] = minV;
      else if (kind === "stdev") {
        const mean = sum / n;
        const variance = windowVals.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / n;
        values[i] = Math.sqrt(variance);
      }
    }
    return values;
  }

  // Same algorithm as public/app.js's getRsiSeries — a standalone copy because this module
  // must run without app.js (server.js/engine.js validate and evaluate formulas too).
  function getRsiSeriesLocal(rows, days) {
    const values = new Array(rows.length).fill(null);
    let gains = 0;
    let losses = 0;
    for (let index = 1; index < rows.length; index += 1) {
      const change = rows[index].close - rows[index - 1].close;
      gains += Math.max(0, change);
      losses += Math.max(0, -change);
      if (index > days) {
        const oldChange = rows[index - days].close - rows[index - days - 1].close;
        gains -= Math.max(0, oldChange);
        losses -= Math.max(0, -oldChange);
      }
      if (index >= days) {
        values[index] = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
      }
    }
    return values;
  }

  // Same algorithm as public/app.js's getAtrPercentSeries — see note above.
  function getAtrPercentSeriesLocal(rows, days) {
    const values = new Array(rows.length).fill(null);
    let sum = 0;
    rows.forEach((row, index) => {
      const previousClose = index > 0 ? rows[index - 1].close : row.close;
      const trueRange = Math.max(
        row.high - row.low,
        Math.abs(row.high - previousClose),
        Math.abs(row.low - previousClose)
      );
      sum += trueRange;
      if (index >= days) {
        const old = rows[index - days];
        const oldPreviousClose = index - days > 0 ? rows[index - days - 1].close : old.close;
        sum -= Math.max(
          old.high - old.low,
          Math.abs(old.high - oldPreviousClose),
          Math.abs(old.low - oldPreviousClose)
        );
      }
      values[index] = index + 1 >= days ? (sum / days / row.close) * 100 : null;
    });
    return values;
  }

  function evaluateNode(node, rows) {
    if (node.type === "number") {
      const v = node.value;
      return rows.map(() => v);
    }
    if (node.type === "field") {
      const { name, offset } = node;
      return rows.map((row, index) => {
        const targetIndex = index + offset;
        if (targetIndex < 0 || targetIndex >= rows.length) return null;
        const v = rows[targetIndex][name];
        return typeof v === "number" && Number.isFinite(v) ? v : null;
      });
    }
    if (node.type === "unary") {
      const arg = evaluateNode(node.arg, rows);
      return arg.map((v) => (v === null ? null : -v));
    }
    if (node.type === "binop") {
      const left = evaluateNode(node.left, rows);
      const right = evaluateNode(node.right, rows);
      return rows.map((row, i) => {
        const l = left[i];
        const r = right[i];
        if (l === null || r === null) return null;
        let result;
        if (node.op === "+") result = l + r;
        else if (node.op === "-") result = l - r;
        else if (node.op === "*") result = l * r;
        else result = r === 0 ? null : l / r;
        return result === null || Number.isFinite(result) ? result : null;
      });
    }
    if (node.type === "call") {
      const { name, args } = node;
      if (name === "abs") {
        const inner = evaluateNode(args[0], rows);
        return inner.map((v) => (v === null ? null : Math.abs(v)));
      }
      if (name === "rsi") return getRsiSeriesLocal(rows, args[0].value);
      if (name === "atr") return getAtrPercentSeriesLocal(rows, args[0].value);
      // window funcs: sma/ema/stdev/max/min/sum
      const inner = evaluateNode(args[0], rows);
      return rollWindow(inner, args[1].value, name);
    }
    throw new Error("未知的公式节点类型");
  }

  function compileFormulaSeries(rows, formula) {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    try {
      const ast = parseFormula(formula);
      const series = evaluateNode(ast, rows);
      return series;
    } catch (error) {
      return null;
    }
  }

  function validateFormula(formula) {
    try {
      parseFormula(formula);
      return true;
    } catch (error) {
      return false;
    }
  }

  return {
    compileFormulaSeries,
    validateFormula,
    MAX_FORMULA_LENGTH,
  };
});
