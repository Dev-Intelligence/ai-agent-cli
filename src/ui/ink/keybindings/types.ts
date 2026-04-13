/**
 * keybindings/types — 快捷键系统类型定义
 *
 * 原版为编译时生成的桩（2 行），实际类型分散在各文件中。
 * 此处统一定义所有类型。
 */

/** 单个按键描述 */
export type ParsedKeystroke = {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  super: boolean;
};

/** 和弦（多键序列） */
export type Chord = ParsedKeystroke[];

/** 快捷键上下文名（决定优先级） */
export type KeybindingContextName =
  | 'Global'
  | 'Chat'
  | 'Scroll'
  | 'Transcript'
  | 'ThemePicker'
  | 'ModelPicker'
  | 'Settings'
  | string;

/** 解析后的快捷键绑定 */
export type ParsedBinding = {
  chord: Chord;
  action: string;
  context: KeybindingContextName;
};

/** 快捷键配置块 */
export type KeybindingBlock = {
  context: KeybindingContextName;
  bindings: Record<string, string>;
};
