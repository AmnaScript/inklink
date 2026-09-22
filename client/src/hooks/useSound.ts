import { useCallback } from 'react';

// Anything in client/public/ is served as-is from the root, so these paths
// map straight to client/public/sounds/*.wav — no import/bundling needed.
const SOUNDS = {
    join: '/sounds/join.wav',
    wordPicker: '/sounds/word-picker.wav',
    roundEnd: '/sounds/round-end.wav',
    allGuessed: '/sounds/all-guessed.wav',
    tick: '/sounds/tick.wav',
    timeout: '/sounds/timeout.wav',
    uiClick: '/sounds/ui-click.wav',
    win: '/sounds/win.wav',
    lose: '/sounds/lose.wav',
} as const;

type SoundName = keyof typeof SOUNDS;

const MUTE_KEY = 'inklink_muted';

export function isMuted(): boolean {
    return localStorage.getItem(MUTE_KEY) === '1';
}

export function toggleMute(): void {
    localStorage.setItem(MUTE_KEY, isMuted() ? '0' : '1');
}

// Module-level, not inside the hook: shared by every component that calls
// useSound(), across the whole app's lifetime — not one fresh cache per
// component instance. Means each file is only ever fetched once, no matter
// how many different components end up playing it.
const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

function getAudio(name: SoundName): HTMLAudioElement {
    let audio = cache[name];
    if (!audio) {
        audio = new Audio(SOUNDS[name]);
        audio.preload = 'auto'; // start downloading immediately on creation
        audio.volume = name === 'tick' ? 0.3 : 0.6;
        cache[name] = audio;
    }
    return audio;
}

// Call this once, early — e.g. right when a player enters a room — so every
// sound file is already downloaded by the time anything actually needs to
// play. This is what actually fixes the production delay/silence: without
// it, the FIRST play() of any given sound is the one paying the network
// fetch cost, live, at the exact moment it needs to be heard.
export function preloadSounds(): void {
    (Object.keys(SOUNDS) as SoundName[]).forEach((name) => getAudio(name));
}

export function useSound() {
    const play = useCallback((name: SoundName) => {
        if (isMuted()) return;
        const audio = getAudio(name);
        audio.currentTime = 0;
        audio.play().catch(() => {
            // Browsers reject play() before the first user gesture in the
            // tab — expected, not a real error, safe to swallow.
        });
    }, []);

    const stop = useCallback((name: SoundName) => {
        const audio = cache[name];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }, []);

    return { play, stop };
}

// --- background music: separate lobby vs. gameplay tracks --------------
const MUSIC_TRACKS = {
    lobby: {src : '/sounds/lobby-music.mp3', volume: 0.09 },
    game: {src : '/sounds/game-music.mp3', volume: 0.03},
} as const;
type MusicTrack = keyof typeof MUSIC_TRACKS;

let musicAudio: HTMLAudioElement | null = null;
let currentTrack: MusicTrack | null = null;
const MUSIC_MUTE_KEY = 'inklink_music_muted';
const CROSSFADE_MS = 1000;

export function isMusicMuted(): boolean {
    return localStorage.getItem(MUSIC_MUTE_KEY) === '1';
}

function fadeVolume(audio: HTMLAudioElement, target: number, ms: number, onDone?: () => void) {
    const steps = 20;
    const start = audio.volume;
    const stepMs = ms / steps;
    let i = 0;
    const timer = setInterval(() => {
        i += 1;
        audio.volume = start + (target - start) * (i / steps);
        if (i >= steps) {
            clearInterval(timer);
            audio.volume = target;
            onDone?.();
        }
    }, stepMs);
}

// Switches to `track`. If it's already the one playing, this is a no-op —
// safe to call on every render/status-check without restarting the loop
// each time.

export function playMusic(track: MusicTrack) {
    if (currentTrack === track && musicAudio) return;

    const config = MUSIC_TRACKS[track];
    const previous = musicAudio;

    const next = new Audio(config.src);
    next.loop = true;
    next.volume = 0; // start silent, fade up below
    currentTrack = track;
    musicAudio = next;

    if (!isMusicMuted()) {
        next.play().catch(() => {});
        fadeVolume(next, config.volume, CROSSFADE_MS);
    }

    // Fade the OLD track out over the same duration, then actually stop
    // it — this is what makes the two overlap instead of one just
    // vanishing and the other popping in.
    if (previous) {
        fadeVolume(previous, 0, CROSSFADE_MS, () => previous.pause());
    }
}

export function stopMusic() {
    musicAudio?.pause();
    musicAudio = null;
    currentTrack = null;
}

export function toggleMusicMute() {
    const nextMuted = !isMusicMuted();
    localStorage.setItem(MUSIC_MUTE_KEY, nextMuted ? '1' : '0');
    if (!musicAudio) return;
    if (nextMuted) musicAudio.pause();
    else musicAudio.play().catch(() => {});
}