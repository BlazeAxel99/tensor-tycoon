import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Sliders, Award, Zap, CheckCircle2, ChevronRight, Play, RefreshCw, Layers, Check, Info, Cpu } from 'lucide-react';
import { INITIAL_CHUNKS, computeCompositeScore } from '../data/contextChunks.js';

export default function ContextPipeline({ gameState, dispatch }) {
  const [chunks, setChunks] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set([10, 7, 4, 13, 1])); // Pre-selected
  const [mode, setMode] = useState('manual'); // 'manual', 'greedy', 'optimized'
  const [animating, setAnimating] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [activeSourceFilter, setActiveSourceFilter] = useState('All');
  
  // Choose GPU for VRAM budget reference
  const allGpus = [];
  gameState.racks.forEach(r => {
    r.gpus.forEach((g, gIdx) => {
      allGpus.push({
        id: `${r.id}-${gIdx}`,
        name: `${g.name} (${r.name} - Slot ${gIdx + 1})`,
        vram: g.vram
      });
    });
  });

  const [selectedGpuAddress, setSelectedGpuAddress] = useState(allGpus.length > 0 ? allGpus[0].id : "1-0");
  const selectedGpu = allGpus.find(g => g.id === selectedGpuAddress) || { vram: 48, name: 'L40S' };
  
  // Get warm prefix groups from selected GPU
  const [rIdGpu, gIdxGpu] = selectedGpuAddress.split("-").map(Number);
  const targetRack = gameState.racks.find(r => r.id === rIdGpu);
  const targetGpuObj = targetRack ? targetRack.gpus[gIdxGpu] : null;
  const warmPrefixes = targetGpuObj ? targetGpuObj.kvCache.map(e => e.prefixGroup) : [];

  const getChunkPrefixGroup = (chunk) => {
    if (["Financial"].includes(chunk.category)) return "pharma-finance";
    if (["Industry", "Engagement"].includes(chunk.category)) return "pharma-advisory";
    if (["News", "Regulatory"].includes(chunk.category)) return "compliance";
    if (["People", "Meeting"].includes(chunk.category)) return "customer";
    return "code-audit";
  };

  const isChunkCached = (chunk) => {
    const group = getChunkPrefixGroup(chunk);
    return warmPrefixes.includes(group);
  };

  const runKnapsackSync = (items, budget) => {
    const n = items.length;
    const SCALE = 10;
    const scaledBudget = Math.floor(budget / SCALE);
    const dp = Array(n + 1).fill(0).map(() => Array(scaledBudget + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
      const chunk = items[i - 1];
      const weight = Math.ceil(chunk.tokens / SCALE);
      const val = Math.round(chunk.compositeScore * 1000);
      
      for (let w = 0; w <= scaledBudget; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + val);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }
    
    let w = scaledBudget;
    const selected = [];
    for (let i = n; i > 0; i--) {
      const chunk = items[i - 1];
      const weight = Math.ceil(chunk.tokens / SCALE);
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(chunk);
        w -= weight;
      }
    }
    return selected;
  };

  // Available VRAM converted to tokens (VRAM GB * 2000)
  const tokenBudget = selectedGpu.vram * 2000;

  // Compute composite scores on load
  useEffect(() => {
    const formatted = INITIAL_CHUNKS.map(chunk => {
      return {
        ...chunk,
        compositeScore: computeCompositeScore(chunk)
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
    
    setChunks(formatted);
  }, []);

  const totalTokens = chunks
    .filter(c => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.tokens, 0);

  const averageScore = chunks.filter(c => selectedIds.has(c.id)).length > 0
    ? parseFloat((chunks.filter(c => selectedIds.has(c.id)).reduce((sum, c) => sum + c.compositeScore, 0) / chunks.filter(c => selectedIds.has(c.id)).length).toFixed(3))
    : 0.000;

  const toggleChunk = (id) => {
    if (mode !== 'manual') return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      // Prevent exceeding VRAM budget manually
      const targetChunk = chunks.find(c => c.id === id);
      if (totalTokens + targetChunk.tokens > tokenBudget) {
        dispatch({ type: "LOG", payload: { type: "error", text: "Manual selection exceeds active GPU VRAM Token Budget!" } });
        return;
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // GREEDY TOP-K
  const runGreedy = () => {
    if (animating) return;
    setMode('greedy');
    setAnimating(true);
    
    const sorted = [...chunks].sort((a, b) => b.compositeScore - a.compositeScore);
    const newSelected = new Set();
    let currentTokens = 0;
    
    let queue = [];
    for (let c of sorted) {
      if (currentTokens + c.tokens <= tokenBudget) {
        newSelected.add(c.id);
        currentTokens += c.tokens;
        queue.push(new Set(newSelected));
      }
    }

    let i = 0;
    const animateNext = () => {
      if (i < queue.length) {
        setSelectedIds(queue[i]);
        i++;
        setTimeout(animateNext, 200);
      } else {
        setAnimating(false);
        const greedyAverage = sorted.filter(c => newSelected.has(c.id)).reduce((sum, c) => sum + c.compositeScore, 0) / newSelected.size;
        setComparison(prev => ({
          ...prev,
          greedy: {
            score: parseFloat(greedyAverage.toFixed(3)),
            tokens: currentTokens,
            chunks: newSelected.size,
            ids: newSelected
          }
        }));
      }
    };
    animateNext();
  };

  // KNAPSACK OPTIMIZER
  const runKnapsack = () => {
    if (animating) return;
    setMode('optimized');
    setAnimating(true);

    const n = chunks.length;
    // We scale down the DP grid if tokenBudget is large to save memory/ticks
    // Since knapsack values are scaled by 1000, we can run a token-step DP
    // Chunk tokens are increments of ~10 tokens, so we divide by 10 for compression
    const SCALE = 10;
    const scaledBudget = Math.floor(tokenBudget / SCALE);
    
    const dp = Array(n + 1).fill(0).map(() => Array(scaledBudget + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
      const chunk = chunks[i - 1];
      const weight = Math.ceil(chunk.tokens / SCALE);
      const val = Math.round(chunk.compositeScore * 1000);
      
      for (let w = 0; w <= scaledBudget; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + val);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    let w = scaledBudget;
    const selected = [];
    for (let i = n; i > 0; i--) {
      const chunk = chunks[i - 1];
      const weight = Math.ceil(chunk.tokens / SCALE);
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(chunk);
        w -= weight;
      }
    }

    // Animate the selections
    const newSelected = new Set();
    let queue = [];
    let cumulative = 0;
    
    selected.sort((a,b) => b.compositeScore - a.compositeScore);

    for (let c of selected) {
      newSelected.add(c.id);
      cumulative += c.tokens;
      queue.push(new Set(newSelected));
    }

    let i = 0;
    const animateNext = () => {
      if (i < queue.length) {
        setSelectedIds(queue[i]);
        i++;
        setTimeout(animateNext, 200);
      } else {
        setAnimating(false);
        const optAverage = selected.reduce((sum, c) => sum + c.compositeScore, 0) / selected.length;
        
        // Calculate greedy scores for comparison
        const greedyIds = new Set();
        let greedyTokens = 0;
        const sorted = [...chunks].sort((a, b) => b.compositeScore - a.compositeScore);
        for (let c of sorted) {
          if (greedyTokens + c.tokens <= tokenBudget) {
            greedyIds.add(c.id);
            greedyTokens += c.tokens;
          }
        }
        const greedyAverage = sorted.filter(c => greedyIds.has(c.id)).reduce((sum, c) => sum + c.compositeScore, 0) / greedyIds.size;
        const improvement = ((optAverage - greedyAverage) / greedyAverage) * 100;
        
        setComparison({
          greedy: {
            score: parseFloat(greedyAverage.toFixed(3)),
            tokens: greedyTokens,
            chunks: greedyIds.size,
            ids: greedyIds
          },
          opt: {
            score: parseFloat(optAverage.toFixed(3)),
            tokens: cumulative,
            chunks: selected.length,
            ids: newSelected
          },
          improvement: parseFloat(improvement.toFixed(1))
        });

        // Trigger score update log
        dispatch({
          type: "LOG",
          payload: { 
            type: "success", 
            text: `Knapsack DP Completed. Selected ${selected.length} chunks. Avg Quality: ${optAverage.toFixed(3)} (${improvement.toFixed(1)}% gain over Greedy).` 
          }
        });
      }
    };
    animateNext();
  };

  // CACHE-AWARE KNAPSACK OPTIMIZER
  const runCacheAwareKnapsack = () => {
    if (animating) return;
    setMode('cache_optimized');
    setAnimating(true);
    
    const cachedChunkIds = new Set(
      chunks.filter(c => isChunkCached(c)).map(c => c.id)
    );
    
    const n = chunks.length;
    const SCALE = 10;
    const scaledBudget = Math.floor(tokenBudget / SCALE);
    
    const dp = Array(n + 1).fill(0).map(() => Array(scaledBudget + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
      const chunk = chunks[i - 1];
      const isCached = cachedChunkIds.has(chunk.id);
      const weight = isCached ? 0 : Math.ceil(chunk.tokens / SCALE);
      const val = Math.round(chunk.compositeScore * 1000);
      
      for (let w = 0; w <= scaledBudget; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + val);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }
    
    let w = scaledBudget;
    const selected = [];
    for (let i = n; i > 0; i--) {
      const chunk = chunks[i - 1];
      const isCached = cachedChunkIds.has(chunk.id);
      const weight = isCached ? 0 : Math.ceil(chunk.tokens / SCALE);
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(chunk);
        w -= weight;
      }
    }
    
    // Animate selections
    const newSelected = new Set();
    let queue = [];
    let cumulativeTokens = 0;
    let cachedTokensSaved = 0;
    
    selected.sort((a,b) => b.compositeScore - a.compositeScore);
    
    for (let c of selected) {
      newSelected.add(c.id);
      if (cachedChunkIds.has(c.id)) {
        cachedTokensSaved += c.tokens;
      } else {
        cumulativeTokens += c.tokens;
      }
      queue.push(new Set(newSelected));
    }
    
    let i = 0;
    const animateNext = () => {
      if (i < queue.length) {
        setSelectedIds(queue[i]);
        i++;
        setTimeout(animateNext, 200);
      } else {
        setAnimating(false);
        const optAverage = selected.reduce((sum, c) => sum + c.compositeScore, 0) / selected.length;
        
        // Calculate greedy scores for comparison
        const greedyIds = new Set();
        let greedyTokens = 0;
        const sorted = [...chunks].sort((a, b) => b.compositeScore - a.compositeScore);
        for (let c of sorted) {
          if (greedyTokens + c.tokens <= tokenBudget) {
            greedyIds.add(c.id);
            greedyTokens += c.tokens;
          }
        }
        const greedyAverage = sorted.filter(c => greedyIds.has(c.id)).reduce((sum, c) => sum + c.compositeScore, 0) / greedyIds.size;
        
        // Normal Knapsack
        const normalSelected = runKnapsackSync(chunks, tokenBudget);
        const normalKnapsackIds = new Set();
        let normalKnapsackTokens = 0;
        normalSelected.forEach(c => {
          normalKnapsackIds.add(c.id);
          normalKnapsackTokens += c.tokens;
        });
        const normalAverage = normalSelected.reduce((sum, c) => sum + c.compositeScore, 0) / normalSelected.length;
        
        const improvement = ((optAverage - greedyAverage) / greedyAverage) * 100;
        
        setComparison({
          greedy: {
            score: parseFloat(greedyAverage.toFixed(3)),
            tokens: greedyTokens,
            chunks: greedyIds.size,
            ids: greedyIds
          },
          opt: {
            score: parseFloat(normalAverage.toFixed(3)),
            tokens: normalKnapsackTokens,
            chunks: normalSelected.length,
            ids: normalKnapsackIds
          },
          cacheOpt: {
            score: parseFloat(optAverage.toFixed(3)),
            tokens: cumulativeTokens,
            actualTokens: cumulativeTokens + cachedTokensSaved,
            chunks: selected.length,
            ids: newSelected,
            saved: cachedTokensSaved
          },
          improvement: parseFloat(improvement.toFixed(1))
        });
        
        dispatch({
          type: "LOG",
          payload: { 
            type: "success", 
            text: `Cache-Aware Knapsack DP Completed. Selected ${selected.length} chunks. Saved ${(cachedTokensSaved / 1000).toFixed(0)}k VRAM tokens. Avg Quality: ${optAverage.toFixed(3)}.` 
          }
        });
      }
    };
    animateNext();
  };

  const resetToManual = () => {
    setMode('manual');
    setSelectedIds(new Set([10, 7, 4, 13, 1]));
    setComparison(null);
  };

  // Chunks source filter logic
  const filteredChunks = chunks.filter(c => {
    if (activeSourceFilter === 'All') return true;
    return c.source === activeSourceFilter;
  });

  // Setup stacked data for Recharts
  const selectedChunksList = chunks.filter(c => selectedIds.has(c.id));
  
  // Format data for Recharts stacked bar
  const stackedBarData = [
    selectedChunksList.reduce((acc, curr) => {
      return { 
        ...acc, 
        [curr.label]: curr.tokens 
      };
    }, { name: 'VRAM Token Allocation' })
  ];

  const categoryColors = {
    Financial: '#3b82f6',
    News: '#60a5fa',
    Industry: '#818cf8',
    Engagement: '#10b981',
    Competitive: '#34d399',
    Credentials: '#6b7280',
    People: '#a78bfa',
    Regulatory: '#f59e0b',
    Meeting: '#ec4899'
  };

  const activeJob = gameState.activeWorkloads.length > 0 
    ? gameState.activeWorkloads[0].job 
    : (gameState.workloadsQueue.length > 0 ? gameState.workloadsQueue[0] : null);

  const currentWorkload = activeJob || {
    name: "PharmaCorp Advisory Brief",
    contextTokens: 8000,
    targetSlaSeconds: 3.5,
    prefixGroup: "pharma-advisory"
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="flex-between" style={{ borderBottom: '1px solid #272a37', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Layers size={24} /> CONTEXT BUDGET OPTIMIZER
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Map unstructured files into GPU memory limits. Run exact Knapsack solvers to maximize composite context score.
          </p>
        </div>
        
        {/* GPU Selector */}
        {allGpus.length > 0 && (
          <div className="flex-gap-sm" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid #1e2230' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ACTIVE BUDGET TARGET GPU:</span>
            <select
              value={selectedGpuAddress}
              onChange={(e) => {
                setSelectedGpuAddress(e.target.value);
                setComparison(null);
              }}
              style={{ background: '#0b0c10', color: 'var(--text-primary)', border: 'none', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              {allGpus.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Intent Decomposition Panel (Stage 4) */}
      <div className="panel" style={{ background: '#12141a', borderColor: '#272a37', padding: '16px' }}>
        <div className="flex-between">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Powered by NeMo Retriever</span>
          <span className="badge badge-nvidia">DECOMPOSITION ACTIVE</span>
        </div>
        <div style={{ marginTop: '12px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            Workload Decomposition: <span style={{ color: 'var(--nvidia-green)' }}>{currentWorkload.name}</span>
          </h3>
          <div className="flex-gap-sm" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-success">Category: {currentWorkload.prefixGroup}</span>
            <span className="badge badge-docs">Source: Multi-source Documents</span>
            <span className="badge badge-crm">Freshness Limit: 85% Target</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: 'auto' }}>
              Base Tokens: <strong>{currentWorkload.contextTokens.toLocaleString()}</strong>
            </span>
          </div>
          <div className="panel" style={{ marginTop: '12px', background: '#0b0c10', borderColor: 'rgba(118, 185, 0, 0.15)', padding: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <strong>💡 Context Engineering Insight:</strong> This decomposition happened before any GPU touched the data. Context Engineering asks: what information do we need before we compute? NeMo Retriever extracts these needs semantically.
          </div>
        </div>
      </div>

      {/* Main interface layout split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left: Chunk Catalog list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '14px', color: 'var(--text-primary)' }}>CONSTRUCT CONTEXT SELECTION</h3>
            {/* Filters */}
            <div className="flex-gap-sm">
              {['All', 'CRM', 'Docs', 'Web', 'Profile'].map(src => (
                <button
                  key={src}
                  className={`btn ${activeSourceFilter === src ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '10px' }}
                  onClick={() => setActiveSourceFilter(src)}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '450px', paddingRight: '4px' }}>
            {filteredChunks.map(c => {
              const isSelected = selectedIds.has(c.id);
              const sourceClass = `badge-${c.source.toLowerCase()}`;

              return (
                <div 
                  key={c.id} 
                  className="panel"
                  onClick={() => toggleChunk(c.id)}
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: mode === 'manual' ? 'pointer' : 'not-allowed',
                    background: isSelected ? 'rgba(34, 211, 238, 0.04)' : 'var(--bg-elevated)',
                    borderColor: isSelected ? 'var(--accent-cyan)' : '#1e2230',
                    opacity: mode !== 'manual' ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="flex-gap-sm" style={{ flexGrow: 1 }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: '1px solid #272a37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--accent-cyan)' : 'transparent'
                    }}>
                      {isSelected && <Check size={12} color="#000" />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {c.label}
                      </span>
                      <div className="flex-gap-sm" style={{ fontSize: '10px', alignItems: 'center' }}>
                        <span className={`badge ${sourceClass}`}>{c.source}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{c.category}</span>
                        <span style={{ color: 'var(--text-muted)' }}>|</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{c.tokens} Tokens</span>
                        {isChunkCached(c) && (
                          <span className="badge" style={{ background: 'rgba(34, 211, 238, 0.15)', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '2px', padding: '1px 4px', fontSize: '9px' }}>
                            ⚡ CACHED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '80px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Score Weight:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent-cyan)', fontSize: '13px' }}>
                      {c.compositeScore.toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Budget metrics and charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active budget status bar */}
          <div className="panel" style={{ background: '#12141a', borderColor: '#272a37' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
              VRAM SPACE EFFICIENCY GAUGE
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="flex-between" style={{ fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tokens Allocated:</span>
                <span style={{ fontWeight: 'bold', color: totalTokens > tokenBudget ? 'var(--neon-red)' : 'var(--accent-cyan)' }}>
                  {totalTokens.toLocaleString()} / {tokenBudget.toLocaleString()} Tokens
                </span>
              </div>
              <div style={{ width: '100%', height: '14px', background: '#08090d', borderRadius: '7px', overflow: 'hidden', border: '1px solid #1e2230' }}>
                <div style={{
                  width: `${Math.min(100, (totalTokens / tokenBudget) * 100)}%`,
                  height: '100%',
                  background: totalTokens > tokenBudget ? 'var(--neon-red)' : 'var(--accent-cyan)',
                  boxShadow: '0 0 8px var(--accent-cyan-glow)',
                  transition: 'width 0.4s ease'
                }}></div>
              </div>
              <div className="flex-between" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Budget Ratio: {((totalTokens / tokenBudget) * 100).toFixed(1)}%</span>
                <span>Max GPU VRAM Limit</span>
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: '16px', borderTop: '1px solid #1e2230', paddingTop: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>SELECTED COUNT</span>
                <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{selectedIds.size} Chunks</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>AVERAGE SCORE</span>
                <strong style={{ fontSize: '18px', color: 'var(--accent-cyan)' }}>{averageScore.toFixed(3)}</strong>
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '12px', flexWrap: 'wrap' }}>
            <div className="flex-gap-sm" style={{ flexWrap: 'wrap' }}>
              <button 
                className={`btn ${mode === 'greedy' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={runGreedy}
                disabled={animating}
              >
                Greedy Top-K
              </button>
              <button 
                className={`btn ${mode === 'optimized' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--accent-cyan)', color: mode === 'optimized' ? '#000' : 'var(--accent-cyan)' }}
                onClick={runKnapsack}
                disabled={animating}
              >
                🚀 Knapsack DP
              </button>
              {(gameState.activeOptimizations.has("prefix_cache") || gameState.activeOptimizations.has("ctx_library")) && (
                <button 
                  className={`btn ${mode === 'cache_optimized' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--accent-cyan)', color: mode === 'cache_optimized' ? '#000' : 'var(--accent-cyan)' }}
                  onClick={runCacheAwareKnapsack}
                  disabled={animating}
                >
                  ⚡ Cache-Aware Knapsack
                </button>
              )}
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={resetToManual}
              disabled={animating}
            >
              <RefreshCw size={12} /> Reset
            </button>
          </div>

          {/* Algorithm Comparison Table */}
          {comparison && (
            <div className="panel" style={{ background: 'rgba(0,0,0,0.3)', borderColor: '#1e2230' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={14} style={{ color: 'var(--accent-cyan)' }} /> OPTIMIZATION SCORECARD
              </h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #272a37', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '4px' }}>Algorithm</th>
                    <th>Selected</th>
                    <th>Tokens</th>
                    <th style={{ textAlign: 'right' }}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '6px 4px', color: 'var(--text-secondary)' }}>Greedy Top-K</td>
                    <td>{comparison.greedy.chunks}</td>
                    <td>{comparison.greedy.tokens.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{comparison.greedy.score.toFixed(3)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '6px 4px', color: 'var(--accent-indigo)' }}>Knapsack DP</td>
                    <td>{comparison.opt.chunks}</td>
                    <td>{comparison.opt.tokens.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-indigo)' }}>{comparison.opt.score.toFixed(3)}</td>
                  </tr>
                  {comparison.cacheOpt && (
                    <tr>
                      <td style={{ padding: '6px 4px', color: 'var(--accent-cyan)' }}>Cache-Aware Knapsack</td>
                      <td>{comparison.cacheOpt.chunks}</td>
                      <td>{comparison.cacheOpt.tokens.toLocaleString()} (eff.)</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{comparison.cacheOpt.score.toFixed(3)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div style={{ marginTop: '10px', fontSize: '11px', background: 'rgba(34, 211, 238, 0.05)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(34,211,238,0.1)' }}>
                {comparison.cacheOpt ? (
                  <span>
                    ⚡ <strong>Cache-Aware Knapsack</strong> selected {comparison.cacheOpt.chunks} chunks (total {comparison.cacheOpt.actualTokens.toLocaleString()} tokens of content) while only costing <strong style={{ color: 'var(--accent-cyan)' }}>{comparison.cacheOpt.tokens.toLocaleString()} tokens</strong> of VRAM budget. Cache reusability saved you <strong style={{ color: 'var(--neon-green)' }}>{comparison.cacheOpt.saved.toLocaleString()} tokens</strong> of VRAM!
                  </span>
                ) : (
                  <span>
                    💡 Knapsack DP achieved <strong style={{ color: 'var(--accent-cyan)' }}>+{comparison.improvement}%</strong> higher average score weight than Greedy selection under the exact same VRAM constraints.
                  </span>
                )}
              </div>
              <div className="panel" style={{ marginTop: '10px', background: 'rgba(118, 185, 0, 0.05)', borderColor: 'rgba(118, 185, 0, 0.15)', padding: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <strong>💡 Reusability Teaching Moment:</strong> The best context is context you don't recompute. On a cold GPU, the knapsack optimizer is limited. But on a warm GPU with cached PharmaCorp data, the cache-aware knapsack fits additional chunks for 0 marginal VRAM cost!
              </div>
            </div>
          )}

          {/* Recharts allocation visual */}
          {selectedChunksList.length > 0 && (
            <div className="panel" style={{ height: '140px', padding: '12px', background: 'rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                RECHARTS GRAPH - CONTEXT SEGMENT ALLOCATION
              </span>
              <div style={{ width: '100%', height: '80px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedBarData} layout="vertical">
                    <XAxis type="number" hide domain={[0, tokenBudget]} />
                    <YAxis type="category" dataKey="name" hide />
                    {selectedChunksList.map(c => (
                      <Bar 
                        key={c.id} 
                        dataKey={c.label} 
                        stackId="a" 
                        fill={categoryColors[c.category] || 'var(--accent-indigo)'} 
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
