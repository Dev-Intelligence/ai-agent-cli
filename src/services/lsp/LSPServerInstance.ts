/**
 * LSPServerInstance — LSP 服务器实例
 *
 * 管理单个 LSP 服务器的生命周期、诊断注册、文件扩展名路由。
 */

import * as path from 'path';
import { pathToFileURL } from 'url';
import type { InitializeParams } from 'vscode-languageserver-protocol';
import { createLSPClient, type LSPClient } from './LSPClient.js';
import { registerPendingLSPDiagnostic, type DiagnosticItem } from './LSPDiagnosticRegistry.js';

// ─── 类型 ───

export interface LspServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  /** 支持的文件扩展名 */
  extensions: string[];
}

export type LspServerState = 'stopped' | 'starting' | 'running' | 'error';

export interface LSPServerInstance {
  readonly name: string;
  readonly state: LspServerState;
  readonly extensions: string[];
  start: (cwd: string) => Promise<void>;
  stop: () => Promise<void>;
  /** 发送 textDocument/didOpen 通知 */
  didOpen: (filePath: string, content: string, languageId: string) => Promise<void>;
  /** 发送 textDocument/didChange 通知 */
  didChange: (filePath: string, content: string, version: number) => Promise<void>;
  /** 获取诊断 */
  getDiagnostics: (filePath: string) => Promise<DiagnosticItem[]>;
}

// ─── 重试常量 ───

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ─── 工厂 ───

export function createLSPServerInstance(
  name: string,
  config: LspServerConfig,
): LSPServerInstance {
  let state: LspServerState = 'stopped';
  let client: LSPClient | null = null;
  let retryCount = 0;

  return {
    get name() { return name; },
    get state() { return state; },
    get extensions() { return config.extensions; },

    async start(cwd: string) {
      if (state === 'running') return;
      state = 'starting';

      try {
        client = createLSPClient(name, (_error) => {
          state = 'error';
          // 自动重试
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => { void this.start(cwd); }, RETRY_DELAY_MS * retryCount);
          }
        });

        await client.start(config.command, config.args ?? [], {
          env: config.env,
          cwd,
        });

        // 初始化
        const initParams: InitializeParams = {
          processId: process.pid,
          capabilities: {
            textDocument: {
              publishDiagnostics: { relatedInformation: true },
              synchronization: { dynamicRegistration: false, didSave: true },
            },
          },
          rootUri: pathToFileURL(cwd).href,
          workspaceFolders: [{ uri: pathToFileURL(cwd).href, name: path.basename(cwd) }],
        };

        await client.initialize(initParams);

        // 注册诊断通知处理
        client.onNotification('textDocument/publishDiagnostics', (params: any) => {
          const uri = params.uri as string;
          const diagnostics: DiagnosticItem[] = (params.diagnostics ?? []).map((d: any) => ({
            message: d.message,
            severity: ['', 'Error', 'Warning', 'Info', 'Hint'][d.severity] ?? 'Info',
            range: d.range,
            source: d.source,
            code: d.code,
          }));
          if (diagnostics.length > 0) {
            registerPendingLSPDiagnostic(name, [{ uri, diagnostics }]);
          }
        });

        state = 'running';
        retryCount = 0;
      } catch {
        state = 'error';
      }
    },

    async stop() {
      if (client) {
        await client.stop();
        client = null;
      }
      state = 'stopped';
    },

    async didOpen(filePath, content, languageId) {
      if (!client?.isInitialized) return;
      await client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri: pathToFileURL(filePath).href,
          languageId,
          version: 1,
          text: content,
        },
      });
    },

    async didChange(filePath, content, version) {
      if (!client?.isInitialized) return;
      await client.sendNotification('textDocument/didChange', {
        textDocument: { uri: pathToFileURL(filePath).href, version },
        contentChanges: [{ text: content }],
      });
    },

    async getDiagnostics(_filePath) {
      // 诊断通过 publishDiagnostics 通知异步到达，不是请求/响应
      return [];
    },
  };
}
