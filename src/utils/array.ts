/**
 * 数组小工具：与 lodash 重复的功能由原生 Set/Array 实现。
 */

/** 在数组元素之间按索引插入分隔符：intersperse([a,b,c], i => sep) → [a, sep, b, sep, c] */
export function intersperse<A>(
  as: A[],
  separator: (index: number) => A,
): A[] {
  return as.flatMap((a, i) => (i ? [separator(i), a] : [a]));
}

/** 统计满足谓词的元素个数 */
export function count<T>(arr: readonly T[], pred: (x: T) => unknown): number {
  let n = 0;
  for (const x of arr) n += +!!pred(x);
  return n;
}

/** 去重（保留首次出现顺序） */
export function uniq<T>(xs: Iterable<T>): T[] {
  return [...new Set(xs)];
}
