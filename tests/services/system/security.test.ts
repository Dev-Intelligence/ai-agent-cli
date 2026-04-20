import { describe, it, expect } from 'vitest';
import { validateReadOnlyCommand } from '../../../src/services/system/security.js';

function expectAllowed(cmd: string): void {
  expect(() => validateReadOnlyCommand(cmd)).not.toThrow();
}

function expectRejected(cmd: string, matcher?: RegExp): void {
  try {
    validateReadOnlyCommand(cmd);
    throw new Error(`应被拒绝但通过了: ${cmd}`);
  } catch (err) {
    const msg = (err as Error).message;
    if (matcher) expect(msg).toMatch(matcher);
    else expect(msg).not.toBe(`应被拒绝但通过了: ${cmd}`);
  }
}

describe('validateReadOnlyCommand 白名单基础', () => {
  it('白名单内单命令允许', () => {
    expectAllowed('ls');
    expectAllowed('ls -la');
    expectAllowed('cat file.txt');
    expectAllowed('grep foo bar.txt');
    expectAllowed('rg pattern');
    expectAllowed('fd --extension ts');
    expectAllowed('bat README.md');
    expectAllowed('jq . data.json');
  });

  it('git 只读子命令', () => {
    expectAllowed('git log');
    expectAllowed('git log --oneline -5');
    expectAllowed('git diff HEAD');
    expectAllowed('git status');
    expectAllowed('git show abc123');
    expectAllowed('git branch -a');
    expectAllowed('git config --get user.name');
  });

  it('版本查询命令', () => {
    expectAllowed('node --version');
    expectAllowed('python --version');
    expectAllowed('pnpm --version');
  });

  it('不在白名单的命令拒绝', () => {
    expectRejected('rm file', /不允许执行/);
    expectRejected('cp a b', /不允许执行/);
    expectRejected('mv a b', /不允许执行/);
    expectRejected('chmod +x x', /不允许执行/);
    expectRejected('npm install', /不允许执行/);
    expectRejected('git push', /不允许执行/);
    expectRejected('git commit -m x', /不允许执行/);
  });
});

describe('重定向检测', () => {
  it('> 写文件拒绝', () => {
    expectRejected('ls > out.txt', /重定向/);
  });
  it('>> 追加拒绝', () => {
    expectRejected('cat a >> b', /重定向/);
  });
  it('2>&1 合流允许（不改文件）', () => {
    expectAllowed('ls 2>&1');
  });
});

describe('命令替换检测', () => {
  it('$(...) 拒绝', () => {
    expectRejected('ls $(echo x)', /命令替换/);
    expectRejected('cat $(find . -name x)', /命令替换/);
  });
  it('反引号拒绝', () => {
    expectRejected('ls `pwd`', /命令替换/);
  });
});

describe('多段命令切分', () => {
  it('; 链式：每段都必须白名单', () => {
    expectAllowed('ls; cat x');
    expectRejected('ls; rm x', /不允许执行/);
  });

  it('&& 链式', () => {
    expectAllowed('ls && cat x');
    expectRejected('ls && rm x', /不允许执行/);
    expectRejected('cat a && curl http://x', /不允许执行/);
  });

  it('|| 回退链', () => {
    expectRejected('cat x || rm x', /不允许执行/);
  });

  it('| 管道：每段都要白名单', () => {
    expectAllowed('cat x | grep foo');
    expectAllowed('ls | wc -l');
    expectRejected('cat x | tee y.txt', /不允许执行/);
  });

  it('首段合法 + 末段危险不放过', () => {
    expectRejected('ls; git push', /不允许执行/);
  });
});

describe('find 参数限制', () => {
  it('find 正常查找允许', () => {
    expectAllowed('find . -name "*.ts"');
    expectAllowed('find src -type f');
  });
  it('-delete 拒绝', () => {
    expectRejected('find . -name "*.log" -delete', /-delete/);
  });
  it('-exec 拒绝', () => {
    expectRejected('find . -exec rm {} \\;', /-exec/);
  });
  it('-execdir 拒绝', () => {
    expectRejected('find . -execdir echo {} \\;', /-execdir/);
  });
  it('-ok 拒绝', () => {
    expectRejected('find . -ok rm {} \\;', /-ok/);
  });
});

describe('边界情况', () => {
  it('空命令拒绝', () => {
    expectRejected('   ', /拒绝空命令|不允许/);
  });
  it('VAR=val cmd 前缀被剥除后仍识别命令', () => {
    expectAllowed('LANG=C ls');
    expectAllowed('LC_ALL=en_US.UTF-8 git log');
    expectRejected('FOO=bar rm file', /不允许执行/);
  });
  it('多个分隔符混合', () => {
    expectRejected('ls && ls ; rm x', /不允许执行/);
  });
});
