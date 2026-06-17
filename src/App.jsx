import React, { useState, useEffect } from 'react';
import { initGame, tickGame, applyAction, calculateTotalPowerDraw } from './game/engine.js';
import GpuFloor from './components/GpuFloor.jsx';
import ContextPipeline from './components/ContextPipeline.jsx';
import CompilerLab from './components/CompilerLab.jsx';
import AgentMesh from './components/AgentMesh.jsx';
import MissionControl from './components/MissionControl.jsx';
import HowToPlayModal from './components/HowToPlayModal.jsx';
import ContractsBoard from './components/ContractsBoard.jsx';

export default function App() {
  const [gameState, setGameState] = useState(() => {
    // Try loading save from localStorage first
    try {
      const saved = localStorage.getItem('tensortycoon_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reconstruct Set from array
        parsed.activeOptimizations = new Set(parsed.activeOptimizations);
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to load save, starting fresh.", e);
    }
    return initGame();
  });
  
  const [activeTab, setActiveTab] = useState('gpu');
  const [isPaused, setIsPaused] = useState(false);

  // Modulo-decrement rAF accumulator game tick loop
  useEffect(() => {
    if (isPaused) return;

    let lastTime = performance.now();
    let accumulator = 0;
    let frameId;

    const loop = (time) => {
      const elapsed = time - lastTime;
      lastTime = time;

      // Accumulate frame delta
      accumulator += elapsed;
      let didTick = false;

      setGameState(prev => {
        // Stop ticking if stress test is complete
        if (prev.stressTestCompleted && !prev.stressTestActive) {
          return prev;
        }

        let stateCopy = prev;
        let tempAccumulator = accumulator;

        // Perform discrete 1-second ticks
        while (tempAccumulator >= 1000) {
          stateCopy = tickGame(stateCopy);
          tempAccumulator -= 1000;
          didTick = true;
        }
        
        accumulator = tempAccumulator;

        // Auto-save during active stress test every 10 ticks
        if (didTick && stateCopy.stressTestActive && stateCopy.tick % 10 === 0) {
          try {
            const copyForSave = {
              ...stateCopy,
              activeOptimizations: Array.from(stateCopy.activeOptimizations) // convert to array for JSON serialization
            };
            localStorage.setItem('tensortycoon_save', JSON.stringify(copyForSave));
          } catch (err) {
            console.error("Autosave failed:", err);
          }
        }

        return stateCopy;
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPaused]);

  // Dispatch game action helper
  const dispatch = (action) => {
    setGameState(prev => {
      const next = applyAction(prev, action);
      
      // Save game on critical user actions
      if (action.type === "BUY_GPU" || action.type === "BUY_RACK" || action.type === "BUY_OPTIMIZATION") {
        try {
          const copyForSave = {
            ...next,
            activeOptimizations: Array.from(next.activeOptimizations)
          };
          localStorage.setItem('tensortycoon_save', JSON.stringify(copyForSave));
        } catch (err) {
          console.error("Save failed:", err);
        }
      }
      return next;
    });
  };

  // Manual Save Game helper
  const handleSave = () => {
    try {
      const copyForSave = {
        ...gameState,
        activeOptimizations: Array.from(gameState.activeOptimizations)
      };
      localStorage.setItem('tensortycoon_save', JSON.stringify(copyForSave));
      dispatch({ type: "LOG", payload: { type: "system", text: "💾 Game saved successfully to localStorage." } });
    } catch (e) {
      alert("Failed to save game to browser storage.");
    }
  };

  // Manual Load Game helper
  const handleLoad = () => {
    try {
      const saved = localStorage.getItem('tensortycoon_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.activeOptimizations = new Set(parsed.activeOptimizations);
        setGameState(parsed);
        dispatch({ type: "LOG", payload: { type: "system", text: "📂 Game state loaded successfully from localStorage." } });
      } else {
        alert("No saved game found in browser storage.");
      }
    } catch (e) {
      alert("Failed to load game from browser storage.");
    }
  };

  // Calculate total power consumption
  const totalPower = calculateTotalPowerDraw(gameState);

  const powerLimit = 5000; // 5000W limit

  return (
    <div className="app-container">
      {/* Background ambient lighting */}
      <div className="ambient-glow glow-green"></div>
      <div className="ambient-glow glow-indigo"></div>

      {/* Main header dashboard */}
      <header className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ color: 'var(--nvidia-green)', margin: 0, fontSize: '24px', textShadow: '0 0 10px var(--nvidia-green-glow)' }}>
            NVIDIA TENSORTYCOON
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>
            GPU Context Optimizer Simulation
          </p>
        </div>

        <div className="flex-gap-md" style={{ flexWrap: 'wrap' }}>
          {/* Tensors Reward Balance */}
          <div className="panel" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', borderColor: '#272a37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>TENSORS:</span>
            <span style={{ color: 'var(--nvidia-green)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px' }}>
              {gameState.tensors.toLocaleString()} T
            </span>
          </div>

          {/* Power Monitor */}
          <div className="panel" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', borderColor: totalPower > powerLimit ? 'var(--neon-red)' : '#272a37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>POWER:</span>
            <span style={{ color: totalPower > powerLimit ? 'var(--neon-red)' : 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {totalPower}W / {powerLimit}W
            </span>
          </div>

          {/* Game Clock */}
          <div className="panel" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', borderColor: '#272a37', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>TICK:</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {gameState.tick}s {gameState.stressTestActive && <span style={{ color: 'var(--neon-red)', fontSize: '11px', marginLeft: '4px' }}>(STRESS TEST ACTIVE)</span>}
            </span>
          </div>

          {/* Controls */}
          <div className="flex-gap-sm">
            <button className="btn btn-secondary" onClick={() => dispatch({ type: "OPEN_GUIDE" })} title="Open How-To-Play Guide">
              ❓ Guide
            </button>
            <button className="btn btn-secondary" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn btn-secondary" onClick={handleSave} title="Save to local storage">
              💾 Save
            </button>
            <button className="btn btn-secondary" onClick={handleLoad} title="Load from local storage">
              📂 Load
            </button>
            <button className="btn btn-secondary" style={{ borderColor: 'var(--neon-red-glow)', color: 'var(--neon-red)' }} onClick={() => { if(confirm("Reset entire simulation?")) dispatch({ type: "RESET_GAME" }); }}>
              ↺ Reset
            </button>
          </div>
        </div>
      </header>

      {/* Tabs navigation */}
      <nav className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'gpu' ? 'active' : ''}`}
          onClick={() => setActiveTab('gpu')}
        >
          ⚙️ GPU Floor <span className="tab-badge tab-badge-nemo">NIM</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          📋 Contracts Board <span className="tab-badge tab-badge-nemo">SLA</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          🔀 Context Pipeline <span className="tab-badge tab-badge-nemo">NeMo Retriever</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'compiler' ? 'active' : ''}`}
          onClick={() => setActiveTab('compiler')}
        >
          💻 Compiler Lab <span className="tab-badge tab-badge-nemo">OpenACC</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mesh' ? 'active' : ''}`}
          onClick={() => setActiveTab('mesh')}
        >
          🕸️ Agent Mesh <span className="tab-badge tab-badge-nemo">NeMo Guardrails</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          📊 Mission Control <span className="tab-badge tab-badge-nemo">NeMo Evaluator</span>
        </button>
      </nav>

      {/* Main tab content */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', flexGrow: 1, alignItems: 'stretch' }}>
        <main className="panel" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'gpu' && <GpuFloor gameState={gameState} dispatch={dispatch} />}
          {activeTab === 'contracts' && <ContractsBoard gameState={gameState} dispatch={dispatch} />}
          {activeTab === 'pipeline' && <ContextPipeline gameState={gameState} dispatch={dispatch} />}
          {activeTab === 'compiler' && <CompilerLab gameState={gameState} dispatch={dispatch} />}
          {activeTab === 'mesh' && <AgentMesh gameState={gameState} dispatch={dispatch} />}
          {activeTab === 'control' && <MissionControl gameState={gameState} dispatch={dispatch} />}
        </main>

        {/* Live event logs panel */}
        <aside className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '600px' }}>
          <h3 style={{ color: 'var(--text-primary)', borderBottom: '1px solid #272a37', paddingBottom: '8px', marginBottom: '12px', fontSize: '15px' }}>
            DECISION LOG & METRIC TRACE
          </h3>
          <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', fontSize: '12px' }}>
            {gameState.logs.map((log, idx) => {
              let dotColor = 'var(--text-muted)';
              if (log.type === 'error') dotColor = 'var(--neon-red)';
              if (log.type === 'success') dotColor = 'var(--neon-green)';
              if (log.type === 'warning') dotColor = 'var(--neon-amber)';
              if (log.type === 'purchase') dotColor = 'var(--nvidia-green)';
              if (log.type === 'cache') dotColor = 'var(--accent-cyan)';
              if (log.type === 'dispatch') dotColor = 'var(--accent-indigo)';
              if (log.type === 'compile') dotColor = 'var(--neon-purple)';

              return (
                <div key={idx} className="flex-gap-sm" style={{ alignItems: 'flex-start', paddingBottom: '4px', borderBottom: '1px dashed rgba(255,255,255,0.03)' }}>
                  <span style={{ color: dotColor, fontWeight: 'bold' }}>●</span>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginRight: '6px' }}>
                      [{log.tick}s]
                    </span>
                    <span style={{ color: log.type === 'error' ? 'var(--neon-red)' : 'var(--text-secondary)' }}>
                      {log.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
      
      {gameState.showHowToPlay && (
        <HowToPlayModal onClose={() => dispatch({ type: "CLOSE_GUIDE" })} />
      )}
    </div>
  );
}
