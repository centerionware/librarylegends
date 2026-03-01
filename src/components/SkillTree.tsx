
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameState, TechNode } from '@/src/types';
import { ALL_SKILLS, TECH_TREE } from '@/src/constants';
import { Cpu, X, Zap, Target, MousePointer2, Shield, Code, Award, Sparkles, RefreshCcw, LayoutGrid, Share2 } from 'lucide-react';

interface Props {
  state: GameState;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (skillId: string) => void;
  onReroll: () => void;
}

const SkillTree: React.FC<Props> = ({ state, isOpen, onClose, onUpgrade, onReroll }) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'tree'>('tree');
  const scrollRef = useRef<HTMLDivElement>(null);
  const repeatTimerRef = useRef<number | null>(null);
  const accelerationRef = useRef<number>(0);
  const [isInjecting, setIsInjecting] = useState(false);

  // We use standard function declarations here to ensure they are hoisted 
  // and available even if referenced early in the component lifecycle.
  function stopRepeating() {
    if (repeatTimerRef.current !== null) {
      window.clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    accelerationRef.current = 0;
    setIsInjecting(false);
  }

  function startRepeating(skillId: string, canAfford: boolean) {
    if (!canAfford) return;
    
    setIsInjecting(true);
    // Initial trigger
    onUpgrade(skillId);

    const repeat = () => {
      onUpgrade(skillId);
      
      // Accelerated interval: 100ms down to a blistering 20ms floor
      accelerationRef.current = Math.min(accelerationRef.current + 1, 15);
      const nextInterval = Math.max(20, 100 - accelerationRef.current * 8);
      
      repeatTimerRef.current = window.setTimeout(repeat, nextInterval);
    };

    // 250ms initial wait before going into turbo mode
    repeatTimerRef.current = window.setTimeout(repeat, 250);
  }
  
  // Cleanup on unmount or tab change
  useEffect(() => {
    return () => stopRepeating();
  }, [activeTab]);

  if (!isOpen) return null;

  // Filter skills: only show if not oneTime or not already unlocked
  const currentShopSkills = ALL_SKILLS.filter(s => 
    state.availableSkills.includes(s.id) && 
    (!s.oneTime || !state.unlockedSkills.includes(s.id))
  );

  const getIcon = (id: string) => {
    if (id.includes('click')) return <MousePointer2 className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (id.includes('range')) return <Target className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (id.includes('dmg')) return <Zap className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (id.includes('collect')) return <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (id.includes('code_gen')) return <Code className="w-5 h-5 sm:w-6 sm:h-6" />;
    if (id.includes('shield')) return <Shield className="w-5 h-5 sm:w-6 sm:h-6" />;
    return <Award className="w-5 h-5 sm:w-6 sm:h-6" />;
  };

  const isTechUnlocked = (id: string) => state.unlockedTech.includes(id);
  const canUnlockTech = (tech: TechNode) => {
    if (isTechUnlocked(tech.id)) return false;
    if (tech.dependsOn && !isTechUnlocked(tech.dependsOn)) return false;
    return state.skillPoints >= tech.cost;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 bg-slate-950/90 backdrop-blur-xl pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Tabs */}
        <div className="flex bg-slate-800/50 p-1 rounded-t-3xl border-b border-slate-700">
          <button 
            onClick={() => setActiveTab('tree')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-black uppercase text-xs sm:text-sm tracking-widest transition-all rounded-t-2xl
              ${activeTab === 'tree' ? 'bg-slate-900 text-sky-400 shadow-[0_-4px_0_0_#38bdf8]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Share2 size={16} /> Tech Stack
          </button>
          <button 
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-black uppercase text-xs sm:text-sm tracking-widest transition-all rounded-t-2xl
              ${activeTab === 'shop' ? 'bg-slate-900 text-pink-400 shadow-[0_-4px_0_0_#f472b6]' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutGrid size={16} /> Dependencies
          </button>
        </div>

        {/* Header */}
        <div className="p-4 sm:p-6 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white italic leading-tight uppercase">
              {activeTab === 'tree' ? 'Global Infrastructure' : 'External Modules'}
            </h2>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              {state.skillPoints.toLocaleString()} Skill Points Available
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-all border border-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div ref={scrollRef} className="flex-grow overflow-auto p-4 sm:p-8 no-scrollbar bg-slate-950/30">
          
          {/* TECH TREE TAB */}
          {activeTab === 'tree' && (
            <div className="relative min-h-[700px] w-full min-w-[600px] flex justify-center">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {TECH_TREE.map(node => {
                  if (!node.dependsOn) return null;
                  const parent = TECH_TREE.find(p => p.id === node.dependsOn);
                  if (!parent) return null;
                  const isLinkActive = isTechUnlocked(node.id);
                  const isLinkAvailable = isTechUnlocked(parent.id);
                  return (
                    <line
                      key={`${parent.id}-${node.id}`}
                      x1={`${parent.position.x}%`}
                      y1={`${parent.position.y}px`}
                      x2={`${node.position.x}%`}
                      y2={`${node.position.y}px`}
                      stroke={isLinkActive ? '#38bdf8' : isLinkAvailable ? '#334155' : '#0f172a'}
                      strokeWidth={isLinkActive ? "4" : "2"}
                      strokeDasharray={isLinkActive ? "0" : "5,5"}
                      className="transition-all duration-500"
                    />
                  );
                })}
              </svg>

              {TECH_TREE.map(node => {
                const unlocked = isTechUnlocked(node.id);
                const available = canUnlockTech(node);
                return (
                  <div
                    key={node.id}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${node.position.x}%`, top: `${node.position.y}px` }}
                  >
                    <button
                      disabled={!available || unlocked}
                      onPointerDown={() => available && !unlocked && startRepeating(node.id, true)}
                      onPointerUp={stopRepeating}
                      onPointerLeave={stopRepeating}
                      className={`
                        w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all group relative
                        ${unlocked ? 'bg-sky-500 border-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.4)]' : 
                          available ? 'bg-slate-800 border-slate-600 hover:border-sky-400 hover:scale-110 active:scale-95 active:bg-slate-700' : 
                          'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed'}
                      `}
                    >
                      <Cpu size={unlocked ? 28 : 24} className={unlocked ? 'text-white' : 'text-slate-400'} />
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-slate-800 border border-slate-700 p-3 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-2xl">
                        <div className="text-[11px] font-black text-sky-400 uppercase mb-1">{node.name}</div>
                        <div className="text-[10px] text-slate-300 leading-tight font-medium">{node.description}</div>
                        {!unlocked && <div className="mt-2 text-[9px] font-black text-amber-500">REQUIREMENT: {node.cost} SP</div>}
                        {unlocked && <div className="mt-2 text-[9px] font-black text-green-400">STATUS: DEPLOYED</div>}
                      </div>
                      {!unlocked && node.cost > 0 && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg">
                          {node.cost}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* SHOP TAB */}
          {activeTab === 'shop' && (
            <div className="flex flex-col gap-6">
              {currentShopSkills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <LayoutGrid size={48} className="mb-4 opacity-20" />
                  <div className="text-sm font-bold uppercase tracking-widest">No dependencies found</div>
                  <div className="text-xs opacity-60">Reroll to fetch new versions</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentShopSkills.map((skill) => {
                    const canAfford = state.skillPoints >= skill.cost;
                    return (
                      <button
                        key={skill.id}
                        onPointerDown={() => canAfford && startRepeating(skill.id, true)}
                        onPointerUp={stopRepeating}
                        onPointerLeave={stopRepeating}
                        disabled={!canAfford}
                        className={`
                          text-left p-6 rounded-2xl border transition-all relative group flex flex-col justify-between h-52
                          ${canAfford 
                            ? 'border-slate-700 bg-slate-800/40 hover:border-pink-400 hover:-translate-y-2 active:scale-95 active:bg-slate-700/60 shadow-lg hover:shadow-pink-500/10' 
                            : 'border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed'}
                        `}
                      >
                        <div>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 
                            ${skill.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' : 
                              skill.rarity === 'rare' ? 'bg-amber-500/20 text-amber-400' : 'bg-pink-500/20 text-pink-400'}`}>
                            {getIcon(skill.id)}
                          </div>
                          <h3 className="text-sm font-black text-white leading-tight mb-1 uppercase tracking-tight">{skill.name}</h3>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{skill.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter bg-slate-700 text-slate-300">
                            {skill.rarity}
                          </span>
                          <div className="font-black text-white text-xs uppercase flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-400" /> {skill.cost} SP
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex flex-col items-center gap-4">
                <button
                  onClick={onReroll}
                  disabled={state.code < state.rerollCost}
                  className={`
                    flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-2xl
                    ${state.code >= state.rerollCost
                      ? 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-pink-400 hover:border-pink-500 shadow-pink-500/5'
                      : 'bg-slate-900/50 text-slate-700 cursor-not-allowed opacity-50 border-2 border-transparent'}
                  `}
                >
                  <RefreshCcw className="w-5 h-5" />
                  <span>Update Dependencies</span>
                  <span className="opacity-60">({state.rerollCost} LOC)</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className={`p-4 bg-slate-950/80 text-center text-[9px] font-bold uppercase tracking-[0.4em] border-t border-slate-800 flex-shrink-0 transition-colors ${isInjecting ? 'text-sky-400 animate-pulse' : 'text-slate-600'}`}>
          HOLD TO AUTO-INJECT SKILL POINTS. ACCELERATION ACTIVE.
        </div>
      </div>
    </div>
  );
};

export default SkillTree;
