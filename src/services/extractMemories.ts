/**
 * extractMemories — 持久记忆提取
 *
 * 适配 ai-agent-cli 的 forkedAgent + ProtocolAdapter。
 *
 * 功能：
 * - 在每次完整查询循环结束后（AI 回复无工具调用时）触发
 * - 用后台子代理从对话中提取持久记忆
 * - 写入 .ai-agent/memory/ 目录
 * - 记忆跨会话持久化（compaction 不影响）
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Message, ExecuteToolFunc } from '../core/types.js';
import type { ProtocolAdapter } from '../services/ai/adapters/base.js';
import { runForkedAgent } from '../utils/forkedAgent.js';

// ─── 系统提示词 ───

const EXTRACT_MEMORIES_SYSTEM_PROMPT = `你是一个记忆提取助手。从对话中识别值得长期保存的信息，写入独立的记忆文件。

每个记忆文件格式：
---
name: 记忆名称
description: 一行描述
type: user | feedback | project | reference
---
记忆内容...

规则：
1. 只提取非显而易见的、有长期价值的信息
2. 不要重复已有记忆的内容
3. 代码模式/架构可以从代码库推导出来，不需要记录
4. 重点记录：用户偏好、项目决策、外部资源引用
5. 输出格式：文件名和内容，用 === 分隔多个文件

示例输出：
=== feedback_testing.md ===
---
name: 测试偏好
description: 用户偏好集成测试而非 mock
type: feedback
---
集成测试必须使用真实数据库，不用 mock。
**原因：** 上季度 mock 测试通过但生产环境迁移失败。`;

// ─── 状态 ───

let extractionCount = 0;
let lastExtractedMessageCount = 0;

// ─── 路径 ───

function getAutoMemoryDir(): string {
  return join(process.cwd(), '.ai-agent', 'memory');
}

// ─── 核心 ───

/**
 * 检查是否应该触发记忆提取
 * 条件：每 3 次完整回复后触发一次
 */
export function shouldExtractMemories(messageCount: number): boolean {
  if (messageCount <= lastExtractedMessageCount) return false;
  return (messageCount - lastExtractedMessageCount) >= 6; // 约 3 轮对话
}

/**
 * 扫描已有记忆文件，生成清单
 */
function scanExistingMemories(): string {
  const dir = getAutoMemoryDir();
  if (!existsSync(dir)) return '（无已有记忆）';

  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) return '（无已有记忆）';

  const lines: string[] = ['已有记忆文件：'];
  for (const f of files) {
    try {
      const content = readFileSync(join(dir, f), 'utf-8');
      const firstLine = content.split('\n').find((l) => l.trim() && !l.startsWith('---')) || '';
      lines.push(`  - ${f}: ${firstLine.slice(0, 80)}`);
    } catch {
      lines.push(`  - ${f}`);
    }
  }
  return lines.join('\n');
}

/**
 * 从对话中提取持久记忆
 *
 * 1. 扫描已有记忆（避免重复）
 * 2. 构建提示词（已有记忆 + 最近对话）
 * 3. 用 forkedAgent 生成新记忆
 * 4. 解析输出并写入文件
 */
export async function extractMemories(
  adapter: ProtocolAdapter,
  messages: Message[],
  executeTool: ExecuteToolFunc,
): Promise<string[]> {
  const existingMemories = scanExistingMemories();

  // 最近对话内容
  const recentMessages = messages.slice(-30);
  const conversation = recentMessages
    .map((m) => {
      const role = m.role === 'user' ? '用户' : 'AI';
      const text = typeof m.content === 'string'
        ? m.content.slice(0, 300)
        : Array.isArray(m.content)
          ? m.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text?.slice(0, 200))
            .join('\n')
          : '';
      return `[${role}]: ${text}`;
    })
    .join('\n\n');

  const userPrompt = `${existingMemories}\n\n最近对话：\n${conversation}\n\n请提取值得长期保存的信息。如果没有新的值得记录的信息，回复"无需提取"。`;

  const result = await runForkedAgent({
    adapter,
    systemPrompt: EXTRACT_MEMORIES_SYSTEM_PROMPT,
    parentMessages: [],
    userPrompt,
    tools: [],
    executeTool,
    forkLabel: 'extract_memories',
    maxOutputTokens: 2000,
    maxTurns: 1,
  });

  // 解析输出
  const text = result.resultText;
  if (!text || text.includes('无需提取') || text === '执行完成') {
    lastExtractedMessageCount = messages.length;
    extractionCount++;
    return [];
  }

  // 解析 === filename.md === 格式
  const files: string[] = [];
  const sections = text.split(/===\s*(.+?\.md)\s*===/).filter(Boolean);

  await mkdir(getAutoMemoryDir(), { recursive: true });

  for (let i = 0; i < sections.length - 1; i += 2) {
    const filename = sections[i]!.trim();
    const content = sections[i + 1]!.trim();
    if (filename && content && filename.endsWith('.md')) {
      const filepath = join(getAutoMemoryDir(), filename);
      await writeFile(filepath, content, 'utf-8');
      files.push(filename);
    }
  }

  // 如果没有 === 分隔格式，整体作为单个记忆文件
  if (files.length === 0 && text.length > 50) {
    const filename = `auto_memory_${Date.now()}.md`;
    await mkdir(getAutoMemoryDir(), { recursive: true });
    await writeFile(join(getAutoMemoryDir(), filename), text, 'utf-8');
    files.push(filename);
  }

  lastExtractedMessageCount = messages.length;
  extractionCount++;
  return files;
}

/**
 * 重置提取状态
 */
export function resetExtractionState(): void {
  extractionCount = 0;
  lastExtractedMessageCount = 0;
}
