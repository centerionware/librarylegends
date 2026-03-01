
import { GameState, Enemy, Tower, Planet } from '@/src/types';
import { COLORS } from '@/src/constants';

export class RenderHandler {
  private ctx: CanvasRenderingContext2D;
  private firingEffects: Array<{x1: number, y1: number, x2: number, y2: number, life: number, color: string, type: string}> = [];
  private screenShake: number = 0;
  private MAX_FIRING_EFFECTS = 250;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public addFiringEffect(x1: number, y1: number, x2: number, y2: number, color: string, type: string) {
    if (this.firingEffects.length < this.MAX_FIRING_EFFECTS) {
      this.firingEffects.push({ x1, y1, x2, y2, life: 1.0, color, type });
    }
  }

  public triggerShake(intensity: number = 10) {
    this.screenShake = intensity;
  }

  private getVersionColor(version: number): string {
    const palette = [COLORS.PRIMARY, '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return palette[(version - 1) % palette.length];
  }

  private drawStarfield(cx: number, cy: number, cameraScale: number) {
    const { canvas } = this.ctx;
    const layers = [
        { count: 180, size: 1, color: '#1e293b' },
        { count: 100, size: 2, color: '#334155' },
        { count: 50, size: 3, color: '#475569' }
    ];

    layers.forEach(layer => {
        this.ctx.fillStyle = layer.color;
        for (let i = 0; i < layer.count; i++) {
            const x = (Math.sin(i * 157.7) * 0.5 + 0.5) * canvas.width;
            const y = (Math.cos(i * 89.1) * 0.5 + 0.5) * canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, layer.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    });
  }

  public draw(state: GameState, cameraScale: number, isPaused: boolean) {
    const { canvas } = this.ctx;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const now = Date.now();
    const version = state.permanentUpgrades.version;
    const versionColor = this.getVersionColor(version);

    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawStarfield(cx, cy, cameraScale);

    this.ctx.save();
    if (this.screenShake > 0) {
      this.ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
      this.screenShake *= 0.85;
    }

    // World Space
    this.ctx.translate(cx, cy);
    this.ctx.scale(cameraScale, cameraScale);
    this.ctx.translate(-cx, -cy);

    // 1. GALAXY NETWORK
    this.ctx.lineWidth = 15 / cameraScale;
    state.planets.forEach(p => {
        if (!p.isCaptured && p.sector > state.currentSector) return;
        this.ctx.globalAlpha = 0.08 / (cameraScale * 0.4);
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.strokeStyle = p.isCaptured ? versionColor : COLORS.ENEMY;
        this.ctx.stroke();

        const progress = (now * 0.0008) % 1;
        const pulseX = cx + (p.x - cx) * progress;
        const pulseY = cy + (p.y - cy) * progress;
        this.ctx.globalAlpha = 0.25;
        this.ctx.fillStyle = p.isCaptured ? versionColor : COLORS.ENEMY;
        this.ctx.beginPath(); this.ctx.arc(pulseX, pulseY, 80 / cameraScale, 0, Math.PI * 2); this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    // 2. BOSS ATTACK BEAMS (Rendering these BEFORE bosses for layering)
    state.enemies.forEach(e => {
        if (e.type === 'boss' && !e.isFriendly) {
            const dx = cx - e.x; const dy = cy - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 4000) { // Beam becomes visible as they approach
                this.ctx.save();
                this.ctx.strokeStyle = '#a855f7';
                this.ctx.lineWidth = (20 + Math.sin(now * 0.1) * 10) / cameraScale;
                this.ctx.globalAlpha = 0.4;
                this.ctx.setLineDash([100 / cameraScale, 50 / cameraScale]);
                this.ctx.lineDashOffset = -now * 0.2;
                this.ctx.beginPath();
                this.ctx.moveTo(e.x, e.y);
                this.ctx.lineTo(cx, cy);
                this.ctx.stroke();
                this.ctx.restore();
            }
        }
    });

    // 3. PLANETS
    state.planets.forEach(p => {
      if (p.sector > state.currentSector + 1) return;
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      const pDrawSize = p.size;
      
      this.ctx.fillStyle = p.isCaptured ? '#0c4a6e' : '#1e0505';
      this.ctx.beginPath(); this.ctx.arc(0, 0, pDrawSize, 0, Math.PI * 2); this.ctx.fill();
      
      this.ctx.strokeStyle = p.isCaptured ? versionColor : COLORS.ENEMY;
      this.ctx.lineWidth = 25 / cameraScale;
      this.ctx.beginPath(); this.ctx.arc(0, 0, pDrawSize * 1.1, 0, Math.PI * 2); this.ctx.stroke();

      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${Math.max(200, 600 / cameraScale)}px Space Grotesk`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(p.name, 0, pDrawSize + (800 / cameraScale));
      this.ctx.restore();
    });

    // 4. THE CORE + BUILD RING
    const coreSize = 350 + (state.level * 2);
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.lineWidth = 60 / cameraScale;
    
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.beginPath(); this.ctx.arc(0, 0, coreSize * 1.4, 0, Math.PI * 2); this.ctx.stroke();
    
    const buildColor = state.buildProgress >= 100 ? '#10b981' : state.buildProgress > 50 ? '#f59e0b' : '#ef4444';
    this.ctx.strokeStyle = buildColor;
    this.ctx.beginPath(); this.ctx.arc(0, 0, coreSize * 1.4, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * (state.buildProgress/100))); this.ctx.stroke();
    this.ctx.restore();

    this.ctx.fillStyle = versionColor;
    this.ctx.shadowBlur = 500 / cameraScale; this.ctx.shadowColor = versionColor;
    this.ctx.beginPath(); this.ctx.arc(cx, cy, coreSize, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // 5. COMBAT FX
    this.firingEffects = this.firingEffects.filter(ef => {
      this.ctx.globalAlpha = ef.life;
      this.ctx.strokeStyle = ef.color;
      this.ctx.lineWidth = (ef.type === 'SNIPER' ? 180 : 80) * ef.life / cameraScale;
      this.ctx.beginPath(); this.ctx.moveTo(ef.x1, ef.y1); this.ctx.lineTo(ef.x2, ef.y2); this.ctx.stroke();
      ef.life -= 0.08;
      return ef.life > 0;
    });
    this.ctx.globalAlpha = 1.0;

    // 6. ENTITIES
    state.enemies.forEach(e => {
      this.ctx.save();
      this.ctx.translate(e.x, e.y);
      this.ctx.rotate(e.angle);
      
      const isHit = now - (e.lastHit || 0) < 100;
      const uSize = e.size;
      
      if (e.type === 'boss') {
        // High-legibility Boss Ship (Absolute thickness lines)
        const bossColor = e.isFriendly ? '#22d3ee' : '#a855f7';
        this.ctx.fillStyle = isHit ? '#fff' : bossColor;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 40 / cameraScale;
        
        this.ctx.beginPath();
        this.ctx.moveTo(uSize, 0);
        this.ctx.lineTo(-uSize * 0.5, uSize * 0.9);
        this.ctx.lineTo(-uSize * 0.1, 0);
        this.ctx.lineTo(-uSize * 0.5, -uSize * 0.9);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Huge Engine Pulse
        this.ctx.fillStyle = bossColor;
        this.ctx.globalAlpha = 0.5 + Math.sin(now * 0.01) * 0.3;
        this.ctx.beginPath(); this.ctx.arc(-uSize * 0.6, 0, uSize * 0.8, 0, Math.PI * 2); this.ctx.fill();
        
        // Text Alert
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `black ${Math.max(400, 700 / cameraScale)}px Space Grotesk`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(e.isFriendly ? "CONVERTED" : "BOSS DETECTED", 0, -uSize * 1.5);
      } else {
        this.ctx.fillStyle = isHit ? '#fff' : (e.isFriendly ? '#22d3ee' : this.getEnemyColor(e));
        this.ctx.beginPath();
        this.ctx.moveTo(uSize, 0);
        this.ctx.lineTo(-uSize * 0.7, uSize * 0.7);
        this.ctx.lineTo(-uSize * 0.3, 0);
        this.ctx.lineTo(-uSize * 0.7, -uSize * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // 7. TOWERS & DROPS
    state.towers.forEach(t => {
      this.ctx.fillStyle = t.color;
      const tSize = 160;
      this.ctx.fillRect(t.x - tSize, t.y - tSize, tSize * 2, tSize * 2);
    });

    state.drops.forEach(d => {
      this.ctx.globalAlpha = d.life;
      this.ctx.fillStyle = d.type === 'shard' ? COLORS.SECONDARY : COLORS.PRIMARY;
      const s = 220;
      this.ctx.save();
      this.ctx.translate(d.x, d.y);
      this.ctx.rotate(now * 0.015);
      this.ctx.fillRect(-s, -s, s*2, s*2);
      this.ctx.restore();
    });

    // 8. PARTICLES
    state.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      if (p.text) {
        this.ctx.font = `black ${p.size / cameraScale}px Space Grotesk`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.text, p.x, p.y);
      } else {
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size / cameraScale, 0, Math.PI * 2); this.ctx.fill();
      }
    });

    this.ctx.restore();
  }

  private getEnemyColor(e: Enemy): string {
      switch(e.type) {
          case 'boss': return '#a855f7';
          case 'glitch': return '#00ffcc';
          case 'null_pointer': return '#ffffff';
          case 'memory_leak': return '#fbbf24';
          case 'shielded': return '#38bdf8';
          case 'worm': return '#f472b6';
          default: return COLORS.ENEMY;
      }
  }
}
