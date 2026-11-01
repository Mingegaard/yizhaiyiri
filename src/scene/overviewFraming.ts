import { Box3, Matrix4, PerspectiveCamera, Vector3 } from 'three';

/** Fit the complete model, including trees and the forecourt, at any screen aspect. */
export function fitOverviewCamera(bounds: Box3, aspect: number) {
  const target = bounds.getCenter(new Vector3());
  const distance = Math.max(100, bounds.getSize(new Vector3()).length() * 1.4);
  const position = target.clone().add(new Vector3(1, .85, 1.3).normalize().multiplyScalar(distance));
  const orientation = new PerspectiveCamera();
  orientation.position.copy(position);
  orientation.lookAt(target);
  orientation.updateMatrixWorld();
  const viewBounds = new Box3();
  const viewMatrix = new Matrix4().copy(orientation.matrixWorldInverse);
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) viewBounds.expandByPoint(new Vector3(x, y, z).applyMatrix4(viewMatrix));
    }
  }
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const portrait = safeAspect < .85;
  const halfHeight = Math.max(
    Math.abs(viewBounds.min.y), Math.abs(viewBounds.max.y),
    Math.abs(viewBounds.min.x) / safeAspect, Math.abs(viewBounds.max.x) / safeAspect,
  ) * (portrait ? 1.12 : 1.28);
  return {
    position: position.toArray() as [number, number, number],
    target: target.toArray() as [number, number, number],
    left: -halfHeight * safeAspect, right: halfHeight * safeAspect,
    top: halfHeight * (portrait ? 1 : .90), bottom: -halfHeight * (portrait ? 1 : 1.10),
    near: .1, far: Math.max(450, distance + bounds.getSize(new Vector3()).length() * 2),
  };
}
