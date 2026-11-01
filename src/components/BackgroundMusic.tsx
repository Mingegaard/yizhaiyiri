import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const preferenceKey = 'yizhaiyiri-music-enabled:v1';
const source = `${import.meta.env.BASE_URL}audio/courtyard-bgm.mp3`;

function savedPreference() {
  try { return localStorage.getItem(preferenceKey) !== '0'; }
  catch { return true; }
}

/** Lives outside the game screen so scene changes never restart the track. */
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [enabled, setEnabled] = useState(savedPreference);
  const enabledRef = useRef(enabled);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current!;
    audio.volume = .4;
    function start() {
      if (enabledRef.current && audio.paused) {
        // Autoplay may need a trusted gesture; keep that retry separate from
        // the user's saved choice and never report blocked playback as active.
        void audio.play().catch(() => undefined);
      }
    }
    function onGesture(event: Event) {
      if ((event.target as Element | null)?.closest?.('[data-testid="music-toggle"]')) return;
      start();
    }
    start();
    window.addEventListener('pointerup', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    return () => {
      window.removeEventListener('pointerup', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      audio.pause();
    };
  }, []);

  function toggle() {
    const audio = audioRef.current!;
    const next = audio.paused;
    enabledRef.current = next;
    setEnabled(next);
    try { localStorage.setItem(preferenceKey, next ? '1' : '0'); } catch { /* Playback also works without storage. */ }
    if (next) void audio.play().catch(() => undefined);
    else audio.pause();
  }

  const label = playing ? '关闭背景音乐' : '播放背景音乐';
  return <>
    <audio ref={audioRef} src={source} loop autoPlay={enabled} preload="auto"
      onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)}/>
    <button type="button" className="background-music-toggle" data-testid="music-toggle"
      aria-label={label} title={label} aria-pressed={playing} onClick={toggle}>
      {playing ? <Volume2 size={17}/> : <VolumeX size={17}/>}
    </button>
  </>;
}
