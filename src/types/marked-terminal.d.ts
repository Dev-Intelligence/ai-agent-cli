declare module 'marked-terminal' {
  import type { MarkedExtension } from 'marked';

  interface MarkedTerminalOptions {
    code?: (code: string, lang?: string) => string;
    firstHeading?: (text: string) => string;
    showSectionPrefix?: boolean;
    reflowText?: boolean;
    width?: number;
    tab?: number;
    [key: string]: unknown;
  }

  export function markedTerminal(options?: MarkedTerminalOptions): MarkedExtension;
  export default function Renderer(options?: MarkedTerminalOptions): void;
}
