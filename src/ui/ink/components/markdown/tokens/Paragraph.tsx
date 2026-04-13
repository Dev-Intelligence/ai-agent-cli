/**
 * Paragraph - 段落组件
 */

import { Text } from '../../../primitives.js';
import type { Tokens } from 'marked';
import { renderInlineTokens } from '../renderToken.js';

export function Paragraph({ token }: { token: Tokens.Paragraph }) {
  return <Text>{renderInlineTokens(token.tokens)}</Text>;
}
