import { describe, it, expect } from 'vitest';
import {
  formatAgentId,
  parseAgentId,
  generateRequestId,
  parseRequestId,
} from '../../src/utils/agentId.js';

describe('formatAgentId / parseAgentId 往返', () => {
  it('基本往返', () => {
    const id = formatAgentId('researcher', 'team-alpha');
    expect(id).toBe('researcher@team-alpha');
    expect(parseAgentId(id)).toEqual({
      agentName: 'researcher',
      teamName: 'team-alpha',
    });
  });

  it('agentName 为空仍可解析', () => {
    expect(parseAgentId('@team')).toEqual({ agentName: '', teamName: 'team' });
  });

  it('teamName 含 - 与字母', () => {
    expect(parseAgentId('agent@team-1-2')).toEqual({
      agentName: 'agent',
      teamName: 'team-1-2',
    });
  });

  it('无 @ → null', () => {
    expect(parseAgentId('researcher')).toBeNull();
  });
});

describe('generateRequestId / parseRequestId', () => {
  it('基本往返', () => {
    const agentId = formatAgentId('r', 't');
    const now = () => 1_700_000_000_000;
    const id = generateRequestId('shutdown', agentId, now);
    expect(id).toBe('shutdown-1700000000000@r@t');
    expect(parseRequestId(id)).toEqual({
      requestType: 'shutdown',
      timestamp: 1_700_000_000_000,
      agentId: 'r@t',
    });
  });

  it('requestType 含短横', () => {
    const id = generateRequestId('plan-approve', 'a@t', () => 42);
    expect(id).toBe('plan-approve-42@a@t');
    expect(parseRequestId(id)).toEqual({
      requestType: 'plan-approve',
      timestamp: 42,
      agentId: 'a@t',
    });
  });

  it('格式不合法的输入 → null', () => {
    expect(parseRequestId('no-at-symbol')).toBeNull();
    expect(parseRequestId('nodash@agent@t')).toBeNull();
    expect(parseRequestId('shutdown-notnum@a@t')).toBeNull();
  });
});
