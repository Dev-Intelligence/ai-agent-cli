/**
 * 全局清理函数注册表
 *
 * 让不同模块登记各自的清理动作，在进程优雅退出时统一跑完。
 * 单独抽出来放在这里，是为了避免与 gracefulShutdown 形成循环依赖。
 */

const cleanupFunctions = new Set<() => Promise<void> | void>();

/**
 * 注册一个清理函数。
 * 返回"反注册"函数，调用它会把这个清理函数从登记簿里摘掉。
 */
export function registerCleanup(
  cleanupFn: () => Promise<void> | void,
): () => void {
  cleanupFunctions.add(cleanupFn);
  return () => {
    cleanupFunctions.delete(cleanupFn);
  };
}

/**
 * 跑所有已登记的清理函数（并行）。
 * 任一函数抛错不会中断其它清理。
 */
export async function runCleanupFunctions(): Promise<void> {
  const fns = Array.from(cleanupFunctions);
  await Promise.all(
    fns.map(async (fn) => {
      try {
        await fn();
      } catch {
        // 单个清理失败不阻断其它清理；调用方要自己记录日志就自己包 try-catch
      }
    }),
  );
}

/** 仅测试使用：清空登记表 */
export function _resetCleanupRegistryForTest(): void {
  cleanupFunctions.clear();
}

/** 仅测试使用：查看当前已登记数量 */
export function _cleanupRegistryCountForTest(): number {
  return cleanupFunctions.size;
}
