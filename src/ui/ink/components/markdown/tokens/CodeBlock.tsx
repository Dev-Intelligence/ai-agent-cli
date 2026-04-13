/**
 * CodeBlock - 代码块组件
 */

import { Box, Text } from '../../../primitives.js';
import type { Tokens } from 'marked';
import { HighlightedCode } from '../../HighlightedCode.js';

export function CodeBlock({ token }: { token: Tokens.Code }) {
  const language = token.lang || 'markdown';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      marginBottom={1}
    >
      {token.lang && (
        <Text dimColor>{token.lang}</Text>
      )}
      <HighlightedCode code={token.text} language={language} />
    </Box>
  );
}
