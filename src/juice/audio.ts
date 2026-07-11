import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { usePrefs } from '@/ui/prefs';

/**
 * The single audio gateway (mirrors the `haptics` module's role). Screens and
 * juice layers NEVER touch expo-audio directly — they name a music bed or an
 * SFX cue and this module owns player lifecycles, crossfades, and the mute
 * gates.
 *
 * Two channels, two prefs:
 *   • MUSIC — one looping bed at a time (`title` / `main` / `rentWeek`), gated
 *     by `usePrefs().musicEnabled`. Switching beds crossfades so the golden-hour
 *     loop and the rent-week variant trade places without a hard cut.
 *   • SFX — the one-shot cascade payout sting + combo-discovery jingle, gated by
 *     `sfxEnabled`. These are melodic flourishes but are wanted even with the
 *     music bed off (human call, 2026-07-11), so they ride the SFX toggle only.
 *
 * Autoplay reality (web + iOS): the very first `play()` can be blocked until a
 * user gesture. Every screen re-asserts its bed on focus, and the title screen
 * calls `primeAudio()` from its buttons, so the bed starts on the first tap at
 * the latest. All playback is fire-and-forget and wrapped so audio can never
 * throw into the UI.
 */

export type MusicTrack = 'title' | 'main' | 'rentWeek';

const MUSIC_SOURCES: Record<MusicTrack, number> = {
  title: require('../../assets/audio/title.mp3'),
  main: require('../../assets/audio/main.mp3'),
  rentWeek: require('../../assets/audio/rent-week.mp3'),
};

const CASCADE_STING_SOURCE = require('../../assets/audio/cascade.mp3');

// B-M11 combo-discovery jingle. PLACEHOLDER SOURCE: a dedicated "warm
// recognition" jingle asset is a deferred audio dependency — until it lands this
// points at the cascade sting so the gateway/prefs wiring is real and the bundle
// stays intact. Swap this one constant for `discovery.mp3` when the asset ships
// (see the B-M11 review packet's deferred gates).
const DISCOVERY_JINGLE_SOURCE = require('../../assets/audio/cascade.mp3');

// Beds sit under the UI; the sting is a reward and rides a touch louder.
const MUSIC_VOLUME = 0.55;
const STING_VOLUME = 0.85;
const FADE_MS = 650;
const FADE_STEP_MS = 40;

const musicPlayers: Partial<Record<MusicTrack, AudioPlayer>> = {};
const fadeTimers = new Map<AudioPlayer, ReturnType<typeof setInterval>>();
let stingPlayer: AudioPlayer | null = null;
let discoveryPlayer: AudioPlayer | null = null;

// The discovery jingle sits a touch under the payout sting — recognition, not a
// jackpot (B-M6 anti-casino identity).
const DISCOVERY_VOLUME = 0.7;

let currentTrack: MusicTrack | null = null;
let audioModeConfigured = false;
let prefsSubscribed = false;

function noop(): void {}

/**
 * Play music even when the hardware silent switch is on: the user opted into a
 * music-forward cozy game and has an in-app mute. Called once, lazily, so we
 * never touch the audio session until the game actually wants sound.
 */
function ensureAudioMode(): void {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  void setAudioModeAsync({ playsInSilentMode: true }).catch(noop);
}

function ensureMusicPlayer(track: MusicTrack): AudioPlayer {
  let player = musicPlayers[track];
  if (!player) {
    player = createAudioPlayer(MUSIC_SOURCES[track]);
    player.loop = true;
    player.volume = 0;
    musicPlayers[track] = player;
  }
  return player;
}

/** Cancel any in-flight fade on a player before starting a new one. */
function clearFade(player: AudioPlayer): void {
  const timer = fadeTimers.get(player);
  if (timer) {
    clearInterval(timer);
    fadeTimers.delete(player);
  }
}

/** Linear volume ramp; `onDone` fires once the target is reached. */
function fadeTo(player: AudioPlayer, target: number, ms: number, onDone?: () => void): void {
  clearFade(player);
  const start = player.volume;
  const delta = target - start;
  if (ms <= 0 || Math.abs(delta) < 0.001) {
    try {
      player.volume = target;
    } catch {
      /* player removed mid-fade */
    }
    onDone?.();
    return;
  }
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    const t = Math.min(1, step / steps);
    try {
      player.volume = start + delta * t;
    } catch {
      clearFade(player);
      return;
    }
    if (t >= 1) {
      clearFade(player);
      onDone?.();
    }
  }, FADE_STEP_MS);
  fadeTimers.set(player, timer);
}

function subscribeToPrefs(): void {
  if (prefsSubscribed) return;
  prefsSubscribed = true;
  let lastMusicEnabled = usePrefs.getState().musicEnabled;
  usePrefs.subscribe((state) => {
    if (state.musicEnabled === lastMusicEnabled) return;
    lastMusicEnabled = state.musicEnabled;
    if (state.musicEnabled) {
      resumeCurrentBed();
    } else {
      pauseAllBeds();
    }
  });
}

function resumeCurrentBed(): void {
  if (!currentTrack) return;
  const player = ensureMusicPlayer(currentTrack);
  try {
    player.play();
  } catch {
    /* autoplay-gated; a later gesture re-asserts */
  }
  fadeTo(player, MUSIC_VOLUME, FADE_MS);
}

function pauseAllBeds(): void {
  for (const player of Object.values(musicPlayers)) {
    if (!player) continue;
    fadeTo(player, 0, FADE_MS, () => {
      try {
        player.pause();
      } catch {
        /* removed */
      }
    });
  }
}

/**
 * Switch the looping background bed, crossfading from whatever is playing. Pass
 * `null` to fade the music out entirely. Idempotent: re-asserting the current
 * track just guarantees it is playing (used on screen focus for autoplay).
 */
export function setMusicTrack(track: MusicTrack | null): void {
  ensureAudioMode();
  subscribeToPrefs();

  if (track === currentTrack) {
    // Same bed: make sure it is actually running (autoplay recovery).
    if (track && usePrefs.getState().musicEnabled) resumeCurrentBed();
    return;
  }

  const previous = currentTrack;
  currentTrack = track;

  if (previous) {
    const prevPlayer = musicPlayers[previous];
    if (prevPlayer) {
      fadeTo(prevPlayer, 0, FADE_MS, () => {
        try {
          prevPlayer.pause();
        } catch {
          /* removed */
        }
      });
    }
  }

  if (!track) return;
  if (!usePrefs.getState().musicEnabled) return;

  const player = ensureMusicPlayer(track);
  try {
    player.volume = 0;
    player.play();
  } catch {
    /* autoplay-gated; primeAudio()/next focus re-asserts */
  }
  fadeTo(player, MUSIC_VOLUME, FADE_MS);
}

/**
 * Nudge the current bed after a user gesture — the reliable moment to satisfy
 * browser/iOS autoplay policy. Safe to call from any button handler.
 */
export function primeAudio(): void {
  ensureAudioMode();
  if (usePrefs.getState().musicEnabled) resumeCurrentBed();
}

function ensureStingPlayer(): AudioPlayer {
  if (!stingPlayer) {
    stingPlayer = createAudioPlayer(CASCADE_STING_SOURCE);
    stingPlayer.volume = STING_VOLUME;
  }
  return stingPlayer;
}

/** One-shot cascade payout flourish. Gated by `sfxEnabled` only — the melodic
 *  combo stings are a wanted reward even with the music bed off (human call,
 *  2026-07-11): the "Sound effects" toggle is their control. */
export function playCascadeSting(): void {
  ensureAudioMode();
  if (!usePrefs.getState().sfxEnabled) return;
  const player = ensureStingPlayer();
  player.volume = STING_VOLUME;
  // Rewind then play so back-to-back cascades always hear the full flourish.
  void player
    .seekTo(0)
    .catch(noop)
    .finally(() => {
      try {
        player.play();
      } catch {
        /* gated / removed */
      }
    });
}

function ensureDiscoveryPlayer(): AudioPlayer {
  if (!discoveryPlayer) {
    discoveryPlayer = createAudioPlayer(DISCOVERY_JINGLE_SOURCE);
    discoveryPlayer.volume = DISCOVERY_VOLUME;
  }
  return discoveryPlayer;
}

/**
 * B-M11: the one-shot combo-discovery jingle — the short warm sting on a
 * FIRST-EVER combo. Same SFX channel + `sfxEnabled` gate as the payout sting
 * (no-op when muted); its own player so a discovery and a payout can overlap.
 */
export function playDiscoveryJingle(): void {
  ensureAudioMode();
  if (!usePrefs.getState().sfxEnabled) return;
  const player = ensureDiscoveryPlayer();
  player.volume = DISCOVERY_VOLUME;
  void player
    .seekTo(0)
    .catch(noop)
    .finally(() => {
      try {
        player.play();
      } catch {
        /* gated / removed */
      }
    });
}
