
import { GameState, Enemy, Planet, LibraryDrop, Tower, Point } from '@/src/types';
import { COLORS, TOWER_TYPES } from '@/src/constants';

const MAX_VAL = 1e300;

export class LogicHandler {
  public static update(state: GameState, dt: number, cameraScale: number, auto: boolean, onLv: () => void): void {
    if (state.isGameOver || state.isVictory || state.isCompiling) return;
    const now = Date.now();
    const cx = window.innerWidth / 2; const cy = window.innerHeight / 2;
    const vMult = Math.pow(6, state.permanentUpgrades.version - 1);

    // 1. Passive Code Generation
    const passiveBase = (150 + state.level * 30) * (dt/1000) * vMult * Math.pow(3.0, state.currentSector);
    state.code = Math.min(MAX_VAL, state.code + passiveBase);

    // 2. Unit AI
    state.enemies.forEach(e => {
        if (e.isFriendly) {
            const targets = state.planets.filter(p => !p.isCaptured);
            if (targets.length > 0) {
                const t = targets[0];
                const dX = t.x - e.x; const dY = t.y - e.y; 
                const dist = Math.sqrt(dX*dX + dY*dY) || 1;
                if (dist < 1000) { 
                    t.hp -= e.hp * 0.05; 
                    e.hp -= 100; 
                    if (t.hp <= 0) this.capturePlanet(state, t, onLv); 
                }
                e.x += (dX/dist) * e.speed * 4.5; 
                e.y += (dY/dist) * e.speed * 4.5; 
                e.angle = Math.atan2(dY, dX);
            } else {
                const dX = cx - e.x; const dY = cy - e.y;
                const dist = Math.sqrt(dX*dX + dY*dY) || 1;
                e.x += (dX/dist) * e.speed * 3;
                e.y += (dY/dist) * e.speed * 3;
                e.angle = Math.atan2(dY, dX);
            }
        } else {
            const dx = cx - e.x; const dy = cy - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            
            if (e.type === 'boss') {
                if (dist < 2200) {
                    if (!e.nextAttackTime || now > e.nextAttackTime) {
                        state.coreHp -= 400; 
                        e.nextAttackTime = now + 1800;
                    }
                } else {
                    e.x += (dx/dist) * e.speed * 1.5; 
                    e.y += (dy/dist) * e.speed * 1.5; 
                }
                e.angle = Math.atan2(dy, dx);
            } else {
                if (dist < 200) { 
                    state.coreHp -= 200; 
                    e.hp = -1; 
                } else {
                    e.x += (dx/dist) * e.speed; 
                    e.y += (dy/dist) * e.speed; 
                    e.angle = Math.atan2(dy, dx);
                }
            }
        }
        
        if (state.coreHp <= 0) state.isGameOver = true;
    });
    state.enemies = state.enemies.filter(e => e.hp > 0);

    // 3. Collection
    state.drops = state.drops.filter(d => {
        d.life -= 0.003;
        const dx = cx - d.x; const dy = cy - d.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const collectRadius = 500 / cameraScale;
        
        if (dist < collectRadius) { this.collectDrop(state, d); return false; }
        
        if (auto || dist < 8000) {
            const pull = auto ? 300 : 180;
            d.x += (dx/dist) * pull; 
            d.y += (dy/dist) * pull;
        }
        return d.life > 0;
    });
  }

  public static handleClick(state: GameState, x: number, y: number, scale: number, onHit: (e: any)=>void, onLv: ()=>void): boolean {
    const splash = (500 + state.level * 15) / Math.pow(scale, 0.4);
    let hitSomething = false;
    
    state.enemies.forEach(e => {
        if (e.isFriendly) return;
        const dist = Math.sqrt((e.x - x)**2 + (e.y - y)**2);
        if (dist < splash) {
            const damage = state.clickPower * (1 - dist/splash);
            e.hp -= damage; 
            e.lastHit = Date.now(); 
            hitSomething = true; 
            onHit(e);
            
            if (e.type === 'boss' && Math.random() < 0.12) {
               e.isFriendly = true;
               e.hp = e.maxHp * 0.5;
               state.experience += 100000;
            }

            if (e.hp <= 0) { 
                this.processEnemyDeath(state, e, true); 
                this.checkLevelUp(state, onLv); 
            }
        }
    });
    return hitSomething;
  }

  public static updateTowers(state: GameState, onFire: (t: any, tar: any)=>void, onLv: ()=>void): void {
    const now = Date.now();
    const rScale = Math.pow(2.5, state.currentSector);
    state.towers.forEach(t => {
        const range = t.range * state.towerModifiers.rangeMult * rScale;
        if (now - t.lastFired > t.fireRate * state.towerModifiers.fireRateMult) {
            let tar = state.enemies.find(e => !e.isFriendly && e.type === 'boss' && Math.sqrt((e.x - t.x)**2 + (e.y - t.y)**2) < range);
            if (!tar) tar = state.enemies.find(e => !e.isFriendly && Math.sqrt((e.x - t.x)**2 + (e.y - t.y)**2) < range);
            if (!tar) tar = state.planets.find(p => !p.isCaptured && Math.sqrt((p.x - t.x)**2 + (p.y - t.y)**2) < range) as any;
            
            if (tar) {
                tar.hp -= t.damage * state.towerModifiers.damageMult;
                state.code = Math.min(MAX_VAL, state.code + (t.damage * 0.2));
                onFire(t, tar);
                if (tar.hp <= 0) {
                    if ('isCaptured' in tar) this.capturePlanet(state, tar as any, onLv);
                    else { this.processEnemyDeath(state, tar as any, false); this.checkLevelUp(state, onLv); }
                }
                t.lastFired = now;
            }
        }
    });
  }

  private static capturePlanet(state: GameState, p: Planet, onLv: ()=>void) {
    p.isCaptured = true; p.color = COLORS.PRIMARY;
    state.experience += 300000 * Math.pow(5, p.sector); 
    // Capturing a planet grants significant unclaimed LP
    state.unclaimedLP += Math.floor(100 * Math.pow(1.5, p.sector));
    this.checkLevelUp(state, onLv);
  }

  public static collectDrop(state: GameState, d: LibraryDrop) {
    if (d.type === 'shard') { 
        state.spProgress += 15; 
        if (state.spProgress >= state.spGoal) { 
            state.skillPoints += 10; 
            state.spProgress = 0; 
            state.spGoal = Math.floor(state.spGoal * 1.3) + 10; 
        } 
    } else {
        state.code = Math.min(MAX_VAL, state.code + (3000 + state.level * 300));
    }
  }

  public static processEnemyDeath(state: GameState, e: Enemy, manual: boolean) {
    state.experience += (e.value / 2.5) * state.permanentUpgrades.xpMultiplier;
    state.code = Math.min(MAX_VAL, state.code + e.value * 1.0 * state.permanentUpgrades.version);
    state.drops.push({ id: Math.random().toString(36), name: 'Shard', type: 'shard', rarity: 'common', x: e.x, y: e.y, effect: 'SP', life: 12.0 });
    
    // Bosses grant LP directly
    if (e.type === 'boss') {
        state.unclaimedLP += Math.floor(50 * Math.pow(1.5, state.currentSector));
    }
  }

  public static checkLevelUp(state: GameState, onLv: ()=>void) {
    const req = 600 + (state.level * 600);
    if (state.experience >= req) { 
        state.level++; 
        state.experience -= req; 
        state.skillPoints += 5; 
        state.clickPower *= 1.35; 
        // Leveling up grants small LP
        state.unclaimedLP += 5 + Math.floor(state.level * 0.5);
        onLv(); 
    }
  }
}
