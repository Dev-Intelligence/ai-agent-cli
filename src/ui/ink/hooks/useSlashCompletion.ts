/**
 * 斜杠命令补全
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInput, type Key } from '../primitives.js';
import type {
  CompletionContext,
  SlashCommandItem,
  UnifiedSuggestion,
} from '../completion/types.js';
import { getSlashCompletionContext } from '../completion/context.js';
import { generateSlashCommandSuggestions } from '../completion/slashSuggestions.js';

interface Props {
  input: string;
  cursorOffset: number;
  onInputChange: (value: string) => void;
  setCursorOffset: (offset: number) => void;
  commands: SlashCommandItem[];
  disableSlashCommands?: boolean;
}

interface CompletionState {
  suggestions: UnifiedSuggestion[];
  selectedIndex: number;
  isActive: boolean;
  context: CompletionContext | null;
  preview: {
    isActive: boolean;
    originalInput: string;
    wordRange: [number, number];
  } | null;
  suppressUntil: number;
}

const INITIAL_STATE: CompletionState = {
  suggestions: [],
  selectedIndex: 0,
  isActive: false,
  context: null,
  preview: null,
  suppressUntil: 0,
};

function shouldHandleTabKey(key: Key): boolean {
  return key.tab && !key.shift;
}

export function useSlashCompletion({
  input,
  cursorOffset,
  onInputChange,
  setCursorOffset,
  commands,
  disableSlashCommands = false,
}: Props) {
  const [state, setState] = useState<CompletionState>(INITIAL_STATE);

  const updateState = useCallback((updates: Partial<CompletionState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetCompletion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      suggestions: [],
      selectedIndex: 0,
      isActive: false,
      context: null,
      preview: null,
    }));
  }, []);

  const activateCompletion = useCallback(
    (suggestions: UnifiedSuggestion[], context: CompletionContext) => {
      setState((prev) => ({
        ...prev,
        suggestions,
        selectedIndex: 0,
        isActive: true,
        context,
        preview: null,
      }));
    },
    []
  );

  const getWordAtCursor = useCallback((): CompletionContext | null => {
    return getSlashCompletionContext({
      input,
      cursorOffset,
      disableSlashCommands,
    });
  }, [input, cursorOffset, disableSlashCommands]);

  const generateSuggestions = useCallback(
    (context: CompletionContext): UnifiedSuggestion[] =>
      generateSlashCommandSuggestions({
        commands,
        prefix: context.prefix,
      }),
    [commands]
  );

  const completeWith = useCallback(
    (suggestion: UnifiedSuggestion, context: CompletionContext) => {
      const completion = `/${suggestion.value} `;
      const currentWord = input.slice(context.startPos);
      const nextSpaceIndex = currentWord.indexOf(' ');
      const actualEndPos =
        nextSpaceIndex === -1
          ? input.length
          : context.startPos + nextSpaceIndex;

      const newInput =
        input.slice(0, context.startPos) +
        completion +
        input.slice(actualEndPos);
      onInputChange(newInput);
      setCursorOffset(context.startPos + completion.length);
    },
    [input, onInputChange, setCursorOffset]
  );

  const shouldAutoTrigger = useCallback((): boolean => true, []);

  const shouldAutoHideSingleMatch = useCallback(
    (suggestion: UnifiedSuggestion, context: CompletionContext): boolean => {
      const currentInput = input.slice(context.startPos, context.endPos);
      const fullCommand = `/${suggestion.value}`;
      return currentInput === fullCommand;
    },
    [input]
  );

  useInput((inputChar, key) => {
    void inputChar;
    if (!shouldHandleTabKey(key)) return false;

    const context = getWordAtCursor();
    if (!context) return false;

    if (state.isActive && state.suggestions.length > 0) {
      const nextIndex = (state.selectedIndex + 1) % state.suggestions.length;
      const nextSuggestion = state.suggestions[nextIndex];

      if (state.context) {
        const currentWord = input.slice(state.context.startPos);
        const wordEnd = currentWord.search(/\s/);
        const actualEndPos =
          wordEnd === -1 ? input.length : state.context.startPos + wordEnd;

        const preview = `/${nextSuggestion.value}`;
        const newInput =
          input.slice(0, state.context.startPos) +
          preview +
          input.slice(actualEndPos);

        onInputChange(newInput);
        setCursorOffset(state.context.startPos + preview.length);

        updateState({
          selectedIndex: nextIndex,
          preview: {
            isActive: true,
            originalInput: input,
            wordRange: [
              state.context.startPos,
              state.context.startPos + preview.length,
            ],
          },
        });
      }
      return true;
    }

    const currentSuggestions = generateSuggestions(context);

    if (currentSuggestions.length === 0) {
      return false;
    } else if (currentSuggestions.length === 1) {
      completeWith(currentSuggestions[0], context);
      return true;
    } else {
      activateCompletion(currentSuggestions, context);

      const firstSuggestion = currentSuggestions[0];
      const currentWord = input.slice(context.startPos);
      const wordEnd = currentWord.search(/\s/);
      const actualEndPos =
        wordEnd === -1 ? input.length : context.startPos + wordEnd;

      const preview = `/${firstSuggestion.value}`;
      const newInput =
        input.slice(0, context.startPos) + preview + input.slice(actualEndPos);

      onInputChange(newInput);
      setCursorOffset(context.startPos + preview.length);

      updateState({
        preview: {
          isActive: true,
          originalInput: input,
          wordRange: [context.startPos, context.startPos + preview.length],
        },
      });

      return true;
    }
  });

  useInput((inputChar, key) => {
    void inputChar;
    if (
      key.return &&
      !key.shift &&
      !key.meta &&
      state.isActive &&
      state.suggestions.length > 0
    ) {
      const selectedSuggestion = state.suggestions[state.selectedIndex];
      if (selectedSuggestion && state.context) {
        const completion = `/${selectedSuggestion.value} `;

        const currentWord = input.slice(state.context.startPos);
        const nextSpaceIndex = currentWord.indexOf(' ');
        const actualEndPos =
          nextSpaceIndex === -1
            ? input.length
            : state.context.startPos + nextSpaceIndex;

        const newInput =
          input.slice(0, state.context.startPos) +
          completion +
          input.slice(actualEndPos);
        onInputChange(newInput);
        setCursorOffset(state.context.startPos + completion.length);
      }
      resetCompletion();
      return true;
    }
    return false;
  });

  useInput((inputChar, key) => {
    if (!state.isActive || state.suggestions.length === 0) return false;

    const handleNavigation = (newIndex: number) => {
      const preview = state.suggestions[newIndex].value;

      if (state.preview?.isActive && state.context) {
        const newInput =
          input.slice(0, state.context.startPos) +
          preview +
          input.slice(state.preview.wordRange[1]);

        onInputChange(newInput);
        setCursorOffset(state.context.startPos + preview.length);

        updateState({
          selectedIndex: newIndex,
          preview: {
            ...state.preview,
            wordRange: [
              state.context.startPos,
              state.context.startPos + preview.length,
            ],
          },
        });
      } else {
        updateState({ selectedIndex: newIndex });
      }
    };

    if (key.downArrow) {
      const nextIndex = (state.selectedIndex + 1) % state.suggestions.length;
      handleNavigation(nextIndex);
      return true;
    }

    if (key.upArrow) {
      const nextIndex =
        state.selectedIndex === 0
          ? state.suggestions.length - 1
          : state.selectedIndex - 1;
      handleNavigation(nextIndex);
      return true;
    }

    if (inputChar === ' ') {
      resetCompletion();
      return false;
    }

    if (key.rightArrow) {
      const selectedSuggestion = state.suggestions[state.selectedIndex];
      if (!state.context) return false;

      const currentWordAtContext = input.slice(
        state.context.startPos,
        state.context.startPos + selectedSuggestion.value.length
      );

      if (currentWordAtContext !== selectedSuggestion.value) {
        completeWith(selectedSuggestion, state.context);
      }

      resetCompletion();
      return true;
    }

    if (key.escape) {
      if (state.preview?.isActive && state.context) {
        onInputChange(state.preview.originalInput);
        setCursorOffset(state.context.startPos + state.context.prefix.length);
      }
      resetCompletion();
      return true;
    }

    return false;
  });

  useInput((inputChar, key) => {
    void inputChar;
    if (key.backspace || key.delete) {
      if (state.isActive) {
        resetCompletion();
        const suppressionTime = input.length > 10 ? 200 : 100;
        updateState({
          suppressUntil: Date.now() + suppressionTime,
        });
        return true;
      }
    }
    return false;
  });

  const lastInputRef = useRef('');

  useEffect(() => {
    if (lastInputRef.current === input) return;

    const inputLengthChange = Math.abs(
      input.length - lastInputRef.current.length
    );
    const isHistoryNavigation =
      (inputLengthChange > 10 ||
        (inputLengthChange > 5 &&
          !input.includes(lastInputRef.current.slice(-5)))) &&
      input !== lastInputRef.current;

    lastInputRef.current = input;

    if (state.preview?.isActive || Date.now() < state.suppressUntil) {
      return;
    }

    if (isHistoryNavigation && state.isActive) {
      resetCompletion();
      return;
    }

    const context = getWordAtCursor();

    if (context && shouldAutoTrigger()) {
      const newSuggestions = generateSuggestions(context);

      if (newSuggestions.length === 0) {
        resetCompletion();
      } else if (
        newSuggestions.length === 1 &&
        shouldAutoHideSingleMatch(newSuggestions[0], context)
      ) {
        resetCompletion();
      } else {
        activateCompletion(newSuggestions, context);
      }
    } else if (state.context) {
      const contextChanged =
        !context ||
        state.context.type !== context.type ||
        state.context.startPos !== context.startPos ||
        !context.prefix.startsWith(state.context.prefix);

      if (contextChanged) {
        resetCompletion();
      }
    }
  }, [
    input,
    cursorOffset,
    state.preview,
    state.suppressUntil,
    state.isActive,
    state.context,
    getWordAtCursor,
    generateSuggestions,
    resetCompletion,
    activateCompletion,
    shouldAutoTrigger,
    shouldAutoHideSingleMatch,
  ]);

  return {
    suggestions: state.suggestions,
    selectedIndex: state.selectedIndex,
    isActive: state.isActive,
  };
}
