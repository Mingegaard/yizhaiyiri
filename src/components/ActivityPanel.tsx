import type { ActivityDefinition } from '../content/activities';

/** The invitation intentionally contains only the verse, destination and return. */
export function ActivityPanel({ activity, stage, disabled, onGuide, onBegin, onPhoto, onClose }: {
  activity: ActivityDefinition; stage: 'guide' | 'action'; disabled: boolean;
  onGuide: () => void; onBegin: () => void; onPhoto: () => void; onClose: () => void;
}) {
  return <section className="healthy-letter" data-testid={`health-${stage}`}>
    {stage === 'guide' ? <>
      <p className="healthy-verse">{activity.invitation}</p>
      <button className="healthy-destination" disabled={disabled} onClick={onGuide}>{activity.guide}</button>
    </> : <div className="healthy-options">
      <button disabled={disabled} onClick={onBegin}>{activity.together}</button>
      <button disabled={disabled} onClick={onPhoto}>{activity.photoLabel}</button>
    </div>}
    <button className="healthy-return" onClick={onClose}>返回</button>
  </section>;
}
