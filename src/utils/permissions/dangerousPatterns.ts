/**
 * dangerousPatterns — 危险 shell 命令模式列表
 *
 * 用于检测允许规则中可能绕过安全分类的危险前缀。
 *
 * 例如：`Bash(python:*)` 允许通过 Python 运行任意代码。
 */

/**
 * 跨平台代码执行入口点（Unix + Windows 通用）
 */
export const CROSS_PLATFORM_CODE_EXEC = [
  // 解释器
  'python', 'python3', 'python2',
  'node', 'deno', 'tsx',
  'ruby', 'perl', 'php', 'lua',
  // 包运行器
  'npx', 'bunx',
  'npm run', 'yarn run', 'pnpm run', 'bun run',
  // 可达的 shell
  'bash', 'sh',
  // 远程任意命令
  'ssh',
] as const;

/**
 * Bash 危险模式列表
 * 包含所有可能执行任意代码的命令前缀
 */
export const DANGEROUS_BASH_PATTERNS: readonly string[] = [
  ...CROSS_PLATFORM_CODE_EXEC,
  'zsh', 'fish',
  'eval', 'exec', 'env',
  'xargs', 'sudo',
];

/**
 * 检查命令是否匹配危险模式
 * @param command - 待检查的命令字符串
 * @returns 匹配的危险模式，或 null
 */
export function matchDangerousPattern(command: string): string | null {
  const trimmed = command.trim().toLowerCase();
  for (const pattern of DANGEROUS_BASH_PATTERNS) {
    // 精确匹配或前缀匹配（后跟空格/特殊字符）
    if (trimmed === pattern || trimmed.startsWith(pattern + ' ') ||
        trimmed.startsWith(pattern + '\t') || trimmed.startsWith(pattern + ';') ||
        trimmed.startsWith(pattern + '|') || trimmed.startsWith(pattern + '&')) {
      return pattern;
    }
  }
  return null;
}

/**
 * 检查命令是否包含潜在的命令注入
 * 检测：管道、命令替换、重定向到敏感文件等
 */
export function detectCommandInjection(command: string): {
  detected: boolean;
  reason?: string;
} {
  // $(...) 或 `...` 命令替换
  if (/\$\(/.test(command) || /`[^`]+`/.test(command)) {
    return { detected: true, reason: '检测到命令替换 ($() 或 ``)' };
  }

  // 重定向到敏感路径
  const sensitiveRedirects = ['/etc/', '/root/', '~/.ssh/', '~/.aws/', '~/.env'];
  for (const path of sensitiveRedirects) {
    if (command.includes(`> ${path}`) || command.includes(`>> ${path}`)) {
      return { detected: true, reason: `检测到重定向到敏感路径: ${path}` };
    }
  }

  // 多命令链（; && || | 后跟危险命令）
  const parts = command.split(/[;&|]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    for (const part of parts.slice(1)) {
      const danger = matchDangerousPattern(part);
      if (danger) {
        return { detected: true, reason: `检测到链式危险命令: ${danger}` };
      }
    }
  }

  return { detected: false };
}
