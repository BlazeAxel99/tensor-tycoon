import { GPU_CATALOG, OPTIMIZATION_CATALOG, DETERMINISTIC_WORKLOADS, CONTRACT_TEMPLATES, MILESTONES } from "./types.js";

// Helper to get random contracts
export function getRandomContracts(count) {
  const selected = [];
  for (let i = 0; i < count; i++) {
    const template = CONTRACT_TEMPLATES[Math.floor(Math.random() * CONTRACT_TEMPLATES.length)];
    selected.push({
      id: `contract-${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      client: template.client,
      contextTokens: template.contextTokens,
      targetSlaSeconds: template.targetSlaSeconds,
      tensorReward: template.tensorReward,
      penalty: template.penalty,
      baseQuality: template.baseQuality,
      prefixGroup: template.prefixGroup,
      description: template.description
    });
  }
  return selected;
}

// Initialize game state
export function initGame() {
  return {
    tensors: 5000,
    racks: [
      {
        id: 1,
        name: "Rack 1",
        gpus: [
          { ...GPU_CATALOG.L40S, activeJobId: null, kvCache: [] }
        ],
        maxGpus: 4
      }
    ],
    activeOptimizations: new Set(),
    pendingOptimizations: {}, // e.g. { tensorrt: 2 } (ticks remaining)
    workloadsQueue: [], // workloads waiting to run
    activeWorkloads: [], // workloads currently running: { id, job, assignedGpuSlot, ticksRemaining, startTick, latency, quality, cacheHitRatio }
    completedJobs: [], // history of completed jobs: { name, tickCompleted, latency, quality, slaMet, reward, cacheHitRatio, prefixGroup }
    tick: 0,
    metrics: {
      contextCoverage: 100, // 0 to 100
      vramEfficiency: 0, // %
      compressionRatio: 0, // %
      freshnessIndex: 90, // %
      llmJudgeScore: 8.5,
      pipelineLatency: 0, // s
      cacheHitRate: 0 // %
    },
    metricsHistory: {
      contextCoverage: [],
      vramEfficiency: [],
      compressionRatio: [],
      freshnessIndex: [],
      llmJudgeScore: [],
      pipelineLatency: [],
      cacheHitRate: []
    },
    agentMesh: {
      // Routing mapping: agent -> gpu address "rackId-gpuIndex"
      routing: {
        orchestrator: "1-0",
        research: "1-0",
        analysis: "1-0",
        drafting: "1-0"
      },
      // Sliders from 0 to 100
      freshness: {
        research: 95,
        industry: 90,
        crm: 85
      },
      // Propagation rules
      rules: {
        orchestrator_research: true,
        research_analysis: true,
        analysis_drafting: true,
        research_drafting: false // Isolated
      }
    },
    stressTestActive: false,
    stressTestCompleted: false,
    oomEventsCount: 0,
    slaBreachesCount: 0,
    totalTensorsEarned: 0,
    // Contracts & Story Mode State
    availableContracts: getRandomContracts(3),
    currentMilestone: 1,
    showHowToPlay: true,
    logs: [
      { tick: 0, type: "system", text: "NVIDIA TensorTycoon initialized. Starting L40S node active." }
    ]
  };
}

// Deep clone helper for React state updates
export function cloneState(state) {
  return {
    ...state,
    racks: state.racks.map(rack => ({
      ...rack,
      isOffline: rack.isOffline || false,
      gpus: rack.gpus.map(gpu => ({
        ...gpu,
        kvCache: [...gpu.kvCache]
      }))
    })),
    activeOptimizations: new Set(state.activeOptimizations),
    pendingOptimizations: { ...state.pendingOptimizations },
    workloadsQueue: state.workloadsQueue.map(w => ({ ...w })),
    activeWorkloads: state.activeWorkloads.map(aw => ({ ...aw, job: { ...aw.job } })),
    completedJobs: state.completedJobs.map(cj => ({ ...cj })),
    metrics: { ...state.metrics },
    metricsHistory: {
      contextCoverage: [...state.metricsHistory.contextCoverage],
      vramEfficiency: [...state.metricsHistory.vramEfficiency],
      compressionRatio: [...state.metricsHistory.compressionRatio],
      freshnessIndex: [...state.metricsHistory.freshnessIndex],
      llmJudgeScore: [...state.metricsHistory.llmJudgeScore],
      pipelineLatency: [...state.metricsHistory.pipelineLatency],
      cacheHitRate: [...state.metricsHistory.cacheHitRate]
    },
    agentMesh: {
      routing: { ...state.agentMesh.routing },
      freshness: { ...state.agentMesh.freshness },
      rules: { ...state.agentMesh.rules }
    },
    availableContracts: state.availableContracts ? state.availableContracts.map(c => ({ ...c })) : [],
    currentMilestone: state.currentMilestone || 1,
    showHowToPlay: state.showHowToPlay !== undefined ? state.showHowToPlay : true,
    logs: state.logs.map(l => ({ ...l }))
  };
}

// Knapsack Token Optimizer (DP Solver)
export function runKnapsackSolver(chunks, maxVramGb, tokensToVramCoeff = 0.0005) {
  // Translate VRAM limit to token limit
  const maxTokens = Math.floor(maxVramGb / tokensToVramCoeff);
  const n = chunks.length;
  
  // dp[i][w] = max value using first i chunks with token budget w
  const dp = Array(n + 1).fill(0).map(() => Array(maxTokens + 1).fill(0));
  
  for (let i = 1; i <= n; i++) {
    const chunk = chunks[i - 1];
    const weight = chunk.tokens;
    // Scale compositeScore to integer
    const val = Math.round(((chunk.relevance * 0.5) + (chunk.freshness * 0.3) + (["Meeting", "Engagement", "People"].includes(chunk.category) ? 0.2 : 0.12)) * 1000);
    
    for (let w = 0; w <= maxTokens; w++) {
      if (weight <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + val);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }
  
  let w = maxTokens;
  const selected = [];
  for (let i = n; i > 0; i--) {
    const chunk = chunks[i - 1];
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(chunk);
      w -= chunk.tokens;
    }
  }
  
  return selected;
}

// Apply player action
export function applyAction(state, action) {
  const next = cloneState(state);
  
  switch (action.type) {
    case "BUY_GPU": {
      const { rackId, gpuType } = action.payload;
      const rack = next.racks.find(r => r.id === rackId);
      const gpuConfig = GPU_CATALOG[gpuType];
      
      if (!rack || !gpuConfig) return state;
      if (rack.gpus.length >= rack.maxGpus) {
        next.logs.unshift({ tick: next.tick, type: "error", text: `Rack ${rackId} is full (max 4 GPUs).` });
        return next;
      }
      if (next.tensors < gpuConfig.cost) {
        next.logs.unshift({ tick: next.tick, type: "error", text: `Insufficient Tensors to purchase ${gpuConfig.name}. Need ${gpuConfig.cost}.` });
        return next;
      }
      
      next.tensors -= gpuConfig.cost;
      rack.gpus.push({
        ...gpuConfig,
        activeJobId: null,
        kvCache: []
      });
      next.logs.unshift({ tick: next.tick, type: "purchase", text: `Purchased ${gpuConfig.name} for Rack ${rackId}. (-${gpuConfig.cost} Tensors)` });
      break;
    }
    
    case "BUY_RACK": {
      const cost = 1000;
      if (next.tensors < cost) {
        next.logs.unshift({ tick: next.tick, type: "error", text: "Insufficient Tensors to buy Rack. Need 1000." });
        return next;
      }
      
      next.tensors -= cost;
      const newRackId = next.racks.length + 1;
      next.racks.push({
        id: newRackId,
        name: `Rack ${newRackId}`,
        gpus: [],
        maxGpus: 4,
        isOffline: false
      });
      next.logs.unshift({ tick: next.tick, type: "purchase", text: `Added Rack ${newRackId} to floor. (-1000 Tensors)` });
      break;
    }
    
    case "BUY_OPTIMIZATION": {
      const { optId } = action.payload;
      const opt = OPTIMIZATION_CATALOG[optId];
      
      if (!opt || next.activeOptimizations.has(optId) || next.pendingOptimizations[optId] !== undefined) {
        return state;
      }
      
      if (next.tensors < opt.cost) {
        next.logs.unshift({ tick: next.tick, type: "error", text: `Insufficient Tensors for ${opt.name}. Need ${opt.cost}.` });
        return next;
      }
      
      next.tensors -= opt.cost;
      
      if (opt.compileDelay) {
        next.pendingOptimizations[optId] = opt.compileDelay;
        next.logs.unshift({ tick: next.tick, type: "compile", text: `Started compilation of ${opt.name}. (Completing in ${opt.compileDelay} ticks)` });
      } else {
        next.activeOptimizations.add(optId);
        next.logs.unshift({ tick: next.tick, type: "purchase", text: `Activated optimization: ${opt.name}. (-${opt.cost} Tensors)` });
      }
      break;
    }
    
    case "SET_ROUTING": {
      const { agent, gpuSlot } = action.payload; // e.g. agent: "research", gpuSlot: "1-0"
      next.agentMesh.routing[agent] = gpuSlot;
      next.logs.unshift({ tick: next.tick, type: "config", text: `Routed ${agent} agent to GPU ${gpuSlot}.` });
      break;
    }
    
    case "SET_FRESHNESS": {
      const { type, value } = action.payload; // e.g. type: "research", value: 85
      next.agentMesh.freshness[type] = value;
      break;
    }
    
    case "SET_RULE": {
      const { rule, value } = action.payload;
      next.agentMesh.rules[rule] = value;
      next.logs.unshift({ tick: next.tick, type: "config", text: `Rule ${rule} set to ${value}.` });
      break;
    }
    
    case "FLUSH_CACHE": {
      const { rackId, gpuIndex } = action.payload;
      const rack = next.racks.find(r => r.id === rackId);
      if (rack && rack.gpus[gpuIndex]) {
        rack.gpus[gpuIndex].kvCache = [];
        next.logs.unshift({ tick: next.tick, type: "system", text: `Manually flushed KV Cache for GPU Rack ${rackId} Slot ${gpuIndex}.` });
      }
      break;
    }
    
    case "START_STRESS_TEST": {
      if (!next.stressTestActive && !next.stressTestCompleted) {
        next.stressTestActive = true;
        next.tick = 0; // Reset tick for standard stress test duration
        next.oomEventsCount = 0;
        next.slaBreachesCount = 0;
        next.activeWorkloads = [];
        next.workloadsQueue = [];
        next.completedJobs = [];
        next.logs = [{ tick: 0, type: "system", text: "⚡ STRESS TEST INITIATED. SLA target is active. Monitoring for OOM crashes." }];
      }
      break;
    }
    
    case "CLOSE_SCORECARD": {
      next.stressTestCompleted = false;
      break;
    }

    case "ACCEPT_CONTRACT": {
      const { contractId, gpuSlot } = action.payload;
      const contractIdx = next.availableContracts.findIndex(c => c.id === contractId);
      if (contractIdx === -1) return state;
      
      const contract = next.availableContracts[contractIdx];
      
      // Remove from available contracts
      next.availableContracts.splice(contractIdx, 1);
      
      // Generate a new available contract to replace it
      next.availableContracts.push(getRandomContracts(1)[0]);
      
      // Push the contract to workloadsQueue with target GPU slot pre-assigned
      const jobId = `job-${next.tick}-${Math.random().toString(36).substr(2, 4)}`;
      next.workloadsQueue.push({
        id: jobId,
        name: contract.name,
        client: contract.client,
        contextTokens: contract.contextTokens,
        targetSlaSeconds: contract.targetSlaSeconds,
        tensorReward: contract.tensorReward,
        penalty: contract.penalty,
        baseQuality: contract.baseQuality,
        prefixGroup: contract.prefixGroup,
        assignedGpuSlot: gpuSlot, // pre-assigned slot
        duration: contract.duration || Math.max(2, Math.ceil((contract.contextTokens / 1000) * 0.08)) // duration in ticks
      });
      
      next.logs.unshift({
        tick: next.tick,
        type: "incoming",
        text: `Signed contract: "${contract.name}" with ${contract.client}. Routed to GPU ${gpuSlot}.`
      });
      break;
    }
    
    case "REFRESH_CONTRACTS": {
      const cost = 200;
      if (next.tensors < cost) {
        next.logs.unshift({ tick: next.tick, type: "error", text: `Insufficient Tensors to refresh contracts. Need 200.` });
        return next;
      }
      next.tensors -= cost;
      next.availableContracts = getRandomContracts(3);
      next.logs.unshift({ tick: next.tick, type: "system", text: `Refreshed available contracts board. (-200 Tensors)` });
      break;
    }
    
    case "CLOSE_GUIDE": {
      next.showHowToPlay = false;
      break;
    }
    
    case "OPEN_GUIDE": {
      next.showHowToPlay = true;
      break;
    }
    
    case "RESET_GAME": {
      return initGame();
    }
    
    default:
      break;
  }
  
  return next;
}

// Tick Game (State loop running at 1Hz)
export function tickGame(state) {
  const next = cloneState(state);
  next.tick += 1;
  
  // 1. Process pending optimizations (compile timers)
  for (const optId in next.pendingOptimizations) {
    next.pendingOptimizations[optId] -= 1;
    if (next.pendingOptimizations[optId] <= 0) {
      delete next.pendingOptimizations[optId];
      next.activeOptimizations.add(optId);
      const opt = OPTIMIZATION_CATALOG[optId];
      next.logs.unshift({ tick: next.tick, type: "compile", text: `🎉 Compile complete: ${opt.name} is now active!` });
    }
  }
  
  // 2. Fetch new workloads or manage contracts board
  if (next.stressTestActive) {
    const incoming = DETERMINISTIC_WORKLOADS.filter(w => w.tick === next.tick - 1);
    for (const job of incoming) {
      // Generate unique ID
      const jobId = `job-${next.tick}-${Math.random().toString(36).substr(2, 4)}`;
      next.workloadsQueue.push({
        id: jobId,
        ...job
      });
      next.logs.unshift({ tick: next.tick, type: "incoming", text: `[STRESS TEST] Incoming workload: "${job.name}" (${(job.contextTokens / 1000).toFixed(0)}k tokens, target SLA ${job.targetSlaSeconds}s).` });
    }
  } else {
    // Tycoon Mode: Maintain 3 available contracts on board
    if (!next.availableContracts || next.availableContracts.length < 3) {
      const needed = 3 - (next.availableContracts ? next.availableContracts.length : 0);
      const newContracts = getRandomContracts(needed);
      next.availableContracts = [...(next.availableContracts || []), ...newContracts];
    }
    // Periodically refresh 1 contract to simulate a moving market
    if (next.tick % 15 === 0 && next.availableContracts.length > 0) {
      next.availableContracts.shift();
      next.availableContracts.push(getRandomContracts(1)[0]);
    }
  }
  
  // 3. Update active workloads (decrement execution ticks)
  const completedThisTick = [];
  const runningWorkloads = [];
  
  // Clear GPU active status before computing this tick's GPU jobs
  next.racks.forEach(r => r.gpus.forEach(g => { g.activeJobId = null; }));
  
  for (const aw of next.activeWorkloads) {
    aw.ticksRemaining -= 1;
    
    if (aw.ticksRemaining <= 0) {
      completedThisTick.push(aw);
    } else {
      runningWorkloads.push(aw);
      // Mark GPU as active
      const routeSlot = aw.assignedGpuSlot || "1-0";
      const [rId, gIdx] = routeSlot.split("-").map(Number);
      const rack = next.racks.find(r => r.id === rId);
      if (rack && rack.gpus[gIdx]) {
        rack.gpus[gIdx].activeJobId = aw.id;
      }
    }
  }
  next.activeWorkloads = runningWorkloads;
  
  // Power limit enforcement
  next.racks.forEach(r => { r.isOffline = false; });
  let currentPower = calculateTotalPowerDraw(next);
  if (currentPower > 5000) {
    for (let i = next.racks.length - 1; i >= 0; i--) {
      const rack = next.racks[i];
      rack.isOffline = true;
      next.logs.unshift({ tick: next.tick, type: "error", text: `⚠️ DATACENTER POWER LIMIT EXCEEDED (${currentPower}W > 5000W). Shutting down ${rack.name}.` });
      
      // Fail active workloads running on GPUs in this rack
      rack.gpus.forEach(gpu => {
        if (gpu.activeJobId) {
          const idx = runningWorkloads.findIndex(aw => aw.id === gpu.activeJobId);
          if (idx !== -1) {
            const aw = runningWorkloads[idx];
            runningWorkloads.splice(idx, 1);
            next.tensors = Math.max(0, next.tensors - (aw.job.penalty || 200)); // Penalty
            next.logs.unshift({ tick: next.tick, type: "error", text: `💥 Job "${aw.job.name}" failed due to power shutdown on ${rack.name}. (-${aw.job.penalty || 200} Tensors)` });
          }
          gpu.activeJobId = null;
        }
      });
      
      currentPower = calculateTotalPowerDraw(next);
      if (currentPower <= 5000) break;
    }
    next.activeWorkloads = runningWorkloads;
  }
  
  // Auto-evict stale cache entries if NeMo Retrieval Rail is active
  if (next.activeOptimizations.has("nemo_retrieval_rail")) {
    const cacheTtl = next.activeOptimizations.has("prefix_cache") ? 50 : 30;
    next.racks.forEach(r => {
      r.gpus.forEach(gpu => {
        const initialCount = gpu.kvCache.length;
        gpu.kvCache = gpu.kvCache.filter(e => (next.tick - e.tickCached) < cacheTtl);
        const evictedCount = initialCount - gpu.kvCache.length;
        if (evictedCount > 0) {
          next.logs.unshift({ tick: next.tick, type: "cache", text: `🛡️ NeMo Retrieval Rail auto-evicted ${evictedCount} stale cache entries from GPU.` });
        }
      });
    });
  }
  
  // 4. Handle completed workloads
  for (const aw of completedThisTick) {
    const job = aw.job;
    const latency = aw.latency;
    const quality = aw.quality;
    const slaMet = latency <= job.targetSlaSeconds;
    
    // Calculate Reward
    let reward = job.tensorReward;
    if (aw.cacheHitRatio > 0) {
      const cacheBonus = Math.floor(aw.cacheHitRatio * job.tensorReward * 0.3);
      reward += cacheBonus;
    }
    
    if (!slaMet) {
      const penalty = job.penalty || Math.floor(reward * 0.5);
      next.tensors = Math.max(0, next.tensors - penalty);
      next.slaBreachesCount += 1;
      next.logs.unshift({ tick: next.tick, type: "warning", text: `❌ SLA Breach: "${job.name}" completed in ${latency.toFixed(2)}s (Target: ${job.targetSlaSeconds}s). Penalty applied: -${penalty} Tensors.` });
    } else {
      next.tensors += reward;
      next.totalTensorsEarned += reward;
      next.logs.unshift({ tick: next.tick, type: "success", text: `✅ Workload complete: "${job.name}" processed in ${latency.toFixed(2)}s. Quality: ${quality.toFixed(1)}/10. (+${reward} Tensors)` });
    }
    
    // Add completed details
    next.completedJobs.push({
      name: job.name,
      tickCompleted: next.tick,
      latency,
      quality,
      slaMet,
      reward: slaMet ? reward : -(job.penalty || Math.floor(reward * 0.5)),
      cacheHitRatio: aw.cacheHitRatio,
      prefixGroup: job.prefixGroup
    });
    
    // Cache the prefix in the assigned GPU
    const routeSlot = aw.assignedGpuSlot || "1-0";
    const [rId, gIdx] = routeSlot.split("-").map(Number);
    const rack = next.racks.find(r => r.id === rId);
    if (rack && rack.gpus[gIdx]) {
      const gpu = rack.gpus[gIdx];
      const currentCacheSize = gpu.kvCache.reduce((sum, entry) => sum + entry.tokenCount, 0);
      const cacheLimitTokens = gpu.cachePool * 2000;
      
      if (currentCacheSize + job.contextTokens > cacheLimitTokens) {
        while (gpu.kvCache.length > 0 && gpu.kvCache.reduce((sum, e) => sum + e.tokenCount, 0) + job.contextTokens > cacheLimitTokens) {
          const evicted = gpu.kvCache.shift();
          next.logs.unshift({ tick: next.tick, type: "system", text: `Evicted prefix group "${evicted.prefixGroup}" from GPU ${routeSlot} cache pool.` });
        }
      }
      
      gpu.kvCache.push({
        prefixGroup: job.prefixGroup,
        tokenCount: job.contextTokens,
        tickCached: next.tick
      });
      next.logs.unshift({ tick: next.tick, type: "cache", text: `⚡ KV Cache stored prefix group "${job.prefixGroup}" (${(job.contextTokens / 1000).toFixed(0)}k tokens) on GPU ${routeSlot}.` });
    }
  }
  
  // 5. Try dispatching workloads from queue (slot-aware dispatcher)
  const idleGpuSlots = [];
  next.racks.forEach(r => {
    if (r.isOffline) return;
    r.gpus.forEach((gpu, gIdx) => {
      if (gpu.activeJobId === null) {
        idleGpuSlots.push(`${r.id}-${gIdx}`);
      }
    });
  });
  
  const remainingQueue = [];
  for (const job of next.workloadsQueue) {
    let assignedSlot = job.assignedGpuSlot;
    if (assignedSlot) {
      const isIdle = idleGpuSlots.includes(assignedSlot);
      if (isIdle) {
        const idx = idleGpuSlots.indexOf(assignedSlot);
        idleGpuSlots.splice(idx, 1);
        dispatchJob(job, assignedSlot);
      } else {
        remainingQueue.push(job);
      }
    } else {
      if (idleGpuSlots.length > 0) {
        assignedSlot = idleGpuSlots.shift();
        dispatchJob(job, assignedSlot);
      } else {
        remainingQueue.push(job);
      }
    }
  }
  next.workloadsQueue = remainingQueue;

  // Local helper for dispatching a job onto a slot
  function dispatchJob(job, slot) {
    const [rId, gIdx] = slot.split("-").map(Number);
    const rack = next.racks.find(r => r.id === rId);
    const gpu = rack.gpus[gIdx];
    
    gpu.activeJobId = job.id;
    
    let contextTokens = job.contextTokens;
    let qualityPenalty = 0;
    let qualityBonus = 0;
    
    if (next.activeOptimizations.has("ctx_compress")) {
      contextTokens *= 0.2;
      if (next.activeOptimizations.has("nemo_output_rail")) {
        qualityPenalty = 0;
      } else {
        qualityPenalty -= 1.5;
      }
    }
    
    if (next.activeOptimizations.has("knapsack")) {
      contextTokens *= 0.85;
      qualityBonus += 0.8;
    }
    
    if (next.activeOptimizations.has("nemo_input_rail")) {
      contextTokens *= 0.85;
      qualityBonus += 0.5;
    }
    
    let vramRequired = (contextTokens / 1000) * 0.5;
    if (next.activeOptimizations.has("paged_attn")) {
      vramRequired *= 0.5;
    }
    
    const permanentVram = next.activeOptimizations.has("ctx_library") ? 8 : 0;
    const availableVram = gpu.vram - permanentVram;
    
    let cacheHitRatio = 0.0;
    const cacheTtl = next.activeOptimizations.has("prefix_cache") ? 50 : 30;
    
    const matchingCache = gpu.kvCache.find(e => e.prefixGroup === job.prefixGroup && (next.tick - e.tickCached) < cacheTtl);
    if (matchingCache) {
      cacheHitRatio = 0.4;
    }
    if (next.activeOptimizations.has("ctx_library")) {
      cacheHitRatio = Math.max(cacheHitRatio, 0.3);
    }
    cacheHitRatio = Math.min(cacheHitRatio, 0.8);
    
    const effectiveVram = vramRequired * (1 - cacheHitRatio * 0.7);
    
    if (effectiveVram > availableVram) {
      next.oomEventsCount += 1;
      next.logs.unshift({ tick: next.tick, type: "error", text: `💥 OOM CRASH on GPU ${slot}: Workload "${job.name}" required ${effectiveVram.toFixed(1)}GB VRAM, but only ${availableVram.toFixed(1)}GB was available. Job aborted.` });
      gpu.activeJobId = null;
      return;
    }
    
    const baseLatency = (contextTokens / 1000) * 0.08;
    let gpuSpeedup = gpu.tflops / 362;
    
    const rackTemp = calculateRackTemperature(rack);
    if (rackTemp >= 80) {
      gpuSpeedup *= 0.5;
    }
    
    let optMultiplier = 1.0;
    if (next.activeOptimizations.has("acc_parallel")) {
      optMultiplier *= 3.0;
    }
    if (next.activeOptimizations.has("tensorrt")) {
      optMultiplier *= 2.5;
    }
    
    const agentShares = { orchestrator: 0.1, research: 0.4, analysis: 0.3, drafting: 0.2 };
    let totalLatency = 0;
    
    for (const agent in agentShares) {
      const share = agentShares[agent];
      const route = next.agentMesh.routing[agent] || "1-0";
      const [rIdRoute, gIdxRoute] = route.split("-").map(Number);
      const routeRack = next.racks.find(r => r.id === rIdRoute);
      const routeGpu = routeRack ? routeRack.gpus[gIdxRoute] : gpu;
      let routeGpuSpeedup = (routeGpu ? routeGpu.tflops : gpu.tflops) / 362;
      
      const routeRackTemp = routeRack ? calculateRackTemperature(routeRack) : rackTemp;
      if (routeRackTemp >= 80) {
        routeGpuSpeedup *= 0.5;
      }
      
      let agentLatency = (share * baseLatency) / (routeGpuSpeedup * optMultiplier);
      
      if (agent === "research" && !next.agentMesh.rules.orchestrator_research) {
        agentLatency += 0.5;
      }
      if (agent === "drafting" && next.agentMesh.rules.research_drafting) {
        agentLatency *= 0.7;
      }
      if (next.activeOptimizations.has("acc_copyin")) {
        agentLatency -= (0.3 / 4);
      }
      if (next.activeOptimizations.has("nemo_output_rail")) {
        agentLatency += (0.2 / 4);
      }
      
      totalLatency += Math.max(0.02, agentLatency);
    }
    
    totalLatency *= (1 - cacheHitRatio * 0.5);
    
    let freshnessVal = calculateFreshnessIndex(next.agentMesh.freshness);
    if (next.activeOptimizations.has("nemo_retrieval_rail") && freshnessVal < 60) {
      freshnessVal = 60;
    }
    
    let stalePenalty = 0;
    if (freshnessVal < 100) {
      stalePenalty = (1 - freshnessVal / 100) * 2.0;
    }
    
    if (!next.agentMesh.rules.research_analysis) {
      qualityPenalty -= 1.0;
    }
    if (!next.agentMesh.rules.analysis_drafting) {
      qualityPenalty -= 1.0;
    }
    if (next.agentMesh.rules.research_drafting && !next.activeOptimizations.has("nemo_output_rail")) {
      qualityPenalty -= 1.2;
    }
    
    let jobQuality = job.baseQuality + qualityBonus + qualityPenalty - stalePenalty;
    jobQuality = Math.max(0.0, Math.min(10.0, jobQuality));
    
    const ticksRequired = Math.max(1, Math.ceil(totalLatency));
    
    next.activeWorkloads.push({
      id: job.id,
      job,
      assignedGpuSlot: slot,
      ticksRemaining: ticksRequired,
      startTick: next.tick,
      latency: totalLatency,
      quality: jobQuality,
      cacheHitRatio
    });
    
    next.logs.unshift({ tick: next.tick, type: "dispatch", text: `Running "${job.name}" on GPU ${slot}. (Expected: ${ticksRequired} ticks, Cache Hit: ${(cacheHitRatio * 100).toFixed(0)}%)` });
  }
  
  // 6. Update global metrics
  updateGlobalMetrics(next);
  
  // 7. Check Milestones and Stress Test
  if (next.stressTestActive && next.tick >= 120) {
    next.stressTestActive = false;
    next.stressTestCompleted = true;
    next.logs.unshift({ tick: next.tick, type: "system", text: "🏁 STRESS TEST COMPLETED. Final scorecard compiled." });
  } else if (!next.stressTestActive) {
    const milestone = MILESTONES.find(m => m.id === next.currentMilestone);
    if (milestone && next.tensors >= milestone.target) {
      if (next.currentMilestone < 3) {
        next.currentMilestone += 1;
        const newM = MILESTONES.find(m => m.id === next.currentMilestone);
        next.logs.unshift({
          tick: next.tick,
          type: "success",
          text: `🎉 MILESTONE COMPLETED! Funding Round Advanced to ${newM.name}. Target: ${newM.target} Tensors.`
        });
      }
    }
  }
  
  return next;
}

// Thermal Model helper
export function calculateRackTemperature(rack) {
  const AMBIENT_TEMP = 22;
  if (rack.isOffline) return AMBIENT_TEMP;
  
  const THERMAL_COEFF = 0.08;
  
  const heatGenerated = rack.gpus.reduce((sum, gpu) => {
    const isIdle = gpu.activeJobId === null;
    return sum + (isIdle ? gpu.heatIndex * 0.1 : gpu.heatIndex);
  }, 0);
  
  return AMBIENT_TEMP + heatGenerated * THERMAL_COEFF;
}

// Power Model helper
export function calculateTotalPowerDraw(state) {
  let totalPower = 0;
  const prefixCacheActive = state.activeOptimizations.has("prefix_cache");
  const accParallelActive = state.activeOptimizations.has("acc_parallel");
  
  state.racks.forEach(rack => {
    if (rack.isOffline) return;
    rack.gpus.forEach(gpu => {
      const isIdle = gpu.activeJobId === null;
      if (isIdle) {
        const idleBonus = prefixCacheActive ? 15 : 0;
        totalPower += gpu.idlePower + idleBonus;
      } else {
        const peakBonus = accParallelActive ? 50 : 0;
        totalPower += gpu.peakPower + peakBonus;
      }
    });
  });
  return totalPower;
}

// Freshness Index helper
function calculateFreshnessIndex(freshness) {
  // Weighted: Research = 40%, Industry = 30%, CRM = 30%
  const index = (freshness.research * 0.4) + (freshness.industry * 0.3) + (freshness.crm * 0.3);
  return parseFloat(index.toFixed(1));
}

// Global metrics helper
function updateGlobalMetrics(state) {
  // 1. Context Coverage
  let coverage = 100;
  if (state.activeOptimizations.has("nemo_input_rail")) {
    coverage = 85; // Filters irrelevant chunks
  }
  state.metrics.contextCoverage = coverage;
  
  // 2. VRAM Efficiency
  let totalCapacity = state.racks.reduce((sum, r) => sum + r.gpus.reduce((s, g) => s + g.vram, 0), 0);
  let vramUsed = 0;
  state.activeWorkloads.forEach(aw => {
    let contextTokens = aw.job.contextTokens;
    if (state.activeOptimizations.has("ctx_compress")) contextTokens *= 0.2;
    if (state.activeOptimizations.has("knapsack")) contextTokens *= 0.85;
    if (state.activeOptimizations.has("nemo_input_rail")) contextTokens *= 0.85;
    
    let jobVram = (contextTokens / 1000) * 0.5;
    if (state.activeOptimizations.has("paged_attn")) jobVram *= 0.5;
    
    vramUsed += jobVram * (1 - aw.cacheHitRatio * 0.7);
  });
  // Add permanent context library VRAM usage
  if (state.activeOptimizations.has("ctx_library")) {
    const gpuCount = state.racks.reduce((sum, r) => sum + r.gpus.length, 0);
    vramUsed += gpuCount * 8;
  }
  
  state.metrics.vramEfficiency = totalCapacity > 0 ? Math.min(100, Math.round((vramUsed / totalCapacity) * 100)) : 0;
  
  // 3. Compression Ratio
  state.metrics.compressionRatio = state.activeOptimizations.has("ctx_compress") ? 80 : 0;
  
  // 4. Freshness Index
  let freshnessVal = calculateFreshnessIndex(state.agentMesh.freshness);
  if (state.activeOptimizations.has("nemo_retrieval_rail") && freshnessVal < 60) {
    freshnessVal = 60;
  }
  state.metrics.freshnessIndex = freshnessVal;
  
  // 5. LLM Judge Score
  if (state.completedJobs.length > 0) {
    const recent = state.completedJobs.slice(-10);
    const sum = recent.reduce((s, c) => s + c.quality, 0);
    state.metrics.llmJudgeScore = parseFloat((sum / recent.length).toFixed(2));
  } else {
    state.metrics.llmJudgeScore = 8.5;
  }
  
  // 6. Pipeline Latency
  if (state.completedJobs.length > 0) {
    const recent = state.completedJobs.slice(-10);
    const sum = recent.reduce((s, c) => s + c.latency, 0);
    state.metrics.pipelineLatency = parseFloat((sum / recent.length).toFixed(2));
  } else {
    state.metrics.pipelineLatency = 0.0;
  }
  
  // 7. Cache Hit Rate
  if (state.completedJobs.length > 0) {
    const recent = state.completedJobs.slice(-10);
    const hits = recent.reduce((s, c) => s + c.cacheHitRatio, 0);
    state.metrics.cacheHitRate = Math.round((hits / recent.length) * 100);
  } else {
    state.metrics.cacheHitRate = 0;
  }
  
  // Push to metrics history
  const historyLimit = 30;
  for (const m in state.metrics) {
    const arr = state.metricsHistory[m];
    arr.push(state.metrics[m]);
    if (arr.length > historyLimit) {
      arr.shift();
    }
  }
}
