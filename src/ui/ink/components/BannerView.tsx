/**
 * BannerView - Ink 版 Banner 组件
 */

import { Box, Text } from 'ink';
import type { BannerConfig } from '../types.js';
import { PRODUCT_NAME, PRODUCT_VERSION, ASCII_LOGO } from '../../../core/constants.js';
import { getInkColors } from '../../theme.js';

export interface BannerViewProps {
  config: BannerConfig;
}

export function BannerView({ config }: BannerViewProps) {
  const colors = getInkColors();
  const workdirName = config.workdir.split('/').pop() || 'workspace';
  const skillsStr = config.skills.length > 0
    ? config.skills.slice(0, 3).join(', ')
    : 'none';

  // 终端宽度过窄时跳过边框渲染，避免 Ink renderBorder 崩溃
  const cols = process.stdout.columns || 80;
  if (cols < 20) {
    return (
      <Box flexDirection="column">
        <Text bold>{PRODUCT_NAME} v{PRODUCT_VERSION}</Text>
        <Text dimColor>{config.providerDisplayName} · {config.model}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={1}>
      <Text bold> {PRODUCT_NAME} v{PRODUCT_VERSION}</Text>
      <Text> </Text>
      <Box>
        {/* 左栏 */}
        <Box flexDirection="column" width="50%">
          <Text bold>  Welcome back!</Text>
          <Text> </Text>
          {ASCII_LOGO.map((line, i) => (
            <Text key={i} color={colors.primary}>{line}</Text>
          ))}
          <Text> </Text>
          <Text dimColor>  {config.model}</Text>
          <Text dimColor>  ~/{workdirName}</Text>
        </Box>
        {/* 右栏 */}
        <Box flexDirection="column" width="50%">
          <Text bold color={colors.heading}>Tips for getting started</Text>
          <Text dimColor>输入消息开始对话</Text>
          <Text dimColor>使用 'exit' 退出，Ctrl+C 中断</Text>
          <Text> </Text>
          <Text bold color={colors.heading}>Configuration</Text>
          <Text dimColor>Provider: {config.providerDisplayName}</Text>
          <Text dimColor>Model: {config.model.slice(0, 30)}</Text>
          <Text dimColor>Skills: {skillsStr}</Text>
          <Text> </Text>
          <Text bold color={colors.heading}>Agent Types</Text>
          <Text dimColor>{config.agentTypes.join(' · ')}</Text>
        </Box>
      </Box>
    </Box>
  );
}
