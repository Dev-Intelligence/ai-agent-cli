/**
 * Link - 链接组件
 */

import { Text } from '../../../primitives.js';
import type { Tokens } from 'marked';

export function Link({ token }: { token: Tokens.Link }) {
  return <Text color="blue">{token.href}</Text>;
}
