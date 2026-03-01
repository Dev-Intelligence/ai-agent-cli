/**
 * HighlightedCode - 代码高亮组件
 */

import { highlight, supportsLanguage } from 'cli-highlight';
import { Text } from 'ink';
import React, { useMemo } from 'react';

export interface HighlightedCodeProps {
  code: string;
  language: string;
}

export function HighlightedCode({ code, language }: HighlightedCodeProps): React.ReactElement {
  const highlighted = useMemo(() => {
    try {
      if (supportsLanguage(language)) {
        return highlight(code, { language });
      }
      return highlight(code, { language: 'markdown' });
    } catch {
      return code;
    }
  }, [code, language]);

  return <Text>{highlighted}</Text>;
}
