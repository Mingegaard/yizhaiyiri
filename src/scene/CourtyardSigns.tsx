import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { STUDY_CANOPY_RAISE, studyZ } from './studyLayout';

function Sign({ text, position, rotation = [0, 0, 0], width = 1.36 }: { text: string; position: [number, number, number]; rotation?: [number, number, number]; width?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#6f897c'; context.fillRect(0, 0, 768, 192);
    context.strokeStyle = '#b9a575'; context.lineWidth = 5; context.strokeRect(11, 10, 746, 172);
    context.fillStyle = '#eee1bb'; context.font = '100px "Songti SC", "STSong", serif';
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 384, 102);
    const result = new CanvasTexture(canvas); result.colorSpace = SRGBColorSpace; return result;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} rotation={rotation}><planeGeometry args={[width, width / 4]}/><meshBasicMaterial map={texture}/></mesh>;
}
export function CourtyardSigns({ interior = false }: { interior?: boolean }) {
  if (interior) return null;
  return <>
    <Sign text="听 松 书 斋" position={[0, 2.616 + STUDY_CANOPY_RAISE, studyZ(.477)]}/>
    <Sign text="二 进 内 院" position={[0, 2.928, 12.325]} width={1.92}/>
    <Sign text="长 安 一 隅" position={[17.04, 2.52, 28.01]} width={1.456}/>
    <Sign text="东 厨" position={[14.50, 1.9, -2.32]} rotation={[0, -Math.PI / 2, 0]} width={.8}/>
    <Sign text="西 厢" position={[-14.50, 1.9, -2.32]} rotation={[0, Math.PI / 2, 0]} width={.8}/>
  </>;
}
