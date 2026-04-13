/**
 * treeify — 文件树/对象树可视化
 *
 * 将嵌套对象渲染为终端树形结构。
 *
 * @example
 * treeify({ src: { 'index.ts': undefined, utils: { 'format.ts': undefined } } })
 * // ├── src
 * // │   ├── index.ts
 * // │   └── utils
 * // │       └── format.ts
 */

export type TreeNode = {
  [key: string]: TreeNode | string | undefined;
};

export interface TreeifyOptions {
  /** 显示叶子节点的值 */
  showValues?: boolean;
}

const BRANCH = '├── ';
const LAST_BRANCH = '└── ';
const LINE = '│   ';
const EMPTY = '    ';

/**
 * 将树形对象渲染为可读的树形文本
 */
export function treeify(obj: TreeNode, options: TreeifyOptions = {}): string {
  const { showValues = false } = options;
  const lines: string[] = [];
  const visited = new WeakSet<object>();

  function render(node: TreeNode | string | undefined, prefix: string): void {
    if (typeof node === 'string') {
      if (showValues) lines.push(prefix + node);
      return;
    }
    if (typeof node !== 'object' || node === null) {
      if (showValues && node !== undefined) {
        lines.push(prefix + String(node));
      }
      return;
    }
    if (visited.has(node)) {
      lines.push(prefix + '[Circular]');
      return;
    }
    visited.add(node);

    const keys = Object.keys(node);
    keys.forEach((key, i) => {
      const isLast = i === keys.length - 1;
      const connector = isLast ? LAST_BRANCH : BRANCH;
      const child = node[key];

      if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
        lines.push(prefix + connector + key);
        const childPrefix = prefix + (isLast ? EMPTY : LINE);
        render(child, childPrefix);
      } else if (child !== undefined && showValues) {
        lines.push(prefix + connector + key + ': ' + String(child));
      } else {
        lines.push(prefix + connector + key);
      }
    });
  }

  render(obj, '');
  return lines.join('\n');
}

/**
 * 从文件路径列表生成树形结构
 * @example
 * pathsToTree(['src/index.ts', 'src/utils/format.ts', 'README.md'])
 */
export function pathsToTree(paths: string[]): TreeNode {
  const root: TreeNode = {};
  for (const p of paths) {
    const parts = p.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (i === parts.length - 1) {
        // 叶子节点
        current[part] = undefined;
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part] as TreeNode;
      }
    }
  }
  return root;
}
