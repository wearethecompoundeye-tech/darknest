// js/audio/sfx.ts
import { Howl } from 'howler';

let sfxEnabled = true;
let masterVolume = 0.7;
let sfxVolume = 0.7;
let musicVolume = 0.4;

const sounds: Record<string, Howl> = {};
const loopingSounds: Record<string, Howl> = {};
let bgMusic: Howl | null = null;
const activeLoops = new Set<string>();
const baseVolumes: Record<string, number> = {};

export function initAudio(): void {
  const CACHE_VERSION = Date.now();

  bgMusic = new Howl({
    src: [`/music/Background%20Theme.wav?v=${CACHE_VERSION}`],
    loop: true,
    volume: musicVolume * masterVolume,
    preload: true
  });

  const sfxDefinitions: Record<string, { src: string; volume: number; loop?: boolean }> = {
    // UI
    uiClick: { src: `/sfx/Ui%20Click%20Sound%20Effects%20Download%20SFX%20Library%20Soundsnap.mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    tomeOpen: { src: `/sfx/Serpentongue%20open.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    tomeClose: { src: `/sfx/Serpentongue%20close.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    satchelOpen: { src: `/sfx/Satchel%20Open%20SFX.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    pageTurn: { src: `/sfx/turn%20page%20serpentongue%20tab%20switch.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    equipRelic: { src: `/sfx/equip%20relic.mp3?v=${CACHE_VERSION}`, volume: 0.3 },

    // Crafting
    phialBoiling: { src: `/sfx/Phial%20Boiling.mp3?v=${CACHE_VERSION}`, volume: 0.35, loop: true },
    grinding: { src: `/sfx/While%20Grinding.mp3?v=${CACHE_VERSION}`, volume: 0.3, loop: true },
    powderSuccess: { src: `/sfx/powder%20success.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    phialSuccess: { src: `/sfx/phial%20success.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    phialFail: { src: `/sfx/phial%20fail.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    craftFail: { src: `/sfx/fail%20effect.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    craftRestoreDraught: { src: `/sfx/craft%20restore%20draught.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    useHealingRestore: { src: `/sfx/use%20healing%20restore.mp3?v=${CACHE_VERSION}`, volume: 0.35 },

    // Circle Tracing
    circleTraceDot: { src: `/sfx/circle%20trace%20dot%20connect.mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    circleTraceComplete: { src: `/sfx/circle%20trace%20complete.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    circleTraceLoop: { src: `/sfx/After%20Circle%20Trace_looping_25_percent_volume.mp3?v=${CACHE_VERSION}`, volume: 0.25, loop: true },
    runeEtchSuccess: { src: `/sfx/Rune%20Etch%20Success%20SFX.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    runeEtchFail: { src: `/sfx/fail%20effect.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    learnRune: { src: `/sfx/Learn.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    runeReveal: { src: `/sfx/rune%20minigame%20rune%20reveal.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    runeClick: { src: `/sfx/rune%20minigame%20rune%20click.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    runeApply: { src: `/sfx/rune%20apply%20to%20circle.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    runeTetherAmbient: { src: `/sfx/rune%20tether%20line%20ambient%20sound.mp3?v=${CACHE_VERSION}`, volume: 0.15, loop: true },

    // Summoning
    summonSuccess: { src: `/sfx/Ons%20Summon%20Demon%20Laugh.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    summonFail: { src: `/sfx/summon%20fail.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    demonSummonBg: { src: `/sfx/Demon%20Modal%20Background%20Ambient.mp3?v=${CACHE_VERSION}`, volume: 0.25, loop: true },
    captureDemon: { src: `/sfx/capture%20demon.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    releaseDemon: { src: `/sfx/Release%20Demon.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    destroyDemon: { src: `/sfx/Destroy%20Demon.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    destroyDemonAlt: { src: `/sfx/additional%20destroy%20effect.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    deathSound: { src: `/sfx/death%20sound%20for%20destroyed%20demon.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    banishDemon: { src: `/sfx/BanishV2.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    demonFailReaction: { src: `/sfx/demon%20fail%20action%20reaction.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    bargainSecret: { src: `/sfx/On%20Secret%20Reveal%20Demon%20Whisper.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    intimidate: { src: `/sfx/intimidate.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    bloodInfuse: { src: `/sfx/Blood%20Infuse.mp3?v=${CACHE_VERSION}`, volume: 0.4 },

    // Maze
    Maze_Send: { src: `/sfx/Maze_Send.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    Path_Select: { src: `/sfx/Path_Select.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    Ward_Trigger: { src: `/sfx/Ward_Trigger.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    Trap_Trigger: { src: `/sfx/Trap_Trigger.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    Fragment_Get: { src: `/sfx/Fragment_Get.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    Maze_Banish: { src: `/sfx/Maze_Banish.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    mazeExit: { src: `/sfx/maze%20exit.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    openMaze: { src: `/sfx/open%20maze.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    mazeDoorOpen: { src: `/sfx/maze%20door%20open%20alt.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    Loot_Reveal: { src: `/sfx/Loot_Reveal.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    tile_reveal: { src: `/sfx/tile_reveal.mp3?v=${CACHE_VERSION}`, volume: 0.2 },
    trap_spring: { src: `/sfx/trap_spring.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    echo_found: { src: `/sfx/echo_found.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    hollow_lair_discover: { src: `/sfx/hollow_lair_discover.mp3?v=${CACHE_VERSION}`, volume: 0.5 },

    // Orbex
    Orbex_Feed: { src: `/sfx/Orbex_Feed.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    Corruption_Rise: { src: `/sfx/Corruption_Rise.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    Fragment_Reunite: { src: `/sfx/Fragment_Reunite.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    Boon_Unlock: { src: `/sfx/Boon_Unlock.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    DemonModal_Open: { src: `/sfx/DemonModal_Open.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    Name_Fragment: { src: `/sfx/Name_Fragment.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    True_Name_Complete: { src: `/sfx/True_Name_Complete.mp3?v=${CACHE_VERSION}`, volume: 0.6 },

    // Whisp
    wispForage: { src: `/sfx/wisp%20forage.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    petWisp: { src: `/sfx/pet%20wisp.mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    wispLevelUp: { src: `/sfx/wisp%20level%20up_20%20percent%20volume.mp3?v=${CACHE_VERSION}`, volume: 0.2 },
    payTithe: { src: `/sfx/Pay%20Tithe.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    healthDrop: { src: `/sfx/health%20drop.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    newDayAlarm: { src: `/sfx/new%20day%20alarm.mp3?v=${CACHE_VERSION}`, volume: 0.4 },

    // Game states
    gameWin: { src: `/sfx/game%20winner%20fanfare.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    gameOver: { src: `/sfx/Game%20Fail%20Death.mp3?v=${CACHE_VERSION}`, volume: 0.55 },
    suspicionRise: { src: `/sfx/When%20suspicion%20rises%2C%20bring%20this%20bed%20in%20gradually%20under%20background.mp3?v=${CACHE_VERSION}`, volume: 0.2, loop: true },
    demonWrathAmbience: { src: `/sfx/SFX_bed_ambience_When_Demons%20are%20angry.mp3?v=${CACHE_VERSION}`, volume: 0.2, loop: true },
    corruptionAmbience: { src: `/sfx/Corruption_Rise.mp3?v=${CACHE_VERSION}`, volume: 0.15, loop: true },
    caveDrips: { src: `/sfx/Cave%20Drips%20SFX%20background%20to%20bring%20in%20randomly%20at%2015%20percent%20volule.mp3?v=${CACHE_VERSION}`, volume: 0.15 },

    splashMusic: { src: `/sfx/Splash%20screen.mp3?v=${CACHE_VERSION}`, volume: 0.4, loop: true }
  };

  Object.entries(sfxDefinitions).forEach(([key, def]) => {
    baseVolumes[key] = def.volume;
    sounds[key] = new Howl({
      src: [def.src],
      volume: def.volume * sfxVolume * masterVolume,
      loop: def.loop || false,
      preload: true,
      onloaderror: () => console.warn(`SFX ${key} failed to load`)
    });
    if (def.loop) loopingSounds[key] = sounds[key];
  });

  if (bgMusic) bgMusic.play();
}

export function playSfx(key: string, volumeMultiplier: number = 1.0): void {
  if (!sfxEnabled || !sounds[key]) return;
  const sound = sounds[key];
  const baseVol = baseVolumes[key] || 0.5;
  sound.volume(baseVol * sfxVolume * masterVolume * volumeMultiplier);
  sound.play();
}

export function stopSfx(key: string): void {
  if (sounds[key]) sounds[key].stop();
}

export function startLoop(key: string): void {
  if (!sfxEnabled || !loopingSounds[key]) return;
  const sound = loopingSounds[key];
  if (!sound.playing()) {
    sound.play();
    activeLoops.add(key);
  }
}

export function stopLoop(key: string): void {
  if (loopingSounds[key]) {
    loopingSounds[key].stop();
    activeLoops.delete(key);
  }
}

export function stopAllLoops(): void {
  activeLoops.forEach(key => {
    if (loopingSounds[key]) loopingSounds[key].stop();
  });
  activeLoops.clear();
}

export function fadeInLoop(key: string, duration: number = 2000): void {
  if (!sfxEnabled || !loopingSounds[key]) return;
  const sound = loopingSounds[key];
  sound.volume(0);
  sound.play();
  sound.fade(0, baseVolumes[key] * sfxVolume * masterVolume, duration);
  activeLoops.add(key);
}

export function fadeOutLoop(key: string, duration: number = 2000): void {
  if (loopingSounds[key]) {
    loopingSounds[key].fade(loopingSounds[key].volume(), 0, duration);
    setTimeout(() => {
      loopingSounds[key].stop();
      activeLoops.delete(key);
    }, duration);
  }
}

export function toggleSfx(enabled: boolean): void {
  sfxEnabled = enabled;
  if (!enabled) {
    stopAllLoops();
    Object.values(sounds).forEach(s => s.stop());
  }
}

export function updateVolumes(master: number, sfx: number, music: number): void {
  masterVolume = master;
  sfxVolume = sfx;
  musicVolume = music;

  Object.keys(sounds).forEach(key => {
    const sound = sounds[key];
    const baseVol = baseVolumes[key] || 0.5;
    sound.volume(baseVol * sfxVolume * masterVolume);
  });

  if (bgMusic) {
    bgMusic.volume(musicVolume * masterVolume);
  }
}

export function toggleMusic(enabled: boolean): void {
  if (bgMusic) {
    if (enabled) bgMusic.play();
    else bgMusic.pause();
  }
}

export function getSound(key: string): Howl | undefined {
  return sounds[key];
}

let dripInterval: number | null = null;
export function startCaveDrips(): void {
  if (dripInterval) clearInterval(dripInterval);
  dripInterval = window.setInterval(() => {
    if (sfxEnabled && Math.random() < 0.3) {
      playSfx('caveDrips', 0.8 + Math.random() * 0.4);
    }
  }, 20000);
}

export function stopCaveDrips(): void {
  if (dripInterval) {
    clearInterval(dripInterval);
    dripInterval = null;
  }
}

// Initialize audio on first user interaction
document.addEventListener('DOMContentLoaded', () => {
  const startAudio = () => {
    initAudio();
    startCaveDrips();
    document.removeEventListener('click', startAudio);
    document.removeEventListener('keydown', startAudio);
  };
  document.addEventListener('click', startAudio);
  document.addEventListener('keydown', startAudio);
});
export function stopAllAudioProcesses(): void {
  stopAllLoops();
  stopAllAmbience();
  stopCaveDrips();
}