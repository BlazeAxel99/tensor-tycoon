import React, { useState, useEffect } from 'react';
import { Briefcase, Zap, CheckCircle, AlertTriangle, RefreshCw, Cpu, Database, Server } from 'lucide-react';
import { MILESTONES } from '../game/types.js';

export default function ContractsBoard({ gameState, dispatch }) {
  // Store selected GPU slot per contract ID
  const [selectedSlots, setSelectedSlots] = useState({});

  // Helper to list all idle GPU slots
  const getIdleSlots = () => {
    const slots = [];
    gameState.racks.forEach(rack => {
      if (rack.isOffline) return;
      rack.gpus.forEach((gpu, idx) => {
        if (gpu.activeJobId === null) {
          slots.push({
            id: `${rack.id}-${idx}`,
            name: `${rack.name} - Slot ${idx + 1} (${gpu.name})`,
            vram: gpu.vram,
            kvCache: gpu.kvCache
          });
        }
      });
    });
    return slots;
  };

  const idleSlots = getIdleSlots();

  // Set default selected slot for each contract if not set
  useEffect(() => {
    if (idleSlots.length > 0) {
      const updated = { ...selectedSlots };
      let changed = false;
      gameState.availableContracts.forEach(contract => {
        if (!updated[contract.id] || !idleSlots.find(s => s.id === updated[contract.id])) {
          // Find matching slot with warm cache first
          const bestSlot = idleSlots.find(s => 
            s.kvCache.some(entry => entry.prefixGroup === contract.prefixGroup)
          );
          updated[contract.id] = bestSlot ? bestSlot.id : idleSlots[0].id;
          changed = true;
        }
      });
      if (changed) {
        setSelectedSlots(updated);
      }
    }
  }, [gameState.availableContracts, idleSlots]);

  // Handle contract acceptance
  const handleAcceptContract = (contractId) => {
    const gpuSlot = selectedSlots[contractId];
    if (!gpuSlot) return;
    dispatch({
      type: "ACCEPT_CONTRACT",
      payload: { contractId, gpuSlot }
    });
  };

  // Handle board refresh
  const handleRefreshContracts = () => {
    dispatch({ type: "REFRESH_CONTRACTS" });
  };

  // Get active milestone details
  const milestone = MILESTONES.find(m => m.id === gameState.currentMilestone) || MILESTONES[0];
  const progressPct = Math.min(100, Math.round((gameState.tensors / milestone.target) * 100));

  // Check if a slot has warm cache for a prefix group
  const hasWarmCache = (slot, prefixGroup) => {
    // Find slot in rack
    const [rackId, gpuIdx] = slot.split("-").map(Number);
    const rack = gameState.racks.find(r => r.id === rackId);
    if (!rack || rack.isOffline) return false;
    const gpu = rack.gpus[gpuIdx];
    if (!gpu) return false;

    const cacheTtl = gameState.activeOptimizations.has("prefix_cache") ? 50 : 30;
    return gpu.kvCache.some(e => e.prefixGroup === prefixGroup && (gameState.tick - e.tickCached) < cacheTtl);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Milestone Progress Board */}
      <div className="panel panel-glowing-green" style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex-between" style={{ marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--nvidia-green)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
              CURRENT FUNDING ROUND
            </span>
            <h3 style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', fontSize: '18px' }}>
              Round {gameState.currentMilestone}: {milestone.name}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
              {milestone.description}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>ROUND GOAL:</span>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--nvidia-green)', fontSize: '18px' }}>
              {gameState.tensors.toLocaleString()} / {milestone.target.toLocaleString()} T
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '10px', background: '#1e2230', borderRadius: '5px', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--nvidia-green), #a3e635)', transition: 'width 0.5s ease' }}></div>
        </div>
        <div className="flex-between" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>Startup Valuation: {progressPct}% toward next scale-up round</span>
          <span>Target: {milestone.target.toLocaleString()} Tensors</span>
        </div>
      </div>

      {/* Contracts Board Header */}
      <div className="flex-between" style={{ borderBottom: '1px solid #272a37', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ color: 'var(--nvidia-green)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px' }}>
            <Briefcase size={20} /> CORPORATE CONTRACTS MARKET
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Sign service agreements, route context workloads, and match GPU warm cache pools to maximize margins.
          </p>
        </div>
        
        <button 
          className="btn btn-secondary" 
          onClick={handleRefreshContracts}
          disabled={gameState.tensors < 200}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px' }}
        >
          <RefreshCw size={14} /> Refresh Board (-200 T)
        </button>
      </div>

      {/* Contracts Market Cards */}
      <div className="grid-3">
        {gameState.availableContracts.map((contract) => {
          const selectedSlot = selectedSlots[contract.id] || "";
          
          // Check cache affinity on selected slot
          const isCached = selectedSlot ? hasWarmCache(selectedSlot, contract.prefixGroup) : false;

          // Find if ANY slot has a warm cache
          const warmSlot = gameState.racks.flatMap((r, rIdx) => 
            r.isOffline ? [] : r.gpus.map((g, gIdx) => ({
              id: `${r.id}-${gIdx}`,
              gpu: g,
              hasCache: g.kvCache.some(e => e.prefixGroup === contract.prefixGroup && (gameState.tick - e.tickCached) < (gameState.activeOptimizations.has("prefix_cache") ? 50 : 30))
            }))
          ).find(s => s.hasCache);

          return (
            <div key={contract.id} className="panel flex-column" style={{ 
              borderColor: isCached ? 'var(--nvidia-green)' : '#272a37',
              background: isCached ? 'rgba(118, 185, 0, 0.02)' : 'rgba(18, 20, 26, 0.5)',
              padding: '16px',
              minHeight: '340px',
              justifyContent: 'space-between'
            }}>
              <div>
                <div className="flex-between">
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    CLIENT: {contract.client}
                  </span>
                  {warmSlot && (
                    <span className="tab-badge" style={{ background: 'rgba(118,185,0,0.1)', color: 'var(--nvidia-green)', borderColor: 'var(--nvidia-green-glow)', border: '1px solid' }}>
                      ⚡ Cache Warm
                    </span>
                  )}
                </div>
                <h4 style={{ color: 'var(--text-primary)', margin: '4px 0 8px 0', fontSize: '15px' }}>
                  {contract.name}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.4', minHeight: '32px' }}>
                  {contract.description}
                </p>

                {/* Contract details table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px', background: '#0b0c10', borderRadius: 'var(--border-radius-sm)', border: '1px solid #1e2230', fontSize: '12px', marginBottom: '16px' }}>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Context Size:</span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{(contract.contextTokens / 1000).toFixed(0)}k tokens</span>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>SLA Target:</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>&le; {contract.targetSlaSeconds}s</span>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>SLA Reward:</span>
                    <span style={{ color: 'var(--nvidia-green)', fontWeight: 'bold' }}>+{contract.tensorReward} T</span>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-secondary)' }}>Breach Penalty:</span>
                    <span style={{ color: 'var(--neon-red)' }}>-{contract.penalty} T</span>
                  </div>
                </div>

                {/* Affinity detector hint */}
                {warmSlot && (
                  <div className="panel" style={{ padding: '8px 10px', fontSize: '11px', borderStyle: 'dotted', borderColor: 'var(--nvidia-green)', background: 'rgba(118, 185, 0, 0.03)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Zap size={12} style={{ color: 'var(--nvidia-green)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)' }}>
                      Warm cache on **Rack {warmSlot.id.split('-')[0]} Slot {Number(warmSlot.id.split('-')[1])+1}** reduces VRAM & latency!
                    </span>
                  </div>
                )}
              </div>

              <div>
                {/* Routing deployment slot dropdown */}
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  DEPLOYMENT TARGET SLOT:
                </label>
                {idleSlots.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlots({ ...selectedSlots, [contract.id]: e.target.value })}
                      style={{
                        background: '#0b0c10',
                        color: 'var(--text-primary)',
                        border: '1px solid #272a37',
                        padding: '8px 12px',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        outline: 'none',
                        width: '100%'
                      }}
                    >
                      {idleSlots.map(s => {
                        const isSlotWarm = s.kvCache.some(e => e.prefixGroup === contract.prefixGroup && (gameState.tick - e.tickCached) < (gameState.activeOptimizations.has("prefix_cache") ? 50 : 30));
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} {isSlotWarm ? "⚡ [WARM]" : ""}
                          </option>
                        );
                      })}
                    </select>

                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAcceptContract(contract.id)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: 600 }}
                    >
                      🚀 Sign & Route Contract
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '10px', border: '1px solid #3c1e22', background: 'rgba(239, 68, 68, 0.03)', borderRadius: 'var(--border-radius-sm)', color: 'var(--neon-red)', fontSize: '11px', textAlign: 'center' }}>
                    All GPUs active. Wait for a slot to clear.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Contracts / SLA Tracking Section */}
      <div className="panel" style={{ marginTop: '12px' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', borderBottom: '1px solid #1e2230', paddingBottom: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} style={{ color: 'var(--accent-indigo)' }} /> ACTIVE COMPUTATION SLAs ({gameState.activeWorkloads.length + gameState.workloadsQueue.length})
        </h3>
        
        {gameState.activeWorkloads.length === 0 && gameState.workloadsQueue.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No active computational contracts running. Sign new agreements above to begin.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Display workloadsQueue */}
            {gameState.workloadsQueue.map((job, idx) => (
              <div key={job.id || idx} className="panel" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderColor: '#1e2230', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 120px', gap: '16px', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13px', display: 'block' }}>{job.name}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Client: {job.client}</span>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Route Slot:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>GPU {job.assignedGpuSlot || "AUTO"}</strong>
                </div>
                <div style={{ fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SLA Target:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>{job.targetSlaSeconds}s</span>
                </div>
                <div>
                  <span className="tab-badge" style={{ background: '#1e2230', color: 'var(--text-muted)' }}>Queued / Buffering</span>
                </div>
                <div style={{ height: '6px', background: '#1e2230', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '0%', height: '100%', background: 'var(--text-muted)' }}></div>
                </div>
              </div>
            ))}

            {/* Display activeWorkloads */}
            {gameState.activeWorkloads.map((aw) => {
              const totalTicks = aw.job.duration || 5;
              const elapsedTicks = totalTicks - aw.ticksRemaining;
              const pct = Math.min(100, Math.round((elapsedTicks / totalTicks) * 100));

              return (
                <div key={aw.id} className="panel pulse-glow-green" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderColor: 'var(--nvidia-green)', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 120px', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '13px', display: 'block' }}>{aw.job.name}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Client: {aw.job.client}</span>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Route Slot:</span>
                    <strong style={{ color: 'var(--accent-cyan)', marginLeft: '4px' }}>GPU {aw.assignedGpuSlot || "1-0"}</strong>
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SLA Target:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>&le; {aw.job.targetSlaSeconds}s</span>
                  </div>
                  <div>
                    <span className="tab-badge" style={{ background: 'rgba(118,185,0,0.1)', color: 'var(--nvidia-green)', borderColor: 'var(--nvidia-green-glow)' }}>
                      ● Active Processing
                    </span>
                  </div>
                  <div>
                    <div style={{ width: '100%', height: '6px', background: '#1e2230', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--nvidia-green)' }}></div>
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                      {aw.ticksRemaining} ticks left
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
