
import React from 'react';
import { GameState, PermanentUpgrades } from '@/src/types';
import { TOWER_TYPES, COLORS, COST_MULTIPLIER } from '@/src/constants';
import { Terminal, Cpu, Zap, Code, Shield, Layers, Award, Star, Heart, Rocket, Lock, Database, Send, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  state: GameState;
  activeBuildingType: keyof typeof TOWER_TYPES | null;
  onBuildTower: (type: keyof typeof TOWER_TYPES) => void;
  onOpenSkills: () => void;
  onRestart: () => void;
  onBuyPermanent: (type: keyof Omit<PermanentUpgrades, 'legacyPoints'>) => void;
  onShipToProduction: () => void;
}

const UIOverlay: React.FC<Props> = ({ state, activeBuildingType, onBuildTower, onOpenSkills, onRestart, onBuyPermanent, onShipToProduction }) => {
  const nextLevelExp = 600 + (state.level * 600);
  const expProgress = (state.experience / nextLevelExp) * 100;
  const coreHpPercent = (state.coreHp / state.maxCoreHp) * 100;
  const buildProgress = state.buildProgress;
  
  const totalLegacyPool = Math.floor(state.permanentUpgrades.legacyPoints);
  const currentVersion = state.permanentUpgrades.version;
  const unclaimedLP = state.unclaimedLP;
  
  const formatLarge = (num: number): string => {
    if (num === Infinity || isNaN(num)) return "MAXED";
    if (num < 1000) return Math.floor(num).toString();
    const suffixes = ["", "K", "M", "B", "T", "Q", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const tier = Math.floor(Math.log10(num) / 3);
    if (tier >= suffixes.length) return num.toExponential(2);
    const suffix = suffixes[tier];
    const scale = Math.pow(10, tier * 3);
    const scaled = num / scale;
    return scaled.toFixed(1) + suffix;
  };

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-between p-4">
      
      {/* TOP HUD */}
      <div className="flex flex-col items-center gap-2 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-full px-6 py-2.5 flex items-center gap-8 shadow-2xl relative overflow-hidden">
          {/* Health Bar */}
          <div className="absolute top-0 left-0 h-[3px] bg-red-500/20 w-full">
            <div className="h-full bg-red-500 shadow-[0_0_12px_#ef4444] transition-all duration-500" style={{ width: `${coreHpPercent}%` }} />
          </div>
          
          <div className="flex items-center gap-2">
            <Code className="text-sky-400 w-4 h-4" />
            <span className="text-white font-black tabular-nums text-sm">
              {formatLarge(state.code)}
            </span>
          </div>

          <div className="flex items-center gap-2 border-x border-slate-700/30 px-8">
            <TrendingUp className="text-purple-400 w-4 h-4" />
            <span className="text-white font-black tabular-nums text-sm flex items-center gap-1">
              {totalLegacyPool} 
              <span className="text-purple-400 text-[10px] animate-pulse">
                (+{unclaimedLP})
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="text-amber-400 w-4 h-4" />
            <span className="text-white font-black text-sm tabular-nums">LV.{state.level}</span>
          </div>

          {/* XP Bar */}
          <div className="absolute bottom-0 left-0 h-[3px] bg-amber-500/10 w-full">
            <div className="h-full bg-amber-400 shadow-[0_0_12px_#fbbf24] transition-all duration-300" style={{ width: `${expProgress}%` }} />
          </div>
        </div>

        <div className="flex gap-4 items-center mt-2">
          {/* BUILD STATUS */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2 flex items-center gap-3">
             <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Prod Stability:</div>
             <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${buildProgress >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : buildProgress > 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                    style={{ width: `${buildProgress}%` }} 
                />
             </div>
             <div className={`text-[11px] font-black uppercase ${buildProgress >= 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {buildProgress >= 100 ? 'STABLE' : `${buildProgress.toFixed(0)}%`}
             </div>
          </div>

          <button 
            onClick={onOpenSkills}
            className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center hover:border-pink-500 transition-all shadow-xl group active:scale-95 pointer-events-auto"
          >
            <Cpu className="text-pink-400 w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>

          {buildProgress >= 100 && (
            <button 
                onClick={onShipToProduction}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2.5 rounded-xl font-black uppercase italic tracking-tighter flex flex-col items-center gap-0 shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-1 active:scale-95 pointer-events-auto animate-bounce border-2 border-emerald-300"
            >
                <div className="flex items-center gap-2 text-sm"><Send className="w-4 h-4" /> Ship v{currentVersion + 1}.0</div>
                <div className="text-[9px] opacity-80 font-bold">BONUS: +{Math.floor(unclaimedLP * 0.25)} LP</div>
            </button>
          )}
        </div>
      </div>

      {/* COMPILING OVERLAY */}
      {state.isCompiling && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center z-[500] pointer-events-auto">
             <div className="text-emerald-400 font-black text-6xl mb-12 animate-pulse italic uppercase tracking-tighter">Deploying v{currentVersion + 1}.0</div>
             <div className="flex flex-col gap-4 items-center">
                <div className="text-slate-400 font-mono text-sm uppercase tracking-[0.4em] flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" /> Distributing {unclaimedLP} Legacy Points
                </div>
                <div className="text-slate-400 font-mono text-sm uppercase tracking-[0.4em] flex items-center gap-3 text-emerald-300">
                    <CheckCircle2 className="w-5 h-5" /> Scaling Infrastructure x2.0
                </div>
             </div>
             <div className="mt-16 w-96 h-2 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[loading_2s_ease-in-out_infinite]" />
             </div>
          </div>
      )}

      {/* BUILDER (BOTTOM) */}
      <div className="flex justify-center gap-4 pointer-events-auto mb-6">
        {(Object.entries(TOWER_TYPES) as [keyof typeof TOWER_TYPES, any][]).map(([key, config]) => {
          const towerCount = state.towers.filter(t => t.type === key).length;
          const currentCost = Math.floor(config.cost * Math.pow(COST_MULTIPLIER, towerCount));
          const isUnlocked = !config.requires || state.unlockedTech.includes(config.requires);
          const canAfford = state.code >= currentCost;
          const isActive = activeBuildingType === key;

          return (
            <button
              key={key}
              onClick={() => isUnlocked && onBuildTower(key)}
              disabled={!isUnlocked}
              className={`group relative bg-slate-900/90 backdrop-blur-xl border p-4 rounded-[1.8rem] flex flex-col items-center gap-2 transition-all min-w-[120px] 
                ${isUnlocked ? 'border-slate-700 hover:border-sky-400 hover:-translate-y-2' : 'opacity-30 grayscale cursor-not-allowed'} 
                ${isActive ? 'border-sky-400 ring-4 ring-sky-400/20 bg-sky-950/50 -translate-y-2 shadow-[0_0_30px_rgba(56,189,248,0.2)]' : ''}`}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative transition-transform" style={{ backgroundColor: config.color + '20' }}>
                {key === 'BASIC' && <Shield className="text-sky-400 w-7 h-7" />}
                {key === 'SNIPER' && <Terminal className="text-pink-400 w-7 h-7" />}
                {key === 'RAPID' && <Layers className="text-amber-400 w-7 h-7" />}
                {key === 'AOE' && <Rocket className="text-purple-400 w-7 h-7" />}
                {!isUnlocked && <Lock className="absolute inset-0 m-auto text-white w-5 h-5 opacity-50" />}
              </div>
              <div className="text-center px-1">
                <div className={`text-[10px] font-black uppercase tracking-tight truncate w-full ${isActive ? 'text-sky-400' : 'text-slate-400'}`}>
                  {isUnlocked ? config.name : 'Module Locked'}
                </div>
                <div className={`text-[13px] font-black tabular-nums ${canAfford ? 'text-white' : 'text-red-500'}`}>
                  {formatLarge(currentCost)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* GAME OVER / PERSISTENT UPGRADES */}
      {state.isGameOver && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-start sm:items-center justify-center pointer-events-auto z-[1000] overflow-y-auto no-scrollbar py-12 px-4">
          <div className="bg-slate-900 border border-slate-700 p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_0_120px_rgba(0,0,0,1)] max-w-5xl w-full border-t-red-500/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-16">
              <div className="text-center md:text-left flex flex-col">
                <h1 className="text-6xl sm:text-8xl font-black text-white mb-2 italic uppercase tracking-tighter leading-none">Kernel Panic</h1>
                <p className="text-red-500 mb-6 sm:mb-10 text-lg sm:text-xl font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                   <AlertTriangle className="w-6 h-6" /> Infrastructure Failed v{currentVersion}.0
                </p>
                
                <div className="bg-purple-500/10 border border-purple-500/30 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] mb-6 sm:mb-10 shadow-2xl group">
                  <div className="text-[10px] sm:text-sm text-purple-400 mb-2 uppercase font-black tracking-[0.4em]">Recovered Assets (Consolation)</div>
                  <div className="text-4xl sm:text-6xl font-black text-white tabular-nums flex items-baseline justify-center md:justify-start gap-4">
                    +{Math.floor(unclaimedLP * 0.5)} <span className="text-lg sm:text-xl text-purple-500 font-black tracking-widest italic">LP</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 mt-4 uppercase font-bold italic tracking-widest">50% Recovery Rate on Production Crash</div>
                </div>
                
                <button onClick={onRestart} className="w-full bg-sky-500 hover:bg-sky-400 text-slate-900 font-black py-5 sm:py-7 rounded-[1.5rem] sm:rounded-[2rem] text-xl sm:text-3xl transition-all active:scale-95 shadow-[0_15px_30px_rgba(14,165,233,0.3)] uppercase italic tracking-tighter">Initialize Recovery</button>
              </div>

              <div className="flex flex-col bg-slate-950/40 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-800/50 shadow-inner">
                <h3 className="text-xl sm:text-2xl font-black text-white mb-6 sm:mb-8 flex items-center gap-4 italic uppercase tracking-wider">
                  <Star className="text-amber-400 w-6 h-6 sm:w-7 sm:h-7 fill-amber-400" /> Mastery Shop
                </h3>
                {/* Fixed the scrolling container below */}
                <div className="flex flex-col space-y-4 max-h-[300px] sm:max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                  {[
                    { id: 'startingCode', name: 'Seed Capital', desc: '+150K Starting LOC', icon: <Database className="text-sky-400 w-5 h-5" /> },
                    { id: 'damageMultiplier', name: 'Overclocked CPUs', desc: 'Global Damage x12', icon: <Zap className="text-amber-400 w-5 h-5" /> },
                    { id: 'xpMultiplier', name: 'AI Optimization', desc: 'Global XP x12', icon: <TrendingUp className="text-purple-400 w-5 h-5" /> },
                  ].map(upg => (
                    <button 
                      key={upg.id} 
                      onClick={() => onBuyPermanent(upg.id as any)} 
                      disabled={state.permanentUpgrades.legacyPoints < 100} 
                      className="w-full p-4 sm:p-6 bg-slate-900/90 border border-slate-700/50 rounded-2xl hover:border-sky-400 flex justify-between items-center group disabled:opacity-25 transition-all hover:scale-[1.03] active:scale-95 flex-shrink-0"
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="p-3 sm:p-4 bg-slate-800 rounded-xl group-hover:bg-slate-700 transition-colors shadow-lg">{upg.icon}</div>
                        <div className="text-left">
                          <div className="text-white font-black text-sm sm:text-base uppercase tracking-tight">{upg.name}</div>
                          <div className="text-slate-500 text-[10px] sm:text-[12px] font-bold tracking-wide italic">{upg.desc}</div>
                        </div>
                      </div>
                      <div className="bg-slate-950 text-purple-400 text-[10px] sm:text-xs px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-black border border-purple-500/40 shadow-inner">100 LP</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
