import { memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { NoToneMapping, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { dragLook, EYE_HEIGHT, firstPersonPose, isNearStudyDesk, moveOnGround, scenes, walkingInput, wheelLook } from './config';
import { AssetLoading, AssetNightContext, AssetSunsetContext } from './ModelAsset';
import { CourtyardCompanion, TangEnvironment } from './TangEnvironment';
import { StoryInteraction } from './StoryInteraction';
import { isNearAdventureVessel, storyApproach, storyTarget } from './adventureLayout';
import { GardenAtmosphere } from './GardenAtmosphere';
import { TallyVessel } from './TallyVessel';
import { VesselCloudTransition } from './VesselCloudTransition';
import { CourtyardSky } from './CourtyardSky';
import { OverviewCamera } from './OverviewCamera';
import { skyPalette } from './skyPalette';
import { STUDY_FURNISHED } from './studyLayout';
import { daybedMeditationPose, isNearDaybed, meditationCameraEase, MEDITATION_CAMERA_SECONDS } from './daybedMeditation';
import { KitchenSmoke } from './KitchenSmoke';
import { companionPlaces, healthyFocusPose, isNearHealthyCompanion } from './healthyCompanion';
import { AtmosphereMotionContext } from './atmosphereMotion';
import { advanceWalkingCamera, createWalkingCamera, resetWalkingCamera, walkingCameraPose } from './walkingCamera';
import type { SceneCanvasProps, SceneDefinition, SceneId, Vec3 } from './types';

interface WalkingPose { position: Vec3; yaw: number; pitch: number }
type PoseMemory = Partial<Record<SceneId, WalkingPose>>;

function Navigation({ definition, inputRef, blocked, overview, focusView, celebrating, healthActivityId, onCompanionNear, onPortalNear, onDeskNear, onDaybedNear, onFocusReady, onPosition, poses, storyTravel, storyNodeId, travel }: SceneCanvasProps & { definition: SceneDefinition; poses: RefObject<PoseMemory> }) {
  const { camera, gl, size } = useThree();
  const keys = useRef(new Set<string>());
  const saved = poses.current[definition.id];
  const view = useRef({ yaw: saved?.yaw ?? 0, pitch: saved?.pitch ?? 0 });
  const position = useRef<Vec3>(saved ? [...saved.position] : [...definition.spawn]);
  const walkingCamera = useRef(createWalkingCamera(position.current, view.current));
  const reducedMotion = useRef(false);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const latest = useRef({ blocked: blocked || !!overview, overview: !!overview, focused: !!focusView, focusView, celebrating, healthActivityId, onCompanionNear, onPortalNear, onDeskNear, onDaybedNear, onFocusReady, onPosition });
  const near = useRef<string | null>(null);
  const deskNear = useRef(false);
  const daybedNear = useRef(false);
  const companionNear = useRef(false);
  const seatCamera = useMemo(() => new PerspectiveCamera(), []);
  const seatTransition = useRef<{ elapsed: number; position: Vector3; quaternion: Quaternion; fov: number; ready: boolean } | null>(null);
  const reportTime = useRef(0);
  const previousReport = useRef('');
  const target = useRef(new Vector3());
  latest.current = { blocked: blocked || !!overview, overview: !!overview, focused: !!focusView, focusView, celebrating, healthActivityId, onCompanionNear, onPortalNear, onDeskNear, onDaybedNear, onFocusReady, onPosition };

  useEffect(() => {
    if (!storyTravel) return;
    const next = storyApproach(storyTravel.nodeId), point = storyTarget(storyTravel.nodeId);
    position.current = next;
    const dx = point[0] - next[0], dz = point[2] - next[2];
    const gazeHeight = ['a1-missing', 'a1-returned'].includes(storyTravel.nodeId) ? point[1] + .13
      : ['a3-letter', 'a3-defense'].includes(storyTravel.nodeId) ? point[1]
      : storyTravel.nodeId === 'a5-clothes' ? 2.1 : point[1] + .35;
    view.current = { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(gazeHeight - EYE_HEIGHT - next[1], Math.hypot(dx, dz)) };
    resetWalkingCamera(walkingCamera.current, position.current, view.current);
    previousReport.current = '';
  }, [storyTravel?.id]);
  useEffect(() => { previousReport.current = ''; }, [storyNodeId]);
  useEffect(() => {
    if (!travel || travel.sceneId !== definition.id) return;
    position.current = [...travel.position];
    view.current = { yaw: travel.yaw, pitch: 0 };
    resetWalkingCamera(walkingCamera.current, position.current, view.current);
    previousReport.current = '';
  }, [travel?.id, definition.id]);


  useLayoutEffect(() => {
    if (overview || latest.current.focusView || latest.current.celebrating) return;
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 64;
      camera.updateProjectionMatrix();
    }
    const pose = walkingCameraPose(walkingCamera.current, position.current);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
  }, [camera, size.width, size.height, overview]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = preference.matches; };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const watched = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const release = () => {
      keys.current.clear();
      pointer.current = null;
      inputRef.current.forward = 0;
      inputRef.current.right = 0;
      inputRef.current.turn = 0;
    };
    const down = (event: KeyboardEvent) => {
      if (latest.current.blocked || latest.current.focused || (event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (watched.has(event.code)) { event.preventDefault(); keys.current.add(event.code); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const startDrag = (event: PointerEvent) => {
      if (latest.current.blocked || latest.current.focused || event.button !== 0) return;
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      gl.domElement.setPointerCapture(event.pointerId);
    };
    const drag = (event: PointerEvent) => {
      const current = pointer.current;
      if (!current || current.id !== event.pointerId || latest.current.blocked || latest.current.focused) return;
      view.current = dragLook(view.current, event.clientX - current.x, event.clientY - current.y);
      current.x = event.clientX; current.y = event.clientY;
    };
    const endDrag = () => { pointer.current = null; };
    const wheel = (event: WheelEvent) => {
      // Trackpad pinch is delivered as Ctrl+wheel; leave system/browser zoom untouched.
      if (event.ctrlKey) return;
      event.preventDefault();
      view.current = wheelLook(view.current, event, latest.current.blocked || latest.current.focused);
    };
    const canvas = gl.domElement;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    canvas.addEventListener('pointerdown', startDrag);
    canvas.addEventListener('pointermove', drag);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', wheel, { passive: false });
    latest.current.onPortalNear(null);
    latest.current.onDeskNear?.(false);
    latest.current.onDaybedNear?.(false);
    latest.current.onCompanionNear?.(false);
    return () => {
      poses.current[definition.id] = { position: [...position.current], ...view.current };
      release();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      canvas.removeEventListener('pointerdown', startDrag);
      canvas.removeEventListener('pointermove', drag);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('wheel', wheel);
    };
  }, [gl, inputRef, poses, definition.id]);

  useEffect(() => {
    if (!blocked && !focusView && !overview) return;
    keys.current.clear();
    pointer.current = null;
    inputRef.current.forward = 0;
    inputRef.current.right = 0;
    inputRef.current.turn = 0;
  }, [blocked, !!focusView, overview, inputRef]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, .05);
    const key = keys.current;
    const paused = latest.current.blocked || latest.current.focused || document.hidden;
    if (!paused) {
      const input = walkingInput(key, inputRef.current);
      view.current.yaw += input.turn * dt * 1.2;
      position.current = moveOnGround(
        position.current, view.current.yaw,
        input.forward, input.right,
        dt, definition,
      );
    }

    if (latest.current.focused || latest.current.overview || latest.current.celebrating) {
      resetWalkingCamera(walkingCamera.current, position.current, view.current);
    } else {
      advanceWalkingCamera(walkingCamera.current, position.current, view.current, dt, paused, reducedMotion.current);
    }

    // Focus never changes the walking refs, so leaving it restores the exact prior pose.
    if (!latest.current.overview) {
      if (latest.current.focusView?.activityId || (latest.current.celebrating && latest.current.healthActivityId)) {
        const pose = healthyFocusPose(latest.current.focusView?.activityId ?? latest.current.healthActivityId!, size.width / size.height, latest.current.celebrating);
        camera.position.set(...pose.position);
        camera.lookAt(...pose.target);
        if (camera instanceof PerspectiveCamera && camera.fov !== pose.fov) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
      } else if (latest.current.focusView?.retreat === 'daybed') {
        const transition = seatTransition.current ??= {
          elapsed: 0, position: camera.position.clone(), quaternion: camera.quaternion.clone(),
          fov: camera instanceof PerspectiveCamera ? camera.fov : 64, ready: false,
        };
        transition.elapsed += Math.min(rawDelta, .1);
        const pose = daybedMeditationPose(size.width / size.height);
        seatCamera.position.set(...pose.position);
        seatCamera.lookAt(...pose.target);
        const blend = meditationCameraEase(transition.elapsed / MEDITATION_CAMERA_SECONDS);
        camera.position.copy(transition.position).lerp(seatCamera.position, blend);
        camera.quaternion.slerpQuaternions(transition.quaternion, seatCamera.quaternion, blend);
        if (camera instanceof PerspectiveCamera) {
          const fov = transition.fov + (pose.fov - transition.fov) * blend;
          if (Math.abs(camera.fov - fov) > .00001) { camera.fov = fov; camera.updateProjectionMatrix(); }
        }
        if (blend === 1 && latest.current.focusView.entering && !transition.ready) {
          transition.ready = true;
          latest.current.onFocusReady?.();
        }
      } else {
        seatTransition.current = null;
        const pose = latest.current.focused
          ? firstPersonPose(position.current, view.current.yaw, view.current.pitch, true, size.width / size.height)
          : walkingCameraPose(walkingCamera.current, position.current);
        camera.position.set(...pose.position);
        target.current.set(...pose.target);
        camera.lookAt(target.current);
        if (camera instanceof PerspectiveCamera && camera.fov !== 64) { camera.fov = 64; camera.updateProjectionMatrix(); }
      }
    }

    const p = position.current;
    const portal = latest.current.focused || latest.current.overview ? null : definition.portals.find(portal => Math.hypot(p[0] - portal.position[0], p[2] - portal.position[2]) <= portal.radius) || null;
    if ((portal?.id || null) !== near.current) {
      near.current = portal?.id || null;
      latest.current.onPortalNear(portal);
    }
    const nextDeskNear = !latest.current.focused && !latest.current.overview && definition.id === 'courtyard' && (isNearStudyDesk(p, definition.id) || isNearAdventureVessel(p));
    if (nextDeskNear !== deskNear.current) {
      deskNear.current = nextDeskNear;
      latest.current.onDeskNear?.(nextDeskNear);
    }
    const nextDaybedNear = !latest.current.focused && !latest.current.overview && isNearDaybed(p, definition.id);
    if (nextDaybedNear !== daybedNear.current) {
      daybedNear.current = nextDaybedNear;
      latest.current.onDaybedNear?.(nextDaybedNear);
    }
    const nextCompanionNear = !latest.current.focused && !latest.current.overview && isNearHealthyCompanion(p, definition.id, latest.current.healthActivityId);
    if (nextCompanionNear !== companionNear.current) {
      companionNear.current = nextCompanionNear;
      latest.current.onCompanionNear?.(nextCompanionNear);
    }
    reportTime.current += dt;
    if (reportTime.current > .15) {
      const signature = `${p[0].toFixed(2)},${p[2].toFixed(2)}`;
      if (signature !== previousReport.current) {
        latest.current.onPosition?.([...p]);
        previousReport.current = signature;
      }
      reportTime.current = 0;
    }
  });
  return null;
}

function DoorMarkers({ definition, night }: { definition: SceneDefinition; night: boolean }) {
  return <>{definition.portals.map(portal => <group key={portal.id} position={portal.position}>
    <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.63, .69, 40]} /><meshBasicMaterial color={night ? '#e7cc8b' : '#f7edcf'} transparent opacity={.9} />
    </mesh>
  </group>)}</>;
}

function SceneWorld(props: SceneCanvasProps) {
  const walkingPoses = useRef<PoseMemory>({});
  const definition = scenes[props.sceneId];
  const companion = props.healthActivityId ? companionPlaces[props.healthActivityId] : null;
  const showElf = companion ? props.sceneId === companion.sceneId && (props.healthActivityId !== 'outdoors' || props.celebrating) : props.sceneId !== 'courtyard' && !props.focusView && (
    (props.elfState === 'cooking' && props.sceneId === 'kitchen') || (props.elfState === 'sleeping' && props.sceneId === 'west-wing') || props.elfState === 'meditating'
  );
  const elfPosition: Vec3 = props.celebrating && props.healthActivityId === 'sleep' ? [0, 0, -2] : companion?.anchor ?? definition.elfAnchor;
  const palette = skyPalette[props.night ? 'night' : props.sunset ? 'sunset' : 'day'];
  return <>
    <color attach="background" args={[palette.horizon]} />
    <fog attach="fog" args={[palette.horizon, props.overview ? 180 : 65, props.overview ? 320 : 110]} />
    <ambientLight intensity={props.night ? .65 : 1.3} color={props.night ? '#a9c9d1' : '#fff7e9'} />
    <hemisphereLight args={['#faf5e3', '#829079', props.night ? .25 : .7]} />
    <directionalLight position={[-8, 16, 8]} intensity={props.night ? .7 : 2.1} color={props.night ? '#b2ced4' : '#fff1d3'} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={17} shadow-camera-bottom={-17} shadow-normalBias={.035} />
    {props.night ? <pointLight position={[0, 2, -3.5]} color="#e6b46f" intensity={16} distance={11} /> : null}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.59, 0]} receiveShadow><planeGeometry args={[props.overview ? 1000 : 160, props.overview ? 1000 : 160]} />{props.overview ? <meshBasicMaterial color={palette.ground} fog={false} /> : <meshStandardMaterial color={palette.ground} roughness={1} />}</mesh>
    <TangEnvironment sceneId={props.sceneId} />
    {props.kitchenSmoking && props.sceneId !== 'west-wing' ? <KitchenSmoke interior={props.sceneId === 'kitchen'}/> : null}
    {props.sceneId === 'courtyard' ? <GardenAtmosphere focusView={props.focusView} /> : null}
    {props.sceneId === 'courtyard' && !props.storyNodeId ? <TallyVessel writingTable={!STUDY_FURNISHED} rods={props.rods} enabled={!props.blocked && !props.overview && !props.focusView && !props.vesselTransition} onTouch={props.onVesselTouch} /> : null}
    {props.storyView && props.storyNodeId ? <StoryInteraction view={props.storyView} nodeId={props.storyNodeId} label={props.storyActionLabel ?? '查看物件'} blocked={props.blocked} onInteract={props.onStoryInteract} /> : null}
    {props.retainedStoryProps?.filter(item => !props.storyView || item.view.prop !== props.storyView.prop || storyTarget(item.nodeId).join() !== storyTarget(props.storyNodeId!).join()).map(item => <StoryInteraction key={item.nodeId} view={item.view} nodeId={item.nodeId} label="" blocked passive/>)}
    {showElf ? <group position={elfPosition} rotation={props.elfState === 'sleeping' && !props.celebrating ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <CourtyardCompanion state={props.celebrating ? 'idle' : props.elfState} celebrating={props.celebrating && !props.companionSpeaking} silverHook={props.sceneId === 'kitchen' || (props.sceneId === 'courtyard' && (props.healthActivityId === 'breakfast' || props.healthActivityId === 'outdoors'))} />
    </group> : null}
    {!props.focusView && !props.overview && !props.storyNodeId ? <DoorMarkers definition={definition} night={props.night} /> : null}
    <Navigation key={props.sceneId} {...props} definition={definition} poses={walkingPoses} />
    {props.overview ? <Suspense fallback={null}><OverviewCamera blocked={props.blocked} resetKey={props.overviewResetKey} /></Suspense> : null}
    <VesselCloudTransition active={!!props.vesselTransition} onComplete={props.onVesselTransitionComplete} />
  </>;
}

export const SceneCanvas = memo(function SceneCanvas(props: SceneCanvasProps) {
  return <div style={{ position: 'absolute', inset: 0, touchAction: 'none' }} data-scene={props.sceneId} data-camera-mode={props.celebrating ? 'celebration' : props.focusView ? 'focus' : props.overview ? 'overview' : 'walk'} data-health-scene={props.healthActivityId} data-kitchen-smoking={!!props.kitchenSmoking} data-atmosphere={props.night ? 'night' : props.sunset ? 'sunset' : 'day'} data-story-zone={props.storyView?.zone} data-story-prop={props.storyView?.prop} data-story-state={props.storyView?.state} aria-label={props.overview ? '宅院全景鸟瞰' : props.storyView ? `筒中奇境 · ${props.storyView.zone}物证场景` : `${scenes[props.sceneId].label}三维场景`}>
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, EYE_HEIGHT, 7], fov: 64, near: .08, far: 150 }} gl={{ antialias: true, alpha: false, toneMapping: NoToneMapping }} fallback={<div style={{ padding: 32 }}>当前浏览器无法显示 3D 场景，打坐和记忆本仍可使用。</div>}>
      <AtmosphereMotionContext.Provider value={!props.storyView && !!props.focusView && !props.focusView.paused && !props.focusView.entering}>
        <AssetNightContext.Provider value={props.night}><AssetSunsetContext.Provider value={!!props.sunset}><SceneWorld {...props} /></AssetSunsetContext.Provider></AssetNightContext.Provider>
        <Suspense fallback={null}><CourtyardSky night={props.night} sunset={props.sunset} /></Suspense>
      </AtmosphereMotionContext.Provider>
    </Canvas>
    <AssetLoading />
  </div>;
});
