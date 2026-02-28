/**
 * ActiveArea - 活跃区域路由组件
 * 根据当前 phase 渲染不同的交互组件
 */

import { Box } from 'ink';
import type { AppPhase } from '../types.js';
import { ThinkingSpinner } from './ThinkingSpinner.js';
import { StreamingText } from './StreamingText.js';
import { UserInput } from './UserInput.js';
import type { QuestionDef } from './QuestionPrompt.js';
import { QuestionPrompt } from './QuestionPrompt.js';
import type { KeybindingRegistry } from '../../keybindings.js';

export interface ActiveAreaProps {
  phase: AppPhase;
  onInput: (text: string) => void;
  onExit: () => void;
  commandNames: string[];
  keybindingRegistry?: KeybindingRegistry;
}

export function ActiveArea({ phase, onInput, onExit, commandNames, keybindingRegistry }: ActiveAreaProps) {
  switch (phase.type) {
    case 'input':
      return (
        <UserInput
          prefix=">>>"
          commandNames={commandNames}
          onSubmit={onInput}
          onCancel={() => {}}
          onExit={onExit}
          keybindingRegistry={keybindingRegistry}
        />
      );

    case 'thinking':
      return <ThinkingSpinner />;

    case 'streaming':
      return <StreamingText text={phase.text} />;

    case 'tool_active':
      return (
        <Box>
          <ThinkingSpinner />
        </Box>
      );

    case 'question':
      return (
        <QuestionPrompt
          questions={phase.questions as QuestionDef[]}
          onResolve={phase.resolve}
        />
      );

    default:
      return null;
  }
}
