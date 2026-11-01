import type { ChapterNode as StoryNode } from './chapters';
export type Presentation = 'dialogue' | 'thought' | 'narrative' | 'letter' | 'object';
const narrative = new Set(['opening','a3-time','a3-loss-record','a4-hard','a5-vessels','a5-vessels-result','a6-dogs','a6-aftermath','a6-dogs-letter','a6-compare','ending']);
const dialogue = new Set(['a1-report','a2-discussion','a2-nephews','a3-summer','a4-report','a5-woman','a6-discussion','a6-weisheng','a6-arrival','a7-altar']);
export function presentation(node: StoryNode): Presentation {
  if(node.presentation) return node.presentation;
  if (narrative.has(node.id)) return 'narrative';
  if (dialogue.has(node.id)) return 'dialogue';
  if (node.kind === 'letter') return 'letter';
  if (['a1-prayer','a3-empty'].includes(node.id)) return 'thought';
  return 'object';
}
export const speaker = (id: string) => id==='a1-report'?'阿万':id.startsWith('a4')||id==='a3-summer'?'士温':id==='a2-nephews'?'士温与士儒':id==='a5-woman'?'丧服妇人':id==='a7-altar'||id==='a6-arrival'?'卫生':'家人';
export const autoPresentation = (node: StoryNode) => ['dialogue','narrative','thought'].includes(presentation(node));
