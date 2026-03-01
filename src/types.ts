
export interface Point {
  x: number;
  y: number;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  text?: string;
}

export interface Projectile extends Point {
  id: string;
  targetId: string;
  speed: number;
  damage: number;
  color: string;
  type: 'allied' | 'enemy';
}

export interface Planet extends Point {
  id: string;
  hp: number;
  maxHp: number;
  isCaptured: boolean;
  size: number;
  color: string;
  name: string;
  sector: number;
}

export interface ClickRipple extends Point {
  radius: number;
  maxRadius: number;
  life: number;
}

export interface Enemy extends Point {
  id: string;
  hp: number;
  maxHp: number;
  speed: number;
  value: number;
  type: 'bug' | 'boss' | 'glitch' | 'null_pointer' | 'memory_leak' | 'shielded' | 'worm';
  size: number;
  angle: number;
  lastHit?: number;
  sourcePlanetId?: string;
  nextAttackTime?: number;
  shield?: number;
  hasBlinked?: boolean;
  isChild?: boolean;
  sinOffset?: number; 
  isFriendly?: boolean; 
}

export interface Tower extends Point {
  id: string;
  type: string;
  level: number;
  range: number;
  damage: number;
  fireRate: number;
  lastFired: number;
  color: string;
  disabledUntil?: number;
  lastTargetId?: string;
}

export interface LibraryDrop extends Point {
  id: string;
  name: string;
  type: 'loc' | 'shard' | 'library';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  effect: string;
  life: number;
}

export interface PermanentUpgrades {
  startingCode: number;
  damageMultiplier: number;
  xpMultiplier: number;
  legacyPoints: number;
  version: number;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  position: { x: number; y: number };
  dependsOn?: string;
}

export interface TowerModifiers {
  damageMult: number;
  rangeMult: number;
  fireRateMult: number;
}

export interface GameState {
  code: number;
  experience: number;
  level: number;
  skillPoints: number;
  spProgress: number;
  spGoal: number;
  clickPower: number;
  towers: Tower[];
  enemies: Enemy[];
  particles: Particle[];
  ripples: ClickRipple[];
  drops: LibraryDrop[];
  planets: Planet[];
  projectiles: Projectile[];
  isGameOver: boolean;
  isVictory: boolean;
  permanentUpgrades: PermanentUpgrades;
  lastRunCode: number;
  availableSkills: string[];
  unlockedTech: string[];
  unlockedSkills: string[]; 
  rerollCost: number;
  combo: number;
  threatLevel: number;
  coreHp: number;
  maxCoreHp: number;
  towerModifiers: TowerModifiers;
  currentSector: number;
  isCompiling?: boolean;
  buildProgress: number; 
  unclaimedLP: number; // Tracks current run's accumulated prestige points
}
