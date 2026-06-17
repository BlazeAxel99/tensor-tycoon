import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Play, Sparkles, TrendingUp, AlertOctagon, HelpCircle, Activity, Award, ShieldAlert } from 'lucide-react';

export default function MissionControl({ gameState, dispatch }) {
  const [rlActive, setRlActive] = useState(false);
  const [rlBoost, setRlBoost] = useState(0);

  const handleStartStressTest = () => {
    dispatch({ type: "START_STRESS_TEST" });
  };

  const handleCloseLoop = () => {
    if (rlActive) return;
    setRlActive(true);
    // Animate LLM Judge Score increase
    let step = 0;
    const interval = setInterval(() => {
      step += 0.1;
      if (step >= 0.8) {
        clearInterval(interval);
        setRlBoost(0.8);
      } else {
        setRlBoost(step);
      }
    }, 150);
  };

  // Sparkline wrapper to keep code clean
  const renderSparkline = (data, color) => {
    if (!data || data.length === 0) return <div style={{ height: '30px' }}></div>;
    const chartData = data.map((val, idx) => ({ idx, val }));
    return (
      <div style={{ width: '100%', height: '30px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Stress Test targets calculation
  const totalTokensProcessed = gameState.completedJobs.reduce((sum, job) => {
    // Look up original job in deterministic script to get original tokens
    return sum + (job.tokens || 8000); // fallback to 8000 if not saved
  }, 0) + (gameState.activeWorkloads.reduce((sum, aw) => sum + aw.job.contextTokens, 0));

  // Actual values for scorecard
  const actualTokens = totalTokensProcessed;
  const actualQuality = parseFloat((gameState.metrics.llmJudgeScore + rlBoost).toFixed(2));
  const actualOoms = gameState.oomEventsCount;
  const actualSla = gameState.slaBreachesCount;
  const actualCache = gameState.metrics.cacheHitRate;

  // Targets status
  const targetTokensMet = actualTokens >= 200000;
  const targetQualityMet = actualQuality >= 8.0;
  const targetOomsMet = actualOoms === 0;
  const targetSlaMet = actualSla <= 2;
  const targetCacheMet = actualCache >= 25;

  const targetsMetCount = [targetTokensMet, targetQualityMet, targetOomsMet, targetSlaMet, targetCacheMet].filter(Boolean).length;

  // Determine final tier
  let finalTier = "Silver Tier";
  let tierColor = "var(--text-secondary)";
  let tierGlow = "rgba(148, 163, 184, 0.2)";

  if (actualOoms > 0) {
    finalTier = "SYSTEM CRASH (OOM)";
    tierColor = "var(--neon-red)";
    tierGlow = "var(--neon-red-glow)";
  } else if (targetsMetCount === 5) {
    finalTier = "NVIDIA ELITE DEVELOPER";
    tierColor = "var(--nvidia-green)";
    tierGlow = "var(--nvidia-green-glow)";
  } else if (targetsMetCount >= 3) {
    finalTier = "Gold Tier";
    tierColor = "var(--neon-amber)";
    tierGlow = "var(--neon-amber-glow)";
  }

  // Dynamic Quality by Run data (Greedy vs Optimized chart from completed jobs)
  const completedJobs = gameState.completedJobs;
  const qualityByRunData = completedJobs.length > 0 
    ? completedJobs.slice(-5).map((job, idx) => {
        const baseQuality = job.quality - (gameState.activeOptimizations.size > 0 ? 0.8 : 0);
        return {
          name: `Run ${completedJobs.length - completedJobs.slice(-5).length + 1 + idx}`,
          Greedy: parseFloat(Math.max(4.0, baseQuality).toFixed(1)),
          Optimized: parseFloat(job.quality.toFixed(1))
        };
      })
    : [
        { name: 'Run 1', Greedy: 7.2, Optimized: 8.2 },
        { name: 'Run 2', Greedy: 7.5, Optimized: 8.5 },
        { name: 'Run 3', Greedy: 7.1, Optimized: 8.8 },
        { name: 'Run 4', Greedy: 7.4, Optimized: 9.1 },
        { name: 'Run 5', Greedy: 7.3, Optimized: 9.3 },
      ];

  // Dynamic Freshness Decay data (7-day decay chart driven by current agent freshness)
  const freshness = gameState.agentMesh.freshness;
  const decayData = Array.from({ length: 7 }).map((_, idx) => {
    const factor = Math.exp(-idx * 0.15); // Decay factor
    return {
      day: `Day ${idx + 1}`,
      news: Math.round(freshness.industry * factor),
      docs: Math.round(freshness.research * factor),
      crm: Math.round(freshness.crm * factor)
    };
  });

  // Dynamic NeMo Evaluator Detail Radar Chart (driven by active guardrails & metrics)
  const hasInputRail = gameState.activeOptimizations.has("nemo_input_rail");
  const hasOutputRail = gameState.activeOptimizations.has("nemo_output_rail");
  const hasCompress = gameState.activeOptimizations.has("ctx_compress");
  const freshnessValIndex = gameState.metrics.freshnessIndex;
  
  const specificity = hasInputRail ? 9.4 : 7.8;
  let accuracy = 8.0;
  if (hasCompress) {
    accuracy = hasOutputRail ? 9.2 : 6.0;
  } else if (hasOutputRail) {
    accuracy = 9.4;
  }
  const conciseness = hasCompress ? 9.5 : 6.8;
  const actionability = freshnessValIndex > 80 ? 9.2 : (freshnessValIndex < 40 ? 4.8 : 7.6);
  
  const nemoRadarData = [
    { subject: 'Specificity', Score: parseFloat(specificity.toFixed(1)) },
    { subject: 'Accuracy', Score: parseFloat(accuracy.toFixed(1)) },
    { subject: 'Conciseness', Score: parseFloat(conciseness.toFixed(1)) },
    { subject: 'Actionability', Score: parseFloat(actionability.toFixed(1)) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ borderBottom: '1px solid #272a37', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--neon-green)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Activity size={24} /> MISSION CONTROL OBSERVABILITY
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Monitor GenAI telemetry, close RL loops to optimize knapsack weights, and execute live stress tests.
          </p>
        </div>

        <div className="flex-gap-sm">
          <button 
            className="btn btn-secondary" 
            style={{ borderColor: 'var(--accent-indigo)', color: 'var(--accent-indigo)' }}
            onClick={handleCloseLoop}
            disabled={rlActive}
          >
            <Sparkles size={14} /> {rlActive ? "Closed Loop (Active)" : "Close Loop (RL)"}
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleStartStressTest}
            disabled={gameState.stressTestActive}
          >
            <Play size={14} /> {gameState.stressTestActive ? "STRESS TEST RUNNING..." : "Start Stress Test"}
          </button>
        </div>
      </div>

      {/* RL Feedback banner */}
      {rlActive && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          borderColor: 'var(--accent-indigo)',
          borderWidth: '1px',
          borderStyle: 'solid',
          padding: '12px 16px',
          borderRadius: 'var(--border-radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px'
        }}>
          <Sparkles size={20} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
          <div style={{ flexGrow: 1 }}>
            <strong>RL Loop Closed: </strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              Reinforcement Learning from Evaluator Feedback is active! Chunk weighting vectors have been dynamically tuned to penalize stale docs (+{rlBoost.toFixed(1)} LLM Judge score boost).
            </span>
          </div>
        </div>
      )}

      {/* 7 Metric Cards in a 4+3 Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="grid-4">
          {/* Card 1: Context Coverage */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CONTEXT COVERAGE</span>
            <strong style={{ fontSize: '22px', color: 'var(--neon-green)', fontFamily: 'var(--font-display)' }}>
              {gameState.metrics.contextCoverage}%
            </strong>
            {renderSparkline(gameState.metricsHistory.contextCoverage, 'var(--neon-green)')}
          </div>

          {/* Card 2: VRAM Efficiency */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>VRAM CAPACITY LOAD</span>
            <strong style={{ fontSize: '22px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-display)' }}>
              {gameState.metrics.vramEfficiency}%
            </strong>
            {renderSparkline(gameState.metricsHistory.vramEfficiency, 'var(--accent-cyan)')}
          </div>

          {/* Card 3: Compression Ratio */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>COMPRESSION PRUNE RATE</span>
            <strong style={{ fontSize: '22px', color: 'var(--accent-indigo)', fontFamily: 'var(--font-display)' }}>
              {gameState.metrics.compressionRatio}%
            </strong>
            {renderSparkline(gameState.metricsHistory.compressionRatio, 'var(--accent-indigo)')}
          </div>

          {/* Card 4: Freshness Index */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>FRESHNESS VALUE INDEX</span>
            <strong style={{ fontSize: '22px', color: gameState.metrics.freshnessIndex < 60 ? 'var(--neon-amber)' : 'var(--neon-green)', fontFamily: 'var(--font-display)' }}>
              {gameState.metrics.freshnessIndex}%
            </strong>
            {renderSparkline(gameState.metricsHistory.freshnessIndex, 'var(--neon-green)')}
          </div>
        </div>

        <div className="grid-3">
          {/* Card 5: LLM Judge Score */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>LLM JUDGE QUALITY SCORE</span>
            <strong style={{ fontSize: '22px', color: 'var(--neon-green)', fontFamily: 'var(--font-display)' }}>
              {actualQuality.toFixed(2)} / 10
            </strong>
            {renderSparkline(gameState.metricsHistory.llmJudgeScore, 'var(--neon-green)')}
          </div>

          {/* Card 6: Pipeline Latency */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PIPELINE LATENCY</span>
            <strong style={{ fontSize: '22px', color: 'var(--neon-amber)', fontFamily: 'var(--font-display)' }}>
              {gameState.metrics.pipelineLatency.toFixed(2)}s
            </strong>
            {renderSparkline(gameState.metricsHistory.pipelineLatency, 'var(--neon-amber)')}
          </div>

          {/* Card 7: Cache Hit Rate (NEW - 7th dimension) */}
          <div className="panel pulse-glow-green" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', border: '1px solid var(--accent-cyan)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              ⚡ KV CACHE REUSE HIT RATE
            </span>
            <strong style={{ fontSize: '22px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-display)' }}>
              {gameState.metrics.cacheHitRate}%
            </strong>
            {renderSparkline(gameState.metricsHistory.cacheHitRate, 'var(--accent-cyan)')}
          </div>
        </div>
      </div>

      {/* Double column charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left chart: Quality by Run */}
        <div className="panel" style={{ height: '260px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
            QUALITY COMPARISON BY PIPELINE RUN
          </span>
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityByRunData}>
                <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" domain={[0, 10]} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', borderColor: '#272a37' }} />
                <Legend />
                <Bar dataKey="Greedy" fill="var(--text-muted)" />
                <Bar dataKey="Optimized" fill="var(--nvidia-green)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right chart: Freshness Decay */}
        <div className="panel" style={{ height: '260px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
            CONTEXT DATA SOURCE FRESHNESS DECAY OVER 7 DAYS
          </span>
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={decayData}>
                <CartesianGrid stroke="#1e2230" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', borderColor: '#272a37' }} />
                <Legend />
                <Line type="monotone" dataKey="news" name="News Index" stroke="var(--neon-red)" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="docs" name="Library Docs" stroke="var(--accent-indigo)" />
                <Line type="monotone" dataKey="crm" name="CRM Records" stroke="var(--accent-cyan)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* NeMo Evaluator collapsable breakdown */}
      <details className="panel" style={{ background: 'rgba(255,255,255,0.01)', borderColor: '#1e2230', cursor: 'pointer' }}>
        <summary style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', outline: 'none', userSelect: 'none' }}>
          🔍 VIEW NeMo EVALUATOR ANALYSIS BREAKDOWN (LLM-AS-A-JUDGE)
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '16px', borderTop: '1px solid #1e2230', paddingTop: '16px', cursor: 'default' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>EVALUATION RADAR</span>
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={nemoRadarData}>
                  <PolarGrid stroke="#272a37" />
                  <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#272a37" />
                  <Radar name="Evaluator Index" dataKey="Score" stroke="var(--nvidia-green)" fill="var(--nvidia-green-glow)" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>NVIDIA NeMo Evaluator Metrics Summary:</span>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              The evaluator utilizes a lightweight judge LLM running under **NVIDIA NIM** to evaluate response grounding against the context chunks.
            </p>
            <ul style={{ paddingLeft: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Specificity:</strong> Measures granular numerical alignment to PharmaCorp records.</li>
              <li><strong>Accuracy:</strong> Verifies assertions against facts to reject hallucinations.</li>
              <li><strong>Conciseness:</strong> Awards higher weight to minimal token counts.</li>
              <li><strong>Actionability:</strong> Audits output code blocks and executable guidelines.</li>
            </ul>
          </div>
        </div>
      </details>

      {/* Scorecard Modal Overlay (Completes Stage 10 failable check) */}
      {gameState.stressTestCompleted && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid #272a37', paddingBottom: '16px' }}>
              <Award size={48} style={{ color: tierColor, filter: `drop-shadow(0 0 8px ${tierGlow})`, marginBottom: '8px' }} />
              <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>STRESS TEST COMPLETE</h2>
              <span style={{ fontSize: '18px', fontWeight: 900, color: tierColor, fontFamily: 'var(--font-display)', marginTop: '6px', textShadow: `0 0 10px ${tierGlow}` }}>
                {finalTier}
              </span>
            </div>

            {/* Scorecard targets table */}
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #272a37', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px 4px' }}>Metric</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>Tokens Processed</td>
                  <td>&ge; 200,000</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{actualTokens.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: targetTokensMet ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {targetTokensMet ? 'PASS' : 'FAIL'}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>Average Quality Score</td>
                  <td>&ge; 8.0 / 10</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{actualQuality.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: targetQualityMet ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {targetQualityMet ? 'PASS' : 'FAIL'}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>OOM GPU Crashes</td>
                  <td>= 0</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: actualOoms > 0 ? 'var(--neon-red)' : 'var(--text-primary)' }}>{actualOoms}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: targetOomsMet ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {targetOomsMet ? 'PASS' : 'FAIL'}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>SLA Breaches</td>
                  <td>&le; 2</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: actualSla > 2 ? 'var(--neon-amber)' : 'var(--text-primary)' }}>{actualSla}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: targetSlaMet ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {targetSlaMet ? 'PASS' : 'FAIL'}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>KV Cache Hit Rate</td>
                  <td>&ge; 25%</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{actualCache}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: targetCacheMet ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                    {targetCacheMet ? 'PASS' : 'FAIL'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Insight block */}
            <div style={{
              background: actualOoms > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(118, 185, 0, 0.05)',
              borderColor: actualOoms > 0 ? 'var(--neon-red)' : 'var(--nvidia-green)',
              borderWidth: '1px',
              borderStyle: 'solid',
              padding: '12px',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              {actualOoms > 0 ? (
                <span>
                  <strong>Critique:</strong> Your pipeline experienced a GPU Out-Of-Memory (OOM) event. Scale your VRAM limits (deploy A100/H100 cards) or compile PagedAttention/Context Compression to avoid memory overload.
                </span>
              ) : targetCacheMet ? (
                <span>
                  <strong>Success Checklist:</strong> Fantastic work routing related workloads (prefix groups) to the same node to optimize cache hit reuse! You successfully optimized Context Reusability.
                </span>
              ) : (
                <span>
                  <strong>Checklist:</strong> Your cache hit rate was below 25%. To improve, purchase the Prefix Cache Manager and route workloads of the same prefix group (like `pharma-advisory`) to the same GPU cluster.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => dispatch({ type: "RESET_GAME" })}
              >
                Reset & Play Again
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // Allow closed overlay review
                  dispatch({ type: "LOG", payload: { type: "system", text: "Scorecard closed. Reviewing final layout state." } });
                  dispatch({ type: "CLOSE_SCORECARD" });
                  dispatch({ type: "LOG", payload: { type: "system", text: "Dashboard fully accessible." } });
                }}
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
