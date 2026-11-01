import { expect, it } from 'vitest';
import { BoxGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { courtyardAsset, COURTYARD_SCALE, interiorAsset } from '../src/content/assets';
import { study, tallyVessel } from '../src/scene/config';
import { DESK_SOUTH_SHIFT, STUDY_NORTH_SHIFT } from '../src/scene/studyLayout';
import { realignStudyPaving } from '../src/scene/courtyardPaving';

it('moves the courtyard study and tabletop interaction together by half a building depth', () => {
  const shift = courtyardAsset.studyNorthShift! * COURTYARD_SCALE;
  expect(shift).toBeCloseTo(study.depth / 2);
  expect(study.center[2]).toBeCloseTo(-2 - shift);
  expect(study.deskPosition[2] - study.center[2]).toBeCloseTo(.12 + DESK_SOUTH_SHIFT);
  expect(courtyardAsset.studyDeskSouthShift! * COURTYARD_SCALE).toBeCloseTo(DESK_SOUTH_SHIFT);
  expect(tallyVessel.position[2] - study.deskPosition[2]).toBeCloseTo(-.41);
  expect(study.focusCamera[2] - study.center[2]).toBeCloseTo(.4 + DESK_SOUTH_SHIFT);
  expect(interiorAsset.studyNorthShift).toBeUndefined();
});

it('fits the paving to the relocated plinth, leaving garden beds and the old side-loop area clear', () => {
  const oldInner = new BoxGeometry(2.37, .093, 2.37).translate(-6, .1585, 0);
  const oldForecourt = new BoxGeometry(2.37, .093, 2.37).translate(-6, .1585, 24);
  const source = mergeGeometries([oldInner, oldForecourt])!;
  source.deleteAttribute('uv');
  const count = source.getAttribute('position').count;
  const shift = STUDY_NORTH_SHIFT / COURTYARD_SCALE;
  const result = realignStudyPaving(source, shift);
  const alternate = realignStudyPaving(source, shift, true);
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = [new Mesh(result, material), new Mesh(alternate, material)];
  const surfaceAt = (x: number, z: number) => new Raycaster(new Vector3(x, 1, z), new Vector3(0, -1, 0)).intersectObjects(meshes)[0]?.point.y;
  expect(surfaceAt(1.2, 2)).toBeCloseTo(.205); // Continuous southern approach in the vacated footprint.
  expect(surfaceAt(5.5, -6.5)).toBeCloseTo(.205); // New northern corner of the paving apron.
  expect(surfaceAt(1.2, -shift)).toBeUndefined(); // No slabs through the study's plinth.
  expect(surfaceAt(5.5, -8)).toBeUndefined(); // Respect the existing northern garden bed.
  expect(surfaceAt(5.5, 5.5)).toBeUndefined(); // Remove the old offset outer loop.
  expect(surfaceAt(-6, 24)).toBeCloseTo(.205); // Forecourt stays at the original surface height.
  expect(source.getAttribute('position').count).toBe(count);
  expect(realignStudyPaving(source, shift)).toBe(result);
  expect(realignStudyPaving(source, 0)).toBe(source);
  material.dispose();
});
