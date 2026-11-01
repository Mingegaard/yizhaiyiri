import type { ActivityId } from '../game/types';

/** Historical copy and illustrations are supplied by the content team. */
export interface KnowledgeCard {
  id: string;
  title: string;
  category: string;
  image: string | null;
  body: string;
  source?: string;
  artifactName?: string;
  tip?: string;
  motif: 'reading' | 'meal' | 'outdoors' | 'sleep' | 'adventure';
}

export const knowledgeCards: Record<string, KnowledgeCard> = {
  meal: { id: 'meal', title: '一餐一味', category: '食谱来信', image: null, body: '小精灵为认真吃饭的你，留下一张食谱卡。', motif: 'meal' },
  outdoors: { id: 'outdoors', title: '行有所遇', category: '珍奇来信', image: null, body: '走出门去，总会遇见一点新鲜。收下小精灵捎来的发现。', motif: 'outdoors' },
  sleep: { id: 'sleep', title: '好梦入笺', category: '诗文来信', image: null, body: '一夜休息之后，小精灵将这一刻的安宁收进信笺。', motif: 'sleep' },
  adventure: { id: 'adventure', title: '小游拾记', category: '冒险纪念', image: null, body: '留心寻觅，慢慢记住。你和小精灵又完成了一次小小冒险。', motif: 'adventure' },
  wamai: { id: 'wamai', title: '瓦魅', category: '冒险 · 永久收藏', image: null, body: '瓦背画作眉目，穿戴衣物，装扮成人。此物留念于《李哲》一篇，与冒险札记一同收藏。', source: '《李哲》主题纪念物 · 互动改编', motif: 'adventure' },
};


export const healthyCardPools: Record<ActivityId, readonly string[]> = {
  breakfast: ['reading-leaves', 'reading-room'], lunch: ['morning-bamboo', 'morning-greens'],
  outdoors: ['outdoors-agate-cup', 'outdoors-dancing-horse', 'outdoors-camel-musicians'], dinner: ['evening-aroma', 'evening-rice'],
  sleep: ['sleep-moon', 'sleep-silence'],
};
const healthyCards: KnowledgeCard[] = [
  { id: 'outdoors-agate-cup', title: '这只兽嘴，竟是杯子的出酒口', category: '奇珍 · 外出所得', image: 'cards/outdoors/agate-cup.png', motif: 'outdoors',
    artifactName: '唐·镶金兽首形玛瑙杯', source: '陕西历史博物馆藏',
    tip: '“猜猜酒从哪里出来？不是杯沿，是这张金嘴。”',
    body: '这只杯子由缠丝玛瑙雕成，天然的红褐与乳白纹理顺着杯身流动，前端却变成了一颗双角兽首。最巧妙的是镶金的兽嘴——它其实是塞子，取下后，酒液便能从兽口流出。\n\n这种有出液孔、常呈兽角形的酒具称为“来通”，在中亚、西亚等地可见。它为何来到唐代长安、究竟在哪里制作，仍有值得追问的故事。' },
  { id: 'outdoors-dancing-horse', title: '马不只会跳舞，还会衔杯', category: '奇珍 · 外出所得', image: 'cards/outdoors/dancing-horse-ewer.jpeg', motif: 'outdoors',
    artifactName: '唐·鎏金舞马衔杯纹皮囊式银壶', source: '陕西历史博物馆藏',
    tip: '“这匹马嘴里衔着杯子。唐人的宴席，连马都有节目？”',
    body: '银壶上，一匹金色的马衔杯而立，把唐代“舞马”的形象留在了器壁上。唐代宫廷曾训练马匹随乐表演，舞马衔杯也成为令人称奇的宴饮景象。\n\n再看壶身：扁圆的轮廓、上方的提梁，让金属器物保留了皮囊般的外形。一件银壶，把游牧生活的器形与宫廷宴乐的趣味放在了一起。' },
  { id: 'outdoors-camel-musicians', title: '骆驼背上，竟坐着一整个乐队', category: '奇珍 · 外出所得', image: 'cards/outdoors/camel-musicians.png', motif: 'outdoors',
    artifactName: '唐·三彩载乐骆驼俑', source: '陕西历史博物馆藏',
    tip: '“我本想带一件乐器回来，结果看见了整座舞台。”',
    body: '骆驼昂首张口，背上托起一个铺着彩毯的平台。七名男乐手面向外侧围坐演奏，中间还站着一位歌唱的女子——八个人，把驼背变成了一座热闹的小舞台。\n\n这不是一张写实的演出照片，而是唐代工匠富有想象力的塑造。人物的姿态、乐器与流动的三彩釉色，让静止的陶俑仿佛随时会响起音乐。' },
  { id: 'reading-leaves', title: '贝叶书', category: '晨读 · 诗中物', image: null, motif: 'reading', body: '“闲持贝叶书，步出东斋读。”\n贝叶书，是以贝叶为书写材料的书籍。晨读时，诗人手中的书也是眼前的一道风景。' },
  { id: 'reading-room', title: '东斋晨读', category: '晨读 · 诗中景', image: null, motif: 'reading', body: '“闲持贝叶书，步出东斋读。”\n持书、出斋、读书，诗句以三个动作铺开一段安闲的晨光。' },
  { id: 'morning-bamboo', title: '雨后新笋', category: '朝食 · 诗中味', image: null, motif: 'meal', body: '“宿雨林笋嫩，晨露园葵鲜。”\n昨夜的雨、清晨的露，把林中的笋与园中的葵连成一幅朝餐小景。' },
  { id: 'morning-greens', title: '一园朝餐', category: '朝食 · 诗中景', image: null, motif: 'meal', body: '“烹葵炮嫩笋，可以备朝餐。”\n从园中鲜蔬写到灶上烹饪，一顿朝餐在诗句里慢慢备好。' },
  { id: 'walking-shade', title: '槐阴闲行', category: '外出 · 诗中景', image: null, motif: 'outdoors', body: '“轻衣稳马槐阴下，自要闲行一两坊。”\n槐树的阴影、从容的步调，让寻常街巷也有了可供停留的风景。' },
  { id: 'walking-streets', title: '一两坊间', category: '外出 · 诗中意', image: null, motif: 'outdoors', body: '“自要闲行一两坊。”\n闲行不必远行。只在熟悉的街巷走一走，也可以遇见今日新鲜的一隅。' },
  { id: 'evening-aroma', title: '鱼香入诗', category: '夕食 · 诗中味', image: null, motif: 'meal', body: '“鱼香肥泼火，饭细滑流匙。”\n诗句把鱼的香气与饭的细滑一同写下，滋味便有了可见的形状。' },
  { id: 'evening-rice', title: '饭细流匙', category: '夕食 · 诗中物', image: null, motif: 'meal', body: '“饭细滑流匙。”\n匙，就是舀取食物的用具。诗中的一匙饭，也留住了一餐的细腻滋味。' },
  { id: 'sleep-moon', title: '月光入扉', category: '就寝 · 诗中景', image: null, motif: 'sleep', body: '“清月出岭光入扉。”\n月亮越过山岭，清光照入门扉。诗句由远山写到屋内，让夜色慢慢安静下来。' },
  { id: 'sleep-silence', title: '夜深静卧', category: '就寝 · 诗中意', image: null, motif: 'sleep', body: '“夜深静卧百虫绝。”\n静卧之后，虫声也远了。诗句把夜深的寂静，留在了听觉之中。' },
];
for (const card of healthyCards) knowledgeCards[card.id] = card;

export function cardImageUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
