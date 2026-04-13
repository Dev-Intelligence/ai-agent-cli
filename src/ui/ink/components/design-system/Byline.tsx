/**
 * Byline — 用 middot (·) 连接子元素的内联元数据展示
 *
 *
 * @example
 * <Text dimColor>
 *   <Byline>
 *     <KeyboardShortcutHint shortcut="Enter" action="confirm" />
 *     <KeyboardShortcutHint shortcut="Esc" action="cancel" />
 *   </Byline>
 * </Text>
 */

import React, { Children, isValidElement } from 'react';
import { Text } from '../../primitives.js';

interface BylineProps {
  children: React.ReactNode;
}

export function Byline({ children }: BylineProps): React.ReactNode {
  const validChildren = Children.toArray(children);

  if (validChildren.length === 0) {
    return null;
  }

  return (
    <>
      {validChildren.map((child, index) => (
        <React.Fragment key={isValidElement(child) ? (child.key ?? index) : index}>
          {index > 0 && <Text dimColor={true}> · </Text>}
          {child}
        </React.Fragment>
      ))}
    </>
  );
}
