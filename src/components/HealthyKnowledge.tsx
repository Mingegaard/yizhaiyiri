import { knowledgeCards } from '../content/cards';

export function HealthyKnowledge({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const card = knowledgeCards[cardId];
  if (!card) return null;
  return <article className={`healthy-knowledge motif-${card.motif}`} data-testid="healthy-knowledge">
    <span className="knowledge-category">{card.category}</span>
    <div className="knowledge-motif" aria-hidden="true">{card.motif === 'reading' ? '卷' : card.motif === 'meal' ? '味' : card.motif === 'outdoors' ? '游' : '月'}</div>
    <h2>{card.title}</h2><p>{card.body}</p>
    <button className="healthy-return" onClick={onClose}>收下</button>
  </article>;
}
