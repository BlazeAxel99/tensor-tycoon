import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Play, Shield, RefreshCw, Cpu, Code, Zap, FileText } from 'lucide-react';
import { OPTIMIZATION_CATALOG } from '../game/types.js';

export default function CompilerLab({ gameState, dispatch }) {
  
  const handleToggleOpt = (optId) => {
    // Check if already active or pending
    if (gameState.activeOptimizations.has(optId) || gameState.pendingOptimizations[optId] !== undefined) {
      return; // Already unlocked
    }
    dispatch({
      type: "BUY_OPTIMIZATION",
      payload: { optId }
    });
  };

  const isCompressActive = gameState.activeOptimizations.has("ctx_compress");
  const isOpenAccParallel = gameState.activeOptimizations.has("acc_parallel");
  const isOpenAccCopyin = gameState.activeOptimizations.has("acc_copyin");
  const isTrtActive = gameState.activeOptimizations.has("tensorrt");

  // Raw vs Compressed text data (Module 4 Studio reference)
  const rawText = `[PharmaCorp Inc. Q3 Earnings Call - October 15, 2024]
Operator: Good afternoon everyone and welcome to the PharmaCorp Q3 earnings report. Today we have CEO Dr. Arthur Pendelton and CFO Marcus Vance.
Dr. Arthur Pendelton: Thank you. I am thrilled to present our Q3 performance index. We experienced massive digital acceleration across all drug discovery pipelines. Our primary candidate, PC-902 for oncology research, entered Phase II testing with an outstanding safety profile. This candidate represents a multi-billion dollar opportunity. The research divisions have migrated 100% of their genomic data nodes to secure cloud architectures. This enables our teams to perform sequence mapping up to 12x faster than last quarter. Our strategic alliance with Novartis has been expanded to cover co-development of drug targets. We expect milestones payments to start in early 2025.
Marcus Vance: Thank you, Arthur. Let's talk numbers. Q3 revenue reached $1.42B, up 8% year-over-year. Operating margin stands strong at 28%. CaPex for the quarter was $310M, mostly funneled into data center infrastructure upgrades. Our cloud migration has driven significant operational savings, although we saw temporary training overhead. We are updating our full-year guidance to the upper range of $5.6B - $5.8B.
Operator: We will now open the floor to questions...`;

  const compressedText = `[SUMMARY: PharmaCorp Q3 Earnings Call (15-10-2024)]
- CEO Arthur Pendelton announced PC-902 candidate (oncology) entered Phase II.
- Genomic sequence mapping migrated to cloud; processing speed increased 12x.
- Strategic target co-development alliance expanded with Novartis (milestones Q1 2025).
- CFO Marcus Vance reported Q3 Revenue of $1.42B (+8% YoY) with 28% operating margin.
- CaPex reached $310M, allocated to data center server scaling.
- Updated FY Guidance: $5.6B - $5.8B (upper limit).`;

  // Recharts Radar Chart data (comparative evaluation)
  const radarData = [
    { subject: 'Specificity', Raw: 9.5, Distilled: 8.8, fullMark: 10 },
    { subject: 'Accuracy', Raw: 9.8, Distilled: 9.6, fullMark: 10 },
    { subject: 'Conciseness', Raw: 3.5, Distilled: 9.8, fullMark: 10 },
    { subject: 'Actionability', Raw: 8.5, Distilled: 8.4, fullMark: 10 },
  ];

  // Recharts dual axis line chart data
  // Shows performance curves under current GPU (e.g. L40S)
  const contextSizes = [2, 4, 8, 16, 32, 64, 128]; // in k tokens
  
  const performanceData = contextSizes.map(size => {
    // Base VRAM required = size * 0.5 GB (linear)
    const baseVram = size * 0.5;
    const currentVram = baseVram 
      * (gameState.activeOptimizations.has("ctx_compress") ? 0.2 : 1.0)
      * (gameState.activeOptimizations.has("knapsack") ? 0.85 : 1.0)
      * (gameState.activeOptimizations.has("paged_attn") ? 0.5 : 1.0);

    // Base Latency = size * 0.08s
    let baseLatency = size * 0.08;
    let speedup = 1.0; // L40S normalized baseline
    if (isOpenAccParallel) speedup *= 3.0;
    if (isTrtActive) speedup *= 2.5;

    let latency = baseLatency / speedup;
    if (isOpenAccCopyin) latency -= 0.3;
    latency = Math.max(0.05, latency);

    return {
      size: `${size}k`,
      unoptimizedLatency: parseFloat((size * 0.08).toFixed(2)),
      optimizedLatency: parseFloat(latency.toFixed(2)),
      unoptimizedVram: parseFloat(baseVram.toFixed(1)),
      optimizedVram: parseFloat(currentVram.toFixed(1))
    };
  });

  // Code editor preview content based on active optimizations
  const getCodeContent = () => {
    let pragmaAcc = "";
    if (isOpenAccParallel) {
      pragmaAcc += `    #pragma acc parallel loop gang vector copy(d_ctx[0:N], d_out[0:M])\n`;
    }
    if (isOpenAccCopyin) {
      pragmaAcc += `    #pragma acc data copyin(d_ctx[0:N]) copyout(d_out[0:M])\n`;
    }

    return `#include <openacc.h>
#include <tensorrt_llm.h>

void compile_context_pipeline(const float* raw_context, float* processed_buffer, int N) {
    // Initialize target GPU sequence registers
    int dev_id = acc_get_device_num(acc_device_nvidia);
    
${pragmaAcc || "    // Running sequential CPU fallback loop. Compile directives missing!\n"}    for (int i = 0; i < N; i++) {
        processed_buffer[i] = raw_context[i] * WEIGHT_RELEVANCE + BIAS_FRESHNESS;
    }
}

int main() {
    init_trt_engine_builder();
    ${isTrtActive ? "compile_trt_llm_module(d_out);" : "// TRT-LLM optimization disabled. Running uncompiled."}
    return 0;
}`;
  };

  // List of relevant optimizations to show in compile list
  const compileOpts = ["acc_parallel", "acc_copyin", "tensorrt", "paged_attn", "ctx_compress", "knapsack", "prefix_cache", "ctx_library"];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="flex-between" style={{ borderBottom: '1px solid #272a37', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Code size={24} /> COMPILER LAB & COMPRESSION STUDIO
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Compile high-performance `#pragma acc` parallel loops and compare raw vs compressed context metrics.
          </p>
        </div>
        <span className="badge badge-nvidia">TRT-LLM Compiler Active</span>
      </div>

      {/* Main split row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left: Code Editor and Optimization list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ background: '#08090d', borderColor: '#272a37', padding: '12px' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid #1e2230', paddingBottom: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={14} style={{ color: 'var(--accent-indigo)' }} /> C/C++ INFRASTRUCTURE COMPILER PREVIEW
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>target: NV_DEVICE_ACCELERATOR</span>
            </div>
            
            {/* Editor code block */}
            <pre style={{
              background: '#040508',
              padding: '16px',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '12px',
              color: 'var(--neon-green)',
              lineHeight: 1.6,
              overflowX: 'auto',
              border: '1px solid #12141a',
              maxHeight: '300px'
            }}>
              <code>{getCodeContent()}</code>
            </pre>
          </div>

          {/* Upgrades Toggles list */}
          <div className="panel" style={{ background: 'rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              SELECT COMPILER OPTIMIZATIONS
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {compileOpts.map(optId => {
                const opt = OPTIMIZATION_CATALOG[optId];
                const isActive = gameState.activeOptimizations.has(optId);
                const isPending = gameState.pendingOptimizations[optId] !== undefined;
                
                let statusText = `Buy (${opt.cost} T)`;
                let btnClass = "btn-secondary";
                if (isActive) {
                  statusText = "✓ ACTIVE";
                  btnClass = "btn-primary";
                } else if (isPending) {
                  statusText = `Compiling (${gameState.pendingOptimizations[optId]}s remaining)`;
                  btnClass = "btn-accent";
                }

                return (
                  <div key={optId} className="flex-between" style={{ padding: '10px', borderBottom: '1px solid #1e2230', fontSize: '12px' }}>
                    <div style={{ flexGrow: 1, paddingRight: '12px' }}>
                      <strong style={{ color: isActive ? 'var(--nvidia-green)' : 'var(--text-primary)', display: 'block' }}>
                        {opt.name}
                      </strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                        {opt.description}
                      </span>
                    </div>
                    <button 
                      className={`btn ${btnClass}`}
                      style={{ padding: '6px 12px', fontSize: '11px', minWidth: '110px' }}
                      onClick={() => handleToggleOpt(optId)}
                      disabled={isActive || isPending}
                    >
                      {statusText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Compression Studio (conditional) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {!isCompressActive ? (
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', borderStyle: 'dashed', borderColor: '#272a37', background: 'transparent' }}>
              <Zap size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>COMPRESSION STUDIO LOCKED</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', maxWidth: '280px', margin: 0 }}>
                Activate the **"Context Compression"** compiler optimization on the left to unlock the Before/After distillation analyzer panel.
              </p>
            </div>
          ) : (
            <div className="panel panel-glowing-indigo" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid #1e2230', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-indigo)' }}>
                  COMPRESSION COMPARISON DIFF
                </span>
                <span className="badge badge-success">85% REDUCTION</span>
              </div>

              {/* Text Diff Blocks */}
              <div className="diff-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div className="diff-panel">
                  <div className="diff-header">Raw Prompt (780 tokens)</div>
                  <div className="diff-body" style={{ fontSize: '10px' }}>
                    <span className="diff-removed">{rawText}</span>
                  </div>
                </div>
                <div className="diff-panel">
                  <div className="diff-header" style={{ color: 'var(--accent-indigo)' }}>Compressed (118 tokens)</div>
                  <div className="diff-body" style={{ fontSize: '10px' }}>
                    <span className="diff-added">{compressedText}</span>
                  </div>
                </div>
              </div>

              {/* Noise Removed details */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid #1e2230', fontSize: '11px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  🗑️ Noise Pruning Summary:
                </span>
                <ul style={{ paddingLeft: '14px', color: 'var(--text-secondary)' }}>
                  <li>Removed operator greeting/instruction filler text (-120 tokens).</li>
                  <li>Pruned repetitive hedge statements and adjectives (-240 tokens).</li>
                  <li>Reconstructed QA format into bulleted summary index (-302 tokens).</li>
                </ul>
              </div>

              {/* Radar Chart comparative */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  COMPRESS QUALITY MATRIX (RAW VS COMPRESSED)
                </span>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#272a37" />
                      <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#272a37" />
                      <Radar name="Raw" dataKey="Raw" stroke="var(--text-muted)" fill="rgba(255,255,255,0.05)" fillOpacity={0.4} />
                      <Radar name="Distilled" dataKey="Distilled" stroke="var(--accent-indigo)" fill="var(--accent-indigo-glow)" fillOpacity={0.5} />
                      <Legend verticalAlign="bottom" height={24} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom dual axis chart */}
      <div className="panel" style={{ height: '280px', padding: '16px' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
          PERFORMANCE PROFILES (LATENCY & VRAM SCALING PER CONTEXT SIZE)
        </h3>
        <div style={{ width: '100%', height: '210px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" />
              <XAxis dataKey="size" stroke="var(--text-secondary)" />
              {/* Latency Axis */}
              <YAxis yAxisId="left" stroke="var(--neon-amber)" label={{ value: 'Latency (seconds)', angle: -90, position: 'insideLeft', style: { fill: 'var(--neon-amber)', fontSize: '12px' } }} />
              {/* VRAM Axis */}
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-cyan)" label={{ value: 'VRAM Usage (GB)', angle: 90, position: 'insideRight', style: { fill: 'var(--accent-cyan)', fontSize: '12px' } }} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', borderColor: '#272a37' }} />
              <Legend />
              
              <Line yAxisId="left" type="monotone" dataKey="unoptimizedLatency" name="Raw Latency (s)" stroke="var(--text-muted)" strokeDasharray="5 5" dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="optimizedLatency" name="Optimized Latency (s)" stroke="var(--neon-amber)" strokeWidth={2} />
              
              <Line yAxisId="right" type="monotone" dataKey="unoptimizedVram" name="Raw VRAM (GB)" stroke="rgba(34,211,238,0.2)" strokeDasharray="5 5" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="optimizedVram" name="Optimized VRAM (GB)" stroke="var(--accent-cyan)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
