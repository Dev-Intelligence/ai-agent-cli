/**
 * Dialog — 通用对话框容器
 *
 * 用于权限确认、选择器、配置提示等场景，统一提供：
 * - 标题/副标题布局
 * - 底部输入提示
 * - 可选边框容器
 *
 * 当前版本先适配现有项目能力，不强耦合完整 keybinding 系统，
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';
import { Byline } from './Byline.js';
import { KeyboardShortcutHint } from './KeyboardShortcutHint.js';
import { Pane } from './Pane.js';

export interface DialogInputGuideState {
  /** 是否处于“再按一次退出”之类的 pending 状态 */
  pending: boolean;
  /** 当前提示对应的按键名 */
  keyName: string;
}

export interface DialogProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onCancel: () => void;
  color?: string;
  hideInputGuide?: boolean;
  hideBorder?: boolean;
  /** 自定义底部输入提示 */
  inputGuide?: (state: DialogInputGuideState) => React.ReactNode;
  /** 保留给后续嵌套输入框控制取消键接管 */
  isCancelActive?: boolean;
}

export function Dialog({
  title,
  subtitle,
  children,
  color = 'warning',
  hideInputGuide = false,
  hideBorder = false,
  inputGuide,
}: DialogProps): React.ReactNode {
  // 当前项目尚未接入完整的 Ctrl+C / Ctrl+D 对话框退出状态机，
  // 先提供稳定的默认展示对象，便于后续无缝升级。
  const guideState: DialogInputGuideState = {
    pending: false,
    keyName: 'Esc',
  };

  const defaultInputGuide = (
    <Byline>
      <KeyboardShortcutHint shortcut="Enter" action="confirm" />
      <KeyboardShortcutHint shortcut="Esc" action="cancel" />
    </Byline>
  );

  const content = (
    <>
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold color={color}>
            {title}
          </Text>
          {subtitle && <Text dimColor>{subtitle}</Text>}
        </Box>
        {children}
      </Box>

      {!hideInputGuide && (
        <Box marginTop={1}>
          <Text dimColor italic>
            {inputGuide ? inputGuide(guideState) : defaultInputGuide}
          </Text>
        </Box>
      )}
    </>
  );

  if (hideBorder) {
    return content;
  }

  return <Pane color={color}>{content}</Pane>;
}
