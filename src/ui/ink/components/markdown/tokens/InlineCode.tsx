/**
 * InlineCode - 行内代码组件
 */

import { Text } from '../../../primitives.js';
import type { Tokens } from 'marked';

export function InlineCode({ token }: { token: Tokens.Codespan }) {
  return <Text color="blue">{token.text}</Text>;
}
