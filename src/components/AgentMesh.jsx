import React from 'react';
import { Shield, Play, Layers, AlertTriangle, ArrowRight, RefreshCw, ToggleLeft, HelpCircle } from 'lucide-react';
import { OPTIMIZATION_CATALOG } from '../game/types.js';

export default function AgentMesh({ gameState, dispatch }) {
  
  const handleToggleRail = (railId) => {
    if (gameState.activeOptimizations.has(railId)) return;
    dispatch({
      type: "BUY_OPTIMIZATION",
      payload: { optId: railId }
    });
  };

  const handleRoutingChange = (agent, slot) => {
    dispatch({
      type: "SET_ROUTING",
      payload: { agent, gpuSlot: slot }
    });
  };

  const handleFreshnessChange = (type, value) => {
    dispatch({
      type: "SET_FRESHNESS",
      payload: { type, value: parseInt(value) }
    });
  };

  const handleToggleRule = (rule, val) => {
    dispatch({
      type: "SET_RULE",
      payload: { rule, value: val }
    });
  };

  // Get active guardrails status
  const hasInputRail = gameState.activeOptimizations.has("nemo_input_rail");
  const hasOutputRail = gameState.activeOptimizations.has("nemo_output_rail");
  const hasRetrievalRail = gameState.activeOptimizations.has("nemo_retrieval_rail");
  const isCompressActive = gameState.activeOptimizations.has("ctx_compress");

  // Flat list of all available GPUs for dropdown
  const gpuOptions = [];
  gameState.racks.forEach(r => {
    r.gpus.forEach((gpu, gIdx) => {
      gpuOptions.push({
        value: `${r.id}-${gIdx}`,
        label: `${gpu.name} (${r.name} - S${gIdx + 1})`
      });
    });
  });

  // Calculate weighted freshness
  const f = gameState.agentMesh.freshness;
  let weightedFreshness = (f.research * 0.4) + (f.industry * 0.3) + (f.crm * 0.3);
  
  // Guardrail auto-corrects freshness
  const isGuardrailCorrected = hasRetrievalRail && weightedFreshness < 60;
  if (isGuardrailCorrected) {
    weightedFreshness = 60;
  }

  // Determine cascading state
  let cascadeState = 'green'; // 'green', 'yellow', 'orange', 'red'
  let alertMessage = '';
  
  if (weightedFreshness < 40) {
    cascadeState = 'red';
    alertMessage = "❌ CRITICAL: Stale context data has poisoned the Drafting output! Day-to-day news is stale. Output quality contains hallucinatory assumptions based on Q2 templates.";
  } else if (weightedFreshness >= 40 && weightedFreshness < 60) {
    cascadeState = 'orange';
    alertMessage = "⚠️ WARNING: Stale data cascading to Analysis. GenAI pipeline is processing ungrounded context variables.";
  } else if (weightedFreshness >= 60 && weightedFreshness < 75) {
    cascadeState = 'yellow';
    alertMessage = "⚠️ NOTICE: Stale metrics detected in Research pipeline. Check news data source feeds.";
  }

  // Agent profiles
  const agents = [
    { id: 'orchestrator', name: 'Orchestrator', role: 'Query Intent Planner', share: 10 },
    { id: 'research', name: 'Research Agent', role: 'Pharma Data Gatherer', share: 40 },
    { id: 'analysis', name: 'Analysis Agent', role: 'Context Aggregator', share: 30 },
    { id: 'drafting', name: 'Drafting Agent', role: 'Executive Brief Compiler', share: 20 }
  ];

  // Helper to color agent cards based on freshness cascade
  const getAgentColorState = (agentId) => {
    if (isGuardrailCorrected) return 'var(--neon-green)';
    if (cascadeState === 'green') return 'var(--neon-green)';
    
    if (agentId === 'research' && weightedFreshness < 75) return 'var(--neon-amber)';
    if (agentId === 'analysis' && weightedFreshness < 60) return 'var(--neon-amber)';
    if (agentId === 'drafting' && weightedFreshness < 40) return 'var(--neon-red)';
    
    return 'var(--neon-green)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="flex-between" style={{ borderBottom: '1px solid #272a37', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--neon-purple)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Layers size={24} /> AGENT MESH & NeMo GUARDRAILS
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Map agent microservices to specific GPUs. Toggle propagation rules and apply programmable Colang guardrails.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hasInputRail && <span className="badge badge-success">🛡️ Input Rail</span>}
          {hasRetrievalRail && <span className="badge badge-success">🛡️ Retrieval Rail</span>}
          {hasOutputRail && <span className="badge" style={{ borderColor: 'var(--accent-cyan)' }}>🛡️ Output Rail</span>}
        </div>
      </div>

      {/* SVG Pipeline Diagram (Top 35%) */}
      <div className="panel" style={{ background: '#08090d', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'flex-start', marginBottom: '16px' }}>
          GPU AGENT PIPELINE ROUTING MAP
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {agents.map((agent, index) => {
            const color = getAgentColorState(agent.id);
            const routeVal = gameState.agentMesh.routing[agent.id] || "1-0";
            
            return (
              <React.Fragment key={agent.id}>
                {/* Agent Card */}
                <div className="panel" style={{
                  background: 'var(--bg-elevated)',
                  borderColor: color,
                  padding: '14px',
                  width: '240px',
                  boxShadow: `0 0 10px ${color}1A`,
                  position: 'relative'
                }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
                      {agent.name}
                    </span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></div>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                    {agent.role}
                  </span>

                  <div style={{ marginTop: '12px', borderTop: '1px solid #1e2230', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>TOKEN SHARE:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{agent.share}%</strong>
                    </div>

                    {/* Routing dropdown */}
                    <div className="flex-between" style={{ marginTop: '2px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>ROUTE TO GPU:</span>
                      <select 
                        value={routeVal}
                        onChange={(e) => handleRoutingChange(agent.id, e.target.value)}
                        style={{ background: '#0b0c10', color: 'var(--text-primary)', border: '1px solid #272a37', padding: '2px 4px', fontSize: '11px', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
                      >
                        {gpuOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Shield graphic for guardrails on cards */}
                  {agent.id === 'research' && isGuardrailCorrected && (
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--neon-green)', color: '#000', borderRadius: '50%', padding: '4px', display: 'flex', boxShadow: '0 0 8px var(--neon-green-glow)' }}>
                      <Shield size={12} />
                    </div>
                  )}
                </div>

                {/* Connecting Arrow */}
                {index < agents.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', color: color, padding: '0 8px' }}>
                    <ArrowRight size={20} className="flow-line" style={{ stroke: color }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Warning Box for Freshness Cascade */}
      {alertMessage && !isGuardrailCorrected && (
        <div style={{
          background: cascadeState === 'red' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          borderColor: cascadeState === 'red' ? 'var(--neon-red)' : 'var(--neon-amber)',
          borderWidth: '1px',
          borderStyle: 'solid',
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px'
        }}>
          <AlertTriangle size={20} style={{ color: cascadeState === 'red' ? 'var(--neon-red)' : 'var(--neon-amber)', flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <strong>Cascade Alert: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>{alertMessage}</span>
            {cascadeState === 'red' && (
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                💡 Day-to-day freshness is below 40%. The drafting template fails to incorporate Q3 PharmaCorp structural variables.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Success notification if Guardrail corrects */}
      {isGuardrailCorrected && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          borderColor: 'var(--neon-green)',
          borderWidth: '1px',
          borderStyle: 'solid',
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px'
        }}>
          <Shield size={20} style={{ color: 'var(--neon-green)', flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <strong>🛡️ NeMo Retrieval Guardrail Active: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              Stale brief context was intercepted! Day-to-day data source freshness was automatically corrected to a minimum floor of 60%. Poisoned cascade averted.
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side Sliders and Propagation Rules (Module 5) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Sliders */}
        <div className="panel">
          <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            FRESHNESS DATA SOURCE INPUTS
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="slider-group">
              <div className="slider-header">
                <span>Research Agent Freshness:</span>
                <span className="slider-val" style={{ color: f.research < 40 ? 'var(--neon-red)' : 'var(--text-primary)' }}>{f.research}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={f.research} 
                onChange={(e) => handleFreshnessChange('research', e.target.value)} 
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span>Industry News Index:</span>
                <span className="slider-val">{f.industry}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={f.industry} 
                onChange={(e) => handleFreshnessChange('industry', e.target.value)} 
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span>PharmaCorp CRM Data:</span>
                <span className="slider-val">{f.crm}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={f.crm} 
                onChange={(e) => handleFreshnessChange('crm', e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Right: Propagation rules */}
        <div className="panel">
          <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '16px' }}>
            CONTEXT PROPAGATION RULES
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="flex-between" style={{ paddingBottom: '10px', borderBottom: '1px solid #1e2230', fontSize: '12px' }}>
              <div>
                <strong>Orchestrator → Research:</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Transmit full query semantic intent context vector.</span>
              </div>
              <input 
                type="checkbox" 
                checked={gameState.agentMesh.rules.orchestrator_research} 
                onChange={(e) => handleToggleRule('orchestrator_research', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <div className="flex-between" style={{ paddingBottom: '10px', borderBottom: '1px solid #1e2230', fontSize: '12px' }}>
              <div>
                <strong>Research → Analysis:</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Forward only filtered fact chunks. (reduces noise)</span>
              </div>
              <input 
                type="checkbox" 
                checked={gameState.agentMesh.rules.research_analysis} 
                onChange={(e) => handleToggleRule('research_analysis', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <div className="flex-between" style={{ paddingBottom: '10px', borderBottom: '1px solid #1e2230', fontSize: '12px' }}>
              <div>
                <strong>Analysis → Drafting:</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Forward structured outlines only. (prevents repetition)</span>
              </div>
              <input 
                type="checkbox" 
                checked={gameState.agentMesh.rules.analysis_drafting} 
                onChange={(e) => handleToggleRule('analysis_drafting', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <div className="flex-between" style={{ paddingBottom: '4px', fontSize: '12px' }}>
              <div>
                <strong>Research → Drafting Isolation:</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Isolate raw gatherer from writer. Prevents memory leaks.</span>
              </div>
              <input 
                type="checkbox" 
                checked={gameState.agentMesh.rules.research_drafting} 
                onChange={(e) => handleToggleRule('research_drafting', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NeMo Guardrails Panel (bottom) */}
      <div className="panel" style={{ background: '#12141a', borderColor: '#272a37' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={16} style={{ color: 'var(--nvidia-green)' }} /> NeMo GUARDRAILS DEPLOYMENT CENTER
        </h3>

        <div className="grid-3">
          {/* Input rail */}
          <div className="panel" style={{ background: '#0b0c10', borderColor: hasInputRail ? 'var(--neon-green)' : '#272a37', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', padding: '12px', minHeight: '120px' }}>
            <div>
              <div className="flex-between">
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)' }}>NeMo Input Rail</span>
                <span className={`badge ${hasInputRail ? 'badge-success' : 'badge-danger'}`}>{hasInputRail ? 'ACTIVE' : 'LOCKED'}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: '4px 0 0 0' }}>
                Rejects low-relevance chunks (&lt; 0.3) on pipeline entry, giving **+0.5 quality** bonus.
              </p>
            </div>
            <button 
              className={`btn ${hasInputRail ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', padding: '4px', fontSize: '11px', marginTop: '12px', textTransform: 'none' }}
              onClick={() => handleToggleRail('nemo_input_rail')}
              disabled={hasInputRail}
            >
              {hasInputRail ? '🛡️ Enabled' : 'Unlock Rail (1,200 T)'}
            </button>
          </div>

          {/* Retrieval rail */}
          <div className="panel" style={{ background: '#0b0c10', borderColor: hasRetrievalRail ? 'var(--neon-green)' : '#272a37', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', padding: '12px', minHeight: '120px' }}>
            <div>
              <div className="flex-between">
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)' }}>NeMo Retrieval Rail</span>
                <span className={`badge ${hasRetrievalRail ? 'badge-success' : 'badge-danger'}`}>{hasRetrievalRail ? 'ACTIVE' : 'LOCKED'}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: '4px 0 0 0' }}>
                Auto-intercepts stale feeds on retrieval and enforces a **60% minimum freshness** limit.
              </p>
            </div>
            <button 
              className={`btn ${hasRetrievalRail ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', padding: '4px', fontSize: '11px', marginTop: '12px', textTransform: 'none' }}
              onClick={() => handleToggleRail('nemo_retrieval_rail')}
              disabled={hasRetrievalRail}
            >
              {hasRetrievalRail ? '🛡️ Enabled' : 'Unlock Rail (2,500 T)'}
            </button>
          </div>

          {/* Output rail */}
          <div className="panel" style={{ background: '#0b0c10', borderColor: hasOutputRail ? 'var(--neon-green)' : '#272a37', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', padding: '12px', minHeight: '120px' }}>
            <div>
              <div className="flex-between">
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-primary)' }}>NeMo Output Rail</span>
                <span className={`badge ${hasOutputRail ? 'badge-success' : 'badge-danger'}`}>{hasOutputRail ? 'ACTIVE' : 'LOCKED'}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: '4px 0 0 0' }}>
                Validates outputs. **Nullifies the quality penalty** of context compression. (adds +0.2s latency)
              </p>
            </div>
            <button 
              className={`btn ${hasOutputRail ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', padding: '4px', fontSize: '11px', marginTop: '12px', textTransform: 'none' }}
              onClick={() => handleToggleRail('nemo_output_rail')}
              disabled={hasOutputRail}
            >
              {hasOutputRail ? '🛡️ Enabled' : 'Unlock Rail (1,800 T)'}
            </button>
          </div>
        </div>
      </div>

      {/* Context Flow Trace Table */}
      <div className="panel" style={{ background: '#12141a', borderColor: '#272a37' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={16} style={{ color: 'var(--accent-cyan)' }} /> LIVE CONTEXT FLOW TRACE
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #272a37', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Agent Component</th>
                <th style={{ padding: '8px' }}>Mapped Node</th>
                <th style={{ padding: '8px' }}>Token Share</th>
                <th style={{ padding: '8px' }}>Base Freshness</th>
                <th style={{ padding: '8px' }}>Active Safety Rails</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => {
                const routeVal = gameState.agentMesh.routing[agent.id] || "1-0";
                const [rId, gIdx] = routeVal.split("-").map(Number);
                const rack = gameState.racks.find(r => r.id === rId);
                const gpu = rack ? rack.gpus[gIdx] : null;
                const nodeName = gpu ? `${rack.name} - Slot ${gIdx} (${gpu.id})` : "N/A";
                
                // Get freshness values mapping
                let freshness = 100;
                if (agent.id === 'orchestrator') freshness = gameState.agentMesh.freshness.crm;
                if (agent.id === 'research') freshness = gameState.agentMesh.freshness.research;
                if (agent.id === 'analysis') freshness = gameState.agentMesh.freshness.industry;
                if (agent.id === 'drafting') freshness = 100; // Final drafting

                // Check rails
                const rails = [];
                if (agent.id === 'orchestrator' && hasInputRail) rails.push("Input Rail (Filters <0.3)");
                if (agent.id === 'research' && hasRetrievalRail) rails.push("Retrieval Rail (Freshness >=60)");
                if (agent.id === 'drafting' && hasOutputRail) rails.push("Output Rail (Nullify Comp)");

                return (
                  <tr key={agent.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '8px', color: 'var(--accent-indigo)', fontWeight: 'bold' }}>{agent.name}</td>
                    <td style={{ padding: '8px' }}>{nodeName}</td>
                    <td style={{ padding: '8px' }}>{(agent.share * 100).toFixed(0)}% share</td>
                    <td style={{ padding: '8px', color: freshness < 60 ? 'var(--neon-red)' : freshness < 80 ? 'var(--neon-amber)' : 'var(--neon-green)' }}>
                      {freshness}%
                    </td>
                    <td style={{ padding: '8px', color: 'var(--accent-cyan)' }}>
                      {rails.length > 0 ? rails.join(", ") : <span style={{ color: 'var(--text-muted)' }}>None</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
