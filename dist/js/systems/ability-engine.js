// js/systems/ability-engine.ts
// Complete ability handling system for card battles
// Full file - no snippets
export const abilityRegistry = {
    'Void Syphon': (ctx, isPlayer, ability) => {
        const heal = ability.value || 1;
        if (isPlayer) {
            ctx.playerHP = Math.min(ctx.playerMaxHP, ctx.playerHP + heal);
            ctx.battleLog.push(`Void Syphon heals for ${heal} HP!`);
        }
    },
    'Shadow Meld': (ctx, isPlayer, ability) => {
        if (!isPlayer)
            return;
        ctx.battleLog.push(`Shadow Meld active - traps avoided!`);
    },
    'Blink': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Blink',
                duration: 1,
                onDamageTaken: (c, dmg) => Math.random() < 0.5 ? 0 : dmg
            });
            ctx.battleLog.push(`Blink active - 50% chance to evade!`);
        }
    },
    'Void Shift': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const bonusAtk = 2;
            ctx.playerAttack += bonusAtk;
            ctx.playerEffects.push({
                name: 'Void Shift',
                duration: 1,
                onTurnEnd: (c, player) => { if (player)
                    c.playerAttack -= bonusAtk; }
            });
            ctx.battleLog.push(`Void Shift grants +${bonusAtk} ATK for this turn!`);
        }
    },
    'Entropy': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyDefense = Math.floor(ctx.enemyDefense / 2);
            ctx.enemyResistance = Math.floor(ctx.enemyResistance / 2);
            ctx.battleLog.push(`Entropy halves enemy DEF and RES!`);
        }
    },
    'Void Implosion': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const damage = 10;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - damage);
            ctx.battleLog.push(`Void Implosion deals ${damage} damage!`);
        }
    },
    'Reality Crack': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Reality Crack shatters wards and traps!`);
    },
    'Siphon': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Siphon',
                duration: 99,
                onDamageDealt: (c, dmg) => {
                    const heal = dmg;
                    c.playerHP = Math.min(c.playerMaxHP, c.playerHP + heal);
                    c.battleLog.push(`Siphon heals for ${heal} HP!`);
                    return dmg;
                }
            });
            ctx.battleLog.push(`Siphon will heal for damage dealt!`);
        }
    },
    'Searing Bite': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.enemyHP > 0) {
            const bonusDamage = 1;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - bonusDamage);
            ctx.battleLog.push(`Searing Bite deals ${bonusDamage} bonus damage!`);
        }
    },
    'Pack Hunter': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerAttack += 1;
            ctx.battleLog.push(`Pack Hunter grants +1 ATK!`);
        }
    },
    'Magma Trail': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyEffects.push({
                name: 'Burning',
                duration: 3,
                onTurnStart: (c, player) => {
                    if (!player) {
                        c.enemyHP = Math.max(0, c.enemyHP - 1);
                        c.battleLog.push(`Magma Trail burns for 1 damage!`);
                    }
                }
            });
            ctx.battleLog.push(`Magma Trail will burn the enemy for 3 turns!`);
        }
    },
    'Heat Wave': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.playerHP < ctx.playerMaxHP / 2) {
            const damage = 1;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - damage);
            ctx.battleLog.push(`Heat Wave deals ${damage} damage!`);
        }
    },
    'Flicker': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Flicker',
                duration: 99,
                onDamageTaken: (c, dmg) => Math.random() < 0.1 ? 0 : dmg
            });
        }
    },
    'Cinder Heal': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Cinder Heal',
                duration: 99,
                onTurnStart: (c, player) => {
                    if (player) {
                        c.playerHP = Math.min(c.playerMaxHP, c.playerHP + 1);
                        c.battleLog.push(`Cinder Heal restores 1 HP!`);
                    }
                }
            });
        }
    },
    'Everburning': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.battleLog.push(`Everburning grants fire immunity and +2 ATK vs Hollows!`);
        }
    },
    'Cleansing Flame': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects = [];
            ctx.battleLog.push(`Cleansing Flame removes all debuffs!`);
        }
    },
    'Unyielding': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerDefense += 1;
            ctx.battleLog.push(`Unyielding increases DEF by 1!`);
        }
    },
    'Guardian': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Guardian',
                duration: 2,
                statModifiers: { def: 1 }
            });
            ctx.playerDefense += 1;
            ctx.battleLog.push(`Guardian grants +1 DEF for 2 turns!`);
        }
    },
    'Swarm': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.battleLog.push(`Swarm bonus active!`);
        }
    },
    'Rolling Shield': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Rolling Shield',
                duration: 1,
                onDamageTaken: (c, dmg) => Math.max(0, dmg - 2)
            });
            ctx.battleLog.push(`Rolling Shield reduces next damage by 2!`);
        }
    },
    'Gemhide': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Gemhide yields extra resources!`);
    },
    'Refract': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Refract',
                duration: 99,
                onDamageTaken: (c, dmg) => Math.random() < 0.2 ? 0 : dmg
            });
        }
    },
    'Stone Tears': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyAttack = Math.max(1, ctx.enemyAttack - 1);
            ctx.battleLog.push(`Stone Tears reduce enemy ATK by 1!`);
        }
    },
    'Petrify': (ctx, isPlayer, ability) => {
        if (isPlayer && Math.random() < 0.1) {
            ctx.enemyEffects.push({
                name: 'Petrified',
                duration: 1,
                onTurnStart: (c, player) => {
                    if (!player) {
                        c.battleLog.push(`Enemy is petrified and cannot act!`);
                    }
                }
            });
            ctx.battleLog.push(`Petrify stuns the enemy!`);
        }
    },
    'Tunnel': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Tunnel allows movement through walls!`);
    },
    'Devour': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Devour',
                duration: 99,
                onDamageDealt: (c, dmg) => {
                    if (c.enemyHP <= 0) {
                        c.playerHP = Math.min(c.playerMaxHP, c.playerHP + 5);
                        c.playerAttack += 1;
                        c.battleLog.push(`Devour heals 5 HP and grants +1 ATK!`);
                    }
                    return dmg;
                }
            });
        }
    },
    'Keen Sight': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Keen Sight reveals extra tiles!`);
    },
    'Dive': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const bonusDamage = 2;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - bonusDamage);
            ctx.battleLog.push(`Dive deals ${bonusDamage} bonus damage!`);
        }
    },
    'Formless': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.battleLog.push(`Formless grants trap immunity!`);
        }
    },
    'Mist Veil': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Mist Veil',
                duration: 99,
                onDamageTaken: (c, dmg) => Math.random() < 0.5 ? Math.max(1, dmg - 1) : dmg
            });
        }
    },
    'Static Charge': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Static Charge slows wards!`);
    },
    'Chain Lightning': (ctx, isPlayer, ability) => {
        if (isPlayer && Math.random() < 0.3) {
            const chainDamage = 2;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - chainDamage);
            ctx.battleLog.push(`Chain Lightning strikes for ${chainDamage} damage!`);
        }
    },
    'Gale Force': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyAttack = Math.max(1, ctx.enemyAttack - 1);
            ctx.battleLog.push(`Gale Force reduces enemy ATK by 1!`);
        }
    },
    'Sonic Boom': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const damage = 1;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - damage);
            ctx.battleLog.push(`Sonic Boom deals ${damage} damage to all enemies!`);
        }
    },
    'Thunderous Dive': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyHP = 0;
            ctx.battleLog.push(`Thunderous Dive destroys the enemy instantly!`);
        }
    },
    'Stormcaller': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const damage = 3;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - damage);
            ctx.battleLog.push(`Stormcaller deals ${damage} damage!`);
        }
    },
    'Slippery': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Slippery',
                duration: 99,
                onDamageTaken: (c, dmg) => Math.random() < 0.2 ? 0 : dmg
            });
        }
    },
    'Tidal Pull': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Tidal Pull yields extra resources!`);
    },
    'Split': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.playerHP <= 0 && Math.random() < 0.5) {
            ctx.playerHP = 1;
            ctx.battleLog.push(`Split saves the entity with 1 HP!`);
        }
    },
    'Absorb': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Absorb heals on water tiles!`);
    },
    'Chilling Touch': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyAttack = Math.max(1, ctx.enemyAttack - 1);
            ctx.battleLog.push(`Chilling Touch reduces enemy ATK by 1!`);
        }
    },
    'Frost Armor': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.playerHP === ctx.playerMaxHP) {
            ctx.playerDefense += 1;
            ctx.battleLog.push(`Frost Armor grants +1 DEF!`);
        }
    },
    'Lure': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Lure may turn minions into resources!`);
    },
    'Deep Bite': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Deep Bite',
                duration: 1,
                onDamageDealt: (c, dmg) => dmg + 3
            });
            ctx.battleLog.push(`Deep Bite ignores 3 DEF this turn!`);
        }
    },
    'Mudslide': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Mudslide makes traps easier!`);
    },
    'Ambush': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Ambush',
                duration: 1,
                onDamageDealt: (c, dmg) => dmg * 2
            });
            ctx.battleLog.push(`Ambush doubles damage this turn!`);
        }
    },
    'Abyssal Presence': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerAttack += 1;
            ctx.playerMaxHP += 1;
            ctx.playerHP += 1;
            ctx.battleLog.push(`Abyssal Presence grants +1 ATK and +1 HP!`);
        }
    },
    'Drowning Gaze': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyAttack = Math.max(1, ctx.enemyAttack - 2);
            ctx.enemyEffects.push({
                name: 'Drowning Gaze',
                duration: 1,
                onTurnEnd: (c, player) => { if (!player)
                    c.enemyAttack += 2; }
            });
            ctx.battleLog.push(`Drowning Gaze reduces enemy ATK by 2!`);
        }
    },
    'Photosynthesis': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Photosynthesis boosts CUN on resource tiles!`);
    },
    'Regrowth': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Regrowth',
                duration: 99,
                onTurnStart: (c, player) => {
                    if (player && c.playerHP < c.playerMaxHP) {
                        c.playerHP = Math.min(c.playerMaxHP, c.playerHP + 1);
                        c.battleLog.push(`Regrowth heals 1 HP!`);
                    }
                }
            });
            ctx.battleLog.push(`Regrowth will heal 1 HP per turn!`);
        }
    },
    'Thorn Whip': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerAttack += 1;
            ctx.battleLog.push(`Thorn Whip grants +1 ATK vs entities!`);
        }
    },
    'Entangle': (ctx, isPlayer, ability) => {
        if (isPlayer && Math.random() < 0.2) {
            ctx.enemyEffects.push({
                name: 'Entangled',
                duration: 1,
                onTurnStart: (c, player) => {
                    if (!player) {
                        c.battleLog.push(`Enemy is entangled and cannot attack!`);
                    }
                }
            });
            ctx.battleLog.push(`Entangle prevents enemy attack!`);
        }
    },
    "Nature's Fury": (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerAttack += 2;
            ctx.battleLog.push(`Nature's Fury grants +2 ATK vs Death/Void!`);
        }
    },
    'Petal Shield': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerMaxHP += 1;
            ctx.playerHP += 1;
            ctx.battleLog.push(`Petal Shield grants +1 HP to all allies!`);
        }
    },
    'Aroma': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Aroma',
                duration: 99,
                onTurnStart: (c, player) => {
                    if (player) {
                        c.playerHP = Math.min(c.playerMaxHP, c.playerHP + 1);
                    }
                }
            });
            ctx.battleLog.push(`Aroma heals all allies 1 HP per turn!`);
        }
    },
    'Healing Scales': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const heal = 2;
            ctx.playerHP = Math.min(ctx.playerMaxHP, ctx.playerHP + heal);
            ctx.battleLog.push(`Healing Scales restore ${heal} HP!`);
        }
    },
    'Blinding Light': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyEffects.push({
                name: 'Blinded',
                duration: 2,
                statModifiers: { cun: -2 }
            });
            ctx.battleLog.push(`Blinding Light reduces enemy CUN by 2!`);
        }
    },
    'Divine Seed': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerHP = ctx.playerMaxHP;
            ctx.battleLog.push(`Divine Seed fully heals all entities!`);
        }
    },
    'Blessing': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerAttack += 2;
            ctx.playerDefense += 2;
            ctx.playerMaxHP += 2;
            ctx.playerHP += 2;
            ctx.battleLog.push(`Blessing grants +2 to all stats!`);
        }
    },
    'Undead Vigor': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.enemyHP <= 0) {
            const heal = 1;
            ctx.playerHP = Math.min(ctx.playerMaxHP, ctx.playerHP + heal);
            ctx.battleLog.push(`Undead Vigor heals ${heal} HP!`);
        }
    },
    'Fear Aura': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyAttack = Math.max(1, ctx.enemyAttack - 1);
            ctx.battleLog.push(`Fear Aura reduces enemy ATK by 1!`);
        }
    },
    'Revealing Light': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Revealing Light makes wards easier!`);
    },
    'Soul Burn': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.enemyHP > ctx.enemyMaxHP / 2) {
            const damage = 1;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - damage);
            ctx.battleLog.push(`Soul Burn deals ${damage} bonus damage!`);
        }
    },
    'Spore Cloud': (ctx, isPlayer, ability) => {
        if (!isPlayer && ctx.playerHP <= 0) {
            ctx.battleLog.push(`Spore Cloud heals allies for 1 HP!`);
        }
    },
    'Decompose': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Decompose yields extra Bone Dust!`);
    },
    'Eternal Vigil': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Eternal Vigil auto-passes wards!`);
    },
    'Soul Drain': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Soul Drain',
                duration: 99,
                onDamageDealt: (c, dmg) => {
                    const heal = Math.floor(dmg / 2);
                    c.playerHP = Math.min(c.playerMaxHP, c.playerHP + heal);
                    c.battleLog.push(`Soul Drain heals for ${heal} HP!`);
                    return dmg;
                }
            });
            ctx.battleLog.push(`Soul Drain will heal for 50% of damage dealt!`);
        }
    },
    'Soul Eater': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.enemyHP <= 0) {
            ctx.playerAttack += 1;
            ctx.battleLog.push(`Soul Eater grants +1 permanent ATK!`);
        }
    },
    'Unholy Resilience': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.playerHP <= 0) {
            ctx.playerHP = 1;
            ctx.battleLog.push(`Unholy Resilience prevents death once!`);
        }
    },
    'Sorrowful Wail': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Sorrowful Wail weakens Hollows!`);
    },
    'Soul Harvest': (ctx, isPlayer, ability) => {
        if (isPlayer && ctx.enemyHP <= 0) {
            ctx.battleLog.push(`Soul Harvest summons a Wisp ally!`);
        }
    },
    'Forbidden Knowledge': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.battleLog.push(`Forbidden Knowledge grants insight!`);
        }
    },
    'Arcane Burst': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            const damage = 2;
            ctx.enemyHP = Math.max(0, ctx.enemyHP - damage);
            ctx.battleLog.push(`Arcane Burst deals ${damage} damage!`);
        }
    },
    'Omen': (ctx, isPlayer, ability) => {
        ctx.battleLog.push(`Omen reveals the next tile!`);
    },
    'Dark Peck': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerEffects.push({
                name: 'Dark Peck',
                duration: 1,
                onDamageDealt: (c, dmg) => dmg + 2
            });
            ctx.battleLog.push(`Dark Peck ignores 2 DEF!`);
        }
    },
    'Lava Shell': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.playerDefense += 1;
            ctx.battleLog.push(`Lava Shell reduces damage by 1!`);
        }
    },
    'Slow Burn': (ctx, isPlayer, ability) => {
        if (isPlayer) {
            ctx.enemyEffects.push({
                name: 'Slow Burn',
                duration: 99,
                onTurnStart: (c, player) => {
                    if (!player) {
                        c.enemyHP = Math.max(0, c.enemyHP - 1);
                    }
                }
            });
            ctx.battleLog.push(`Slow Burn deals 1 damage per turn!`);
        }
    }
};
export function applyAbility(ctx, isPlayer, abilityName, ability) {
    const handler = abilityRegistry[abilityName];
    if (handler) {
        handler(ctx, isPlayer, ability);
    }
    else {
        console.warn(`[Ability] No handler for: ${abilityName}`);
        ctx.battleLog.push(`${abilityName} activates!`);
    }
}
export function applyPassiveAbility(ctx, isPlayer, ability) {
    if (ability.type === 'passive' || ability.trigger === 'onTurnStart') {
        applyAbility(ctx, isPlayer, ability.name, ability);
    }
}
export function applyTriggeredAbility(ctx, isPlayer, trigger, abilities) {
    for (const ability of abilities) {
        if (ability.trigger === trigger) {
            applyAbility(ctx, isPlayer, ability.name, ability);
        }
    }
}
export function processStatusEffects(ctx, isPlayer) {
    const effects = isPlayer ? ctx.playerEffects : ctx.enemyEffects;
    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        if (effect.onTurnStart) {
            effect.onTurnStart(ctx, isPlayer);
        }
        effect.duration--;
        if (effect.duration <= 0) {
            effects.splice(i, 1);
            ctx.battleLog.push(`${effect.name} fades.`);
        }
    }
}
export function calculateDamage(ctx, baseDamage, isPlayerAttacking) {
    const attackerAtk = isPlayerAttacking ? ctx.playerAttack : ctx.enemyAttack;
    const defenderDef = isPlayerAttacking ? ctx.enemyDefense : ctx.playerDefense;
    let damage = attackerAtk + baseDamage - defenderDef;
    damage = Math.max(1, damage);
    const effects = isPlayerAttacking ? ctx.enemyEffects : ctx.playerEffects;
    for (const effect of effects) {
        if (effect.onDamageTaken) {
            damage = effect.onDamageTaken(ctx, damage, !isPlayerAttacking);
        }
    }
    return Math.max(1, Math.floor(damage));
}
