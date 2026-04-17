/**
 * 固定大小的循环缓冲区
 *
 * 缓冲区满后新元素会覆盖最旧元素。
 * 典型用途：维护最近 N 条事件 / 滚动窗口指标。
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  /** 添加一个元素；若已满则淘汰最旧的一个 */
  add(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /** 批量添加 */
  addAll(items: T[]): void {
    for (const item of items) {
      this.add(item);
    }
  }

  /**
   * 取最近的 N 个元素（从旧到新）。
   * 缓冲区不足 N 条时返回全部可用元素。
   */
  getRecent(count: number): T[] {
    const result: T[] = [];
    const start = this.size < this.capacity ? 0 : this.head;
    const available = Math.min(count, this.size);

    for (let i = 0; i < available; i++) {
      const index = (start + this.size - available + i) % this.capacity;
      result.push(this.buffer[index]!);
    }

    return result;
  }

  /** 取全部元素（从旧到新） */
  toArray(): T[] {
    if (this.size === 0) return [];

    const result: T[] = [];
    const start = this.size < this.capacity ? 0 : this.head;

    for (let i = 0; i < this.size; i++) {
      const index = (start + i) % this.capacity;
      result.push(this.buffer[index]!);
    }

    return result;
  }

  /** 清空所有元素 */
  clear(): void {
    this.buffer.length = 0;
    this.head = 0;
    this.size = 0;
  }

  /** 当前元素数量 */
  length(): number {
    return this.size;
  }
}
