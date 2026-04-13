/**
 * usePasteHandler — 粘贴内容处理 Hook
 *
 * 统一处理终端粘贴文本的常见需求：
 * - 行尾标准化
 * - 特殊粘贴内容识别
 * - 回调分发
 *
 * 当前版本先适配现有 TextInput/paste utils，作为后续 PromptInput 升级的基础层。
 */

import { useCallback } from 'react';
import {
  normalizeLineEndings,
  shouldTreatAsSpecialPaste,
} from '../utils/paste.js';

export interface UsePasteHandlerOptions<TSpecial = string> {
  /** 普通文本粘贴 */
  onTextPaste: (text: string) => void;
  /** 特殊粘贴内容（当前默认仍传标准化后的字符串） */
  onSpecialPaste?: (content: TSpecial) => void;
  /** 自定义解析特殊粘贴数据 */
  parseSpecialPaste?: (text: string) => TSpecial;
}

export interface UsePasteHandlerResult<TSpecial = string> {
  handlePaste: (rawText: string) => { handled: true; kind: 'text' | 'special'; value: string | TSpecial };
}

export function usePasteHandler<TSpecial = string>({
  onTextPaste,
  onSpecialPaste,
  parseSpecialPaste,
}: UsePasteHandlerOptions<TSpecial>): UsePasteHandlerResult<TSpecial> {
  const handlePaste = useCallback((rawText: string) => {
    const normalized = normalizeLineEndings(rawText);

    if (shouldTreatAsSpecialPaste(normalized) && onSpecialPaste) {
      const special = parseSpecialPaste ? parseSpecialPaste(normalized) : (normalized as TSpecial);
      onSpecialPaste(special);
      return {
        handled: true as const,
        kind: 'special' as const,
        value: special,
      };
    }

    onTextPaste(normalized);
    return {
      handled: true as const,
      kind: 'text' as const,
      value: normalized,
    };
  }, [onSpecialPaste, onTextPaste, parseSpecialPaste]);

  return { handlePaste };
}
