/**
 * LSPClient — LSP 客户端
 *
 * 管理与 LSP 服务器进程的 JSON-RPC 通信。
 *
 * 生命周期：start() → initialize() → sendRequest/sendNotification → stop()
 */

import { type ChildProcess, spawn } from 'child_process';
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node.js';
import type {
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
} from 'vscode-languageserver-protocol';

// ─── 类型 ───

export type LSPClient = {
  readonly capabilities: ServerCapabilities | undefined;
  readonly isInitialized: boolean;
  start: (command: string, args: string[], options?: { env?: Record<string, string>; cwd?: string }) => Promise<void>;
  initialize: (params: InitializeParams) => Promise<InitializeResult>;
  sendRequest: <TResult>(method: string, params: unknown) => Promise<TResult>;
  sendNotification: (method: string, params: unknown) => Promise<void>;
  onNotification: (method: string, handler: (params: unknown) => void) => void;
  onRequest: <TParams, TResult>(method: string, handler: (params: TParams) => TResult | Promise<TResult>) => void;
  stop: () => Promise<void>;
};

// ─── 工厂 ───

/**
 * 创建 LSP 客户端
 */
export function createLSPClient(
  serverName: string,
  onCrash?: (error: Error) => void,
): LSPClient {
  let proc: ChildProcess | undefined;
  let connection: MessageConnection | undefined;
  let capabilities: ServerCapabilities | undefined;
  let isInitialized = false;
  let startFailed = false;
  let startError: Error | undefined;
  let isStopping = false;

  // 延迟注册的处理器队列
  const pendingHandlers: Array<{ method: string; handler: (params: unknown) => void }> = [];
  const pendingRequestHandlers: Array<{ method: string; handler: (params: unknown) => unknown | Promise<unknown> }> = [];

  function checkStartFailed(): void {
    if (startFailed) throw startError || new Error(`LSP 服务器 ${serverName} 启动失败`);
  }

  return {
    get capabilities() { return capabilities; },
    get isInitialized() { return isInitialized; },

    async start(command, args, options) {
      try {
        // 1. 启动 LSP 服务器进程
        proc = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...options?.env },
          cwd: options?.cwd,
          windowsHide: true,
        });

        if (!proc.stdout || !proc.stdin) throw new Error('LSP 服务器进程 stdio 不可用');

        // 等待进程成功 spawn
        const spawnedProc = proc;
        await new Promise<void>((resolve, reject) => {
          const onSpawn = () => { cleanup(); resolve(); };
          const onError = (error: Error) => { cleanup(); reject(error); };
          const cleanup = () => { spawnedProc.removeListener('spawn', onSpawn); spawnedProc.removeListener('error', onError); };
          spawnedProc.once('spawn', onSpawn);
          spawnedProc.once('error', onError);
        });

        // stderr 日志
        proc.stderr?.on('data', (data: Buffer) => {
          const output = data.toString().trim();
          if (output) console.error(`[LSP ${serverName}] ${output}`);
        });

        // 进程错误处理
        proc.on('error', (error) => {
          if (!isStopping) { startFailed = true; startError = error; }
        });

        proc.on('exit', (code) => {
          if (code !== 0 && code !== null && !isStopping) {
            isInitialized = false;
            const crashError = new Error(`LSP 服务器 ${serverName} 崩溃，退出码 ${code}`);
            onCrash?.(crashError);
          }
        });

        proc.stdin.on('error', () => { /* 静默处理，connection error handler 会捕获 */ });

        // 2. 创建 JSON-RPC 连接
        const reader = new StreamMessageReader(proc.stdout);
        const writer = new StreamMessageWriter(proc.stdin);
        connection = createMessageConnection(reader, writer);

        connection.onError(([error]) => {
          if (!isStopping) { startFailed = true; startError = error; }
        });
        connection.onClose(() => { if (!isStopping) isInitialized = false; });

        // 3. 开始监听
        connection.listen();

        // 4. 应用排队的处理器
        for (const { method, handler } of pendingHandlers) connection.onNotification(method, handler);
        pendingHandlers.length = 0;
        for (const { method, handler } of pendingRequestHandlers) connection.onRequest(method, handler);
        pendingRequestHandlers.length = 0;
      } catch (error) {
        throw error;
      }
    },

    async initialize(params) {
      if (!connection) throw new Error('LSP 客户端未启动');
      checkStartFailed();

      const result: InitializeResult = await connection.sendRequest('initialize', params);
      capabilities = result.capabilities;
      await connection.sendNotification('initialized', {});
      isInitialized = true;
      return result;
    },

    async sendRequest<TResult>(method: string, params: unknown): Promise<TResult> {
      if (!connection) throw new Error('LSP 客户端未启动');
      checkStartFailed();
      if (!isInitialized) throw new Error('LSP 服务器未初始化');
      return connection.sendRequest(method, params);
    },

    async sendNotification(method, params) {
      if (!connection) throw new Error('LSP 客户端未启动');
      checkStartFailed();
      if (!isInitialized) throw new Error('LSP 服务器未初始化');
      await connection.sendNotification(method, params);
    },

    onNotification(method, handler) {
      if (connection) {
        connection.onNotification(method, handler);
      } else {
        pendingHandlers.push({ method, handler });
      }
    },

    onRequest(method, handler) {
      if (connection) {
        connection.onRequest(method, handler as any);
      } else {
        pendingRequestHandlers.push({ method, handler: handler as any });
      }
    },

    async stop() {
      isStopping = true;
      if (connection) {
        if (isInitialized) {
          try { await connection.sendRequest('shutdown', null); } catch { /* 忽略 */ }
          try { await connection.sendNotification('exit', null); } catch { /* 忽略 */ }
        }
        connection.dispose();
        connection = undefined;
      }
      if (proc) {
        proc.kill('SIGTERM');
        proc = undefined;
      }
      isInitialized = false;
      isStopping = false;
    },
  };
}
