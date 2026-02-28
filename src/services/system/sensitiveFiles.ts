/**
 * 敏感文件保护系统
 * 防止意外读取、写入或编辑敏感文件（密钥、证书、环境变量等）
 */

import path from 'node:path';

/**
 * 默认敏感文件模式
 */
const DEFAULT_SENSITIVE_PATTERNS: string[] = [
  '.env',
  '.env.*',
  '.env.local',
  '.env.production',
  '.env.staging',
  'credentials*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '*.jks',
  '.git/hooks/*',
  '**/id_rsa*',
  '**/id_ed25519*',
  '**/id_ecdsa*',
  '.npmrc',
  '.pypirc',
  '.netrc',
  '.aws/credentials',
  '.ssh/config',
  '*.keystore',
  'secrets.*',
  'secret_key*',
  'service-account*.json',
  'gcloud-service-key.json',
];

/**
 * 匹配敏感文件模式
 * 支持简单通配符: * 和 **
 */
function matchPattern(filePath: string, pattern: string): boolean {
  // 规范化路径分隔符
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // 将 glob 模式转为正则
  const regexStr = normalizedPattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '§§') // 临时标记
    .replace(/\*/g, '[^/]*')
    .replace(/§§/g, '.*')
    .replace(/\?/g, '[^/]');

  const regex = new RegExp(`(^|/)${regexStr}$`, 'i');
  return regex.test(normalizedPath);
}

/**
 * 判断文件是否为敏感文件
 * @param filePath 相对或绝对文件路径
 * @param extraPatterns 额外的保护模式（追加到默认列表）
 */
export function isSensitiveFile(filePath: string, extraPatterns?: string[]): boolean {
  const patterns = extraPatterns
    ? [...DEFAULT_SENSITIVE_PATTERNS, ...extraPatterns]
    : DEFAULT_SENSITIVE_PATTERNS;

  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');

  for (const pattern of patterns) {
    // 对纯文件名模式，匹配 basename
    if (!pattern.includes('/') && !pattern.includes('**')) {
      if (matchPattern(basename, pattern)) {
        return true;
      }
    }
    // 对路径模式，匹配完整路径
    if (matchPattern(normalized, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * 验证文件访问权限
 * @param workdir 工作目录
 * @param filePath 文件路径（相对于工作目录）
 * @param operation 操作类型
 * @throws 如果文件受保护
 */
export function validateFileAccess(
  _workdir: string,
  filePath: string,
  operation: 'read' | 'write' | 'edit'
): void {
  if (isSensitiveFile(filePath)) {
    throw new Error(
      `安全保护: 不允许${operation === 'read' ? '读取' : operation === 'write' ? '写入' : '编辑'}敏感文件 "${filePath}"。` +
      `\n该文件匹配敏感文件保护规则。如需操作此文件，请手动进行。`
    );
  }
}

/**
 * 获取默认敏感文件模式列表（用于提示词展示）
 */
export function getSensitivePatterns(): string[] {
  return [...DEFAULT_SENSITIVE_PATTERNS];
}
