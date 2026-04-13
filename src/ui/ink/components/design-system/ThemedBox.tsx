import type { ComponentProps, PropsWithChildren } from 'react';
import { Box } from '../../primitives.js';
import type { InkColorMap } from '../../../theme.js';
import { resolveThemeColor } from './color.js';

export interface ThemedBoxProps
  extends Omit<ComponentProps<typeof Box>, 'borderColor' | 'backgroundColor'> {
  borderColor?: keyof InkColorMap | string;
  backgroundColor?: keyof InkColorMap | string;
}

export function ThemedBox({
  borderColor,
  backgroundColor,
  children,
  ...rest
}: PropsWithChildren<ThemedBoxProps>) {
  return (
    <Box
      borderColor={resolveThemeColor(borderColor)}
      backgroundColor={resolveThemeColor(backgroundColor)}
      {...rest}
    >
      {children}
    </Box>
  );
}
