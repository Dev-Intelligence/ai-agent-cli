/**
 * MarkdownTable — Markdown 表格渲染
 *
 * 使用 marked 的 Tokens.Table 类型，自动计算列宽、支持对齐。
 */

import type { Token, Tokens } from 'marked';
import React from 'react';
import { Box, Text } from '../primitives.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

export function MarkdownTable({
  token,
  renderTokens: _renderTokens,
}: {
  token: Tokens.Table;
  renderTokens: (tokens: Token[]) => React.ReactNode;
}): React.ReactNode {
  const { columns } = useTerminalSize();

  // 计算每列宽度
  const columnWidths = token.header.map((_: Tokens.TableCell, i: number) => {
    const headerWidth = token.header[i]!.text.length;
    const cellWidths = token.rows.map((row: Tokens.TableCell[]) => row[i]!.text.length);
    return Math.max(headerWidth, ...cellWidths);
  });

  const totalWidth = columnWidths.reduce((a: number, b: number) => a + b, 0) + columnWidths.length * 3 + 1;
  const scale = totalWidth > columns - 4 ? (columns - 4) / totalWidth : 1;
  const scaledWidths = columnWidths.map((w: number) => Math.max(3, Math.floor(w * scale)));

  const renderCell = (
    text: string,
    width: number,
    align: Tokens.Table['align'][number],
    isHeader: boolean,
  ) => {
    const textWidth = text.length;
    const padding = Math.max(0, width - textWidth);

    let leftPad = 1;
    let rightPad = 1;

    if (align === 'right') {
      leftPad = padding + 1;
    } else if (align === 'center') {
      leftPad = Math.floor(padding / 2) + 1;
      rightPad = Math.ceil(padding / 2) + 1;
    } else {
      rightPad = padding + 1;
    }

    return (
      <Box paddingLeft={leftPad} paddingRight={rightPad}>
        <Text color={isHeader ? 'cyan' : undefined} bold={isHeader}>
          {text}
        </Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" marginY={1}>
      {/* 表头 */}
      <Box
        borderStyle="single"
        borderBottom
        borderTop={false}
        borderLeft={false}
        borderRight={false}
        borderDimColor
      >
        {token.header.map((cell: Tokens.TableCell, i: number) => (
          <React.Fragment key={i}>
            <Box
              borderStyle="single"
              borderLeft={i > 0}
              borderRight={false}
              borderTop={false}
              borderBottom={false}
              borderDimColor
            >
              {renderCell(cell.text, scaledWidths[i]!, token.align[i]!, true)}
            </Box>
          </React.Fragment>
        ))}
      </Box>

      {/* 数据行 */}
      {token.rows.map((row: Tokens.TableCell[], i: number) => (
        <Box key={i}>
          {row.map((cell: Tokens.TableCell, j: number) => (
            <React.Fragment key={j}>
              <Box
                borderStyle="single"
                borderLeft={j > 0}
                borderRight={false}
                borderTop={false}
                borderBottom={false}
                borderDimColor
              >
                {renderCell(cell.text, scaledWidths[j]!, token.align[j]!, false)}
              </Box>
            </React.Fragment>
          ))}
        </Box>
      ))}
    </Box>
  );
}
