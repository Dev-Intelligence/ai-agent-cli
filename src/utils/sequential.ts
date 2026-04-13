/**
 * sequential — 互斥锁/顺序执行保护
 *
 * 确保异步函数顺序执行，后续调用排队等待前一个完成。
 *
 * 用法：
 *   const safeFn = sequential(async () => { ... });
 *   safeFn(); // 立即执行
 *   safeFn(); // 等待第一个完成后再执行
 */

/**
 * 包装一个异步函数，确保同一时间只有一个实例在运行。
 * 后续调用排队等待，按 FIFO 顺序执行。
 */
export function sequential<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  let pending: Promise<any> = Promise.resolve();

  const wrapped = ((...args: any[]) => {
    const run = () => fn(...args);
    pending = pending.then(run, run);
    return pending;
  }) as T;

  return wrapped;
}
