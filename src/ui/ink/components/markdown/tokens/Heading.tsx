/**
 * Heading - 标题组件
 */

import { Box, Text } from '../../../primitives.js';
import type { Tokens } from 'marked';
import { renderInlineTokens } from '../renderToken.js';

export function Heading({ token }: { token: Tokens.Heading }) {
  switch (token.depth) {
    case 1:
      return (
        <Box marginBottom={1}>
          <Text bold italic underline>{renderInlineTokens(token.tokens)}</Text>
        </Box>
      );
    case 2:
      return (
        <Box marginBottom={1}>
          <Text bold>{renderInlineTokens(token.tokens)}</Text>
        </Box>
      );
    default:
      return (
        <Box marginBottom={1}>
          <Text bold dimColor>{renderInlineTokens(token.tokens)}</Text>
        </Box>
      );
  }
}
