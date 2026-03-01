
export const COLORS = {
  PRIMARY: '#38bdf8',
  SECONDARY: '#f472b6',
  ACCENT: '#fbbf24',
  BG: '#020617',
  ENEMY: '#ef4444',
  PARTICLE: '#94a3b8',
  BOSS: '#a855f7',
};

export const LIBRARIES = [
  { name: 'lodash', rarity: 'common', effect: 'Speed +5%' },
  { name: 'react', rarity: 'uncommon', effect: 'Click Power +10%' },
  { name: 'd3', rarity: 'rare', effect: 'Tower Range +20%' },
  { name: 'tensorflow', rarity: 'epic', effect: 'Auto-targeting' },
  { name: 'kubernetes', rarity: 'legendary', effect: 'System Overload' },
  { name: 'is-even', rarity: 'common', effect: 'Code +1' },
  { name: 'left-pad', rarity: 'uncommon', effect: 'Padding +100%' },
  { name: 'three.js', rarity: 'rare', effect: 'Visual Clarity' },
  { name: 'express', rarity: 'common', effect: 'Enemy Delay' },
  { name: 'next.js', rarity: 'epic', effect: 'Production Grade Performance' },
] as const;

export const TOWER_TYPES = {
  BASIC: {
    name: 'Logic Gate',
    cost: 1500, // Raised from 120
    damage: 150, // Raised from 25
    range: 250, 
    fireRate: 800,
    color: '#38bdf8',
    requires: null,
  },
  SNIPER: {
    name: 'Regex Matcher',
    cost: 12000, // Raised from 2500
    damage: 2500, // Raised from 350
    range: 850, 
    fireRate: 3500,
    color: '#f472b6',
    requires: 'tech_sniper',
  },
  RAPID: {
    name: 'Loop Unroller',
    cost: 25000, // Raised from 6000
    damage: 180, // Raised from 25
    range: 300, 
    fireRate: 120,
    color: '#fbbf24',
    requires: 'tech_rapid',
  },
  AOE: {
    name: 'Broadcast Channel',
    cost: 75000, // Raised from 15000
    damage: 650, // Raised from 85
    range: 400, 
    fireRate: 1500,
    color: '#a855f7',
    requires: 'tech_aoe',
  }
};

export const COST_MULTIPLIER = 2.5; // Every tower of same type costs 2.5x more

export const ALL_SKILLS = [
  { id: 'click_1', name: 'Mechanical Key', description: 'Double Click Power', cost: 1, rarity: 'common', oneTime: false },
  { id: 'tower_range_1', name: 'Fiber Link', description: '+20% Range', cost: 1, rarity: 'common', oneTime: false },
  { id: 'tower_dmg_1', name: 'Overclock', description: '+40% Damage', cost: 2, rarity: 'rare', oneTime: false },
  { id: 'auto_collect', name: 'Garbage Collector', description: 'Auto-pick drops', cost: 2, rarity: 'epic', oneTime: true },
  { id: 'code_gen', name: 'SaaS Business', description: 'Passive Code gain', cost: 2, rarity: 'rare', oneTime: true },
  { id: 'crit_chance', name: 'Unit Tests', description: '10% Critical Click (5x)', cost: 3, rarity: 'rare', oneTime: true },
  { id: 'massive_click', name: 'Keypad Hack', description: '+500% Click Power', cost: 5, rarity: 'epic', oneTime: true },
  { id: 'fast_shards', name: 'Fragment Accelerator', description: '+50% Shard Spawn Rate', cost: 2, rarity: 'rare', oneTime: true },
  { id: 'core_plating', name: 'Firewall Extra', description: '+1000 Core HP', cost: 2, rarity: 'uncommon', oneTime: false },
] as const;

export const TECH_TREE = [
  { id: 'root', name: 'Junior Dev', description: 'The journey begins.', cost: 0, position: { x: 50, y: 50 } },
  { id: 'tech_sniper', name: 'Regex Mastery', description: 'Unlocks Regex Matcher', cost: 1, dependsOn: 'root', position: { x: 30, y: 150 } },
  { id: 'tech_rapid', name: 'Event Loop', description: 'Unlocks Loop Unroller', cost: 1, dependsOn: 'root', position: { x: 70, y: 150 } },
  { id: 'tech_efficiency', name: 'Clean Code', description: '+20% LOC from all sources', cost: 1, dependsOn: 'root', position: { x: 50, y: 180 } },
  { id: 'tech_aoe', name: 'Microservices', description: 'Unlocks Broadcast Channel', cost: 2, dependsOn: 'tech_sniper', position: { x: 20, y: 250 } },
  { id: 'tech_range', name: 'CDN Nodes', description: '+35% Tower Range', cost: 2, dependsOn: 'tech_sniper', position: { x: 40, y: 250 } },
  { id: 'tech_speed', name: 'V8 Engine', description: '+30% Attack Speed', cost: 2, dependsOn: 'tech_rapid', position: { x: 60, y: 250 } },
  { id: 'tech_god', name: 'SILICON GOD', description: 'All damage x5. Mastery attained.', cost: 10, dependsOn: 'tech_speed', position: { x: 50, y: 450 } },
];
