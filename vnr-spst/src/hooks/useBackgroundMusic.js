import { useState, useRef, useEffect, useCallback } from "react";

const BGM_STORAGE_KEY = "vnr_bgm";
const VOLUME_STEP = 0.1;

function loadPersisted() {
  try {
    const raw = localStorage.getItem(BGM_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: false, volume: 0.3 };
}

export function useBackgroundMusic(src = "/sound/bgm/bgm.mp3") {
  const [enabled, setEnabled] = useState(() => loadPersisted().enabled);
  const [volume, setVolume] = useState(() => loadPersisted().volume);
  const audioRef = useRef(null);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(BGM_STORAGE_KEY, JSON.stringify({ enabled, volume }));
    } catch { /* ignore */ }
  }, [enabled, volume]);

  // Create / sync audio element
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    // Auto-play if enabled from last session (needs user gesture first)
    if (enabled) {
      const tryPlay = () => {
        audio.play().catch(() => {});
      };
      // Wait for first user interaction to satisfy autoplay policy
      document.addEventListener("pointerdown", tryPlay, { once: true });
    }

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Sync enabled/volume to the live audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
      try { audio.currentTime = 0; } catch { /* ignore */ }
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  const increaseVolume = useCallback(() => {
    setVolume((v) => Math.min(1, +(v + VOLUME_STEP).toFixed(2)));
  }, []);

  const decreaseVolume = useCallback(() => {
    setVolume((v) => Math.max(0, +(v - VOLUME_STEP).toFixed(2)));
  }, []);

  return { enabled, volume, toggle, increaseVolume, decreaseVolume, setVolume };
}
