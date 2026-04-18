/**
 * 错误类与归一化工具
 *
 * 提供项目内一致的错误形状，以及 try/catch 块常用的短路判断：
 *   - isAbortError: 多种 abort 形态
 *   - isENOENT / isFsInaccessible: 文件系统典型错误
 *   - shortErrorStack: 把栈帧截短给模型看，省 context
 *   - classifyAxiosError: 给 axios 类请求做分类
 */

/** 项目通用基础错误 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 命令 / 参数解析出错 */
export class MalformedCommandError extends AppError {}

/** 主动中断 */
export class AbortError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * 判断是否任意一种 abort 形态：
 *   - 我们自己的 AbortError
 *   - 任意 Error 且 name === 'AbortError'（DOMException 也是这个形态）
 *
 * 不直接依赖 @anthropic-ai/sdk 的 APIUserAbortError，
 * 用 name 判断即可覆盖（SDK 侧也把 name 置为 AbortError 或子类）。
 */
export function isAbortError(e: unknown): boolean {
  if (e instanceof AbortError) return true;
  if (e instanceof Error && e.name === 'AbortError') return true;
  return false;
}

/**
 * 配置文件解析错误；携带文件路径与默认配置，便于上层回退。
 */
export class ConfigParseError extends Error {
  filePath: string;
  defaultConfig: unknown;

  constructor(message: string, filePath: string, defaultConfig: unknown) {
    super(message);
    this.name = 'ConfigParseError';
    this.filePath = filePath;
    this.defaultConfig = defaultConfig;
  }
}

/** Shell 命令执行失败 */
export class ShellError extends Error {
  constructor(
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly code: number,
    public readonly interrupted: boolean,
  ) {
    super('Shell 命令执行失败');
    this.name = 'ShellError';
  }
}

export function hasExactErrorMessage(e: unknown, message: string): boolean {
  return e instanceof Error && e.message === message;
}

/** 把任意 unknown 值归一为 Error，便于后续链式操作 */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

/** 只取错误的 message 字符串（日志 / UI 展示用） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * 抽 errno code（如 'ENOENT' / 'EACCES'）。
 * 替代 `(e as NodeJS.ErrnoException).code` 的常见强转。
 */
export function getErrnoCode(e: unknown): string | undefined {
  if (
    e &&
    typeof e === 'object' &&
    'code' in e &&
    typeof (e as { code?: unknown }).code === 'string'
  ) {
    return (e as { code: string }).code;
  }
  return undefined;
}

/** 是否为 ENOENT（文件/目录不存在） */
export function isENOENT(e: unknown): boolean {
  return getErrnoCode(e) === 'ENOENT';
}

/** 抽 errno path（触发错误的文件路径） */
export function getErrnoPath(e: unknown): string | undefined {
  if (
    e &&
    typeof e === 'object' &&
    'path' in e &&
    typeof (e as { path?: unknown }).path === 'string'
  ) {
    return (e as { path: string }).path;
  }
  return undefined;
}

/**
 * 只保留前 N 个栈帧。
 * 错误如果会作为 tool_result 回传给模型，完整栈常是 500-2000 字符
 * 的内部帧，纯浪费 context；截短能显著减少 token 消耗。完整栈留给
 * debug 日志。
 */
export function shortErrorStack(e: unknown, maxFrames = 5): string {
  if (!(e instanceof Error)) return String(e);
  if (!e.stack) return e.message;
  const lines = e.stack.split('\n');
  const header = lines[0] ?? e.message;
  const frames = lines.slice(1).filter((l) => l.trim().startsWith('at '));
  if (frames.length <= maxFrames) return e.stack;
  return [header, ...frames.slice(0, maxFrames)].join('\n');
}

/**
 * 判断是否为"路径不存在 / 不可达 / 无权限"类错误：
 *   ENOENT  路径不存在
 *   EACCES  无权限
 *   EPERM   操作不被允许
 *   ENOTDIR 路径中间某一段不是目录
 *   ELOOP   符号链接循环
 */
export function isFsInaccessible(e: unknown): boolean {
  const code = getErrnoCode(e);
  return (
    code === 'ENOENT' ||
    code === 'EACCES' ||
    code === 'EPERM' ||
    code === 'ENOTDIR' ||
    code === 'ELOOP'
  );
}

/** 把 axios 风格的请求错误归类 */
export type AxiosErrorKind =
  | 'auth' // 401/403
  | 'timeout' // ECONNABORTED
  | 'network' // ECONNREFUSED / ENOTFOUND
  | 'http' // 其它 axios 错误（可能带 status）
  | 'other'; // 非 axios 错误

export function classifyAxiosError(e: unknown): {
  kind: AxiosErrorKind;
  status?: number;
  message: string;
} {
  const message = errorMessage(e);
  if (
    !e ||
    typeof e !== 'object' ||
    !('isAxiosError' in e) ||
    !(e as { isAxiosError?: unknown }).isAxiosError
  ) {
    return { kind: 'other', message };
  }
  const err = e as { response?: { status?: number }; code?: string };
  const status = err.response?.status;
  if (status === 401 || status === 403) return { kind: 'auth', status, message };
  if (err.code === 'ECONNABORTED') return { kind: 'timeout', status, message };
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return { kind: 'network', status, message };
  }
  return { kind: 'http', status, message };
}
