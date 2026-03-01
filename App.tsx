
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { GameState, PermanentUpgrades } from './types';
import UIOverlay from './components/UIOverlay';
import SkillTree from './components/SkillTree';
import { TOWER_TYPES } from './constants';
import { Target } from 'lucide-react';
import { audio } from './engine/AudioManager';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [buildingType, setBuildingType] = useState<keyof typeof TOWER_TYPES | null>(null);
  const touchDistRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, (state) => setGameState(state));
    engineRef.current = engine;
    return () => engineRef.current?.destroy();
  }, []);

  useEffect(() => {
    // Explicitly freeze engine when any menu is open
    engineRef.current?.setPaused(isSkillTreeOpen || !!gameState?.isGameOver);
  }, [isSkillTreeOpen, gameState?.isGameOver]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist / touchDistRef.current;
      engineRef.current?.setPinchZoom(delta);
      touchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    audio.enable();
    if (!engineRef.current || isSkillTreeOpen || gameState?.isGameOver || gameState?.isCompiling) return;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let wasPlacement = false;
    if (buildingType) {
      wasPlacement = engineRef.current.buyTower(buildingType, x, y);
    }
    
    engineRef.current.handleClick(x, y, wasPlacement);
  };

  const handleUpgrade = (skillId: string) => {
    engineRef.current?.applySkill(skillId, (s) => {
      if (skillId === 'click_1') s.clickPower *= 2.0; 
      if (skillId === 'massive_click') s.clickPower *= 5.0; 
      if (skillId === 'tower_range_1') s.towerModifiers.rangeMult *= 1.2; 
      if (skillId === 'tower_dmg_1') s.towerModifiers.damageMult *= 1.5; 
      if (skillId === 'tech_god') { s.clickPower *= 5; s.towerModifiers.damageMult *= 5; }
    });
  };

  return (
    <div 
      className="relative w-screen h-screen bg-slate-950 overflow-hidden select-none cursor-crosshair"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas 
        ref={canvasRef} 
        onClick={handleClick} 
        onContextMenu={(e) => {
          e.preventDefault();
          setBuildingType(null); 
        }}
        className={`block w-full h-full transition-filter duration-300 ${isSkillTreeOpen ? 'grayscale opacity-50' : ''}`} 
      />
      {gameState && (
        <>
          <UIOverlay 
            state={gameState} 
            activeBuildingType={buildingType}
            onBuildTower={(t) => setBuildingType(buildingType === t ? null : t)}
            onOpenSkills={() => setIsSkillTreeOpen(true)}
            onRestart={() => engineRef.current?.reset()}
            onBuyPermanent={(p) => engineRef.current?.buyPermanentUpgrade(p)}
            onShipToProduction={() => engineRef.current?.shipToProduction()}
          />
          <SkillTree 
            state={gameState}
            isOpen={isSkillTreeOpen}
            onClose={() => setIsSkillTreeOpen(false)}
            onUpgrade={handleUpgrade}
            onReroll={() => engineRef.current?.rerollSkills()}
          />
        </>
      )}
      {buildingType && (
        <div 
          className="fixed top-24 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-900 px-6 py-2 rounded-full font-bold shadow-lg animate-bounce pointer-events-auto z-40 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105" 
          onClick={() => setBuildingType(null)}
        >
          <Target className="w-5 h-5" /> STICKY PLACING: {TOWER_TYPES[buildingType].name} (TAP TO CANCEL)
        </div>
      )}
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_100%)]" />
    </div>
  );
};

export default App;
