/**
 * permissions — 权限系统统一导出
 */

export { DANGEROUS_BASH_PATTERNS, CROSS_PLATFORM_CODE_EXEC, matchDangerousPattern, detectCommandInjection } from './dangerousPatterns.js';
export { classifyBashCommand, shouldAskPermission } from './bashClassifier.js';
export type { ClassifierResult, ClassifierBehavior, RiskLevel } from './bashClassifier.js';
