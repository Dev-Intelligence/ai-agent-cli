/**
 * REPL — 主屏幕编排器
 *
 * 从 AppStateStore 订阅所有状态切片，组装 FullscreenLayout 的插槽。
 */

import { useRef, useEffect, useState } from 'react';
import type { AppStateStore } from '../store.js';
import { useAppState } from '../hooks.js';
import { FullscreenLayout, useUnseenDivider } from '../components/FullscreenLayout.js';
import { Messages } from '../components/Messages.js';
import { RequestStatusIndicator } from '../components/RequestStatusIndicator.js';
import type { TokenStatsSnapshot } from '../components/EnhancedSpinner.js';
import { UserInput } from '../components/UserInput.js';
import { PermissionPrompt } from '../components/PermissionPrompt.js';
import { QuestionPrompt } from '../components/QuestionPrompt.js';
import { SessionSelector } from '../components/SessionSelector.js';
import { TaskSelector } from '../components/TaskSelector.js';
import type { AskUserQuestionDef } from '../types.js';
import type { SlashCommandItem } from '../completion/types.js';
import { useCancelRequest } from '../hooks/useCancelRequest.js';
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD.js';
import { useCommandKeybindings } from '../hooks/useCommandKeybindings.js';
import { ScrollKeybindingHandler } from '../components/ScrollKeybindingHandler.js';
import type { ScrollBoxHandle } from '../primitives.js';

export interface REPLProps {
  store: AppStateStore;
  onInput: (text: string) => void;
  onExit: () => void;
  onInterrupt: () => void;
  slashCommands: SlashCommandItem[];
  getTokenStats?: () => TokenStatsSnapshot;
  /** 当前模型显示名，用于状态栏 */
  modelName?: string;
  /** 当前 provider，用于状态栏上下文 */
  provider?: string;
}

export function REPL({ store, onInput, onExit, onInterrupt, slashCommands, getTokenStats, modelName, provider }: REPLProps) {
  const completedItems = useAppState(store, (s) => s.completedItems);
  const activeToolUses = useAppState(store, (s) => s.activeToolUses);
  const streaming = useAppState(store, (s) => s.streaming);
  const loading = useAppState(store, (s) => s.loading);
  const focus = useAppState(store, (s) => s.focus);
  const tokenInfo = useAppState(store, (s) => s.tokenInfo);
  const contextTokenUsage = useAppState(store, (s) => s.contextTokenUsage);

  const scrollRef = useRef<ScrollBoxHandle>(null);
  const [columns, setColumns] = useState(process.stdout.columns || 80);
  const isLoading = Boolean(loading || streaming || activeToolUses.length > 0);

  // 终端 resize 追踪
  useEffect(() => {
    const onResize = () => setColumns(process.stdout.columns || 80);
    process.stdout.on('resize', onResize);
    return () => { process.stdout.off('resize', onResize); };
  }, []);

  useCancelRequest({ isLoading, focus, onInterrupt });
  useExitOnCtrlCD({ focus, isLoading, onExit });
  useCommandKeybindings({
    store,
    enabled: !focus && !isLoading,
  });

  // ─── 未读分割线追踪 ───
  const { dividerYRef, onScrollAway, onRepin, jumpToNew, newMessageCount } =
    useUnseenDividerAdapter(completedItems.length, scrollRef);

  // ─── scrollable：消息 + spinner ───
  const scrollable = (
    <>
      <Messages
        completedItems={completedItems}
        activeToolUses={activeToolUses}
        streaming={streaming}
        scrollRef={scrollRef}
        columns={columns}
      />
      {isLoading && !focus && (
        <RequestStatusIndicator getTokenStats={getTokenStats} />
      )}
    </>
  );

  // ─── overlay：权限弹窗（在 ScrollBox 内，用户可回滚查看上下文） ───
  const overlay = focus?.type === 'permission' ? (
    <PermissionPrompt
      toolName={focus.toolName}
      params={focus.params}
      reason={focus.reason}
      commandPrefix={focus.commandPrefix}
      commandInjectionDetected={focus.commandInjectionDetected}
      onResolve={focus.resolve}
    />
  ) : undefined;

  // ─── bottom：对话框 / 输入框 ───
  const bottom = (
    <>
      {focus?.type === 'question' && (
        <QuestionPrompt
          questions={focus.questions as AskUserQuestionDef[]}
          initialAnswers={focus.initialAnswers}
          onResolve={focus.resolve}
        />
      )}
      {focus?.type === 'session_selector' && (
        <SessionSelector
          sessions={focus.sessions}
          onSelect={(index) => focus.resolve(index)}
          onCancel={() => focus.resolve(null)}
        />
      )}
      {focus?.type === 'task_selector' && (
        <TaskSelector
          tasks={focus.tasks}
          onAction={(action, taskId) => focus.resolve({ action, taskId })}
          onCancel={() => focus.resolve(null)}
        />
      )}
      {!focus && (
        <UserInput
          slashCommands={slashCommands}
          onSubmit={onInput}
          onExit={onExit}
          tokenInfo={tokenInfo}
          contextTokenUsage={contextTokenUsage}
          modelName={modelName}
          provider={provider}
          getTokenStats={getTokenStats}
        />
      )}
    </>
  );

  return (
    <>
      {/* 滚动快捷键处理器（有弹窗时禁用） */}
      <ScrollKeybindingHandler
        scrollRef={scrollRef}
        isActive={!focus}
        onScroll={(sticky, handle) => {
          if (!sticky) {
            onScrollAway(handle);
          } else {
            onRepin();
          }
        }}
      />

      {/* 全屏布局 */}
      <FullscreenLayout
        scrollable={scrollable}
        bottom={bottom}
        overlay={overlay}
        scrollRef={scrollRef}
        dividerYRef={dividerYRef}
        newMessageCount={newMessageCount}
        onPillClick={() => jumpToNew(scrollRef.current)}
      />
    </>
  );
}

/**
 * useUnseenDivider 适配器
 * 将 FullscreenLayout 的 useUnseenDivider 包装为 REPL 需要的接口，
 * 增加 newMessageCount 计算。
 */
function useUnseenDividerAdapter(
  messageCount: number,
  scrollRef: React.RefObject<ScrollBoxHandle | null>,
) {
  const { dividerIndex, dividerYRef, onScrollAway, onRepin, jumpToNew } =
    useUnseenDivider(messageCount);

  // 新消息计数：当前消息数 - 快照时的消息数
  const newMessageCount = dividerIndex !== null
    ? Math.max(0, messageCount - dividerIndex)
    : 0;

  // 滚动事件监听：驱动 onScrollAway / onRepin
  useEffect(() => {
    const handle = scrollRef.current;
    if (!handle) return;
    return handle.subscribe(() => {
      if (!handle.isSticky()) {
        onScrollAway(handle);
      } else {
        onRepin();
      }
    });
  }, [scrollRef, onScrollAway, onRepin]);

  return { dividerYRef, onScrollAway, onRepin, jumpToNew, newMessageCount };
}
