import { useEffect, useRef, type ComponentType } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';

export const SCENE_DURATIONS = {
  intro: 8000,
  roles: 10000,
  discovery: 14000,
  booking: 14000,
  consultation: 18000,
  provider: 16000,
  institute: 18000,
  outro: 18000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  intro: Scene1,
  roles: Scene2,
  discovery: Scene3,
  booking: Scene4,
  consultation: Scene5,
  provider: Scene6,
  institute: Scene7,
  outro: Scene8,
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
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
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
    <div className="w-full h-screen overflow-hidden relative bg-black font-sans">
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/composite_audio.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
        className="hidden"
      />
      
      {/* Background Layer (Persistent) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          src={`${import.meta.env.BASE_URL}videos/intro-bg.mp4`}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            sceneIndex === 0 || sceneIndex === 1 ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <video
          src={`${import.meta.env.BASE_URL}videos/map-bg.mp4`}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            sceneIndex === 2 || sceneIndex === 3 ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <video
          src={`${import.meta.env.BASE_URL}videos/consultation-bg.mp4`}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            sceneIndex === 4 ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <video
          src={`${import.meta.env.BASE_URL}videos/dashboard-bg.mp4`}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            sceneIndex === 5 || sceneIndex === 6 ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <video
          src={`${import.meta.env.BASE_URL}videos/network-bg.mp4`}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            sceneIndex === 7 ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
