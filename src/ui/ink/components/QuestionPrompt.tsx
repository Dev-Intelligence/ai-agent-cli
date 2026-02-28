/**
 * QuestionPrompt - 问答交互组件
 */

import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

export interface QuestionOption {
  label: string;
  description: string;
}

export interface QuestionDef {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

export interface QuestionPromptProps {
  questions: QuestionDef[];
  onResolve: (result: string) => void;
}

export function QuestionPrompt({ questions, onResolve }: QuestionPromptProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const q = questions[currentIdx];
  if (!q) return null;

  useInput(useCallback((input: string) => {
    const num = parseInt(input, 10);
    if (num >= 1 && num <= q.options.length) {
      const label = q.options[num - 1].label;
      const newAnswers = { ...answers, [q.header]: label };
      setAnswers(newAnswers);

      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        // 格式化结果
        let result = '用户回答:\n\n';
        for (const [header, answer] of Object.entries(newAnswers)) {
          if (Array.isArray(answer)) {
            result += `${header}: ${answer.join(', ')}\n`;
          } else {
            result += `${header}: ${answer}\n`;
          }
        }
        onResolve(result);
      }
    }
  }, [q, currentIdx, questions, answers, onResolve]));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="blue">📋 {q.header}</Text>
      <Text> </Text>
      <Text>❓ {q.question}</Text>
      <Text> </Text>
      {q.options.map((opt, idx) => (
        <Box key={idx} flexDirection="column">
          <Text>  <Text bold>{idx + 1}.</Text> {opt.label}</Text>
          <Text dimColor>     {opt.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>请选择 (1-{q.options.length}):</Text>
    </Box>
  );
}
