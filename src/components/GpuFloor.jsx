import React, { useState } from 'react';
import { Cpu, Layers, Zap, Thermometer, Trash2, PlusCircle, Server, RefreshCw } from 'lucide-react';
import { GPU_CATALOG, OPTIMIZATION_CATALOG } from '../game/types.js';
import { calculateRackTemperature } from '../game/engine.js';

export default function GpuFloor({ gameState, dispatch }) {
  const [selectedGpuType, setSelectedGpuType] = useState('L40S');
  const [selectedRackId, setSelectedRackId] = useState(1);

  const handleBuyGpu = (rackId) => {
    dispatch({
      type: "BUY_GPU",
      payload: { rackId, gpuType: selectedGpuType }
    });
  };

  const handleBuyRack = () => {
    dispatch({ type: "BUY_RACK" });
  };

  const handleFlushCache = (rackId, gpuIndex) => {
    dispatch({
      type: "FLUSH_CACHE",
      payload: { rackId, gpuIndex }
    });
  };

  // Check if Context Library is active (permanent 8GB VRAM reservation)
  const isLibraryActive = gameState.activeOptimizations.has("ctx_library");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab Intro and Purchase controls */}
      <div className="flex-between" style={{ borderBottom: '1px solid #272a37', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--nvidia-green)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Server size={24} /> GPU FLOOR CONTROLLER
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Scale hardware infrastructure, monitor VRAM cache hit pools, and manage power/thermal loads.
          </p>
        </div>

        <div className="flex-gap-md" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 20px', borderRadius: 'var(--border-radius-md)', border: '1px solid #1e2230', alignItems: 'center' }}>
          <div className="flex-gap-sm">
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>PURCHASE HARDWARE:</span>
            <select 
              value={selectedGpuType} 
              onChange={(e) => setSelectedGpuType(e.target.value)}
              style={{ background: '#0b0c10', color: 'var(--text-primary)', border: '1px solid #272a37', padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', outline: 'none' }}
            >
              {Object.keys(GPU_CATALOG).map(key => (
                <option key={key} value={key}>
                  {GPU_CATALOG[key].name} ({GPU_CATALOG[key].vram}GB VRAM / {GPU_CATALOG[key].cost} T)
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={() => handleBuyGpu(selectedRackId)}>
            <PlusCircle size={16} /> Deploy GPU
          </button>
        </div>
      </div>

      {/* Hardware catalog summary row */}
      <div className="grid-4">
        {Object.keys(GPU_CATALOG).map(key => {
          const gpu = GPU_CATALOG[key];
          return (
            <div key={key} className="panel" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderColor: '#1e2230', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>{gpu.name}</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>VRAM: <strong style={{ color: 'var(--accent-cyan)' }}>{gpu.vram} GB</strong></span>
                <span>Cache Pool: <strong style={{ color: 'var(--accent-indigo)' }}>{gpu.cachePool} GB</strong></span>
                <span>Compute: <strong>{gpu.tflops} TFLOPS</strong></span>
                <span>Peak Power: <strong>{gpu.peakPower}W</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Racks grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }}>
        {gameState.racks.map(rack => {
          const rackTemp = calculateRackTemperature(rack);
          const totalRackPower = rack.isOffline ? 0 : rack.gpus.reduce((sum, g) => {
            const isActive = g.activeJobId !== null;
            let power = isActive ? g.peakPower : g.idlePower;
            if (gameState.activeOptimizations.has("prefix_cache")) power += 15;
            if (gameState.activeOptimizations.has("acc_parallel") && isActive) power += 50;
            return sum + power;
          }, 0);

          // Determine temperature color indicators
          let tempColor = 'var(--neon-green)';
          let tempStatus = 'Healthy';
          if (rack.isOffline) {
            tempColor = 'var(--text-muted)';
            tempStatus = 'OFFLINE (OVERLOAD)';
          } else if (rackTemp >= 65 && rackTemp < 80) {
            tempColor = 'var(--neon-amber)';
            tempStatus = 'Warning';
          } else if (rackTemp >= 80 && rackTemp < 95) {
            tempColor = 'var(--neon-red)';
            tempStatus = 'THROTTLED (80°C)';
          } else if (rackTemp >= 95) {
            tempColor = 'var(--neon-red)';
            tempStatus = 'CRITICAL OVERHEAT';
          }

          return (
            <div key={rack.id} className="panel panel-glowing-green" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', borderLeft: `4px solid ${tempColor}` }}>
              {/* Rack Specs Column */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #1e2230', paddingRight: '20px' }}>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={18} /> {rack.name}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RACK HARDWARE CONTROL INDEX</span>

                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Temperature gauge */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex-between" style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>TEMPERATURE:</span>
                        <span style={{ color: tempColor, fontWeight: 'bold' }}>{rackTemp.toFixed(1)}°C</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#1e2230', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (rackTemp / 100) * 100)}%`, height: '100%', background: tempColor, transition: 'width 0.5s ease' }}></div>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>STATUS: {tempStatus}</span>
                    </div>

                    {/* Rack power */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex-between" style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>POWER DRAW:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{totalRackPower}W</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Peak load draw capacity: 2000W per rack</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>TARGET FOR DEPLOYMENT:</label>
                  <button 
                    className={`btn ${selectedRackId === rack.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setSelectedRackId(rack.id)}
                  >
                    {selectedRackId === rack.id ? '✓ Active Rack Target' : 'Select Target'}
                  </button>
                </div>
              </div>

              {/* Racks slots grid */}
              <div>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>DEPLOYED GPU RACK SLOTS (4 MAX):</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {/* Render 4 slots */}
                  {Array.from({ length: 4 }).map((_, index) => {
                    const gpu = rack.gpus[index];
                    const slotAddress = `${rack.id}-${index}`;
                    
                    if (!gpu) {
                      return (
                        <div key={index} className="panel" style={{ borderStyle: 'dashed', background: 'transparent', borderColor: '#272a37', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px', padding: '16px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>SLOT {index + 1}: EMPTY</span>
                          <button 
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => {
                              setSelectedRackId(rack.id);
                              handleBuyGpu(rack.id);
                            }}
                          >
                            + Deploy Here
                          </button>
                        </div>
                      );
                    }

                    // Calculate cache fill ratio
                    const cacheLimit = gpu.cachePool * 2000;
                    const cacheUsed = gpu.kvCache.reduce((sum, e) => sum + e.tokenCount, 0);
                    const cachePct = Math.min(100, Math.round((cacheUsed / cacheLimit) * 100));

                    return (
                      <div key={index} className={`panel ${gpu.activeJobId ? 'pulse-glow-green' : ''}`} style={{ background: '#12141a', borderColor: gpu.activeJobId ? 'var(--nvidia-green)' : '#272a37', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', padding: '12px 16px' }}>
                        <div>
                          <div className="flex-between">
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              <Cpu size={14} style={{ color: 'var(--nvidia-green)' }} /> {gpu.name}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SLOT {slotAddress}</span>
                          </div>

                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                            <div className="flex-between">
                              <span style={{ color: 'var(--text-secondary)' }}>STATUS:</span>
                              <span style={{ color: gpu.activeJobId ? 'var(--neon-green)' : 'var(--text-muted)', fontWeight: 600 }}>
                                {gpu.activeJobId ? '● ACTIVE PROCESSING' : 'Idle'}
                              </span>
                            </div>

                            {/* VRAM / Cache metrics */}
                            <div className="flex-between">
                              <span style={{ color: 'var(--text-secondary)' }}>AVAILABLE VRAM:</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>
                                {isLibraryActive ? `${gpu.vram - 8}GB (8GB Reserved)` : `${gpu.vram} GB`}
                              </span>
                            </div>

                            {/* Cache occupancy bar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                              <div className="flex-between" style={{ fontSize: '10px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>KV CACHE POOL:</span>
                                <span style={{ color: 'var(--accent-indigo)' }}>{cachePct}% ({gpu.kvCache.length} prefixes)</span>
                              </div>
                              <div style={{ width: '100%', height: '4px', background: '#1e2230', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${cachePct}%`, height: '100%', background: 'var(--accent-indigo)' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex-between" style={{ marginTop: '12px', borderTop: '1px solid #1e2230', paddingTop: '8px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{gpu.tflops} TFLOPS</span>
                          <button 
                            className="btn btn-secondary"
                            style={{ padding: '3px 6px', fontSize: '10px', textTransform: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleFlushCache(rack.id, index)}
                            disabled={gpu.kvCache.length === 0}
                          >
                            <Trash2 size={10} /> Clear Cache
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buy new rack block */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
        <button className="btn btn-secondary" style={{ borderColor: 'var(--nvidia-green)', color: 'var(--nvidia-green)' }} onClick={handleBuyRack}>
          ⚡ BUY NEW SERVER RACK (-1,000 Tensors)
        </button>
      </div>
    </div>
  );
}
