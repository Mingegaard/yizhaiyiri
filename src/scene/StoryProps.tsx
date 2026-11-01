import { courtyardAsset, gameProp } from '../content/assets';
import { ModelAsset } from './ModelAsset';
import { storyPropStates } from './storyConfig';
import type { StoryView } from './types';

const assets = Object.fromEntries(Object.entries(storyPropStates).flatMap(([prop, states]) =>
  prop === 'bamboo' || prop === 'none' ? [] : states.map(state => [`${prop}.${state}`, gameProp(`${prop}_${state}`)]),
));
const bamboo = { ...courtyardAsset, node: 'lux_bamboo_east_bamboo_01', position: [0, 0, 0] as [number, number, number], scale: .78, localOrigin: true };
const clothesTree = { ...courtyardAsset, node: 'lux_flower_crabapple_tree', position: [0, 0, -.6] as [number, number, number], scale: .45, localOrigin: true };
const bambooLetter = { ...gameProp('letter_visible'), scale: .6, position: [0, 0, .5] as [number, number, number] };

/** Scene variants swap visible evidence; the original story controller owns progression. */
export function StoryProps({ view }: { view: StoryView }) {
  if (view.prop === 'none') return null;
  if (view.prop === 'bamboo') return <>
    <ModelAsset asset={bamboo}/>
    {view.state === 'letter' || view.state === 'visible' ? <ModelAsset asset={bambooLetter}/> : null}
  </>;
  if (view.prop === 'clothes') return <><ModelAsset asset={clothesTree}/><ModelAsset asset={assets[`clothes.${view.state}`]}/></>;
  const asset = assets[`${view.prop}.${view.state}`];
  return asset ? <ModelAsset asset={asset}/> : null;
}
