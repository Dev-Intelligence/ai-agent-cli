/**
 * LSPDiagnosticRegistry — LSP 诊断注册表
 *
 * 存储和管理来自 LSP 服务器的异步诊断通知。
 *
 * 模式：
 * 1. LSP 服务器发送 publishDiagnostics 通知
 * 2. registerPendingLSPDiagnostic() 存储诊断
 * 3. checkForLSPDiagnostics() 获取待处理诊断
 * 4. 去重 + 数量限制
 */

import { randomUUID } from 'crypto';

// ─── 类型 ───

export interface DiagnosticItem {
  message: string;
  severity?: string;
  range?: { start: { line: number; character: number }; end: { line: number; character: number } };
  source?: string;
  code?: string | number;
}

export interface DiagnosticFile {
  uri: string;
  diagnostics: DiagnosticItem[];
}

export interface PendingLSPDiagnostic {
  serverName: string;
  files: DiagnosticFile[];
  timestamp: number;
  attachmentSent: boolean;
}

// ─── 常量 ───

const MAX_DIAGNOSTICS_PER_FILE = 10;
const MAX_TOTAL_DIAGNOSTICS = 30;
const MAX_DELIVERED_FILES = 500;

// ─── 全局状态 ───

const pendingDiagnostics = new Map<string, PendingLSPDiagnostic>();
const deliveredDiagnostics = new Map<string, Set<string>>();

// ─── 辅助 ───

function severityToNumber(severity: string | undefined): number {
  switch (severity) {
    case 'Error': return 1;
    case 'Warning': return 2;
    case 'Info': return 3;
    case 'Hint': return 4;
    default: return 4;
  }
}

function createDiagnosticKey(diag: DiagnosticItem): string {
  return JSON.stringify({
    message: diag.message,
    severity: diag.severity,
    range: diag.range,
    source: diag.source || null,
    code: diag.code || null,
  });
}

function deduplicateDiagnosticFiles(allFiles: DiagnosticFile[]): DiagnosticFile[] {
  const fileMap = new Map<string, Set<string>>();
  const dedupedFiles: DiagnosticFile[] = [];

  for (const file of allFiles) {
    if (!fileMap.has(file.uri)) {
      fileMap.set(file.uri, new Set());
      dedupedFiles.push({ uri: file.uri, diagnostics: [] });
    }
    const seen = fileMap.get(file.uri)!;
    const dedupedFile = dedupedFiles.find((f) => f.uri === file.uri)!;
    const previouslyDelivered = deliveredDiagnostics.get(file.uri) ?? new Set();

    for (const diag of file.diagnostics) {
      const key = createDiagnosticKey(diag);
      if (seen.has(key) || previouslyDelivered.has(key)) continue;
      seen.add(key);
      dedupedFile.diagnostics.push(diag);
    }
  }
  return dedupedFiles.filter((f) => f.diagnostics.length > 0);
}

// ─── API ───

/** 注册来自 LSP 服务器的诊断 */
export function registerPendingLSPDiagnostic(serverName: string, files: DiagnosticFile[]): void {
  const id = randomUUID();
  pendingDiagnostics.set(id, { serverName, files, timestamp: Date.now(), attachmentSent: false });
}

/** 获取所有待处理诊断（去重后） */
export function checkForLSPDiagnostics(): Array<{ serverName: string; files: DiagnosticFile[] }> {
  const allFiles: DiagnosticFile[] = [];
  const serverNames = new Set<string>();
  const toMark: PendingLSPDiagnostic[] = [];

  for (const diagnostic of pendingDiagnostics.values()) {
    if (!diagnostic.attachmentSent) {
      allFiles.push(...diagnostic.files);
      serverNames.add(diagnostic.serverName);
      toMark.push(diagnostic);
    }
  }

  if (allFiles.length === 0) return [];

  const dedupedFiles = deduplicateDiagnosticFiles(allFiles);

  // 标记已发送
  for (const d of toMark) d.attachmentSent = true;

  // 限制数量
  let totalDiags = 0;
  const limitedFiles: DiagnosticFile[] = [];
  for (const file of dedupedFiles) {
    const sorted = [...file.diagnostics].sort((a, b) => severityToNumber(a.severity) - severityToNumber(b.severity));
    const limited = sorted.slice(0, MAX_DIAGNOSTICS_PER_FILE);
    totalDiags += limited.length;
    limitedFiles.push({ uri: file.uri, diagnostics: limited });
    if (totalDiags >= MAX_TOTAL_DIAGNOSTICS) break;
  }

  // 记录已交付（LRU 限制）
  for (const file of limitedFiles) {
    if (!deliveredDiagnostics.has(file.uri)) {
      deliveredDiagnostics.set(file.uri, new Set());
    }
    if (deliveredDiagnostics.size > MAX_DELIVERED_FILES) {
      const firstKey = deliveredDiagnostics.keys().next().value;
      if (firstKey) deliveredDiagnostics.delete(firstKey);
    }
    const delivered = deliveredDiagnostics.get(file.uri)!;
    for (const diag of file.diagnostics) {
      delivered.add(createDiagnosticKey(diag));
    }
  }

  // 清理已发送的诊断
  for (const [id, d] of pendingDiagnostics) {
    if (d.attachmentSent) pendingDiagnostics.delete(id);
  }

  return [...serverNames].map((name) => ({
    serverName: name,
    files: limitedFiles,
  }));
}

/** 清空所有待处理诊断 */
export function clearPendingDiagnostics(): void {
  pendingDiagnostics.clear();
}

/** 重置所有状态 */
export function resetDiagnosticRegistry(): void {
  pendingDiagnostics.clear();
  deliveredDiagnostics.clear();
}
