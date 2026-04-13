/**
 * spinnerVerbs — Spinner 动词库
 *
 * 每次 Spinner 挂载时随机选一个，保持稳定直到卸载。
 */

export const SPINNER_VERBS = [
  // 思考类
  'Thinking',
  'Pondering',
  'Reasoning',
  'Cogitating',
  'Contemplating',
  'Deliberating',
  'Reflecting',
  'Mulling',
  // 工作类
  'Working',
  'Processing',
  'Computing',
  'Analyzing',
  'Crafting',
  'Assembling',
  'Building',
  'Composing',
  // 创意类
  'Imagining',
  'Conjuring',
  'Inventing',
  'Dreaming',
  'Brainstorming',
  // 动作类
  'Crunching',
  'Wrangling',
  'Juggling',
  'Brewing',
  'Cooking',
  'Mixing',
  // 趣味类
  'Clauding',
  'Sparking',
  'Vibing',
  'Channeling',
  'Summoning',
  'Manifesting',
  'Orchestrating',
  'Harmonizing',
];

/** 随机选择一个动词 */
export function pickRandomVerb(): string {
  return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)]!;
}
