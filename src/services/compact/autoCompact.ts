/**
 * autoCompact — 上下文告警与自动压缩阈值计算
 *
 * 但按当前项目已存在的 ContextCompressor 行为做最小适配：
 * - 保留“预留输出 token”概念
 * - TokenWarning 与自动压缩共用同一套阈值
 * - 当前项目自动压缩阈值仍以 80% 为默认触发点
 */

/** 为压缩摘要和模型输出预留的 token 数 */
export const RESERVED_OUTPUT_TOKENS = 16_384;
/** 进入 warning 的预警缓冲区 */
export const WARNING_THRESHOLD_BUFFER_TOKENS = 20_000;
/** 进入 error 的预警缓冲区 */
export const ERROR_THRESHOLD_BUFFER_TOKENS = 20_000;

/**
 * 获取有效上下文窗口大小
 * 扣除预留输出 token，避免把上下文吃满后没有响应空间。
 */
export function getEffectiveContextWindowSize(maxTokens: number): number {
  return Math.max(0, maxTokens - RESERVED_OUTPUT_TOKENS);
}

/**
 * 获取自动压缩阈值
 * 当前项目沿用 ContextCompressor 的百分比触发方式。
 */
export function getAutoCompactThreshold(
  maxTokens: number,
  thresholdPercentage = 80,
): number {
  const effectiveWindow = getEffectiveContextWindowSize(maxTokens);
  return Math.floor(effectiveWindow * (thresholdPercentage / 100));
}

export function calculateTokenWarningState(
  tokenUsage: number,
  maxTokens: number,
  options?: {
    thresholdPercentage?: number;
    autoCompactEnabled?: boolean;
  },
): {
  percentLeft: number;
  isAboveWarningThreshold: boolean;
  isAboveErrorThreshold: boolean;
  isAboveAutoCompactThreshold: boolean;
} {
  const thresholdPercentage = options?.thresholdPercentage ?? 80;
  const autoCompactEnabled = options?.autoCompactEnabled ?? true;
  const effectiveWindow = getEffectiveContextWindowSize(maxTokens);
  const autoCompactThreshold = getAutoCompactThreshold(
    maxTokens,
    thresholdPercentage,
  );
  const threshold = autoCompactEnabled ? autoCompactThreshold : effectiveWindow;

  const percentLeft = threshold > 0
    ? Math.max(0, Math.round(((threshold - tokenUsage) / threshold) * 100))
    : 0;

  const warningThreshold = Math.max(
    0,
    threshold - WARNING_THRESHOLD_BUFFER_TOKENS,
  );
  const errorThreshold = Math.max(
    0,
    threshold - ERROR_THRESHOLD_BUFFER_TOKENS,
  );

  return {
    percentLeft,
    isAboveWarningThreshold: tokenUsage >= warningThreshold,
    isAboveErrorThreshold: tokenUsage >= errorThreshold,
    isAboveAutoCompactThreshold:
      autoCompactEnabled && tokenUsage >= autoCompactThreshold,
  };
}
