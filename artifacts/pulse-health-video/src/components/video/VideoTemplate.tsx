import { useEffect, useRef, type ComponentType } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

export const SCENE_DURATIONS = {
  s1_home: 6000,
  s2_specialist: 8000,
  s3_booking: 9000,
  s4_provider: 8000,
  s5_institute: 7000,
  s6_outro: 5000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  s1_home: Scene1,
  s2_specialist: Scene2,
  s3_booking: Scene3,
  s4_provider: Scene4,
  s5_institute: Scene5,
  s6_outro: Scene6,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const offsets: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, duration] of Object.entries(SCENE_DURATIONS)) {
    offsets[key] = cumulativeMs / 1000;
    cumulativeMs += duration;
  }
  return offsets;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 1;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [baseSceneKey, currentSceneKey, muted]);

  return (
    <div className="w-full h-full overflow-hidden relative bg-[#020617] font-sans flex items-center justify-center">
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
        className="hidden"
      />
      
      {/* Persistent App Container scaled to fill the 9:19.5 canvas */}
      <div 
        className="relative origin-center"
        style={{
          width: '360px',
          height: '780px',
          // Force scale to fill whatever the parent is, assuming parent is 9:19.5
          transform: 'scale(max(calc(100vw / 360), calc(100vh / 780)))'
        }}
      >
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
