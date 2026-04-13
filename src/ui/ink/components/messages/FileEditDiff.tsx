/**
 * FileEditDiff — 文件编辑 diff 展示
 *
 * 使用 StructuredDiffList 渲染逐词级彩色 diff。
 *
 *   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
 *    10  unchanged line
 *   -11  removed line        ← 红色背景
 *   +11  added line          ← 绿色背景
 *    12  unchanged line
 *   ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
 */

import { Box, Text } from '../../primitives.js';
import { getPatchFromContents } from '../../../../utils/diff.js';
import { StructuredDiffList } from '../StructuredDiff/index.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';

// ─── Props ───

export interface FileEditDiffProps {
  filePath: string;
  oldContent: string;
  newContent: string;
}

// ─── 组件 ───

export function FileEditDiff({ filePath, oldContent, newContent }: FileEditDiffProps) {
  const { columns } = useTerminalSize();
  const hunks = getPatchFromContents({ filePath, oldContent, newContent });

  if (hunks.length === 0) {
    return <Text dimColor>（无差异）</Text>;
  }

  return (
    <Box flexDirection="column">
      {/* 虚线边框 */}
      <Box borderStyle="single" borderColor="gray" borderLeft={false} borderRight={false} flexDirection="column">
        <StructuredDiffList hunks={hunks} width={columns} filePath={filePath} />
      </Box>
    </Box>
  );
}
