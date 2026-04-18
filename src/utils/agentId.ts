/**
 * 确定性 Agent ID
 *
 * 给 swarm/teammate 体系的每个代理一个可重现、可读的 ID。
 *
 * ## 格式
 *   Agent ID:   `agentName@teamName`（如 `researcher@my-project`）
 *   Request ID: `{requestType}-{timestamp}@{agentId}`
 *               （如 `shutdown-1702500000000@researcher@my-project`）
 *
 * ## 为什么确定性？
 *   1. 崩溃重连：同名 + 同 team 的代理重启后仍拿到同一 ID
 *   2. 可读：出现在日志里直接懂
 *   3. 可预测：主代理不查表就能算出某个组员的 ID
 *
 * ## 约束
 *   - agentName 不允许包含 `@`（它是分隔符）
 *   - 业务侧要自行保证去掉非法字符
 */

/** 生成 agent ID：agentName@teamName */
export function formatAgentId(agentName: string, teamName: string): string {
  return `${agentName}@${teamName}`;
}

/**
 * 解析 agent ID。
 * 没有 @ 分隔符时返回 null，便于调用方判断。
 */
export function parseAgentId(
  agentId: string,
): { agentName: string; teamName: string } | null {
  const atIndex = agentId.indexOf('@');
  if (atIndex === -1) return null;
  return {
    agentName: agentId.slice(0, atIndex),
    teamName: agentId.slice(atIndex + 1),
  };
}

/** 生成 request ID：{requestType}-{timestamp}@{agentId} */
export function generateRequestId(
  requestType: string,
  agentId: string,
  now: () => number = Date.now,
): string {
  return `${requestType}-${now()}@${agentId}`;
}

/**
 * 解析 request ID。
 * 任一段非法（无 @、无 - 或 timestamp 非数字）返回 null。
 */
export function parseRequestId(
  requestId: string,
): { requestType: string; timestamp: number; agentId: string } | null {
  const atIndex = requestId.indexOf('@');
  if (atIndex === -1) return null;

  const prefix = requestId.slice(0, atIndex);
  const agentId = requestId.slice(atIndex + 1);

  const lastDashIndex = prefix.lastIndexOf('-');
  if (lastDashIndex === -1) return null;

  const requestType = prefix.slice(0, lastDashIndex);
  const timestampStr = prefix.slice(lastDashIndex + 1);
  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return null;

  return { requestType, timestamp, agentId };
}
