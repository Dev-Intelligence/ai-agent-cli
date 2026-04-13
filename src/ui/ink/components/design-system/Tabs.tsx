/**
 * Tabs — 轻量级标签页组件
 *
 * 用于在同一块面板区域内切换多个内容页。当前实现聚焦于：
 * - 标签头渲染
 * - 受控/非受控切换
 * - 左右方向键切换
 *
 * - 与 modal scroll 的深度联动
 * - header/content 焦点切换状态机
 * - keybinding provider 集成
 */

import React, { Children, isValidElement, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from '../../primitives.js';
import { getInkColors } from '../../../theme.js';

export interface TabProps {
  /** Tab 唯一标识 */
  id: string;
  /** 页签标题 */
  title: string;
  children: React.ReactNode;
}

export function Tab({ children }: TabProps): React.ReactNode {
  return <>{children}</>;
}

export interface TabsProps {
  children: React.ReactNode;
  title?: string;
  color?: string;
  defaultTab?: string;
  hidden?: boolean;
  selectedTab?: string;
  onTabChange?: (tabId: string) => void;
  banner?: React.ReactNode;
  disableNavigation?: boolean;
}

function isTabElement(node: React.ReactNode): node is React.ReactElement<TabProps> {
  return isValidElement<TabProps>(node) && typeof node.props.id === 'string';
}

export function Tabs({
  children,
  title,
  color,
  defaultTab,
  hidden = false,
  selectedTab,
  onTabChange,
  banner,
  disableNavigation = false,
}: TabsProps): React.ReactNode {
  const colors = getInkColors();
  const tabs = useMemo(
    () => Children.toArray(children).filter(isTabElement),
    [children],
  );

  const defaultIndex = Math.max(
    0,
    defaultTab ? tabs.findIndex((tab) => tab.props.id === defaultTab) : 0,
  );
  const [internalIndex, setInternalIndex] = useState(defaultIndex === -1 ? 0 : defaultIndex);

  const isControlled = selectedTab !== undefined;
  const selectedIndex = isControlled
    ? Math.max(0, tabs.findIndex((tab) => tab.props.id === selectedTab))
    : internalIndex;

  useEffect(() => {
    if (!isControlled) {
      setInternalIndex(defaultIndex === -1 ? 0 : defaultIndex);
    }
  }, [defaultIndex, isControlled]);

  const setActiveIndex = (nextIndex: number) => {
    if (tabs.length === 0) return;
    const normalized = (nextIndex + tabs.length) % tabs.length;
    const nextTab = tabs[normalized];
    if (!nextTab) return;

    if (!isControlled) {
      setInternalIndex(normalized);
    }
    onTabChange?.(nextTab.props.id);
  };

  useInput((input, key) => {
    if (hidden || disableNavigation || tabs.length <= 1) {
      return;
    }

    if (key.leftArrow || input === 'h') {
      setActiveIndex(selectedIndex - 1);
      return;
    }

    if (key.rightArrow || input === 'l' || key.tab) {
      setActiveIndex(selectedIndex + 1);
    }
  });

  if (tabs.length === 0) {
    return null;
  }

  const activeTab = tabs[selectedIndex] ?? tabs[0];
  if (!activeTab) {
    return null;
  }

  const activeColor = color ?? colors.primary;

  return (
    <Box flexDirection="column" gap={hidden ? 0 : 1}>
      {!hidden && (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" gap={1}>
            {title && (
              <Text bold color={activeColor}>
                {title}
              </Text>
            )}
            {tabs.map((tab, index) => {
              const isCurrent = index === selectedIndex;
              return (
                <Text
                  key={tab.props.id}
                  bold={isCurrent}
                  inverse={isCurrent}
                  color={isCurrent ? undefined : colors.textDim}
                >
                  {' '}
                  {tab.props.title}
                  {' '}
                </Text>
              );
            })}
          </Box>
          {banner}
        </Box>
      )}

      <Box flexDirection="column">{activeTab.props.children}</Box>
    </Box>
  );
}
