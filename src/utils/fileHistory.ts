/**
 * fileHistory — 文件编辑快照/撤销系统
 *
 * 每次文件编辑前自动备份原始内容，支持恢复到任意快照。
 * 备份存储在 .ai-agent/fileHistory/<sessionId>/ 下。
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { getSessionId } from '../services/session/sessionId.js';

// ─── 类型 ───

export interface FileHistoryBackup {
  /** 原始文件路径 */
  filePath: string;
  /** 备份文件路径 */
  backupPath: string;
  /** 内容 hash */
  hash: string;
  /** 备份时间 */
  timestamp: number;
  /** 关联的消息 ID */
  messageId?: string;
}

export interface FileHistorySnapshot {
  id: string;
  timestamp: number;
  messageId?: string;
  backups: FileHistoryBackup[];
}

export interface FileHistoryState {
  snapshots: FileHistorySnapshot[];
  maxSnapshots: number;
}

// ─── 常量 ───

const MAX_SNAPSHOTS = 100;

// ─── 辅助 ───

function getHistoryDir(): string {
  const sessionId = getSessionId();
  const dir = join(process.cwd(), '.ai-agent', 'fileHistory', sessionId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ─── 全局状态 ───

const state: FileHistoryState = {
  snapshots: [],
  maxSnapshots: MAX_SNAPSHOTS,
};

// ─── API ───

/**
 * 在编辑文件前调用：备份当前内容
 * @returns 备份信息，或 null（文件不存在时）
 */
export function backupFileBeforeEdit(
  filePath: string,
  messageId?: string,
): FileHistoryBackup | null {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf-8');
  const hash = contentHash(content);
  const dir = getHistoryDir();
  const name = basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
  const version = state.snapshots.length;
  const backupPath = join(dir, `${name}@${hash}@v${version}`);

  // 避免重复备份相同内容
  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, content, 'utf-8');
  }

  const backup: FileHistoryBackup = {
    filePath,
    backupPath,
    hash,
    timestamp: Date.now(),
    messageId,
  };

  return backup;
}

/**
 * 创建快照（一组文件备份的集合）
 */
export function createSnapshot(
  backups: FileHistoryBackup[],
  messageId?: string,
): FileHistorySnapshot {
  const snapshot: FileHistorySnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    messageId,
    backups,
  };

  state.snapshots.push(snapshot);

  // 限制快照数量
  while (state.snapshots.length > state.maxSnapshots) {
    state.snapshots.shift();
  }

  return snapshot;
}

/**
 * 恢复文件到指定快照
 */
export function restoreSnapshot(snapshotId: string): { restored: string[]; errors: string[] } {
  const snapshot = state.snapshots.find((s) => s.id === snapshotId);
  if (!snapshot) {
    return { restored: [], errors: [`快照不存在: ${snapshotId}`] };
  }

  const restored: string[] = [];
  const errors: string[] = [];

  for (const backup of snapshot.backups) {
    try {
      if (!existsSync(backup.backupPath)) {
        errors.push(`备份文件丢失: ${backup.backupPath}`);
        continue;
      }
      const content = readFileSync(backup.backupPath, 'utf-8');
      writeFileSync(backup.filePath, content, 'utf-8');
      restored.push(backup.filePath);
    } catch (err) {
      errors.push(`恢复失败 ${backup.filePath}: ${err}`);
    }
  }

  return { restored, errors };
}

/**
 * 列出所有快照
 */
export function listSnapshots(): FileHistorySnapshot[] {
  return [...state.snapshots];
}

/**
 * 获取文件的编辑历史
 */
export function getFileHistory(filePath: string): FileHistoryBackup[] {
  return state.snapshots
    .flatMap((s) => s.backups)
    .filter((b) => b.filePath === filePath);
}

/**
 * 清空会话的文件历史
 */
export function clearHistory(): void {
  const dir = getHistoryDir();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
  state.snapshots.length = 0;
}

/**
 * 检查文件历史是否有任何变更
 */
export function hasAnyChanges(): boolean {
  return state.snapshots.length > 0;
}
