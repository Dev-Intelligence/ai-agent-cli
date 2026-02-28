/**
 * CompletedItemView - Static 区域项路由组件
 * 根据 item.type 分发到对应子组件
 */

import { Box, Text } from 'ink';
import type { CompletedItem } from '../types.js';
import { BannerView } from './BannerView.js';
import { SystemMessage } from './SystemMessage.js';
import { ToolCallView } from './ToolCallView.js';
import { renderMarkdown, isMarkdownContent } from '../../markdown.js';
import { getInkColors } from '../../theme.js';

export interface CompletedItemViewProps {
  item: CompletedItem;
}

export function CompletedItemView({ item }: CompletedItemViewProps) {
  const colors = getInkColors();

  switch (item.type) {
    case 'banner':
      return <BannerView config={item.config} />;

    case 'user_message':
      return (
        <Box>
          <Text color={colors.cursor} bold>{'>>>'} </Text>
          <Text>{item.text}</Text>
        </Box>
      );

    case 'ai_message': {
      const rendered = isMarkdownContent(item.text)
        ? renderMarkdown(item.text)
        : item.text;
      return (
        <Box flexDirection="column">
          <Text>{rendered}</Text>
          {item.elapsed !== undefined && (
            <Text dimColor>  ⏱  {item.elapsed.toFixed(2)}s</Text>
          )}
        </Box>
      );
    }

    case 'tool_call':
      return (
        <ToolCallView
          name={item.name}
          detail={item.detail}
          result={item.result}
          isError={item.isError}
        />
      );

    case 'system':
      return <SystemMessage level={item.level} text={item.text} />;

    case 'divider':
      return <Text dimColor>{'─'.repeat(50)}</Text>;

    default:
      return null;
  }
}
