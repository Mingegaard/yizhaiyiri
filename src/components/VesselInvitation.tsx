import { ADVENTURE_COST } from '../game/engine';

/** The vessel reveals its count only when touched; it is the sole adventure entrance. */
export function VesselInvitation({ rods, busy, onEnter, onReturn }: {
  rods: number; busy: boolean; onEnter: () => void; onReturn: () => void;
}) {
  const canEnter = rods >= ADVENTURE_COST;
  return <div className="vessel-invitation">
    <output className="vessel-count" aria-label={`筒中 ${rods} 筹`} data-testid="vessel-count"><span>{rods}<small>筹</small></span></output>
    <div className="vessel-inscription">
      {canEnter ? <p className="vessel-stirring">似有异动</p> : <>
        <p className="vessel-artifact-name">唐龟负论语玉烛酒筹鎏金银筒</p>
        <p className="vessel-quote">与朋友共，敝之而无憾</p>
      </>}
    </div>
    <div className="vessel-actions">
      {canEnter ? <button type="button" data-testid="vessel-enter" disabled={busy} onClick={onEnter}>入境</button> : null}
      <button type="button" disabled={busy} onClick={onReturn}>返回</button>
    </div>
  </div>;
}
