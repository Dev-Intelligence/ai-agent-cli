/**
 * primitives — UI 基础原语统一入口
 *
 * 从 vendor/ink 自定义渲染器导出所有原语。
 * vendor ink 源文件带有 @ts-nocheck，在主 tsconfig strict 模式下安全编译。
 * 主项目的所有组件应从此模块导入，而非直接 `from 'ink'`。
 */

// ─── 组件 ───
export { default as Box } from '../../vendor/ink/components/Box.js';
export { default as Text } from '../../vendor/ink/components/Text.js';
export { default as Spacer } from '../../vendor/ink/components/Spacer.js';
export { default as Newline } from '../../vendor/ink/components/Newline.js';
export { default as Link } from '../../vendor/ink/components/Link.js';
export { default as ScrollBox } from '../../vendor/ink/components/ScrollBox.js';
export type { ScrollBoxHandle, ScrollBoxProps } from '../../vendor/ink/components/ScrollBox.js';
export { Ansi } from '../../vendor/ink/Ansi.js';
export { NoSelect } from '../../vendor/ink/components/NoSelect.js';
export { useTerminalViewport } from '../../vendor/ink/hooks/use-terminal-viewport.js';
export { default as measureElement } from '../../vendor/ink/measure-element.js';
export type { DOMElement } from '../../vendor/ink/dom.js';

// ─── 渲染 ───
export { default as render } from '../../vendor/ink/root.js';
export type { Instance, RenderOptions } from '../../vendor/ink/root.js';

// ─── Hooks ───
export { default as useApp } from '../../vendor/ink/hooks/use-app.js';
export { default as useInput } from '../../vendor/ink/hooks/use-input.js';
export type { Key } from '../../vendor/ink/events/input-event.js';
export { default as useStdin } from '../../vendor/ink/hooks/use-stdin.js';
