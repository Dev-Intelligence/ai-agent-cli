/**
 * $ARGUMENTS 占位替换
 *
 * 用于 skill / 斜杠命令的提示词模板。支持：
 *   - $ARGUMENTS           → 整段参数字符串
 *   - $ARGUMENTS[0]、$0    → 按空白/引号切分后的第 N 个参数
 *   - 具名参数 $foo / $bar → 当 frontmatter 声明了参数名时，按位置映射
 *
 * 为避免引入 shell-quote 依赖，tokenizer 使用一个最小实现：
 *   - 双引号 / 单引号包裹的整体作为一个 token
 *   - 反斜杠可转义单个字符
 *   - 其余按空白分隔
 *   - 不支持管道、重定向等 shell 操作符
 */

/** 把参数字符串切成单个参数数组 */
export function parseArguments(args: string): string[] {
  if (!args || !args.trim()) return [];

  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escape = false;

  for (let i = 0; i < args.length; i++) {
    const ch = args[i]!;
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      // 引号内反斜杠仅在双引号里生效（与 bash 一致）；单引号内原样保留
      if (quote === "'") {
        current += ch;
      } else {
        escape = true;
      }
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * 解析 frontmatter 的 `arguments` 字段：支持空格分隔字符串或字符串数组。
 * 数值型名（会和 $0/$1 简写冲突）会被过滤掉。
 */
export function parseArgumentNames(
  argumentNames: string | string[] | undefined,
): string[] {
  if (!argumentNames) return [];
  const isValidName = (name: string): boolean =>
    typeof name === 'string' && name.trim() !== '' && !/^\d+$/.test(name);

  if (Array.isArray(argumentNames)) {
    return argumentNames.filter(isValidName);
  }
  if (typeof argumentNames === 'string') {
    return argumentNames.split(/\s+/).filter(isValidName);
  }
  return [];
}

/**
 * 生成剩余未填充参数的提示。例如定义了 [arg1, arg2, arg3]，用户已输入
 * 2 个，返回 "[arg3]"；全部填满返回 undefined。
 */
export function generateProgressiveArgumentHint(
  argNames: string[],
  typedArgs: string[],
): string | undefined {
  const remaining = argNames.slice(typedArgs.length);
  if (remaining.length === 0) return undefined;
  return remaining.map((name) => `[${name}]`).join(' ');
}

/**
 * 将 content 中的 $ARGUMENTS 占位符替换为实际参数。
 *
 * @param content 含占位符的模板内容
 * @param args 用户输入的原始参数字符串（null / undefined 时原样返回）
 * @param appendIfNoPlaceholder 若为 true 且 content 中无占位符且 args 非空，
 *                              在末尾附加 `\n\nARGUMENTS: {args}`
 * @param argumentNames 具名参数数组（来自 frontmatter），按位置映射
 */
export function substituteArguments(
  content: string,
  args: string | undefined,
  appendIfNoPlaceholder = true,
  argumentNames: string[] = [],
): string {
  if (args === undefined || args === null) {
    return content;
  }

  const parsedArgs = parseArguments(args);
  const originalContent = content;

  // 具名参数（$foo、$bar）按位置映射
  for (let i = 0; i < argumentNames.length; i++) {
    const name = argumentNames[i];
    if (!name) continue;
    // 不匹配 $foo[...] 或 $fooBar（word 字符连续）
    content = content.replace(
      new RegExp(`\\$${name}(?![\\[\\w])`, 'g'),
      parsedArgs[i] ?? '',
    );
  }

  // 索引形式 $ARGUMENTS[0] / $ARGUMENTS[1]
  content = content.replace(/\$ARGUMENTS\[(\d+)\]/g, (_match, indexStr: string) => {
    const index = parseInt(indexStr, 10);
    return parsedArgs[index] ?? '';
  });

  // 简写 $0 / $1 / ...
  content = content.replace(/\$(\d+)(?!\w)/g, (_match, indexStr: string) => {
    const index = parseInt(indexStr, 10);
    return parsedArgs[index] ?? '';
  });

  // 整段 $ARGUMENTS
  content = content.replaceAll('$ARGUMENTS', args);

  // 没任何占位且 args 非空 → 附加到末尾
  if (content === originalContent && appendIfNoPlaceholder && args) {
    content = content + `\n\nARGUMENTS: ${args}`;
  }

  return content;
}
