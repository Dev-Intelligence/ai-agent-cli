/**
 * AbortController 工具
 *
 * 处理两件事：
 *   1. 默认将 signal 的 max listeners 设到 50，避免 MaxListenersExceededWarning
 *   2. 父子 AbortController 关系：父 abort 时级联子；子 abort 不影响父
 *      全程使用 WeakRef 避免内存泄漏。
 */

import { setMaxListeners } from 'node:events';

const DEFAULT_MAX_LISTENERS = 50;

/**
 * 创建一个 AbortController，并预先调高 signal 的 listener 上限。
 */
export function createAbortController(
  maxListeners: number = DEFAULT_MAX_LISTENERS,
): AbortController {
  const controller = new AbortController();
  setMaxListeners(maxListeners, controller.signal);
  return controller;
}

/**
 * 从父（弱引用）向子（弱引用）传播 abort。
 * 放在模块作用域避免每次绑定都分配闭包。
 */
function propagateAbort(
  this: WeakRef<AbortController>,
  weakChild: WeakRef<AbortController>,
): void {
  const parent = this.deref();
  weakChild.deref()?.abort(parent?.signal.reason);
}

/**
 * 从父 signal 上摘除一个已注册的 handler。
 * 父/handler 任一已被 GC、或父已 abort（once:true 已自动移除）都是 no-op。
 */
function removeAbortHandler(
  this: WeakRef<AbortController>,
  weakHandler: WeakRef<(...args: unknown[]) => void>,
): void {
  const parent = this.deref();
  const handler = weakHandler.deref();
  if (parent && handler) {
    parent.signal.removeEventListener('abort', handler);
  }
}

/**
 * 创建会随 parent 级联 abort 的子 AbortController。
 * 子 abort 不回传到父。
 *
 * 内存语义：
 *   - 父通过 WeakRef 持有子，子被丢弃（且未 abort）仍可被 GC
 *   - 子 abort 时自动摘除在父上的 handler，避免死 handler 堆积
 */
export function createChildAbortController(
  parent: AbortController,
  maxListeners?: number,
): AbortController {
  const child = createAbortController(maxListeners);

  // 快路径：父已 abort，子立即 abort
  if (parent.signal.aborted) {
    child.abort(parent.signal.reason);
    return child;
  }

  const weakChild = new WeakRef(child);
  const weakParent = new WeakRef(parent);
  const handler = propagateAbort.bind(weakParent, weakChild);

  parent.signal.addEventListener('abort', handler, { once: true });

  // 子 abort 后主动摘父端 handler（弱引用双方，安全 no-op）
  child.signal.addEventListener(
    'abort',
    removeAbortHandler.bind(weakParent, new WeakRef(handler)),
    { once: true },
  );

  return child;
}
