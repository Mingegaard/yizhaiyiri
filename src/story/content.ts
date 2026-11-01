import userEdits from './user-edits.json';
import { buildChapters, CHAPTERS, type ChapterNode } from './chapters';
import { ORIGINAL_SECTIONS, NODE_SOURCE } from './original';
export type StoryZone = 'study' | 'courtyard' | 'bedroom' | 'hall' | 'garden' | 'gate' | 'river';
export type StoryProp = 'books' | 'letter' | 'shoes' | 'tile' | 'clothes' | 'vessels' | 'luggage' | 'dogs' | 'chest' | 'pot' | 'bamboo' | 'none';
export interface StoryInspection { id: string; label: string; body?: string }
export interface StoryNode {
  id: string;
  act: number;
  title: string;
  location: string;
  hotspotLabel: string;
  body: string[];
  buttonLabel: string;
  nextId: string | null;
  requiredFlags?: StoryInspection[];
  inspectItems?: StoryInspection[];
  quote?: string;
  reporter?: string;
  options?: { label: string; feedback: string }[];
  evidenceTitle?: string;
  evidenceFlags?: string[];
  kind?: 'report' | 'letter' | 'inspection' | 'time' | 'event' | 'ending';
  visual: { zone: StoryZone; prop: StoryProp; state: string };
}

export const STORY_START = 'opening';
export const STORY_ACTS = CHAPTERS;

const tileInspections: StoryInspection[] = [
  { id: 'wamai:face', label: '检视瓦背眉目', body: '瓦背上画着眉与眼。灯下看得分明：眼前是一片瓦，被画出了人的面容。' },
  { id: 'wamai:clothes', label: '检视穿戴衣物', body: '它戴着纸头巾，穿着小儿衣，另有披帛。瓦片被装扮成了人的模样。' },
];
const riverInspection: StoryInspection = { id: 'river:ding_found', label: '查看画中的铛子', body: '家人指出河中发现铛子的位置。回报写道：“果于河中得铛子。”这一项说法有了查验结果。' };

/** Source quotations only come from the supplied implementation document.
 * Full bibliographic verification belongs to the historian's content pipeline.
 * Labels and first-person thoughts are explicitly presented as adaptation in the UI.
 */
const nodes: StoryNode[] = [
  {
    id: 'opening', act: 0, title: '这一回，我是李哲', location: '李宅', hotspotLabel: '看看身在何处', kind: 'event',
    quote: '李哲家于丹阳县东郭',
    body: ['这一回，我是李哲。', '春日以来，庄上屡次无故起火，家里也渐有物件凭空投掷。今夜，阿万忽然来找我。'],
    buttonLabel: '听阿万禀报', nextId: 'a1-report', visual: { zone: 'study', prop: 'books', state: 'missing' },
  },
  {
    id: 'a1-report', act: 1, title: '夹着书卷的陌生人', location: '书房', hotspotLabel: '听阿万禀报', kind: 'report', reporter: '阿万所见',
    body: ['阿万来报：“主人，方才有个须髯很盛的丈夫，穿羔裘、戴貂帽，夹着一卷书走了。”', '我听罢，转向屋中的书帙。'],
    buttonLabel: '核对书帙', nextId: 'a1-missing', visual: { zone: 'study', prop: 'books', state: 'missing' },
  },
  {
    id: 'a1-missing', act: 1, title: '书帙里空了一卷', location: '书房', hotspotLabel: '检视书帙空槽', kind: 'inspection',
    body: ['书帙中有一处空槽。', '我核对后发现：果然少了一卷《春秋》。'],
    options: [{ label: '四处查找', feedback: '遍寻不见。书帙中的空位仍在。' }],
    buttonLabel: '祝祈，请他归还', nextId: 'a1-prayer', visual: { zone: 'study', prop: 'books', state: 'missing' },
  },
  {
    id: 'a1-prayer', act: 1, title: '向无形的来客祝祈', location: '书房', hotspotLabel: '在书帙前祝祈', kind: 'event',
    body: ['我对着空处祝祈，请那位来客将书归还。', '静候片刻，再看看书帙。'],
    buttonLabel: '祝祈', nextId: 'a1-returned', visual: { zone: 'study', prop: 'books', state: 'missing' },
  },
  {
    id: 'a1-returned', act: 1, title: '卷轴已回帙中', location: '书房', hotspotLabel: '再查看归还的卷轴', kind: 'inspection', evidenceTitle: '无损归还的《春秋》',
    quote: '须臾，书复帙中，亦无损污。',
    body: ['再看时，那卷书已回到帙中。', '我展卷检视：无损无污。怪客若藏在家中，会在何处？'],
    buttonLabel: '收好卷轴', nextId: 'a2-discussion', visual: { zone: 'study', prop: 'books', state: 'returned' },
  },
  {
    id: 'a2-discussion', act: 2, title: '庭竹之下的私议', location: '庭院竹丛', hotspotLabel: '到庭中与家人商议', kind: 'event',
    quote: '意其庭竹耸茂，鬼魅可栖，潜议伐去之，以植桃。',
    body: ['我与家人来到庭中。竹木耸茂，会不会正是鬼魅的栖身处？', '家人提议：“伐去种桃，如何？”我们低声议论，尚未真的动斧。'],
    buttonLabel: '议定，伐竹种桃', nextId: 'a2-letter', visual: { zone: 'courtyard', prop: 'bamboo', state: 'idle' },
  },
  {
    id: 'a2-letter', act: 2, title: '刚议完，它便回信', location: '庭院竹丛', hotspotLabel: '拾起竹下的新信', kind: 'letter', evidenceTitle: '竹庭来信',
    quote: '闻君议伐竹种桃……一船竹可贸一船粟，幸速图之。',
    body: ['庭中忽得一书。信上竟写着我们刚刚议论的事。', '白话：听说要砍竹种桃，不如把竹子做成竹筹；如今粮食便宜，一船竹能换一船粮，赶快办。'],
    options: [
      { label: '它竟听到了', feedback: '我们方才分明只是私议。它究竟藏在哪里？' },
      { label: '它还替我算起账来', feedback: '这怪客不只窥听，竟还替我盘算起买卖。' },
      { label: '看看纸角', feedback: '方数寸，笔札不工。小小一纸，字迹并不工整。' },
    ],
    buttonLabel: '收下此信', nextId: 'a2-nephews', visual: { zone: 'courtyard', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a2-nephews', act: 2, title: '侄子们的斥骂', location: '庭院', hotspotLabel: '听士温、士儒说话', kind: 'report', reporter: '士温、士儒当面说起',
    body: ['士温、士儒听闻，愤然斥骂：“何必容它如此！”', '待我再回过身，廊下摆放冠履的地方竟空了。'],
    buttonLabel: '听罢', nextId: 'a3-empty', visual: { zone: 'courtyard', prop: 'shoes', state: 'missing' },
  },
  {
    id: 'a3-empty', act: 3, title: '冠与履都不见了', location: '廊下', hotspotLabel: '查看廊下冠履空位', kind: 'inspection',
    body: ['冠与履都不见了。方才侄子骂过它。', '我看着空位，决定先好言祈求。'],
    options: [{ label: '向空处斥责', feedback: '无人回应。空位仍旧空着。' }],
    buttonLabel: '好言祈求', nextId: 'a3-restored', visual: { zone: 'courtyard', prop: 'shoes', state: 'missing' },
  },
  {
    id: 'a3-restored', act: 3, title: '冠履归来，还附了一封信', location: '廊下', hotspotLabel: '查看归还的冠履', kind: 'inspection',
    body: ['好言祈求过后，冠履重新出现在眼前。', '下面还压着一张信纸。'],
    buttonLabel: '查看压在下面的信', nextId: 'a3-letter', visual: { zone: 'courtyard', prop: 'shoes', state: 'returned' },
  },
  {
    id: 'a3-letter', act: 3, title: '署名“墨荻君状”', location: '廊下', hotspotLabel: '读冠履下的信', kind: 'letter', evidenceTitle: '墨荻君的自辩',
    quote: '惟圣罔念作狂，唯狂克念作圣……君始骂我而见祈，今并还之。\n墨荻君状',
    body: ['它引圣贤之语回敬辱骂，说我们先骂它，后来又向它祈求，如今便将冠履一并归还。', '信末署着“墨荻君状”。这个名字，并不能让我知晓它究竟是谁。'],
    buttonLabel: '记下墨荻君', nextId: 'a3-time', visual: { zone: 'courtyard', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a3-time', act: 3, title: '日子继续往前', location: '李宅', hotspotLabel: '翻过这些日子', kind: 'time',
    body: ['冠履虽已归还，宅中的异事却没有就此停歇。', '接下来，是又过数旬后的记录。'],
    buttonLabel: '又过数旬', nextId: 'a3-loss-record', visual: { zone: 'study', prop: 'letter', state: 'collected' },
  },
  {
    id: 'a3-loss-record', act: 3, title: '失物簿又添了几笔', location: '书房', hotspotLabel: '翻看失物记录', kind: 'report', reporter: '家人补充禀报',
    body: ['家中失物愈多，我也疑心是它所为。', '家人说：“家中也曾查出邻人作盗，并非尽是鬼魅。”此事没有让我查明每一件失物的去处。', '怪客又寄来了一封自辩信。'],
    buttonLabel: '查看它的来信', nextId: 'a3-defense', visual: { zone: 'study', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a3-defense', act: 3, title: '并非所有失窃都由它认领', location: '书房', hotspotLabel: '读自辩信', kind: 'letter', evidenceTitle: '失物未明与自辩信',
    quote: '直氏偷金枉，君谓我为盗',
    body: ['信中借受冤作盗的说法自辩，追问我为何将失窃归到它身上。', '我想到：它会藏物，却不肯认下所有失窃。我尚不能尽信它。'],
    buttonLabel: '将未明之物记下', nextId: 'a3-summer', visual: { zone: 'study', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a3-summer', act: 3, title: '仍要设法制它', location: '李宅', hotspotLabel: '听士温的打算', kind: 'time', reporter: '士温当面说起',
    body: ['我在失物记录中留下“未明”，没有把所有盗失都算在怪客头上。', '士温却说：“仍要设法制它。”', '春日的事暂且记下。接下来，是夏夜。'],
    buttonLabel: '入夏', nextId: 'a4-report', visual: { zone: 'courtyard', prop: 'none', state: 'idle' },
  },
  {
    id: 'a4-report', act: 4, title: '是夏夜，寝房传来响动', location: '寝房', hotspotLabel: '听到响动，去寝房查看', kind: 'report', reporter: '士温擒魅后的禀报',
    body: ['我赶到寝房，听士温说起方才的经过。', '“我醉卧床上，背着烛光。一个丈夫直入烛前，我跃起扭住，烛便灭了。”'],
    buttonLabel: '后来如何？', nextId: 'a4-hard', visual: { zone: 'bedroom', prop: 'none', state: 'idle' },
  },
  {
    id: 'a4-hard', act: 4, title: '手中渐渐变硬', location: '寝房', hotspotLabel: '听完烛灭后的经过', kind: 'report', reporter: '士温所见',
    body: ['士温接着说：“扭住许久，手中渐硬。”', '烛已熄灭。我请家人重新举灯，要看看被他扭住的究竟是什么。'],
    buttonLabel: '举灯，让我看看', nextId: 'a4-reveal', visual: { zone: 'bedroom', prop: 'tile', state: 'covered' },
  },
  {
    id: 'a4-reveal', act: 4, title: '灯下竟是一片瓦', location: '寝房烛下', hotspotLabel: '举灯检视瓦魅', kind: 'inspection', evidenceTitle: '瓦魅：眉目与衣物',
    quote: '是一瓦，瓦背画作眉目。',
    body: ['灯下，眼前的东西有了分明的轮廓。请分别检视瓦背与它的穿戴。', '看清之后，我才确认：竟是一瓦，装扮成人。'],
    requiredFlags: tileInspections, inspectItems: tileInspections,
    options: [{ label: '再看纸头巾、小儿衣与披帛', feedback: '它的装扮由纸头巾、小儿衣和披帛组成。这里只记录所见，并不据此猜定它生前或来处。' }],
    buttonLabel: '记下此事', nextId: 'a4-fragments', visual: { zone: 'bedroom', prop: 'tile', state: 'whole' },
  },
  {
    id: 'a4-fragments', act: 4, title: '柱边的碎瓦', location: '寝房', hotspotLabel: '读后续事件记录', kind: 'event', evidenceTitle: '瓦魅后续记录',
    body: ['后续记录：家人将其钉于柱，击碎。', '柱边留下碎瓦。', '又过了数日，后圃忽然有人哭泣。'],
    buttonLabel: '数日后', nextId: 'a5-woman', visual: { zone: 'bedroom', prop: 'tile', state: 'fragments' },
  },
  {
    id: 'a5-woman', act: 5, title: '后圃的哭声', location: '后圃', hotspotLabel: '循哭声查看', kind: 'event',
    quote: '杀我夫',
    body: ['后圃有一位丧服妇人哭泣，只听她说：“杀我夫。”', '我心中疑惑：她所哭的，莫非是那片瓦？'],
    buttonLabel: '次日', nextId: 'a5-letter', visual: { zone: 'garden', prop: 'none', state: 'idle' },
  },
  {
    id: 'a5-letter', act: 5, title: '它说同类有百户', location: '庭院', hotspotLabel: '拾起庭中的新信', kind: 'letter', evidenceTitle: '百户报复信',
    quote: '一鸡死，一鸡鸣。吾属百户，当相报耳。',
    body: ['次日，哭声转到庭中，一封新信随之出现。', '信中说同类有百户，要彼此报复。我看过这番威吓，却无从确认它们的数目。'],
    buttonLabel: '收信', nextId: 'a5-clothes', visual: { zone: 'courtyard', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a5-clothes', act: 5, title: '衣物怎么到了树上', location: '庭树旁', hotspotLabel: '查看满树衣物', kind: 'inspection',
    body: ['满树衣物，竟不知如何挂上去。', '我只好求它们将衣物解下。'],
    buttonLabel: '求其解下', nextId: 'a5-clothes-returned', visual: { zone: 'courtyard', prop: 'clothes', state: 'hanging' },
  },
  {
    id: 'a5-clothes-returned', act: 5, title: '衣物回到了原处', location: '庭院', hotspotLabel: '查看解下的衣物', kind: 'inspection', evidenceTitle: '庭树上的衣物',
    body: ['再看时，衣物已经回到原处。', '器物间又有异样。我循着动静去看。'],
    buttonLabel: '查看器物间', nextId: 'a5-vessels', visual: { zone: 'courtyard', prop: 'clothes', state: 'returned' },
  },
  {
    id: 'a5-vessels', act: 5, title: '小器皿里竟有大器物', location: '器物间', hotspotLabel: '检视大小器物', kind: 'inspection',
    body: ['小小器皿之中，却放着比它更大的器物。', '按平常的大小看来，分明不应相容。'],
    buttonLabel: '试着取出', nextId: 'a5-vessels-result', visual: { zone: 'hall', prop: 'vessels', state: 'nested' },
  },
  {
    id: 'a5-vessels-result', act: 5, title: '大小不相容，出入竟无碍', location: '器物间', hotspotLabel: '查看取出的器物', kind: 'inspection', evidenceTitle: '大器入小器',
    body: ['大器物竟顺利取出，大小不相容，出入却无碍。', '庭中、室内，处处都成了它们戏弄之地。此宅还能安居么？'],
    buttonLabel: '与家人商议迁居', nextId: 'a6-discussion', visual: { zone: 'hall', prop: 'vessels', state: 'released' },
  },
  {
    id: 'a6-discussion', act: 6, title: '换一处居所，或可避开', location: '院门内', hotspotLabel: '与家人商议迁居', kind: 'event',
    body: ['我与家人私下议论：“换一处居所，或可避开。”', '事情尚未办妥，我们先准备行囊。'],
    buttonLabel: '议定，暂备行囊', nextId: 'a6-letter', visual: { zone: 'gate', prop: 'luggage', state: 'packed' },
  },
  {
    id: 'a6-letter', act: 6, title: '我还没走，它已先到', location: '行囊旁', hotspotLabel: '读行囊上的信', kind: 'letter', evidenceTitle: '迁居来信',
    quote: '闻君欲徙居，吾已先至其所矣。',
    body: ['行囊上又出现一封信。它说听闻我要迁居，自己已经先到了那处地方。', '我尚未动身，它何以先知？'],
    buttonLabel: '留意家中动静', nextId: 'a6-dogs', visual: { zone: 'gate', prop: 'luggage', state: 'letter' },
  },
  {
    id: 'a6-dogs', act: 6, title: '韩儿与猛子', location: '庭院暗处', hotspotLabel: '观察两犬与食盆', kind: 'inspection', evidenceTitle: '两犬观察',
    body: ['韩儿与猛子自闹魅后不复进食，常摇尾戏于空暗处。', '我留意到食盆，也留意到它们朝着空处嬉戏的异样。'],
    buttonLabel: '其后', nextId: 'a6-aftermath', visual: { zone: 'courtyard', prop: 'dogs', state: 'bowls' },
  },
  {
    id: 'a6-aftermath', act: 6, title: '其后的家中记录', location: '李宅', hotspotLabel: '读两犬后续记录', kind: 'event',
    body: ['后续记录：李家杀了两犬。', '此后家有窃议，魅莫能知。', '新的信又送到了。'],
    buttonLabel: '查看新信', nextId: 'a6-dogs-letter', visual: { zone: 'courtyard', prop: 'dogs', state: 'bowls_empty' },
  },
  {
    id: 'a6-dogs-letter', act: 6, title: '自无韩大猛二', location: '庭院', hotspotLabel: '读两犬之后的新信', kind: 'letter', evidenceTitle: '两犬依附线索',
    quote: '自无韩大猛二，吾属无依。',
    body: ['信中说，自从没有“韩大猛二”，它们便无所依附。', '我将这封信和迁居时的信放在一起看。'],
    buttonLabel: '对照两封信', nextId: 'a6-compare', visual: { zone: 'courtyard', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a6-compare', act: 6, title: '两封信之间的线索', location: '书房', hotspotLabel: '并读迁居信与两犬信', kind: 'inspection', evidenceTitle: '尚不能确知的推想',
    quote: '迁居来信：闻君欲徙居，吾已先至其所矣。\n两犬来信：自无韩大猛二，吾属无依。',
    body: ['我的推想：它们窥知家事，或与依附两犬有关。', '这仍是推想，并不表示我已掌握确定的机制，更不表示鬼魅就此退散。'],
    buttonLabel: '仍须设法平息', nextId: 'a6-weisheng', visual: { zone: 'study', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a6-weisheng', act: 6, title: '家人荐来卫生', location: '正厅', hotspotLabel: '听家人荐人', kind: 'report', reporter: '家人推荐',
    quote: '淮楚有卫生者，久于咒术。',
    body: ['家人向我推荐卫生，说他来自淮楚，熟于咒术。', '我决定请他来宅，设法平息此事。'],
    buttonLabel: '邀卫生来宅', nextId: 'a6-arrival', visual: { zone: 'hall', prop: 'none', state: 'idle' },
  },
  {
    id: 'a6-arrival', act: 6, title: '卫生来到宅中', location: '正厅', hotspotLabel: '迎卫生入厅', kind: 'time',
    body: ['后来，卫生来到宅中。鬼魅出没渐疏。', '正厅设坛，坛中放置木箱。接下来，请他考召。'],
    buttonLabel: '请卫生设坛考召', nextId: 'a7-altar', visual: { zone: 'hall', prop: 'chest', state: 'closed' },
  },
  {
    id: 'a7-altar', act: 7, title: '箱置坛中', location: '正厅', hotspotLabel: '听卫生设坛交代', kind: 'report', reporter: '卫生当面交代',
    body: ['卫生交代：“箱置坛中，待至明日。”', '我记下这番话，等到次日再来查看。'],
    buttonLabel: '待至明日', nextId: 'a7-chest', visual: { zone: 'hall', prop: 'chest', state: 'closed' },
  },
  {
    id: 'a7-chest', act: 7, title: '次日，坛中木箱可开', location: '正厅', hotspotLabel: '打开坛中木箱', kind: 'inspection',
    body: ['次日，我来到坛前。', '木箱已经可以打开，里头的东西尚待核验。'],
    buttonLabel: '开箱', nextId: 'a7-confession', visual: { zone: 'hall', prop: 'chest', state: 'closed' },
  },
  {
    id: 'a7-confession', act: 7, title: '最后交来一份账', location: '正厅木箱旁', hotspotLabel: '读箱顶供状', kind: 'letter', evidenceTitle: '坛中供状',
    body: ['箱中供状置顶，下有归还物。', '供状大意：若干物已经卖出，得钱若干；用来买果子及梳子等，其余送还。', '我先验看能够核对的归还物。'],
    buttonLabel: '验看归还物', nextId: 'a7-inventory-start', visual: { zone: 'hall', prop: 'chest', state: 'open' },
  },
  {
    id: 'a7-inventory-start', act: 7, title: '按供状逐步核对', location: '正厅木箱旁', hotspotLabel: '开始清点归还物', kind: 'inspection',
    body: ['先读供状所列，再看箱中实物，最后记下核验结果。', '我将供状展在箱旁，开始核对。'],
    buttonLabel: '供状所列归还物', nextId: 'a7-inventory-list', visual: { zone: 'hall', prop: 'chest', state: 'open' },
  },
  {
    id: 'a7-inventory-list', act: 7, title: '一 · 供状所列归还物', location: '正厅木箱旁', hotspotLabel: '核对供状条目', kind: 'inspection',
    body: ['供状列有归还物。', '我记下应当核验的条目，再转向箱内。'],
    buttonLabel: '箱内实物', nextId: 'a7-inventory-objects', visual: { zone: 'hall', prop: 'chest', state: 'open' },
  },
  {
    id: 'a7-inventory-objects', act: 7, title: '二 · 箱内实物', location: '正厅木箱旁', hotspotLabel: '验看箱内实物', kind: 'inspection',
    body: ['我对照供状，验看箱中的归还物。', '核验有据的条目，就逐一记下。'],
    buttonLabel: '核验相符', nextId: 'a7-inventory-verified', visual: { zone: 'hall', prop: 'chest', state: 'open' },
  },
  {
    id: 'a7-inventory-verified', act: 7, title: '三 · 核验相符', location: '正厅木箱旁', hotspotLabel: '记下归还物核验', kind: 'inspection', evidenceTitle: '归还物核验记录',
    body: ['供状与箱内归还物已作核验，能够相符的部分记在此处。', '供状末尾还有一项，不能在箱边就此了结。'],
    buttonLabel: '查看最后一项', nextId: 'a7-last', visual: { zone: 'hall', prop: 'chest', state: 'verified' },
  },
  {
    id: 'a7-last', act: 7, title: '铛子不在箱中', location: '正厅', hotspotLabel: '读供状最后一项', kind: 'letter', evidenceTitle: '河滨待验的铛子',
    quote: '失铛子，其实不取，请问诸水滨。',
    body: ['供状称失去的铛子并非它们所取，要我去水滨询查。', '这一件，尚须亲验。我遣家人往河滨查验。'],
    buttonLabel: '遣人往河滨查验', nextId: 'a7-river', visual: { zone: 'hall', prop: 'letter', state: 'visible' },
  },
  {
    id: 'a7-river', act: 7, title: '家人自河滨回报', location: '河滨回报图', hotspotLabel: '查看河滨查验回报', kind: 'inspection', reporter: '家人查验回报', evidenceTitle: '河中铛子：核验属实',
    quote: '果于河中得铛子。',
    body: ['家人回来，指给我看找到铛子的位置。', '我细问所在，将回报与供状最后一项相对照。'],
    requiredFlags: [riverInspection], inspectItems: [riverInspection],
    buttonLabel: '核验属实', nextId: 'ending', visual: { zone: 'river', prop: 'pot', state: 'found' },
  },
  {
    id: 'ending', act: 7, title: '往来至此，记入札记', location: '李宅', hotspotLabel: '收好这段经历', kind: 'ending', evidenceTitle: '筒中奇境 · 终章',
    body: ['自此，宅中不复有此往来。', '回想那些信，或恐吓，或辩解，满口诗书；末了却交来一份失物账。', '这次冒险将留下“瓦魅”主题纪念物与冒险札记，作为这段经历的永久收藏。'],
    buttonLabel: '返回庭院', nextId: null, visual: { zone: 'courtyard', prop: 'none', state: 'idle' },
  },
];

// User revision: retain stable IDs and storage compatibility.
const revision = {
  "opening": {
    "body": [
      "这一回，我是李哲。",
      "贞元四年春，我居于丹阳县东郭。庄上屡次无故起火，宅中又有投掷与失物。",
      "今夜，能见鬼神的乳母阿万匆匆来报。"
    ],
    "buttonLabel": "听阿万禀报"
  },
  "a1-report": {
    "body": [
      "“主人，方才有个须髯很盛的丈夫，穿羔裘、戴貂帽，夹着一卷书走了。”",
      "我得亲自到书帙前核对。"
    ],
    "buttonLabel": "去书帙前核对"
  },
  "a1-prayer": {
    "options": [
      {
        "label": "再找一遍书架",
        "feedback": "书架、案下都找过了，仍不见那卷书。"
      },
      {
        "label": "向空处质问",
        "feedback": "屋里无人应答，只有灯火微动。"
      }
    ],
    "body": [
      "找也找过，问也问过。我只好向空处祝祈，请那位来客将书归还。",
      "祈求之后，须亲手再检查书帙。"
    ],
    "buttonLabel": "好言祝祈，然后检查书卷"
  },
  "a2-discussion": {
    "body": [
      "书虽归还，怪客会藏在何处？家人来到我面前商议。",
      "“庭竹耸茂，会不会是它的栖身处？伐去种桃，如何？”",
      "我们低声议定，尚未动斧。我准备去庭院左侧看看竹丛。"
    ],
    "buttonLabel": "去庭院左侧查看竹丛"
  },
  "a2-letter": {
    "hotspotLabel": "拾起竹下的信"
  },
  "a2-nephews": {
    "body": [
      "“何必容它如此！”士温、士儒听闻，愤然斥骂。",
      "廊下传来轻响。我得过去检查原先摆冠履的位置。"
    ],
    "buttonLabel": "去廊下查冠履"
  },
  "a3-empty": {
    "options": [
      {
        "label": "沿廊寻找",
        "feedback": "柱后、阶下都没有。冠履并未掉在附近。"
      },
      {
        "label": "向空处斥责",
        "feedback": "没有回应。方才侄子的斥骂似乎也未奏效。"
      }
    ],
    "buttonLabel": "好言请求归还"
  },
  "a3-restored": {
    "buttonLabel": "放下冠履，寻找下面的信"
  },
  "a3-time": {
    "body": [
      "又过十日，邻人盗走李家的犬，杀而食之；事情败露。怪客来信：“里仁为美，择不处仁，焉得智？”",
      "数旬之后，家中失物愈多。人盗与怪事交织，每件物品的去向仍未查清。"
    ],
    "buttonLabel": "继续听家人回报"
  },
  "a3-loss-record": {
    "body": [
      "家人疑心失物都是鬼魅所取。怪客却又送来自辩信。",
      "信已放在书房，需亲自过去展开查看。"
    ],
    "buttonLabel": "去书房找信"
  },
  "a4-report": {
    "location": "书房",
    "body": [
      "夏夜，宅中忽起一阵躁动。士温来到书房，向我说明经过。",
      "“我醉卧床上，背着烛光。一个丈夫直入烛前，我跃起扭住，烛便灭了。”"
    ],
    "buttonLabel": "听他说完"
  },
  "a4-hard": {
    "body": [
      "士温说，暗中扭住那人许久，手里传来喀喀声，渐渐变得坚硬。",
      "家人将捉住的东西放到书房。我须走近它，亲自检查。"
    ],
    "buttonLabel": "去检查书房中的物证"
  },
  "a4-reveal": {
    "location": "书房灯下"
  },
  "a4-fragments": {
    "location": "书房柱旁",
    "hotspotLabel": "按家人建议击碎瓦魅",
    "body": [
      "家人建议将这片瓦钉在柱上击碎。我照做后，柱下留下碎片。",
      "数日后，庭院后侧忽然传来哭声。"
    ],
    "buttonLabel": "循哭声听其来由"
  },
  "a5-woman": {
    "body": [
      "庭院后侧传来妇人哭声，家人回来禀报她穿着丧服。",
      "“杀我夫！”她哭诉。第二日，哭声又到了庭中。",
      "一封信留在庭院。我得过去拾起。"
    ],
    "buttonLabel": "去庭中寻找新信"
  },
  "a5-vessels": {
    "body": [
      "家人又来回报：它们还把大器物投入小器皿，取出放入，竟毫无阻碍。",
      "这些异事在庭院与屋内反复发生。"
    ],
    "buttonLabel": "听后续"
  },
  "a5-vessels-result": {
    "body": [
      "过了一段时日，士儒也在灯下擒住一个妇人，扭住后同样变成穿衣的瓦，随后将其击碎。翌日，其类又来哀哭。",
      "它们畏惧侄辈，被称为二郎的人来到时，便较少出现。宅中仍未真正安宁。"
    ],
    "buttonLabel": "与家人商议迁居"
  },
  "a6-dogs": {
    "body": [
      "家人说，两只老犬一名韩儿、一名猛子。自闹魅后不复进食，常向空暗处摇尾嬉戏。",
      "我留意到这份异样，尚不能确定其中缘由。"
    ],
    "buttonLabel": "听其后的记录"
  },
  "a6-dogs-letter": {
    "body": [
      "来信写道：“自无韩大猛二，吾属无依。”",
      "我想起迁居前那封声称先到新居的信。"
    ],
    "buttonLabel": "想一想两封信"
  },
  "a6-weisheng": {
    "body": [
      "家人从城郭回来，说路侧曾有两丈夫询问宅中异事，回头看时却已不见。",
      "此前请来的韦士昌将符放在瓦棂间。怪客来信讥讽：“符至圣也，而置之屋上，不亦轻为。”韦士昌未能平息，只得离去。",
      "“听闻淮楚有卫生，久于咒术，可请他来宅一试。”"
    ],
    "buttonLabel": "邀卫生来宅"
  },
  "a6-arrival": {
    "body": [
      "卫生来到宅中，鬼魅似乎颇为忌惮，出现渐少。",
      "“我将设道场考召。请准备木箱，置于坛中。”"
    ],
    "buttonLabel": "听卫生交代"
  }
} as Record<string, Partial<StoryNode>>;
for (const node of nodes) {
  Object.assign(node, revision[node.id] ?? {});
  node.quote = (NODE_SOURCE[node.id] ?? []).map(i => ORIGINAL_SECTIONS[i][1]).join('\n\n');
}

const chapterNodes = buildChapters(nodes);
for (const node of chapterNodes) { const edit = (userEdits as Record<string, Partial<ChapterNode>>)[node.id]; if(edit) Object.assign(node,edit); }
for (const node of chapterNodes) {
  if (node.sourceSections) NODE_SOURCE[node.id] = node.sourceSections;
  node.quote = (NODE_SOURCE[node.id] ?? []).map(i => ORIGINAL_SECTIONS[i][1]).join('\n\n');
}
export const STORY_NODES: Record<string, ChapterNode> = Object.fromEntries(chapterNodes.map(node => [node.id, node]));
export const STORY_ORDER = chapterNodes.map(node => node.id);
export const STORY_DESIGN_NOTES = [
  { title: '书房：秩序被打断', body: '书帙的空槽与无损归还，使原本可清点的家中秩序出现缺口。互动把“核对”与“收好”留给李哲。' },
  { title: '庭院：竹木与私议', body: '庭竹被人物猜作可能的栖身处，刚刚说完的议论又进入来信。这里呈现本篇人物的推想，不概括所有唐人的观念。' },
  { title: '寝房：亲密边界被穿过', body: '寝房中发生擒魅，但玩家只以李哲身份听取士温禀报。报告与物证分开，避免把他人的见闻写成李哲亲见。' },
  { title: '迁居：门外也未必安全', body: '行囊尚在院门，怪客已声称先到新居。这是故事中的威吓。两犬前后的线索保留为推想，不制作成唯一正确的推理题。' },
  { title: '瓦片：建筑材料成为怪客形体', body: '瓦背眉目与穿戴共同完成揭晓。通关收藏以主题纪念物呈现，既不重演伤害，也不暗示角色复活。' },
];
