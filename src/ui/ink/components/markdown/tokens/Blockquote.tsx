/**
 * Blockquote - 引用块组件
 */

import { Box, Text } from '../../../primitives.js';
import type { Tokens } from 'marked';
import { renderBlockToken } from '../renderToken.js';

export function Blockquote({ token }: { token: Tokens.Blockquote }) {
  return (
    <Box>
      <Text dimColor>│ </Text>
      <Box flexDirection="column">
        {(token.tokens ?? []).map((t, i) => (
          <Text key={i} dimColor italic>{renderBlockToken(t)}</Text>
        ))}
      </Box>
    </Box>
  );
}
