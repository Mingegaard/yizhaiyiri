import { ORIGINAL_SECTIONS, NODE_SOURCE, SOURCE_NOTE } from './original';
export function OriginalText({ nodeId, full = false }: { nodeId?: string; full?: boolean }) {
  const indices = full ? ORIGINAL_SECTIONS.map((_, i) => i) : NODE_SOURCE[nodeId ?? ''] ?? [];
  return <div className="original-text"><p className="source-note">{SOURCE_NOTE}</p>{indices.map(i => <article key={i}><h4>{i + 1}　{ORIGINAL_SECTIONS[i][0]}</h4><p>{ORIGINAL_SECTIONS[i][1]}</p></article>)}</div>;
}
export function Silhouette({ name }: { name: string }) {
  const elderly = name === '阿万';
  return <div className={`speaker-silhouette ${elderly ? 'is-elderly' : ''}`} role="img" aria-label={`${name}${elderly ? '老妇人' : ''}剪影`}><svg viewBox="0 0 240 300"><defs><linearGradient id="figure" x2="0" y2="1"><stop stopColor="#202b2b"/><stop offset="1" stopColor="#303f3b"/></linearGradient></defs>{elderly ? <circle cx="143" cy="43" r="19" fill="#202b2b"/> : null}<ellipse cx="120" cy="76" rx={elderly?31:35} ry="43" fill="url(#figure)"/><path d={elderly?'M95 108 Q52 125 45 215 L24 294 H218 L190 210 Q175 121 145 109Z':'M91 111 Q51 119 35 190 L12 300 H228 L207 190 Q185 120 148 111Z'} fill="url(#figure)"/><path d="M99 115 120 160 143 115M120 160v140" fill="none" stroke="#8d9c8b" strokeOpacity=".25" strokeWidth="3"/>{elderly ? <path d="m51 192-14 102" stroke="#303c34" strokeWidth="9"/> : null}</svg><span>{name}</span></div>;
}
export function CourierSilhouette() {
 return <div className="courier-illustration" role="img" aria-label="胡人抱书离去示意"><svg viewBox="0 0 300 260"><path d="m104 75 10-35 61-3 14 36Z" fill="#433f35"/><ellipse cx="149" cy="91" rx="30" ry="34" fill="#8e826a"/><path d="m120 91 8 45 23 22 28-29-1-37-18 20-19-1Z" fill="#333a35"/><path d="m117 123-43 36-20 69 129 18 51-67-50-49-31 31Z" fill="#64564b"/><path d="m118 130 31 45 34-43-10 102-60-6Z" fill="#846355"/><path d="m78 168 60 29 41-35 12 14-43 44-80-29Z" fill="#4c4d42"/><g transform="translate(168 155) rotate(25)"><rect x="-15" y="-24" width="68" height="42" rx="5" fill="#d7c59f"/><path d="M-17-27v48m73-48v48" stroke="#795d3c" strokeWidth="9"/></g></svg></div>;
}
