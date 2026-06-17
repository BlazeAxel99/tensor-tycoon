export const GPU_CATALOG = {
  L40S: { id: "L40S", name: "NVIDIA L40S", vram: 48, cachePool: 12, tflops: 362, idlePower: 75, peakPower: 350, heatIndex: 120, cost: 2000 },
  A100: { id: "A100", name: "NVIDIA A100", vram: 80, cachePool: 20, tflops: 624, idlePower: 90, peakPower: 400, heatIndex: 180, cost: 5000 },
  H100: { id: "H100", name: "NVIDIA H100", vram: 80, cachePool: 20, tflops: 1979, idlePower: 115, peakPower: 700, heatIndex: 310, cost: 10000 },
  B200: { id: "B200", name: "NVIDIA B200", vram: 192, cachePool: 48, tflops: 4500, idlePower: 150, peakPower: 1000, heatIndex: 450, cost: 25000 }
};

export const OPTIMIZATION_CATALOG = {
  acc_parallel: {
    id: "acc_parallel",
    name: "#pragma acc parallel loop",
    description: "Multiplies execution speed by 3x, adds 50W peak power consumption per GPU.",
    cost: 1500,
    speedFactor: 3.0,
    peakPowerBonus: 50
  },
  acc_copyin: {
    id: "acc_copyin",
    name: "#pragma acc data copyin",
    description: "Reduces base latency offset by 0.3s.",
    cost: 800,
    latencyOffset: -0.3
  },
  paged_attn: {
    id: "paged_attn",
    name: "PagedAttention (vLLM)",
    description: "Halves VRAM consumption of active workloads, allowing larger jobs on smaller cards.",
    cost: 3000,
    vramMultiplier: 0.5
  },
  tensorrt: {
    id: "tensorrt",
    name: "TensorRT-LLM Compile",
    description: "Multiplies speed by 2.5x. Takes 2 compile ticks to activate.",
    cost: 5000,
    speedFactor: 2.5,
    compileDelay: 2
  },
  ctx_compress: {
    id: "ctx_compress",
    name: "Context Compression",
    description: "Compresses tokens by 80% (0.2x multiplier), but incurs a -1.5 LLM Judge quality penalty.",
    cost: 1000,
    tokenMultiplier: 0.2,
    qualityPenalty: -1.5
  },
  knapsack: {
    id: "knapsack",
    name: "Knapsack Token Optimizer",
    description: "Runs exact knapsack on GPU budget, giving +0.8 quality and 15% token reduction (0.85x multiplier).",
    cost: 2000,
    qualityBonus: 0.8,
    tokenMultiplier: 0.85
  },
  prefix_cache: {
    id: "prefix_cache",
    name: "Prefix Cache Manager",
    description: "Extends KV Cache TTL by +20 ticks. Adds +15W idle power per GPU for cache maintenance.",
    cost: 1500,
    cacheTtlBonus: 20,
    idlePowerBonus: 15
  },
  ctx_library: {
    id: "ctx_library",
    name: "Context Library",
    description: "Pre-loads common chunks into GPU. Sets minimum cache hit to 30%, but consumes 8GB VRAM permanently.",
    cost: 4000,
    cacheHitFloor: 0.3,
    permanentVramReservation: 8
  },
  nemo_input_rail: {
    id: "nemo_input_rail",
    name: "NeMo Input Rail",
    description: "Blocks chunks with relevance < 0.3 from pipeline, giving +0.5 quality. Reduces available chunks.",
    cost: 1200,
    relevanceFloor: 0.3,
    qualityBonus: 0.5
  },
  nemo_output_rail: {
    id: "nemo_output_rail",
    name: "NeMo Output Rail",
    description: "Catches hallucinations. Nullifies the -1.5 quality penalty of compression, but adds 0.2s latency overhead.",
    cost: 1800,
    latencyOffset: 0.2, // validation overhead
    nullifyCompressionPenalty: true
  },
  nemo_retrieval_rail: {
    id: "nemo_retrieval_rail",
    name: "NeMo Retrieval Rail",
    description: "Evicts stale chunks automatically. Ensures freshness >= 60% on retrieval.",
    cost: 2500,
    freshnessFloor: 0.6,
    autoEvictStale: true
  }
};

export const DETERMINISTIC_WORKLOADS = [
  { tick: 0, name: "PharmaCorp Advisory Brief", contextTokens: 8000, targetSlaSeconds: 3.5, tensorReward: 100, baseQuality: 8.5, prefixGroup: "pharma-advisory" },
  { tick: 0, name: "Real-time Customer Agent", contextTokens: 2000, targetSlaSeconds: 0.6, tensorReward: 40, baseQuality: 9.0, prefixGroup: "customer" },
  { tick: 5, name: "Large Financial Audit", contextTokens: 64000, targetSlaSeconds: 6.0, tensorReward: 350, baseQuality: 7.8, prefixGroup: "pharma-finance" },
  { tick: 15, name: "Real-time Agent Loop", contextTokens: 2000, targetSlaSeconds: 0.6, tensorReward: 40, baseQuality: 9.0, prefixGroup: "customer" },
  { tick: 25, name: "Massive Compliance Audit", contextTokens: 128000, targetSlaSeconds: 10.0, tensorReward: 800, baseQuality: 7.5, prefixGroup: "compliance" },
  { tick: 35, name: "PharmaCorp Pipeline Review", contextTokens: 16000, targetSlaSeconds: 4.0, tensorReward: 150, baseQuality: 8.2, prefixGroup: "pharma-advisory" },
  
  // Tick 45: Customer Support ×3
  { tick: 45, name: "Customer Support A", contextTokens: 4000, targetSlaSeconds: 1.2, tensorReward: 60, baseQuality: 8.8, prefixGroup: "customer" },
  { tick: 45, name: "Customer Support B", contextTokens: 4000, targetSlaSeconds: 1.2, tensorReward: 60, baseQuality: 8.8, prefixGroup: "customer" },
  { tick: 45, name: "Customer Support C", contextTokens: 4000, targetSlaSeconds: 1.2, tensorReward: 60, baseQuality: 8.8, prefixGroup: "customer" },
  
  { tick: 55, name: "PharmaCorp Financial Report", contextTokens: 64000, targetSlaSeconds: 6.0, tensorReward: 350, baseQuality: 7.8, prefixGroup: "pharma-finance" },
  
  // Tick 65: Agent Loop ×2
  { tick: 65, name: "Agent Loop A", contextTokens: 2000, targetSlaSeconds: 0.6, tensorReward: 40, baseQuality: 9.0, prefixGroup: "customer" },
  { tick: 65, name: "Agent Loop B", contextTokens: 2000, targetSlaSeconds: 0.6, tensorReward: 40, baseQuality: 9.0, prefixGroup: "customer" },
  
  { tick: 75, name: "Drafting Compliance Filing", contextTokens: 128000, targetSlaSeconds: 10.0, tensorReward: 800, baseQuality: 7.5, prefixGroup: "compliance" },
  
  // Tick 85: Compliance Batch ×2
  { tick: 85, name: "Compliance Batch A", contextTokens: 64000, targetSlaSeconds: 8.0, tensorReward: 350, baseQuality: 7.8, prefixGroup: "compliance" },
  { tick: 85, name: "Compliance Batch B", contextTokens: 64000, targetSlaSeconds: 8.0, tensorReward: 350, baseQuality: 7.8, prefixGroup: "compliance" },
  
  { tick: 95, name: "Annual Pharma Advisory Draft", contextTokens: 16000, targetSlaSeconds: 4.0, tensorReward: 150, baseQuality: 8.2, prefixGroup: "pharma-advisory" },
  
  // Tick 105: Surge: Mixed ×4
  { tick: 105, name: "Surge: Pharma Brief", contextTokens: 8000, targetSlaSeconds: 4.0, tensorReward: 100, baseQuality: 8.5, prefixGroup: "pharma-advisory" },
  { tick: 105, name: "Surge: Pipeline Review", contextTokens: 16000, targetSlaSeconds: 4.0, tensorReward: 150, baseQuality: 8.2, prefixGroup: "pharma-advisory" },
  { tick: 105, name: "Surge: Compliance Audit", contextTokens: 32000, targetSlaSeconds: 5.0, tensorReward: 250, baseQuality: 7.9, prefixGroup: "compliance" },
  { tick: 105, name: "Surge: Financial Audit", contextTokens: 64000, targetSlaSeconds: 7.0, tensorReward: 350, baseQuality: 7.8, prefixGroup: "pharma-finance" },
  
  // Tick 115: Final Agents ×2
  { tick: 115, name: "Final Agent A", contextTokens: 2000, targetSlaSeconds: 0.6, tensorReward: 40, baseQuality: 9.0, prefixGroup: "customer" },
  { tick: 115, name: "Final Agent B", contextTokens: 2000, targetSlaSeconds: 0.6, tensorReward: 40, baseQuality: 9.0, prefixGroup: "customer" }
];

export const CONTRACT_TEMPLATES = [
  {
    name: "PharmaCorp Advisory Brief",
    client: "PharmaCorp",
    contextTokens: 16000,
    targetSlaSeconds: 4.0,
    tensorReward: 250,
    penalty: 100,
    baseQuality: 8.5,
    prefixGroup: "pharma-advisory",
    description: "Analyze medical trial records for drug efficacy. Requires high quality."
  },
  {
    name: "Real-time Customer Agent",
    client: "CRM Loop",
    contextTokens: 4000,
    targetSlaSeconds: 0.8,
    tensorReward: 80,
    penalty: 40,
    baseQuality: 9.0,
    prefixGroup: "customer",
    description: "Support live user chat queries. Needs ultra-low latency response."
  },
  {
    name: "Audit Compliance Scanner",
    client: "Compliance Corp",
    contextTokens: 64000,
    targetSlaSeconds: 7.0,
    tensorReward: 600,
    penalty: 250,
    baseQuality: 7.5,
    prefixGroup: "compliance",
    description: "Scan huge regulatory filings for document violations. Large context size."
  },
  {
    name: "Biotech Patent Parser",
    client: "PharmaCorp",
    contextTokens: 32000,
    targetSlaSeconds: 5.0,
    tensorReward: 400,
    penalty: 150,
    baseQuality: 8.2,
    prefixGroup: "pharma-advisory",
    description: "Review biomedical patents to identify overlapping claims."
  },
  {
    name: "Algorithmic Risk Auditor",
    client: "FinTech Inc",
    contextTokens: 48000,
    targetSlaSeconds: 6.0,
    tensorReward: 500,
    penalty: 200,
    baseQuality: 8.0,
    prefixGroup: "pharma-finance",
    description: "Evaluate risk index parameters for high-frequency stock portfolios."
  },
  {
    name: "Live Support Surge Queue",
    client: "CRM Loop",
    contextTokens: 8000,
    targetSlaSeconds: 1.2,
    tensorReward: 120,
    penalty: 60,
    baseQuality: 8.8,
    prefixGroup: "customer",
    description: "Process backlogged chat tickets during an application outage."
  },
  {
    name: "Global Finance Compliance",
    client: "Compliance Corp",
    contextTokens: 128000,
    targetSlaSeconds: 12.0,
    tensorReward: 1200,
    penalty: 500,
    baseQuality: 7.2,
    prefixGroup: "compliance",
    description: "Cross-check multi-national audit ledgers. Extremely large context."
  }
];

export const MILESTONES = [
  { id: 1, name: "Seed Startup", target: 8000, description: "Earn 8,000 Tensors. Deploy your first racks and master basic Chatbot SLAs." },
  { id: 2, name: "Venture-Backed Scaleup", target: 30000, description: "Earn 30,000 Tensors. Upgrade to H100s, unlock compiler optimization, and serve complex Biotech patents." },
  { id: 3, name: "Sovereign AI Supercluster", target: 100000, description: "Earn 100,000 Tensors. Scale to B200 nodes, route complex Agent Mesh rules, and keep LLM Judge quality above 9.0." }
];

