import { useCallback, useRef } from 'react';

// Anything in client/public/ is served as-is from the root, so these paths
// map straight to client/public/sounds/*.mp3 — no import/bundling needed.
const SOUNDS = {
    join: '/sounds/join.wav',
    wordPicker: '/sounds/word-picker.wav',
    roundEnd: '/sounds/round-end.wav',
    allGuessed: '/sounds/all-guessed.wav',
    tick: '/sounds/tick.wav',
    timeout: '/sounds/timeout.wav',
    uiClick: '/sounds/ui-click.wav',
    win: '/sounds/win.wav',
    lose: '/sounds/lose.wav'
} as const;

type SoundName = keyof typeof SOUNDS;

const MUTE_KEY = 'inklink_muted';

export function isMuted(): boolean {
    return localStorage.getItem(MUTE_KEY) === '1';
}

export function toggleMute(): void {
    localStorage.setItem(MUTE_KEY, isMuted() ? '0' : '1');
}

export function useSound() {
    // One Audio() per sound, created lazily on first use and reused after
    // that — avoids re-fetching/re-decoding the file on every play.
    const cache = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

    const play = useCallback((name: SoundName) => {
        console.log('play() called with', name, 'muted:', isMuted());
        if (isMuted()) return;

        let audio = cache.current[name];
        if (!audio) {
            audio = new Audio(SOUNDS[name]);
            audio.volume = name === 'tick' ? 0.3 : 0.6;
            cache.current[name] = audio;
        }

        // Reset so the sound can restart even if a previous play of the
        // same sound hasn't finished yet (e.g. rapid ticks).
        audio.currentTime = 0;
        audio.play().catch(() => {
            // Browsers reject play() before the first user gesture in the
            // tab — expected, not a real error, safe to swallow.
        });
    }, []);

    const stop = useCallback((name: SoundName) => {
        const audio = cache.current[name];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    return { play, stop };
}
// bottom of useSound.ts
let musicAudio: HTMLAudioElement | null = null;
const MUSIC_MUTE_KEY = 'inklink_music_muted';

export function isMusicMuted(): boolean {
    return localStorage.getItem(MUSIC_MUTE_KEY) === '1';
}

export function startMusic() {
    if (musicAudio) return; // already created — don't restart on every call
    musicAudio = new Audio('/sounds/background-music.mp3');
    musicAudio.loop = true;
    musicAudio.volume = 0.15; // meant to sit under SFX, not compete with it
    if (!isMusicMuted()) musicAudio.play().catch(() => {});
}

export function toggleMusicMute() {
    const nextMuted = !isMusicMuted();
    localStorage.setItem(MUSIC_MUTE_KEY, nextMuted ? '1' : '0');
    if (!musicAudio) { if (!nextMuted) startMusic(); return; }
    if (nextMuted) musicAudio.pause();
    else musicAudio.play().catch(() => {});
}