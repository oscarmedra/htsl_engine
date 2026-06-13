/**
 * Tiny **safe** math-expression evaluator (no `eval`, no `Function`, no globals).
 *
 * It compiles a string like `"sin(x)*cos(y)"` once into a closure that maps a
 * variable scope to a number, so a curve/surface can be sampled at many points
 * cheaply. This keeps the engine's guarantee intact: HTSL content is **data**,
 * interpreted by a restricted interpreter — never arbitrary JavaScript.
 *
 * Supported: `+ - * / % ^` (^ = power, right-assoc), unary `-`, parentheses,
 * variables, constants (`pi`, `e`, `tau`, `phi`) and the usual functions
 * (`sin cos tan asin acos atan atan2 sinh cosh tanh exp log ln log10 sqrt cbrt
 * abs sign floor ceil round min max pow mod hypot`).
 */
export type CompiledExpr = (scope: Record<string, number>) => number;

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
};

type Fn = (...a: number[]) => number;
const FUNCTIONS: Record<string, Fn> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, log: Math.log, ln: Math.log, log10: Math.log10,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, sign: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max, pow: Math.pow, hypot: Math.hypot,
  mod: (a, b) => ((a % b) + b) % b,
};

/* -------------------------------------------------------------------------- */
/* Tokenizer                                                                   */
/* -------------------------------------------------------------------------- */

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9.eE+\-]/.test(src[j]!)) {
        // allow exponent (1e-3) but stop a stray +/- that is not part of one
        const ch = src[j]!;
        if ((ch === "+" || ch === "-") && !/[eE]/.test(src[j - 1]!)) break;
        j++;
      }
      const num = Number(src.slice(i, j));
      if (!Number.isFinite(num)) throw new Error(`nombre invalide : ${src.slice(i, j)}`);
      toks.push({ t: "num", v: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j]!)) j++;
      toks.push({ t: "id", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/%^(),".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new Error(`caractère inattendu dans l'expression : "${c}"`);
  }
  return toks;
}

/* -------------------------------------------------------------------------- */
/* Recursive-descent parser → closure                                          */
/* -------------------------------------------------------------------------- */

class Parser {
  private pos = 0;
  constructor(private readonly toks: Tok[]) {}

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  private eat(): Tok {
    const t = this.toks[this.pos++];
    if (!t) throw new Error("expression incomplète");
    return t;
  }
  private isOp(v: string): boolean {
    const t = this.peek();
    return t?.t === "op" && t.v === v;
  }

  parse(): CompiledExpr {
    const e = this.expr();
    if (this.pos !== this.toks.length) throw new Error("expression mal formée");
    return e;
  }

  private expr(): CompiledExpr {
    let left = this.term();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.eat().v;
      const right = this.term();
      const l = left;
      left = op === "+" ? (s) => l(s) + right(s) : (s) => l(s) - right(s);
    }
    return left;
  }

  private term(): CompiledExpr {
    let left = this.unary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("%")) {
      const op = this.eat().v;
      const right = this.unary();
      const l = left;
      left =
        op === "*"
          ? (s) => l(s) * right(s)
          : op === "/"
            ? (s) => l(s) / right(s)
            : (s) => l(s) % right(s);
    }
    return left;
  }

  // Unary minus binds *looser* than `^`, so `-2^2` = -(2^2) = -4.
  private unary(): CompiledExpr {
    if (this.isOp("-")) {
      this.eat();
      const u = this.unary();
      return (s) => -u(s);
    }
    if (this.isOp("+")) {
      this.eat();
      return this.unary();
    }
    return this.power();
  }

  private power(): CompiledExpr {
    const base = this.atom();
    if (this.isOp("^")) {
      this.eat();
      const exp = this.unary(); // right-associative, exponent may be unary (2^-3)
      return (s) => Math.pow(base(s), exp(s));
    }
    return base;
  }

  private atom(): CompiledExpr {
    const t = this.eat();
    if (t.t === "num") {
      const v = t.v;
      return () => v;
    }
    if (t.t === "id") {
      const name = t.v;
      if (this.isOp("(")) {
        this.eat();
        const args: CompiledExpr[] = [];
        if (!this.isOp(")")) {
          args.push(this.expr());
          while (this.isOp(",")) {
            this.eat();
            args.push(this.expr());
          }
        }
        if (!this.isOp(")")) throw new Error("')' manquant");
        this.eat();
        const fn = FUNCTIONS[name];
        if (!fn) throw new Error(`fonction inconnue : ${name}`);
        return (s) => fn(...args.map((a) => a(s)));
      }
      if (name in CONSTANTS) {
        const v = CONSTANTS[name]!;
        return () => v;
      }
      return (s) => s[name] ?? 0; // variable
    }
    if (t.t === "op" && t.v === "(") {
      const e = this.expr();
      if (!this.isOp(")")) throw new Error("')' manquant");
      this.eat();
      return e;
    }
    throw new Error(`jeton inattendu dans l'expression`);
  }
}

/** Compile a math expression into a reusable `(scope) => number` evaluator. */
export function compileExpr(src: string): CompiledExpr {
  return new Parser(tokenize(src)).parse();
}

/** Compile if possible, else a constant-0 function (so a bad formula never throws). */
export function safeExpr(src: string | undefined): CompiledExpr {
  if (!src) return () => 0;
  try {
    return compileExpr(src);
  } catch {
    return () => 0;
  }
}
