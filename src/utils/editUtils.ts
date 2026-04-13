/**
 * editUtils — 文件编辑辅助工具
 *
 * 提供引号归一化、尾部空白清理、模糊字符串匹配。
 */

// ─── 弯引号常量 ───
const LEFT_SINGLE_CURLY = '\u2018';   // '
const RIGHT_SINGLE_CURLY = '\u2019';  // '
const LEFT_DOUBLE_CURLY = '\u201C';   // "
const RIGHT_DOUBLE_CURLY = '\u201D';  // "

/**
 * 将弯引号归一化为直引号
 * LLM 无法输出弯引号，但源文件中可能存在
 */
export function normalizeQuotes(str: string): string {
  return str
    .replaceAll(LEFT_SINGLE_CURLY, "'")
    .replaceAll(RIGHT_SINGLE_CURLY, "'")
    .replaceAll(LEFT_DOUBLE_CURLY, '"')
    .replaceAll(RIGHT_DOUBLE_CURLY, '"');
}

/**
 * 去除每行尾部空白，保留换行符
 */
export function stripTrailingWhitespace(str: string): string {
  const lines = str.split(/(\r\n|\n|\r)/);
  let result = '';
  for (let i = 0; i < lines.length; i++) {
    const part = lines[i];
    if (part !== undefined) {
      if (i % 2 === 0) {
        // 行内容：去除尾部空白
        result += part.replace(/\s+$/, '');
      } else {
        // 换行符：保留
        result += part;
      }
    }
  }
  return result;
}

/**
 * 在文件内容中查找匹配字符串
 * 先尝试精确匹配，失败后尝试引号归一化匹配
 *
 * @returns 文件中实际匹配的字符串，或 null
 */
export function findActualString(
  fileContent: string,
  searchString: string,
): string | null {
  // 1. 精确匹配
  if (fileContent.includes(searchString)) {
    return searchString;
  }

  // 2. 引号归一化匹配
  const normalizedSearch = normalizeQuotes(searchString);
  const normalizedFile = normalizeQuotes(fileContent);
  const idx = normalizedFile.indexOf(normalizedSearch);
  if (idx !== -1) {
    return fileContent.substring(idx, idx + searchString.length);
  }

  // 3. 尾部空白归一化匹配
  const strippedSearch = stripTrailingWhitespace(searchString);
  const strippedFile = stripTrailingWhitespace(fileContent);
  const strippedIdx = strippedFile.indexOf(strippedSearch);
  if (strippedIdx !== -1) {
    // 找到原始文件中对应位置
    return findOriginalSubstring(fileContent, strippedFile, strippedIdx, strippedSearch.length);
  }

  return null;
}

/**
 * 从 stripped 位置反推原始文件中的子串
 */
function findOriginalSubstring(
  original: string,
  stripped: string,
  strippedStart: number,
  strippedLength: number,
): string {
  // 简单策略：按字符映射找到原始位置
  let origIdx = 0;
  let stripIdx = 0;

  // 跳过到 strippedStart
  while (stripIdx < strippedStart && origIdx < original.length) {
    if (stripped[stripIdx] === original[origIdx]) {
      stripIdx++;
    }
    origIdx++;
  }
  const origStart = origIdx;

  // 继续匹配 strippedLength 个字符
  let matched = 0;
  while (matched < strippedLength && origIdx < original.length) {
    if (stripped[strippedStart + matched] === original[origIdx]) {
      matched++;
    }
    origIdx++;
  }

  return original.substring(origStart, origIdx);
}
