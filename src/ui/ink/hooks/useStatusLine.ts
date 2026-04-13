/**
 * useStatusLine - 状态栏命令输出
 *
 * 执行用户配置的外部命令，将结果显示在底部状态栏。
 * 通过 STATUSLINE_CONTEXT 环境变量传递 JSON 上下文（model/cost/tokens 等）。
 */

import { useEffect, useRef, useState } from 'react';
import { execa } from 'execa';
import { getStatusLineCommand } from '../../../services/ui/statusline.js';

const MAX_STATUSLINE_LENGTH = 300;
const STATUSLINE_TIMEOUT_MS = 1000;
const STATUSLINE_INTERVAL_MS = 2000;

/** 传递给外部命令的上下文 */
export interface StatusLineContext {
  model?: string;
  provider?: string;
  workdir?: string;
  version?: string;
  cost?: { totalTokens?: number; totalCost?: number };
}

function normalizeStatusLineText(value: string): string {
  const singleLine = value.replace(/\r?\n/g, ' ').trim();
  if (singleLine.length > MAX_STATUSLINE_LENGTH) {
    return `${singleLine.slice(0, MAX_STATUSLINE_LENGTH)}…`;
  }
  return singleLine;
}

export function useStatusLine(context?: StatusLineContext): string | null {
  const [text, setText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;

  useEffect(() => {
    const enabled =
      process.env['KODE_STATUSLINE_ENABLED'] === '1' ||
      process.env['NODE_ENV'] !== 'test';
    if (!enabled) return;

    let alive = true;

    const tick = async () => {
      const command = getStatusLineCommand();
      if (!command) {
        abortRef.current?.abort();
        abortRef.current = null;
        if (alive) setText(null);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        // 通过环境变量传递 JSON 上下文
        const env: Record<string, string> = { ...process.env } as Record<string, string>;
        if (contextRef.current) {
          env['STATUSLINE_CONTEXT'] = JSON.stringify(contextRef.current);
        }

        const result = await execa('bash', ['-c', command], {
          cwd: process.cwd(),
          timeout: STATUSLINE_TIMEOUT_MS,
          reject: false,
          signal: ac.signal,
          env,
        });

        if (!alive || ac.signal.aborted) return;

        const raw =
          result.exitCode === 0 ? result.stdout : result.stdout || result.stderr;
        const next = raw ? normalizeStatusLineText(raw) : '';
        setText(next || null);
      } catch {
        if (!alive) return;
        if (ac.signal.aborted) return;
        setText(null);
      }
    };

    tick().catch(() => {});
    const id = setInterval(() => {
      tick().catch(() => {});
    }, STATUSLINE_INTERVAL_MS);

    return () => {
      alive = false;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, []);

  return text;
}
