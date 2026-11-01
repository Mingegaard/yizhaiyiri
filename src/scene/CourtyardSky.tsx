import { useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { BackSide, Color, SRGBColorSpace, TextureLoader, type Mesh, type ShaderMaterial } from 'three';
import { skyPalette } from './skyPalette';
import { AtmosphereMotionContext } from './atmosphereMotion';

const vertexShader = /* glsl */ `
  varying vec3 skyDirection;
  void main() {
    skyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  uniform vec3 horizon;
  uniform vec3 zenith;
  uniform vec3 dayZenith;
  uniform vec3 cloudPaper;
  uniform vec3 cloudShade;
  uniform vec3 cloudInk;
  uniform sampler2D skyPainting;
  uniform float drift;
  uniform float paintingVisible;
  varying vec3 skyDirection;
  void main() {
    vec3 direction = normalize(skyDirection);
    float elevation = direction.y;
    vec3 sky = mix(horizon, zenith, smoothstep(-.04, .85, elevation));

    // Rotate the painted sky about the courtyard's north/south axis. Seen from
    // the daybed facing south, clouds rise on the left and arc over to the right.
    // Inverse rotation samples a painting whose visible motion is clockwise.
    float c = cos(drift);
    float s = sin(drift);
    vec3 cloudDirection = vec3(
      c * direction.x + s * direction.y,
      -s * direction.x + c * direction.y,
      direction.z
    );
    // Keep the original seamless hemisphere projection and fixed horizon.
    vec2 overhead = cloudDirection.xz / (1.0 + max(cloudDirection.y, 0.0));
    vec2 paintingUv = vec2(.5) + overhead * .46;
    // The painting defines the shapes; render its regions with flat palette
    // colors and a screen-sized fine contour instead of enlarged fuzzy edges.
    float region = texture2D(skyPainting, paintingUv).r;
    float edgeWidth = max(fwidth(region), .0005);
    float cloud = smoothstep(-.7 * edgeWidth, .7 * edgeWidth, region - .47);
    float paper = smoothstep(.61, .69, region);
    float contour = 1.0 - smoothstep(.1 * edgeWidth, .8 * edgeWidth,
      abs(region - .47));
    vec3 paintedSky = mix(dayZenith, mix(cloudShade, cloudPaper, paper), cloud);
    paintedSky = mix(paintedSky, cloudInk, contour * .65) * zenith / dayZenith;

    float paintedAmount = smoothstep(-.02, .13, elevation) * paintingVisible;
    gl_FragColor = vec4(mix(sky, paintedSky, paintedAmount), 1.0);
    #include <colorspace_fragment>
  }
`;

export function CourtyardSky({ night, sunset = false }: { night: boolean; sunset?: boolean }) {
  const moving = useContext(AtmosphereMotionContext);
  const dome = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const reducedMotion = useRef(false);
  const elapsed = useRef(0);
  const painting = useLoader(TextureLoader, `${import.meta.env.BASE_URL}textures/outlined-cloud-sky.png`);
  painting.colorSpace = SRGBColorSpace;
  const uniforms = useMemo(() => ({
    horizon: { value: new Color(skyPalette[night ? 'night' : sunset ? 'sunset' : 'day'].horizon) },
    zenith: { value: new Color(skyPalette[night ? 'night' : sunset ? 'sunset' : 'day'].zenith) },
    dayZenith: { value: new Color(skyPalette.day.zenith) },
    cloudPaper: { value: new Color('#e3e7df') },
    cloudShade: { value: new Color('#cfdde1') },
    cloudInk: { value: new Color('#879da7') },
    skyPainting: { value: painting },
    drift: { value: 0 },
    paintingVisible: { value: 1 },
  }), [night, sunset, painting]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = preference.matches; };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useFrame(({ camera }, delta) => {
    dome.current?.position.copy(camera.position);
    dome.current?.scale.setScalar(camera.type === 'OrthographicCamera' ? 2.8 : 1);
    if (moving) elapsed.current += Math.min(delta, .1) * (reducedMotion.current ? .3 : 1);
    if (material.current) {
      material.current.uniforms.drift.value = elapsed.current * .014;
      material.current.uniforms.paintingVisible.value = camera.type === 'OrthographicCamera' ? 0 : 1;
    }
  });

  return <mesh ref={dome} name="painted-cloud-sky" renderOrder={-1000} frustumCulled={false} raycast={() => {}}>
    <sphereGeometry args={[120, 64, 40]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
      side={BackSide} depthWrite={false} depthTest={false} toneMapped={false} />
  </mesh>;
}
