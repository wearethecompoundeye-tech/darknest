// js/audio/sfx.ts – Complete SFX registry with pool support.
// Now includes pool helpers previously in sfx-pools.ts.
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
    src: [`${import.meta.env.BASE_URL}music/Background%20Theme.wav?v=${CACHE_VERSION}`],
    loop: true,
    volume: musicVolume * masterVolume,
    preload: true
  });

  const sfxDefinitions: Record<string, { src: string; volume: number; loop?: boolean }> = {
    // ── UI ──
    uiClick: { src: `${import.meta.env.BASE_URL}sfx/Ui%20Click%20Sound%20Effects%20Download%20SFX%20Library%20Soundsnap.mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    uiClickAlt: { src: `${import.meta.env.BASE_URL}sfx/Ui%20Click%20Sound%20Effects%20Download%20SFX%20Library%20Soundsnap(1).mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    tomeOpen: { src: `${import.meta.env.BASE_URL}sfx/Serpentongue%20open.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    tomeClose: { src: `${import.meta.env.BASE_URL}sfx/Serpentongue%20close.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    satchelOpen: { src: `${import.meta.env.BASE_URL}sfx/Satchel%20Open%20SFX.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    pageTurn: { src: `${import.meta.env.BASE_URL}sfx/turn%20page%20serpentongue%20tab%20switch.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    equipRelic: { src: `${import.meta.env.BASE_URL}sfx/equip%20relic.mp3?v=${CACHE_VERSION}`, volume: 0.3 },

    // ── Crafting ──
    phialBoiling: { src: `${import.meta.env.BASE_URL}sfx/Phial%20Boiling.mp3?v=${CACHE_VERSION}`, volume: 0.35, loop: true },
    grinding: { src: `${import.meta.env.BASE_URL}sfx/While%20Grinding.mp3?v=${CACHE_VERSION}`, volume: 0.3, loop: true },
    powderSuccess: { src: `${import.meta.env.BASE_URL}sfx/powder%20success.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    phialSuccess: { src: `${import.meta.env.BASE_URL}sfx/phial%20success.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    phialFail: { src: `${import.meta.env.BASE_URL}sfx/phial%20fail.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    craftFail: { src: `${import.meta.env.BASE_URL}sfx/fail%20effect.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    craftRestoreDraught: { src: `${import.meta.env.BASE_URL}sfx/craft%20restore%20draught.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    useHealingRestore: { src: `${import.meta.env.BASE_URL}sfx/use%20healing%20restore.mp3?v=${CACHE_VERSION}`, volume: 0.35 },

    // ── Circle Tracing ──
    circleTraceDot: { src: `${import.meta.env.BASE_URL}sfx/circle%20trace%20dot%20connect.mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    circleTraceComplete: { src: `${import.meta.env.BASE_URL}sfx/circle%20trace%20complete.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    circleTraceLoop: { src: `${import.meta.env.BASE_URL}sfx/After%20Circle%20Trace_looping_25_percent_volume.mp3?v=${CACHE_VERSION}`, volume: 0.25, loop: true },
    runeEtchSuccess: { src: `${import.meta.env.BASE_URL}sfx/Rune%20Etch%20Success%20SFX.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    runeEtchFail: { src: `${import.meta.env.BASE_URL}sfx/fail%20effect.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    learnRune: { src: `${import.meta.env.BASE_URL}sfx/Learn.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    runeReveal: { src: `${import.meta.env.BASE_URL}sfx/rune%20minigame%20rune%20reveal.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    runeClick: { src: `${import.meta.env.BASE_URL}sfx/rune%20minigame%20rune%20click.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    runeApply: { src: `${import.meta.env.BASE_URL}sfx/rune%20apply%20to%20circle.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    runeTetherAmbient: { src: `${import.meta.env.BASE_URL}sfx/rune%20tether%20line%20ambient%20sound.mp3?v=${CACHE_VERSION}`, volume: 0.15, loop: true },

    // ── Summoning ──
    summonSuccess: { src: `${import.meta.env.BASE_URL}sfx/Ons%20Summon%20Demon%20Laugh.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    summonFail: { src: `${import.meta.env.BASE_URL}sfx/summon%20fail.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    demonSummonBg: { src: `${import.meta.env.BASE_URL}sfx/Demon%20Modal%20Background%20Ambient.mp3?v=${CACHE_VERSION}`, volume: 0.25, loop: true },
    captureDemon: { src: `${import.meta.env.BASE_URL}sfx/capture%20demon.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    releaseDemon: { src: `${import.meta.env.BASE_URL}sfx/Release%20Demon.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    destroyDemon: { src: `${import.meta.env.BASE_URL}sfx/Destroy%20Demon.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    destroyDemonAlt: { src: `${import.meta.env.BASE_URL}sfx/additional%20destroy%20effect.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    deathSound: { src: `${import.meta.env.BASE_URL}sfx/death%20sound%20for%20destroyed%20demon.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    banishDemon: { src: `${import.meta.env.BASE_URL}sfx/BanishV2.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    demonFailReaction: { src: `${import.meta.env.BASE_URL}sfx/demon%20fail%20action%20reaction.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    bargainSecret: { src: `${import.meta.env.BASE_URL}sfx/On%20Secret%20Reveal%20Demon%20Whisper.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    intimidate: { src: `${import.meta.env.BASE_URL}sfx/intimidate.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    bloodInfuse: { src: `${import.meta.env.BASE_URL}sfx/Blood%20Infuse.mp3?v=${CACHE_VERSION}`, volume: 0.4 },

    // ── Maze ──
    Maze_Send: { src: `${import.meta.env.BASE_URL}sfx/Maze_Send.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    Path_Select: { src: `${import.meta.env.BASE_URL}sfx/Path_Select.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    Ward_Trigger: { src: `${import.meta.env.BASE_URL}sfx/Ward_Trigger.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    Trap_Trigger: { src: `${import.meta.env.BASE_URL}sfx/Trap_Trigger.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    Fragment_Get: { src: `${import.meta.env.BASE_URL}sfx/Fragment_Get.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    Maze_Banish: { src: `${import.meta.env.BASE_URL}sfx/Maze_Banish.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    mazeExit: { src: `${import.meta.env.BASE_URL}sfx/maze%20exit.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    openMaze: { src: `${import.meta.env.BASE_URL}sfx/open%20maze.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    mazeDoorOpen: { src: `${import.meta.env.BASE_URL}sfx/maze%20door%20open%20alt.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    Loot_Reveal: { src: `${import.meta.env.BASE_URL}sfx/Loot_Reveal.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    tile_reveal: { src: `${import.meta.env.BASE_URL}sfx/tile_reveal.mp3?v=${CACHE_VERSION}`, volume: 0.2 },
    trap_spring: { src: `${import.meta.env.BASE_URL}sfx/trap_spring.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    echo_found: { src: `${import.meta.env.BASE_URL}sfx/echo_found.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    hollow_lair_discover: { src: `${import.meta.env.BASE_URL}sfx/hollow_lair_discover.mp3?v=${CACHE_VERSION}`, volume: 0.5 },

    // ── Orbex ──
    Orbex_Feed: { src: `${import.meta.env.BASE_URL}sfx/Orbex_Feed.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    Corruption_Rise: { src: `${import.meta.env.BASE_URL}sfx/Corruption_Rise.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    Fragment_Reunite: { src: `${import.meta.env.BASE_URL}sfx/Fragment_Reunite.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    Boon_Unlock: { src: `${import.meta.env.BASE_URL}sfx/Boon_Unlock.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    DemonModal_Open: { src: `${import.meta.env.BASE_URL}sfx/DemonModal_Open.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    Name_Fragment: { src: `${import.meta.env.BASE_URL}sfx/Name_Fragment.mp3?v=${CACHE_VERSION}`, volume: 0.45 },
    True_Name_Complete: { src: `${import.meta.env.BASE_URL}sfx/True_Name_Complete.mp3?v=${CACHE_VERSION}`, volume: 0.6 },

    // ── Whisp ──
    wispForage: { src: `${import.meta.env.BASE_URL}sfx/wisp%20forage.mp3?v=${CACHE_VERSION}`, volume: 0.3 },
    petWisp: { src: `${import.meta.env.BASE_URL}sfx/pet%20wisp.mp3?v=${CACHE_VERSION}`, volume: 0.25 },
    wispLevelUp: { src: `${import.meta.env.BASE_URL}sfx/wisp%20level%20up_20%20percent%20volume.mp3?v=${CACHE_VERSION}`, volume: 0.2 },
    payTithe: { src: `${import.meta.env.BASE_URL}sfx/Pay%20Tithe.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    healthDrop: { src: `${import.meta.env.BASE_URL}sfx/health%20drop.mp3?v=${CACHE_VERSION}`, volume: 0.35 },
    newDayAlarm: { src: `${import.meta.env.BASE_URL}sfx/new%20day%20alarm.mp3?v=${CACHE_VERSION}`, volume: 0.4 },

    // ── Game states ──
    gameWin: { src: `${import.meta.env.BASE_URL}sfx/game%20winner%20fanfare.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    gameOver: { src: `${import.meta.env.BASE_URL}sfx/Game%20Fail%20Death.mp3?v=${CACHE_VERSION}`, volume: 0.55 },
    suspicionRise: { src: `${import.meta.env.BASE_URL}sfx/When%20suspicion%20rises%2C%20bring%20this%20bed%20in%20gradually%20under%20background.mp3?v=${CACHE_VERSION}`, volume: 0.2, loop: true },
    demonWrathAmbience: { src: `${import.meta.env.BASE_URL}sfx/SFX_bed_ambience_When_Demons%20are%20angry.mp3?v=${CACHE_VERSION}`, volume: 0.2, loop: true },
    corruptionAmbience: { src: `${import.meta.env.BASE_URL}sfx/Corruption_Rise.mp3?v=${CACHE_VERSION}`, volume: 0.15, loop: true },
    caveDrips: { src: `${import.meta.env.BASE_URL}sfx/Cave%20Drips%20SFX%20background%20to%20bring%20in%20randomly%20at%2015%20percent%20volule.mp3?v=${CACHE_VERSION}`, volume: 0.15 },
    splashMusic: { src: `${import.meta.env.BASE_URL}sfx/Splash%20screen.mp3?v=${CACHE_VERSION}`, volume: 0.4, loop: true },

    // ── Battle Clash sequence ──
    enemy_card_reveal:   { src: `${import.meta.env.BASE_URL}sfx/enemy card reveal.mp3?v=${CACHE_VERSION}`,   volume: 0.5 },
    enemy_card_flip:     { src: `${import.meta.env.BASE_URL}sfx/enemy card flip in.mp3?v=${CACHE_VERSION}`,   volume: 0.4 },
    player_card_reveal:  { src: `${import.meta.env.BASE_URL}sfx/player card reveal hit.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    player_card_flip:    { src: `${import.meta.env.BASE_URL}sfx/player card flip in.mp3?v=${CACHE_VERSION}`,   volume: 0.4 },
    card_battle_music_bed: { src: `${import.meta.env.BASE_URL}sfx/card battle music bed.mp3?v=${CACHE_VERSION}`, volume: 0.5, loop: true },
    battle_start_horn:   { src: `${import.meta.env.BASE_URL}sfx/Battle start horn.mp3?v=${CACHE_VERSION}`,    volume: 0.6 },
    clash_impact:        { src: `${import.meta.env.BASE_URL}sfx/clash impact.mp3?v=${CACHE_VERSION}`,          volume: 0.7 },
    screen_shake:        { src: `${import.meta.env.BASE_URL}sfx/screen shake.mp3?v=${CACHE_VERSION}`,          volume: 0.5 },
    card_hit_damage:     { src: `${import.meta.env.BASE_URL}sfx/card hit damage.mp3?v=${CACHE_VERSION}`,       volume: 0.4 },
    card_hover_drone:    { src: `${import.meta.env.BASE_URL}sfx/card hover drone.mp3?v=${CACHE_VERSION}`,      volume: 0.15, loop: true },
    defeat_music:        { src: `${import.meta.env.BASE_URL}sfx/shatter defeat.mp3?v=${CACHE_VERSION}`,        volume: 0.55 },
    victory_music:       { src: `${import.meta.env.BASE_URL}sfx/victory 10 seconds.mp3?v=${CACHE_VERSION}`,   volume: 0.6 },
    particle_common:     { src: `${import.meta.env.BASE_URL}sfx/common particle.mp3?v=${CACHE_VERSION}`,       volume: 0.3 },
    particle_uncommon:   { src: `${import.meta.env.BASE_URL}sfx/uncommon particle.mp3?v=${CACHE_VERSION}`,     volume: 0.35 },
    particle_rare:       { src: `${import.meta.env.BASE_URL}sfx/rare particle.mp3?v=${CACHE_VERSION}`,         volume: 0.4 },
    particle_epic:       { src: `${import.meta.env.BASE_URL}sfx/epic particle burst.mp3?v=${CACHE_VERSION}`,  volume: 0.5 },
    particle_legendary:  { src: `${import.meta.env.BASE_URL}sfx/legendary particle reveal.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    cards_landing_in_place: { src: `${import.meta.env.BASE_URL}sfx/cards landing in place for battle.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    attack_swing:        { src: `${import.meta.env.BASE_URL}sfx/attack swing.mp3?v=${CACHE_VERSION}`,          volume: 0.45 },
    finishing_move_heavy_attack: { src: `${import.meta.env.BASE_URL}sfx/finishing move heavy attack.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    light_attack:        { src: `${import.meta.env.BASE_URL}sfx/light attack.mp3?v=${CACHE_VERSION}`,          volume: 0.4 },
    high_impact_hit:     { src: `${import.meta.env.BASE_URL}sfx/high impact hit.mp3?v=${CACHE_VERSION}`,       volume: 0.5 },
    light_impact_hit:    { src: `${import.meta.env.BASE_URL}sfx/light impact hit.mp3?v=${CACHE_VERSION}`,      volume: 0.4 },
    light_impact_hit_v2: { src: `${import.meta.env.BASE_URL}sfx/light impact hit v2.mp3?v=${CACHE_VERSION}`,   volume: 0.4 },
    hard_impact_critical_bone_crush: { src: `${import.meta.env.BASE_URL}sfx/hard impact critical bone crush.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    spell_impact:        { src: `${import.meta.env.BASE_URL}sfx/spell impact.mp3?v=${CACHE_VERSION}`,          volume: 0.5 },
    tiny_ice_hit:        { src: `${import.meta.env.BASE_URL}sfx/tiny ice hit.mp3?v=${CACHE_VERSION}`,          volume: 0.35 },
    light_earth_spell_damage: { src: `${import.meta.env.BASE_URL}sfx/light earth spell damage.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    heavy_defeat_message_hit: { src: `${import.meta.env.BASE_URL}sfx/heavy defeat message hit.mp3?v=${CACHE_VERSION}`, volume: 0.55 },
    ice_spell:           { src: `${import.meta.env.BASE_URL}sfx/ice spell.mp3?v=${CACHE_VERSION}`,             volume: 0.45 },
    failed_spell_hit:    { src: `${import.meta.env.BASE_URL}sfx/failed spell hit.mp3?v=${CACHE_VERSION}`,      volume: 0.4 },
    void_spell:          { src: `${import.meta.env.BASE_URL}sfx/void spell.mp3?v=${CACHE_VERSION}`,            volume: 0.5 },
    rife_spell:          { src: `${import.meta.env.BASE_URL}sfx/rife spell.mp3?v=${CACHE_VERSION}`,            volume: 0.5 },
    kalgoth_defeats_you: { src: `${import.meta.env.BASE_URL}sfx/Kalgoth defeats you.mp3?v=${CACHE_VERSION}`,  volume: 0.6 },
    victory_hit_message_particle_burst: { src: `${import.meta.env.BASE_URL}sfx/vicrory hit message particle burst.mp3?v=${CACHE_VERSION}`, volume: 0.6 },
    card_attack_heavy_slash: { src: `${import.meta.env.BASE_URL}sfx/card attack heavy slash.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    defeat:              { src: `${import.meta.env.BASE_URL}sfx/defeat.mp3?v=${CACHE_VERSION}`,                volume: 0.5 },
    victory_10_seconds:  { src: `${import.meta.env.BASE_URL}sfx/victory 10 seconds.mp3?v=${CACHE_VERSION}`,   volume: 0.6 },

    // Duell / Choice
    duel_start: { src: `${import.meta.env.BASE_URL}sfx/duel_start.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    duel_success: { src: `${import.meta.env.BASE_URL}sfx/duel_success.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    duel_fail: { src: `${import.meta.env.BASE_URL}sfx/duel_fail.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    card_play: { src: `${import.meta.env.BASE_URL}sfx/card_play.mp3?v=${CACHE_VERSION}`, volume: 0.4 },
    card_draw: { src: `${import.meta.env.BASE_URL}sfx/card_draw.mp3?v=${CACHE_VERSION}`, volume: 0.3 },

    // ── Gaze Ward SFX ──
    wardObliteration: { src: `${import.meta.env.BASE_URL}sfx/wardObliteration.mp3?v=${CACHE_VERSION}`, volume: 0.5 },
    wardSubjugation:   { src: `${import.meta.env.BASE_URL}sfx/wardSubjugation.mp3?v=${CACHE_VERSION}`,   volume: 0.5 },
    wardSublimation:   { src: `${import.meta.env.BASE_URL}sfx/wardSublimation.mp3?v=${CACHE_VERSION}`,   volume: 0.5 },
    wardShatter:       { src: `${import.meta.env.BASE_URL}sfx/wardShatter.mp3?v=${CACHE_VERSION}`,       volume: 0.6 },
    fracture:          { src: `${import.meta.env.BASE_URL}sfx/fracture.mp3?v=${CACHE_VERSION}`,          volume: 0.4 },
    zelion_scream:     { src: `${import.meta.env.BASE_URL}sfx/zelion_scream.mp3?v=${CACHE_VERSION}`,     volume: 0.5 },
  };

  // Create all Howl instances
  Object.entries(sfxDefinitions).forEach(([key, def]) => {
    baseVolumes[key] = def.volume;
    const sound = new Howl({
      src: [def.src],
      volume: def.volume * sfxVolume * masterVolume,
      loop: def.loop || false,
      preload: true,
      onload: () => { /* loaded */ },
      onloaderror: (_id: number, err: unknown) => {
        console.warn(`SFX ${key} failed to load: ${err}`);
      }
    });
    sounds[key] = sound;
    if (def.loop) loopingSounds[key] = sound;
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
    sound.volume(baseVolumes[key] * sfxVolume * masterVolume);
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
  const targetVol = baseVolumes[key] * sfxVolume * masterVolume;
  sound.volume(0);
  sound.play();
  activeLoops.add(key);
  sound.fade(0, targetVol, duration);
}

export function fadeOutLoop(key: string, duration: number = 2000): void {
  if (loopingSounds[key]) {
    const sound = loopingSounds[key];
    sound.fade(sound.volume(), 0, duration);
    setTimeout(() => {
      sound.stop();
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

// ── Cave Drips (random interval) ──
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

export function stopAllAudioProcesses(): void {
  stopAllLoops();
  stopCaveDrips();
}

// ═══════════════════════════════════════════════════════════════
// Pool helpers (previously in sfx-pools.ts)
// ═══════════════════════════════════════════════════════════════
const POOLS: Record<string, string[]> = {
  attack_hit: ['light_impact_hit', 'light_impact_hit_v2', 'percussive_hit'],
  heavy_hit: ['high_impact_hit', 'hard_impact_critical_bone_crush', 'card_attack_heavy_slash'],
  critical_hit: ['finishing_move_heavy_attack', 'hard_impact_critical_bone_crush'],
  spell_impact: ['spell_impact', 'rife_spell', 'void_spell', 'light_earth_spell_damage', 'ice_spell'],
  summon_fail: ['summon_fail', 'demon_fail_action_reaction'],
  victory_fanfare: ['victory_10_seconds', 'game_winner_fanfare'],
  clash_card_reveal: ['enemy_card_reveal', 'player_card_reveal'],
  clash_landing: ['cards_landing_in_place'],
  ui_click: ['uiClick', 'uiClickAlt'],
  tome_open: ['tomeOpen'],
  tome_close: ['tomeClose'],
  satchel_open: ['satchelOpen'],
  page_turn: ['pageTurn'],
  craft_phial_success: ['phialSuccess'],
  craft_powder_success: ['powderSuccess'],
  craft_fail: ['craftFail'],
  craft_restore: ['craftRestoreDraught'],
  maze_send: ['Maze_Send'],
  path_select: ['Path_Select'],
  ward_trigger: ['Ward_Trigger'],
  trap_trigger: ['Trap_Trigger'],
  fragment_get: ['Fragment_Get'],
  loot_reveal: ['Loot_Reveal'],
  wisp_forage: ['wispForage'],
  wisp_pet: ['petWisp'],
  wisp_levelup: ['wispLevelUp'],
  cave_drips: ['caveDrips'],
  suspicion_rise: ['suspicionRise'],
  demon_wrath: ['demonWrathAmbience'],
  corruption_ambience: ['corruptionAmbience'],
  battle_music_bed: ['card_battle_music_bed'],
};

export function playPool(poolKey: string, volumeMultiplier = 1.0): void {
  const pool = POOLS[poolKey];
  if (!pool) {
    console.warn(`SFX pool "${poolKey}" not found.`);
    return;
  }
  const sfxKey = pool[Math.floor(Math.random() * pool.length)];
  playSfx(sfxKey, volumeMultiplier);
}

export function startPoolLoop(poolKey: string): void {
  const pool = POOLS[poolKey];
  if (!pool) {
    console.warn(`SFX pool "${poolKey}" not found.`);
    return;
  }
  const sfxKey = pool[Math.floor(Math.random() * pool.length)];
  startLoop(sfxKey);
}

export function stopPoolLoop(poolKey: string): void {
  const pool = POOLS[poolKey];
  if (!pool) return;
  for (const key of pool) {
    stopLoop(key);
  }
}

export function stopAllPools(): void {
  stopAllLoops();
}