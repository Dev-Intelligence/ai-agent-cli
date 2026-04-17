/**
 * Semver 比较小工具
 *
 * Node 环境默认用 npm `semver` 包（已在项目的间接依赖里），
 * Bun 环境优先走原生 Bun.semver（~20x 更快）。
 *
 * 所有比较默认 `loose: true`：接受如 "1.2" 这类不严格的版本号。
 */

declare global {
  // eslint-disable-next-line no-var
  var Bun:
    | {
        semver: {
          order(a: string, b: string): -1 | 0 | 1;
          satisfies(version: string, range: string): boolean;
        };
      }
    | undefined;
}

type NpmSemverLike = {
  gt(a: string, b: string, opts?: { loose?: boolean }): boolean;
  gte(a: string, b: string, opts?: { loose?: boolean }): boolean;
  lt(a: string, b: string, opts?: { loose?: boolean }): boolean;
  lte(a: string, b: string, opts?: { loose?: boolean }): boolean;
  satisfies(v: string, r: string, opts?: { loose?: boolean }): boolean;
  compare(a: string, b: string, opts?: { loose?: boolean }): -1 | 0 | 1;
};

let _npmSemver: NpmSemverLike | undefined;

async function getNpmSemver(): Promise<NpmSemverLike> {
  if (!_npmSemver) {
    const mod = (await import('semver')) as unknown as NpmSemverLike & {
      default?: NpmSemverLike;
    };
    _npmSemver = mod.default ?? mod;
  }
  return _npmSemver;
}

/** a > b */
export async function gt(a: string, b: string): Promise<boolean> {
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.semver.order(a, b) === 1;
  }
  return (await getNpmSemver()).gt(a, b, { loose: true });
}

/** a >= b */
export async function gte(a: string, b: string): Promise<boolean> {
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.semver.order(a, b) >= 0;
  }
  return (await getNpmSemver()).gte(a, b, { loose: true });
}

/** a < b */
export async function lt(a: string, b: string): Promise<boolean> {
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.semver.order(a, b) === -1;
  }
  return (await getNpmSemver()).lt(a, b, { loose: true });
}

/** a <= b */
export async function lte(a: string, b: string): Promise<boolean> {
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.semver.order(a, b) <= 0;
  }
  return (await getNpmSemver()).lte(a, b, { loose: true });
}

/** version 是否满足 range（如 ">=1.2 <2.0"） */
export async function satisfies(
  version: string,
  range: string,
): Promise<boolean> {
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.semver.satisfies(version, range);
  }
  return (await getNpmSemver()).satisfies(version, range, { loose: true });
}

/** 完整比较：a < b → -1、== → 0、> → 1 */
export async function order(a: string, b: string): Promise<-1 | 0 | 1> {
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.semver.order(a, b);
  }
  return (await getNpmSemver()).compare(a, b, { loose: true });
}
