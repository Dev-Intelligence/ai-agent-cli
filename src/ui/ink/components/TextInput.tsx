/**
 * TextInput - 终端输入组件（基于 Kode-cli）
 */

import React from 'react';
import { Text, useInput } from 'ink';
import chalk from 'chalk';
import type { Key } from 'ink';
import { useTextInput } from '../hooks/useTextInput.js';
import { getTheme } from '../../theme.js';
import {
  normalizeLineEndings,
  shouldTreatAsSpecialPaste,
  shouldAggregatePasteChunk,
} from '../utils/paste.js';

const BRACKETED_PASTE_ENABLE = '\x1b[?2004h';
const BRACKETED_PASTE_DISABLE = '\x1b[?2004l';
const BRACKETED_PASTE_START = '\x1b[200~';
const BRACKETED_PASTE_END = '\x1b[201~';
const BRACKETED_PASTE_START_NO_ESC = '[200~';
const BRACKETED_PASTE_END_NO_ESC = '[201~';

let bracketedPasteRefCount = 0;

function setBracketedPasteEnabled(enabled: boolean) {
  if (!process.stdout?.isTTY) return;
  process.stdout.write(
    enabled ? BRACKETED_PASTE_ENABLE : BRACKETED_PASTE_DISABLE
  );
}

function acquireBracketedPasteMode() {
  if (bracketedPasteRefCount === 0) {
    setBracketedPasteEnabled(true);
  }
  bracketedPasteRefCount++;
}

function releaseBracketedPasteMode() {
  bracketedPasteRefCount = Math.max(0, bracketedPasteRefCount - 1);
  if (bracketedPasteRefCount === 0) {
    setBracketedPasteEnabled(false);
  }
}

export type TextInputProps = {
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  placeholder?: string;
  multiline?: boolean;
  focus?: boolean;
  mask?: string;
  showCursor?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onExit?: () => void;
  onExitMessage?: (show: boolean, key?: string) => void;
  onMessage?: (show: boolean, message?: string) => void;
  onHistoryReset?: () => void;
  columns: number;
  onPaste?: (text: string) => void;
  isDimmed?: boolean;
  disableCursorMovementForUpDownKeys?: boolean;
  onSpecialKey?: (input: string, key: Key) => boolean;
  cursorOffset: number;
  onChangeCursorOffset: (offset: number) => void;
};

export default function TextInput({
  value: originalValue,
  placeholder = '',
  focus = true,
  mask,
  multiline = false,
  showCursor = true,
  onChange,
  onSubmit,
  onExit,
  onHistoryUp,
  onHistoryDown,
  onExitMessage,
  onMessage,
  onHistoryReset,
  columns,
  onPaste,
  isDimmed = false,
  disableCursorMovementForUpDownKeys = false,
  onSpecialKey,
  cursorOffset,
  onChangeCursorOffset,
}: TextInputProps) {
  const theme = getTheme();
  const { onInput, renderedValue } = useTextInput({
    value: originalValue,
    onChange,
    onSubmit,
    onExit,
    onExitMessage,
    onMessage,
    onHistoryReset,
    onHistoryUp,
    onHistoryDown,
    mask,
    multiline,
    cursorChar: showCursor ? ' ' : '',
    invert: chalk.inverse,
    themeText: (text: string) => theme.text(text),
    columns,
    disableCursorMovementForUpDownKeys,
    externalOffset: cursorOffset,
    onOffsetChange: onChangeCursorOffset,
  });

  React.useEffect(() => {
    acquireBracketedPasteMode();
    return () => releaseBracketedPasteMode();
  }, []);

  const [pasteState, setPasteState] = React.useState<{
    chunks: string[];
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({ chunks: [], timeoutId: null });

  const bracketedPasteState = React.useRef<{
    mode: 'normal' | 'in_paste';
    incomplete: string;
    buffer: string;
  }>({ mode: 'normal', incomplete: '', buffer: '' });

  const flushBracketedPasteBuffer = (rawText: string) => {
    const normalized = normalizeLineEndings(rawText);
    if (onPaste && shouldTreatAsSpecialPaste(normalized)) {
      Promise.resolve().then(() => onPaste(normalized));
      return;
    }

    onInput(normalized, {} as Key);
  };

  const longestSuffixPrefix = (haystack: string, needle: string): number => {
    const max = Math.min(haystack.length, needle.length - 1);
    for (let len = max; len > 0; len--) {
      if (haystack.endsWith(needle.slice(0, len))) return len;
    }
    return 0;
  };

  const findFirstMarker = (
    haystack: string,
    markers: string[]
  ): { index: number; marker: string } | null => {
    let best: { index: number; marker: string } | null = null;
    for (const marker of markers) {
      const index = haystack.indexOf(marker);
      if (index === -1) continue;
      if (!best || index < best.index) {
        best = { index, marker };
      }
    }
    return best;
  };

  const getSuffixKeepLength = (haystack: string, markers: string[]): number => {
    let keep = 0;
    for (const marker of markers) {
      keep = Math.max(keep, longestSuffixPrefix(haystack, marker));
    }
    return keep;
  };

  const handleBracketedPasteSequences = (input: string): boolean => {
    const state = bracketedPasteState.current;
    let handledAny = false;
    let data = state.incomplete + input;
    state.incomplete = '';

    const startMarkers = [BRACKETED_PASTE_START, BRACKETED_PASTE_START_NO_ESC];
    const endMarkers = [BRACKETED_PASTE_END, BRACKETED_PASTE_END_NO_ESC];

    while (data) {
      if (state.mode === 'normal') {
        const start = findFirstMarker(data, startMarkers);
        if (!start) {
          const keep = getSuffixKeepLength(data, startMarkers);
          if (keep === 0) {
            if (!handledAny) {
              return false;
            }
            onInput(data, {} as Key);
            return true;
          }

          const toInsert = data.slice(0, -keep);
          if (toInsert) {
            onInput(toInsert, {} as Key);
          }
          state.incomplete = data.slice(-keep);
          handledAny = true;
          return true;
        }

        const before = data.slice(0, start.index);
        if (before) {
          onInput(before, {} as Key);
        }

        data = data.slice(start.index + start.marker.length);
        state.mode = 'in_paste';
        handledAny = true;
        continue;
      }

      const end = findFirstMarker(data, endMarkers);
      if (!end) {
        const keep = getSuffixKeepLength(data, endMarkers);
        const content = keep > 0 ? data.slice(0, -keep) : data;
        if (content) {
          state.buffer += content;
        }
        if (keep > 0) {
          state.incomplete = data.slice(-keep);
        }
        handledAny = true;
        return true;
      }

      state.buffer += data.slice(0, end.index);
      const completedPaste = state.buffer;
      state.buffer = '';
      state.mode = 'normal';

      flushBracketedPasteBuffer(completedPaste);

      data = data.slice(end.index + end.marker.length);
      handledAny = true;
      continue;
    }

    return true;
  };

  const resetPasteTimeout = (
    currentTimeoutId: ReturnType<typeof setTimeout> | null
  ) => {
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
    }
    return setTimeout(() => {
      setPasteState(({ chunks }) => {
        const pastedText = chunks.join('');
        Promise.resolve().then(() => onPaste?.(pastedText));
        return { chunks: [], timeoutId: null };
      });
    }, 500);
  };

  const wrappedOnInput = (input: string, key: Key): void => {
    if (/^(?:\x1b)?\[13;2(?:u|~)$/.test(input)) {
      onInput('\r', { ...key, return: true, meta: false, shift: false } as Key);
      return;
    }
    if (/^(?:\x1b)?\[13;(?:3|4)(?:u|~)$/.test(input)) {
      onInput('\r', { ...key, return: true, meta: true } as Key);
      return;
    }

    if (input === '\n') {
      if (multiline) {
        onInput('\n', key);
        return;
      }

      onInput('\r', { ...key, return: true } as Key);
      return;
    }

    if (input === '\x1b\r' || input === '\x1b\n') {
      onInput('\r', {
        ...key,
        return: true,
        meta: true,
      } as Key);
      return;
    }

    if (onSpecialKey && onSpecialKey(input, key)) {
      return;
    }

    if (
      key.backspace ||
      key.delete ||
      input === '\b' ||
      input === '\x7f' ||
      input === '\x08'
    ) {
      onInput(input, {
        ...key,
        backspace: true,
      } as Key);
      return;
    }

    if (input && handleBracketedPasteSequences(input)) {
      return;
    }

    if (onPaste && shouldAggregatePasteChunk(input, pasteState.timeoutId !== null)) {
      setPasteState(({ chunks, timeoutId }) => {
        return {
          chunks: [...chunks, input],
          timeoutId: resetPasteTimeout(timeoutId),
        };
      });
      return;
    }

    onInput(input, key);
  };

  useInput(wrappedOnInput, { isActive: focus });

  let renderedPlaceholder = placeholder
    ? theme.textDim(placeholder)
    : undefined;

  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) + theme.textDim(placeholder.slice(1))
        : chalk.inverse(' ');
  }

  const showPlaceholder = originalValue.length === 0 && placeholder;
  return (
    <Text wrap="truncate-end" dimColor={isDimmed}>
      {showPlaceholder ? renderedPlaceholder : renderedValue}
    </Text>
  );
}
