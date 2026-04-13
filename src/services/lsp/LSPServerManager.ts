/**
 * LSPServerManager — LSP 服务器管理器
 *
 * 管理多个 LSP 服务器实例，基于文件扩展名路由请求。
 */

import { createLSPServerInstance, type LSPServerInstance, type LspServerConfig } from './LSPServerInstance.js';

// ─── 类型 ───

export interface LSPServerManager {
  /** 启动所有配置的服务器 */
  startAll: (cwd: string) => Promise<void>;
  /** 停止所有服务器 */
  stopAll: () => Promise<void>;
  /** 根据文件路径找到对应的 LSP 服务器 */
  getServerForFile: (filePath: string) => LSPServerInstance | null;
  /** 获取所有服务器 */
  getAllServers: () => LSPServerInstance[];
  /** 添加服务器配置 */
  addServer: (name: string, config: LspServerConfig) => void;
}

// ─── 工厂 ───

export function createLSPServerManager(): LSPServerManager {
  const servers = new Map<string, LSPServerInstance>();
  const configs = new Map<string, LspServerConfig>();

  // 扩展名 → 服务器名映射
  const extensionMap = new Map<string, string>();

  function rebuildExtensionMap() {
    extensionMap.clear();
    for (const [name, config] of configs) {
      for (const ext of config.extensions) {
        extensionMap.set(ext.startsWith('.') ? ext : `.${ext}`, name);
      }
    }
  }

  return {
    async startAll(cwd) {
      const startPromises = [...configs.entries()].map(async ([name, config]) => {
        if (!servers.has(name)) {
          servers.set(name, createLSPServerInstance(name, config));
        }
        const server = servers.get(name)!;
        if (server.state !== 'running') {
          await server.start(cwd);
        }
      });
      await Promise.allSettled(startPromises);
    },

    async stopAll() {
      const stopPromises = [...servers.values()].map((s) => s.stop());
      await Promise.allSettled(stopPromises);
      servers.clear();
    },

    getServerForFile(filePath) {
      const ext = filePath.slice(filePath.lastIndexOf('.'));
      const serverName = extensionMap.get(ext);
      if (!serverName) return null;
      return servers.get(serverName) ?? null;
    },

    getAllServers() {
      return [...servers.values()];
    },

    addServer(name, config) {
      configs.set(name, config);
      rebuildExtensionMap();
    },
  };
}
