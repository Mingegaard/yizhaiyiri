import { ORIGINAL_SECTIONS } from './original';
import { PROVIDED_TRANSLATION } from './translation';
export function EndingReading({onClose}:{onClose:()=>void}) {
 return <main className="ending-reading"><header><div><small>冒险终章</small><h1>李哲</h1><p>出《通幽记》</p></div><button onClick={onClose}>返回庭院</button></header><div className="ending-reading-columns"><section><h2>原文</h2>{ORIGINAL_SECTIONS.map(([title,text])=><p key={title}>{text}</p>)}<p>（出《通幽记》）</p></section><section><h2>译文</h2><p>{PROVIDED_TRANSLATION}</p></section></div></main>;
}
