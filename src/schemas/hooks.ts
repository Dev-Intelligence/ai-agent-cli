/**
 * Hook 配置的 Zod Schema
 *
 * 用于校验用户写在 .ai-agent/hooks.json / ~/.ai-agent/hooks.json 中的
 * Hook 配置。与 src/core/hooks.ts 里的运行时类型保持一致，但这里是
 * schema 真值源，TypeScript 类型从 schema 反推。
 *
 * 支持四种 hook 类型（discriminated union on `type`）：
 *   - command: 执行 shell 命令
 *   - prompt:  以 LLM 评估一个提示词
 *   - http:    向 URL POST hook 输入 JSON
 *   - agent:   交给子代理做验证
 */

import { z } from 'zod';

// ─── 公共字段 ─────────────────────────────────────────────────────────

/** 触发过滤：使用权限规则语法（如 "Bash(git *)", "Read(*.ts)"）。 */
const IfConditionSchema = z
  .string()
  .optional()
  .describe(
    '触发过滤（权限规则语法）。只有工具调用匹配此模式时 hook 才会触发，' +
      '避免为不相关命令反复拉起 hook。',
  );

const StatusMessageSchema = z
  .string()
  .optional()
  .describe('Spinner 里显示的自定义状态提示');

const TimeoutSchema = z
  .number()
  .positive()
  .optional()
  .describe('单次执行超时（秒）');

const OnceSchema = z
  .boolean()
  .optional()
  .describe('若为 true，hook 执行一次后自动移除');

/** 支持的 shell 类型（参考上游 SHELL_TYPES） */
export const SHELL_TYPES = ['bash', 'powershell'] as const;
export type ShellType = (typeof SHELL_TYPES)[number];

// ─── 四种 Hook 的 schema ─────────────────────────────────────────────

export const BashCommandHookSchema = z.object({
  type: z.literal('command').describe('Shell 命令型 hook'),
  command: z.string().describe('要执行的 shell 命令'),
  if: IfConditionSchema,
  shell: z
    .enum(SHELL_TYPES)
    .optional()
    .describe("Shell 解释器：'bash' 用 \$SHELL；'powershell' 用 pwsh。默认 bash。"),
  timeout: TimeoutSchema,
  statusMessage: StatusMessageSchema,
  once: OnceSchema,
  async: z
    .boolean()
    .optional()
    .describe('若为 true，hook 在后台运行，不阻塞主流程'),
  asyncRewake: z
    .boolean()
    .optional()
    .describe(
      '若为 true，后台运行；当退出码 = 2（阻塞错误）时再把模型唤起。隐含 async=true。',
    ),
});

export const PromptHookSchema = z.object({
  type: z.literal('prompt').describe('LLM 提示词型 hook'),
  prompt: z
    .string()
    .describe('要让模型评估的提示词。可用 $ARGUMENTS 占位 hook 输入 JSON。'),
  if: IfConditionSchema,
  timeout: TimeoutSchema,
  model: z
    .string()
    .optional()
    .describe('该 hook 使用的模型 ID；未设置时使用默认的小型快速模型'),
  statusMessage: StatusMessageSchema,
  once: OnceSchema,
});

export const HttpHookSchema = z.object({
  type: z.literal('http').describe('HTTP 型 hook'),
  url: z.string().url().describe('接收 hook 输入 JSON 的目标 URL'),
  if: IfConditionSchema,
  timeout: TimeoutSchema,
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      '附加请求头。值可用 $VAR / ${VAR} 引用环境变量，' +
        '仅 allowedEnvVars 列出的变量会被真正展开，其它一律留空。',
    ),
  allowedEnvVars: z
    .array(z.string())
    .optional()
    .describe('允许在 header 中展开的环境变量名白名单'),
  statusMessage: StatusMessageSchema,
  once: OnceSchema,
});

export const AgentHookSchema = z.object({
  type: z.literal('agent').describe('代理验证型 hook'),
  prompt: z
    .string()
    .describe(
      '描述要验证什么的提示词（例：确认单测已跑且通过）。可用 $ARGUMENTS 占位 hook 输入 JSON。',
    ),
  if: IfConditionSchema,
  timeout: TimeoutSchema,
  model: z.string().optional().describe('该 hook 使用的模型 ID'),
  statusMessage: StatusMessageSchema,
  once: OnceSchema,
});

// ─── 聚合 ─────────────────────────────────────────────────────────────

/** Hook 命令（discriminated union，excludes function hooks） */
export const HookCommandSchema = z.discriminatedUnion('type', [
  BashCommandHookSchema,
  PromptHookSchema,
  AgentHookSchema,
  HttpHookSchema,
]);

/** 某个 matcher 下的一组 hooks */
export const HookMatcherSchema = z.object({
  matcher: z
    .string()
    .optional()
    .describe('字符串匹配（例：工具名 "Write"）；缺省匹配所有'),
  hooks: z.array(HookCommandSchema).describe('命中 matcher 时要执行的 hook 列表'),
});

/** 所有 hook 事件名（与上游保持一致，方便迁移） */
export const HOOK_EVENTS = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Notification',
  'UserPromptSubmit',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'StopFailure',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'PermissionRequest',
  'PermissionDenied',
  'Setup',
  'TeammateIdle',
  'TaskCreated',
  'TaskCompleted',
  'Elicitation',
  'ElicitationResult',
  'ConfigChange',
  'WorktreeCreate',
  'WorktreeRemove',
  'InstructionsLoaded',
  'CwdChanged',
  'FileChanged',
] as const;

export type HookEvent = (typeof HOOK_EVENTS)[number];

/** 完整 hooks 配置：事件 → matcher 列表 */
export const HooksSchema = z.record(
  z.enum(HOOK_EVENTS),
  z.array(HookMatcherSchema),
);

// ─── 反推的 TS 类型 ──────────────────────────────────────────────────

export type HookCommand = z.infer<typeof HookCommandSchema>;
export type BashCommandHook = Extract<HookCommand, { type: 'command' }>;
export type PromptHook = Extract<HookCommand, { type: 'prompt' }>;
export type AgentHook = Extract<HookCommand, { type: 'agent' }>;
export type HttpHook = Extract<HookCommand, { type: 'http' }>;
export type HookMatcher = z.infer<typeof HookMatcherSchema>;
export type HooksSettings = Partial<Record<HookEvent, HookMatcher[]>>;
