// js/audio/spatial.ts – Spatial (stereo‑panned) audio using the existing SFX registry.
import { getSound } from './sfx.js';
import type { Howl } from 'howler';

export interface SpatialOptions {
  /** Normalized position. x: -1 (left) to 1 (right). */
  pos?: { x: number; y?: number; z?: number };
  /** Volume multiplier (0‑1). Overrides the global volume for this play. */
  volume?: number;
  /** Playback speed. */
  rate?: number;
  /** Whether to loop. */
  loop?: boolean;
}

/**
 * Play a registered SFX with stereo panning derived from pos.x.
 * The pan is applied globally to the sound instance – acceptable for one‑shot effects.
 *
 * @param key     SFX identifier (must exist in sfx.ts).
 * @param options Spatial configuration.
 * @returns The Howl instance, or undefined if the key is not found.
 */
export function playSpatialSfx(key: string, options: SpatialOptions = {}): Howl | undefined {
  const sound = getSound(key);
  if (!sound) {
    console.warn(`[spatial] Sound "${key}" not found.`);
    return undefined;
  }

  // Set stereo pan (–1 to 1) from x‑coordinate.
  const pan = options.pos ? Math.max(-1, Math.min(1, options.pos.x)) : 0;
  sound.stereo(pan);

  if (options.rate !== undefined) sound.rate(options.rate);
  if (options.loop !== undefined) sound.loop(options.loop);

  // Use explicit volume only if provided; otherwise keep the global volume.
  if (options.volume !== undefined) {
    sound.volume(options.volume);
  }

  sound.play();
  return sound;
}