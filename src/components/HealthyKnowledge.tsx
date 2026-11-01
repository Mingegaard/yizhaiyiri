import { useEffect, useRef } from 'react';
import { cardImageUrl, knowledgeCards } from '../content/cards';

export function HealthyKnowledge({ cardId, onClose, closeLabel = '收下' }: { cardId: string; onClose: () => void; closeLabel?: string }) {
  const card = knowledgeCards[cardId];
  const article = useRef<HTMLElement>(null);
  useEffect(() => {
    // A native dialog otherwise focuses the bottom collect button and skips the card title.
    const frame = requestAnimationFrame(() => {
      article.current?.focus({ preventScroll: true });
      article.current?.closest('dialog')?.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [cardId]);
  if (!card) return null;
  if (card.image) return <article ref={article} tabIndex={-1} className="healthy-knowledge knowledge-illustrated" data-testid="healthy-knowledge" data-card-id={card.id}>
    <h2>{card.title}</h2>
    <div className="knowledge-layout">
      <figure className={`knowledge-illustration image-${card.id}`}>
        <img src={cardImageUrl(card.image)} alt={card.artifactName ?? card.title} decoding="async"/>
        <figcaption>{card.artifactName}<span>{card.source}</span></figcaption>
      </figure>
      <div className="knowledge-reading">
        {card.tip ? <aside className="knowledge-tip"><p>{card.tip}</p></aside> : null}
        <div className="knowledge-copy">{card.body.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      </div>
    </div>
    <button className="healthy-return" onClick={onClose}>{closeLabel}</button>
  </article>;
  return <article ref={article} tabIndex={-1} className={`healthy-knowledge motif-${card.motif}`} data-testid="healthy-knowledge" data-card-id={card.id}>
    <span className="knowledge-category">{card.category}</span>
    <div className="knowledge-motif" aria-hidden="true">{card.motif === 'reading' ? '卷' : card.motif === 'meal' ? '味' : card.motif === 'outdoors' ? '游' : '月'}</div>
    <h2>{card.title}</h2><p>{card.body}</p>
    <button className="healthy-return" onClick={onClose}>{closeLabel}</button>
  </article>;
}
