import { describe, expect, it } from 'vitest';
import { Box3, OrthographicCamera, Vector3 } from 'three';
import { fitOverviewCamera } from '../src/scene/overviewFraming';

describe('complete courtyard overview framing', () => {
  const bounds = new Box3(new Vector3(-23, -.3, -22), new Vector3(23, 12, 31));
  for (const aspect of [1440 / 1000, 390 / 844, 1920 / 720]) {
    it(`keeps both courts and the tallest trees visible at aspect ${aspect}`, () => {
      const fit = fitOverviewCamera(bounds, aspect);
      const camera = new OrthographicCamera(fit.left, fit.right, fit.top, fit.bottom, fit.near, fit.far);
      camera.position.set(...fit.position);
      camera.lookAt(...fit.target);
      camera.updateMatrixWorld();
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const point = new Vector3(x, y, z).project(camera);
            expect(Math.abs(point.x)).toBeLessThan(.9);
            expect(Math.abs(point.y)).toBeLessThan(.9);
            expect(point.z).toBeGreaterThan(-1);
            expect(point.z).toBeLessThan(1);
          }
        }
      }
    });
  }
});
