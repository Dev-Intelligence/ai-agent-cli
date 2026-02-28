/**
 * 层级式 AbortController
 *
 * 支持 parent→child 级联中断，子代理循环的中断不影响父级。
 */

export class HierarchicalAbortController {
  private controller: AbortController;
  private children = new Set<HierarchicalAbortController>();
  private parent?: HierarchicalAbortController;

  constructor(parent?: HierarchicalAbortController) {
    this.controller = new AbortController();
    if (parent) {
      this.parent = parent;
      parent.children.add(this);
      // 父级中断时自动中断所有子级
      parent.signal.addEventListener('abort', () => this.abort(), { once: true });
    }
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  abort(): void {
    // 先中断所有子级
    for (const child of this.children) {
      child.abort();
    }
    this.children.clear();
    this.controller.abort();
    // 从父级移除自己
    this.parent?.children.delete(this);
  }

  createChild(): HierarchicalAbortController {
    return new HierarchicalAbortController(this);
  }
}
