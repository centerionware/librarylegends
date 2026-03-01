
import { GameState, Tower, PermanentUpgrades, Planet, LibraryDrop, Point, Enemy } from '../types';
import { COLORS, TOWER_TYPES, ALL_SKILLS, TECH_TREE, COST_MULTIPLIER } from '../constants';
import { LogicHandler } from './LogicHandler';
import { RenderHandler } from './RenderHandler';
import { audio } from './AudioManager';

const PERM_STORAGE_KEY = 'library_legend_v7_perm';
const SESSION_STORAGE_KEY = 'library_legend_v7_session';
const MAX_VAL = 1e308;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private lastTime: number = 0;
  private enemySpawnTimer: number = 0;
  private onUpdate: (state: GameState) => void;
  private hasAutoCollect: boolean = false;
  private cameraScale: number = 1.0;
  private targetCameraScale: number = 1.0;
  private userZoomFactor: number = 1.0;
  private isPaused: boolean = false;
  private frameCount: number = 0;
  private isDestroyed: boolean = false;
  private renderer: RenderHandler;

  constructor(canvas: HTMLCanvasElement, onUpdate: (state: GameState) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas context not available');
    this.ctx = context;
    this.onUpdate = onUpdate;
    this.renderer = new RenderHandler(this.ctx);

    this.state = this.getInitialState();
    this.loadGame(); 
    
    // If loading didn't generate planets, do it now
    if (this.state.planets.length === 0) {
      this.generatePlanets(0);
    }
    
    this.refreshSkillShop();

    window.addEventListener('resize', this.resize.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    this.resize();
    requestAnimationFrame(this.animate);
  }

  public setPaused(paused: boolean) { 
    this.isPaused = paused; 
    if (!paused) this.lastTime = performance.now(); // Avoid time jumps
  }
  
  public destroy() { this.isDestroyed = true; audio.stop(); }

  private getInitialState(): GameState {
    return {
      code: 1000, experience: 0, level: 1, skillPoints: 5, spProgress: 0, spGoal: 20,
      clickPower: 200, towers: [], enemies: [], particles: [], ripples: [], drops: [], planets: [],
      projectiles: [], isGameOver: false, isVictory: false, lastRunCode: 0, availableSkills: [],
      unlockedTech: ['root'], unlockedSkills: [], rerollCost: 100, combo: 0,
      threatLevel: 0.5, coreHp: 2500, maxCoreHp: 2500, currentSector: 0,
      buildProgress: 0, unclaimedLP: 0,
      towerModifiers: { damageMult: 1.0, rangeMult: 1.0, fireRateMult: 1.0 },
      permanentUpgrades: { startingCode: 0, damageMultiplier: 1.0, xpMultiplier: 1.0, legacyPoints: 0, version: 1 }
    };
  }

  private generatePlanets(sector: number) {
    const dist = 6000 + (sector * 12000); 
    const count = 3 + sector;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (sector * 2.5);
      const vScale = Math.pow(1.8, this.state.permanentUpgrades.version - 1);
      const hp = (50000 + (this.state.level * 2500)) * Math.pow(5.5, sector) * vScale;
      this.state.planets.push({
        id: `p_${sector}_${i}`, 
        name: `NODE_0x${sector}${i}`,
        x: this.canvas.width/2 + Math.cos(angle) * dist,
        y: this.canvas.height/2 + Math.sin(angle) * dist,
        hp, maxHp: hp, isCaptured: false, size: 1200 + (sector * 500), color: COLORS.ENEMY,
        sector
      });
    }
  }

  public handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.userZoomFactor = Math.max(0.1, Math.min(5.0, this.userZoomFactor - e.deltaY * zoomSpeed));
  }

  public setPinchZoom(delta: number) {
    this.userZoomFactor = Math.max(0.1, Math.min(5.0, this.userZoomFactor * delta));
  }

  public async shipToProduction() {
    if (this.state.buildProgress < 100) return;
    this.state.isCompiling = true;
    this.onUpdate({ ...this.state });
    audio.playLevelUp();
    
    // Distribute 100% of unclaimed LP plus stability bonus
    const stabilityBonus = Math.floor(this.state.unclaimedLP * 0.35);
    const totalGained = this.state.unclaimedLP + stabilityBonus;
    
    this.state.permanentUpgrades.legacyPoints += totalGained;
    this.state.permanentUpgrades.version++;
    
    // Clear session storage as the run is done
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.savePermanentUpgrades();

    await new Promise(r => setTimeout(r, 2200));
    this.state.isCompiling = false;
    this.reset();
  }

  public reset() {
    // If we're coming from a GameOver, distribute 50% consolation LP
    if (this.state.isGameOver) {
      const consolation = Math.floor(this.state.unclaimedLP * 0.5);
      this.state.permanentUpgrades.legacyPoints += consolation;
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    const perms = { ...this.state.permanentUpgrades };
    this.state = this.getInitialState();
    this.state.permanentUpgrades = perms;
    this.savePermanentUpgrades();
    
    const vMult = Math.pow(2.2, perms.version - 1);
    this.state.code = (1000 + perms.startingCode) * vMult * 10;
    this.state.clickPower = 200 * perms.damageMultiplier * vMult;
    
    this.generatePlanets(0);
    this.onUpdate({ ...this.state });
  }

  public buyTower(type: keyof typeof TOWER_TYPES, rawX: number, rawY: number): boolean {
    if (this.state.isGameOver || this.state.isCompiling || this.isPaused) return false;
    const worldX = (rawX - this.canvas.width/2) / this.cameraScale + this.canvas.width/2;
    const worldY = (rawY - this.canvas.height/2) / this.cameraScale + this.canvas.height/2;
    const config = TOWER_TYPES[type];
    const tCount = this.state.towers.filter(t => t.type === type).length;
    const cost = Math.floor(config.cost * Math.pow(COST_MULTIPLIER, tCount));

    if (this.state.code >= cost && (!config.requires || this.state.unlockedTech.includes(config.requires))) {
      this.state.code -= cost;
      this.state.towers.push({ 
        id: Math.random().toString(36), type, level: 1, x: worldX, y: worldY, 
        range: config.range, damage: config.damage, fireRate: config.fireRate, 
        lastFired: 0, color: config.color 
      });
      audio.playClick();
      this.state.buildProgress = Math.min(100, this.state.buildProgress + 10);
      return true;
    }
    return false;
  }

  public handleClick(rawX: number, rawY: number, wasPlacement: boolean) {
    if (this.state.isGameOver || this.isPaused || this.state.isCompiling) return;
    audio.enable();
    const worldX = (rawX - this.canvas.width/2) / this.cameraScale + this.canvas.width/2;
    const worldY = (rawY - this.canvas.height/2) / this.cameraScale + this.canvas.height/2;
    
    const hit = LogicHandler.handleClick(this.state, worldX, worldY, this.cameraScale, (e) => {
        this.createParticles(e.x, e.y, 14, COLORS.PRIMARY);
        audio.playClick();
        this.state.buildProgress = Math.min(100, this.state.buildProgress + 0.2);
    }, () => this.onLevelUp());

    if (!hit && !wasPlacement) {
      const vMult = Math.pow(1.6, this.state.permanentUpgrades.version - 1);
      const reward = (400 + (this.state.level * 80)) * (1 + this.state.currentSector) * vMult;
      this.state.code = Math.min(MAX_VAL, this.state.code + reward);
      this.createFloatingText(worldX, worldY, `+${Math.floor(reward)}`, COLORS.PRIMARY);
      audio.playClick();
    }
    this.onUpdate({ ...this.state });
  }

  private onLevelUp() {
    audio.playLevelUp();
    const uncaptured = this.state.planets.filter(p => !p.isCaptured && p.sector === this.state.currentSector);
    if (uncaptured.length === 0) {
      this.state.currentSector++;
      this.generatePlanets(this.state.currentSector);
      this.state.buildProgress = Math.min(100, this.state.buildProgress + 45); 
    }
    if (this.state.level % 5 === 0) this.spawnBoss();
    this.refreshSkillShop();
    this.saveGame(); // Periodic save on level up
  }

  private animate = (time: number) => {
    if (this.isDestroyed) return;
    const dt = Math.min(time - this.lastTime, 33);
    this.lastTime = time;
    this.frameCount++;
    
    // HARD PAUSE CHECK
    const canUpdate = !this.isPaused && !this.state.isGameOver && !this.state.isCompiling;
    if (canUpdate) {
        this.update(dt);
    }
    
    this.renderer.draw(this.state, this.cameraScale, this.isPaused);
    requestAnimationFrame(this.animate);
  }

  private update(dt: number) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    // VIEWPORT BOUNDING
    let bounds = { 
      minX: cx - 3000, maxX: cx + 3000, 
      minY: cy - 3000, maxY: cy + 3000 
    };
    
    this.state.planets.forEach(p => {
        if (p.sector <= this.state.currentSector) {
            bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x);
            bounds.minY = Math.min(bounds.minY, p.y); bounds.maxY = Math.max(bounds.maxY, p.y);
        }
    });

    this.state.enemies.forEach(e => {
        if (e.type === 'boss') {
            bounds.minX = Math.min(bounds.minX, e.x); bounds.maxX = Math.max(bounds.maxX, e.x);
            bounds.minY = Math.min(bounds.minY, e.y); bounds.maxY = Math.max(bounds.maxY, e.y);
        }
    });
    
    const viewW = bounds.maxX - bounds.minX;
    const viewH = bounds.maxY - bounds.minY;
    const autoScaleX = this.canvas.width / (viewW * 1.6);
    const autoScaleY = this.canvas.height / (viewH * 1.6);
    
    // Combine auto-zoom with user control
    const targetBaseScale = Math.max(0.01, Math.min(autoScaleX, autoScaleY, 1.0));
    this.targetCameraScale = targetBaseScale * this.userZoomFactor;
    
    this.cameraScale += (this.targetCameraScale - this.cameraScale) * 0.08; 

    LogicHandler.update(this.state, dt, this.cameraScale, this.hasAutoCollect, () => this.onLevelUp());
    LogicHandler.updateTowers(this.state, (t, tar) => {
        this.renderer.addFiringEffect(t.x, t.y, tar.x, tar.y, t.color, t.type);
        audio.playFire(t.type);
    }, () => this.onLevelUp());

    this.enemySpawnTimer += dt;
    if (this.enemySpawnTimer > 3500 / (1 + this.state.currentSector * 0.9)) {
        const active = this.state.planets.filter(p => !p.isCaptured && p.sector <= this.state.currentSector);
        const s = active[Math.floor(Math.random() * active.length)];
        this.spawnEnemyAt(s ? s.x : -999, s ? s.y : -999);
        this.enemySpawnTimer = 0;
    }

    this.state.particles = this.state.particles.filter(p => { 
        p.x += p.vx; p.y += p.vy; p.life -= 0.04; return p.life > 0; 
    });
    
    if (this.frameCount % 5 === 0) {
      this.onUpdate({ ...this.state });
      if (this.frameCount % 300 === 0) this.saveGame(); // Save every ~5 seconds
    }
  }

  private spawnBoss() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 16000 + (this.state.currentSector * 6000); 
    const x = this.canvas.width/2 + Math.cos(angle) * dist;
    const y = this.canvas.height/2 + Math.sin(angle) * dist;
    const vScale = Math.pow(2.5, this.state.permanentUpgrades.version - 1);
    const hp = 1200000 * Math.pow(4.5, this.state.currentSector) * vScale;
    this.state.enemies.push({ 
        id: Math.random().toString(36), x, y, hp, maxHp: hp, speed: 1.0, 
        value: hp * 20, type: 'boss', size: 2400, angle: 0 
    });
  }

  private spawnEnemyAt(sx: number, sy: number) {
    if (this.state.enemies.length > 80) return;
    const x = sx === -999 ? this.canvas.width/2 + 7000 : sx + (Math.random()-0.5)*2000;
    const y = sy === -999 ? this.canvas.height/2 + 7000 : sy + (Math.random()-0.5)*2000;
    const vScale = Math.pow(1.7, this.state.permanentUpgrades.version - 1);
    const hp = 1200 * Math.pow(1.45, this.state.level) * vScale;
    this.state.enemies.push({ 
        id: Math.random().toString(36), x, y, hp, maxHp: hp, speed: 1.3 + (this.state.level * 0.07), 
        value: hp * 10, type: 'bug', size: 250, angle: 0 
    });
  }

  private resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
  
  private saveGame() {
    localStorage.setItem(PERM_STORAGE_KEY, JSON.stringify(this.state.permanentUpgrades));
    const sessionData = {
      ...this.state,
      particles: [], ripples: [], enemies: [], projectiles: [], drops: [] // Don't save transient arrays
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  }

  private loadGame() {
    const permS = localStorage.getItem(PERM_STORAGE_KEY);
    if (permS) {
      try { this.state.permanentUpgrades = { ...this.state.permanentUpgrades, ...JSON.parse(permS) }; } catch(e){}
    }
    const sessionS = localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionS) {
      try { 
        const data = JSON.parse(sessionS);
        this.state = { ...this.state, ...data };
        // Validate auto-collect state
        this.hasAutoCollect = this.state.unlockedSkills.includes('auto_collect');
      } catch(e){}
    }
  }

  private savePermanentUpgrades() { localStorage.setItem(PERM_STORAGE_KEY, JSON.stringify(this.state.permanentUpgrades)); }
  
  private refreshSkillShop() { this.state.availableSkills = [...ALL_SKILLS].sort(()=>0.5-Math.random()).slice(0,3).map(s=>s.id); }
  
  public applySkill(id: string, cb: (s: any)=>void) {
    const s = ALL_SKILLS.find(x=>x.id===id) || TECH_TREE.find(x=>x.id===id);
    if (s && this.state.skillPoints >= s.cost) {
        this.state.skillPoints -= s.cost;
        if (id.startsWith('tech_')) this.state.unlockedTech.push(id); else this.state.unlockedSkills.push(id);
        if (id === 'auto_collect') this.hasAutoCollect = true;
        cb(this.state); this.refreshSkillShop(); this.onUpdate({...this.state}); return true;
    }
    return false;
  }

  public rerollSkills() {
    if (this.state.code >= this.state.rerollCost) {
        this.state.code -= this.state.rerollCost; this.state.rerollCost = Math.floor(this.state.rerollCost * 2.0);
        this.refreshSkillShop(); this.onUpdate({...this.state}); return true;
    }
    return false;
  }

  public buyPermanentUpgrade(type: keyof Omit<PermanentUpgrades, 'legacyPoints'>) {
    if (this.state.permanentUpgrades.legacyPoints >= 100) {
        this.state.permanentUpgrades.legacyPoints -= 100;
        if (type === 'startingCode') this.state.permanentUpgrades.startingCode += 150000;
        if (type === 'damageMultiplier') this.state.permanentUpgrades.damageMultiplier += 12.0;
        if (type === 'xpMultiplier') this.state.permanentUpgrades.xpMultiplier += 12.0;
        this.savePermanentUpgrades(); 
        this.onUpdate({...this.state}); 
        return true;
    }
    return false;
  }

  private createParticles(x: number, y: number, count: number, color: string) {
    for (let i=0; i<count; i++) this.state.particles.push({ x, y, vx: (Math.random()-0.5)*60, vy: (Math.random()-0.5)*60, size: Math.random()*20+10, life: 1.0, color });
  }

  private createFloatingText(x: number, y: number, text: string, color: string) {
    this.state.particles.push({ x, y, vx: 0, vy: -18, size: 70, life: 3.2, color, text });
  }
}
