# AI Developer Guide (AGENTS.md)

Welcome, AI Coding Agent! This guide serves as the source of truth for the codebase architecture, constants, conventions, and operational workflows of **NVIDIA TensorTycoon**.

## GPU Hardware Catalog

These constants are the canonical, immutable hardware profiles for the simulation. Do not redefine them.

| GPU | VRAM (GB) | KV Cache Pool (GB) | Compute (TFLOPS) | Idle Power (W) | Peak Power (W) | Heat Index (BTU/tick) | Cost (Tensors) |
|-----|-----------|---------------------|-------------------|-----------------|-----------------|----------------------|-----------------|
| L40S | 48 | 12 | 362 | 75 | 350 | 120 | 2,000 |
| A100 | 80 | 20 | 624 | 90 | 400 | 180 | 5,000 |
| H100 | 80 | 20 | 1,979 | 115 | 700 | 310 | 10,000 |
| B200 | 192 | 48 | 4,500 | 150 | 1,000 | 450 | 25,000 |

## Codebase Architecture Conventions

- **React + Vite**: Built with Vite, React, Vanilla CSS, and Recharts.
- **Engine Monolith**: `src/game/engine.js` is the pure state machine monolith containing all game logic, state updates, knapsack solver, and simulation formulas. It contains NO React dependencies.
- **State Flow**:
  1. `initGame()` initializes the simulation state.
  2. `tickGame(state)` handles the tick progression (1Hz frequency), increments timers, processes job pipelines, updates power/thermals, and checks for SLA/OOM states.
  3. `applyAction(state, action)` processes explicit user actions (buying a GPU, choosing chunks, purchasing optimizations).
- **Design Tokens**: All CSS variables are defined in `src/index.css`. Never use raw hex codes in component files.

## Project Structure

```
nvidia-tensor-tycoon/
├── .agents/
│   ├── plans/
│   │   ├── README.md
│   │   └── 001-initial-design.md
│   └── skills/
│       └── fable-mode/
│           └── SKILL.md
├── src/
│   ├── game/
│   │   ├── types.js
│   │   └── engine.js
│   ├── data/
│   │   └── contextChunks.js
│   ├── components/
│   │   ├── GpuFloor.jsx
│   │   ├── ContextPipeline.jsx
│   │   ├── CompilerLab.jsx
│   │   ├── AgentMesh.jsx
│   │   └── MissionControl.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── package.json
├── vite.config.js
└── index.html
```

## Domain Vocabulary

- **Tensor**: The standard in-game currency earned by completing context compilation jobs.
- **SLA**: Service Level Agreement. The latency deadline of a job. If breached, the Tensor reward is halved.
- **OOM**: Out of Memory. Occurs when a job's VRAM requirements exceed the selected GPU's available capacity.
- **KV Cache**: Key-Value Cache Pool representing 25% of GPU VRAM. Persistent context chunks from completed workloads are cached here to reduce latency and VRAM for subsequent overlapping jobs.
- **NeMo Retriever**: Powers the Context Pipeline chunk ranking and retrieval simulation.
- **NeMo Guardrails**: Three safety rails (Input, Output, Retrieval) that intercept raw inputs, prevent hallucinations, and enforce freshness in the Agent Mesh.
- **NeMo Evaluator**: Generates the LLM-as-a-Judge Quality Score in Mission Control.
- **NIM Microservices**: High-performance inference container wraps. When optimization TRT-LLM is active, a NIM badge is shown on the GPU cards.

## Simulation Formulas

### VRAM Requirements
$$vram\_required = \frac{tokens}{1000} \times 0.5 \times vram\_multiplier$$
- `vram_multiplier` = 0.5 if `PagedAttention` is active.

### Latency
$$latency\_s = \frac{base\_latency}{gpu\_speedup \times opt\_multiplier} - latency\_offset$$
- `base_latency` = $(tokens / 1000) \times 0.08$
- `gpu_speedup` = $gpu\_tflops / 362$
- `opt_multiplier` = cumulative `speedFactor` of active optimizations.
- Latency is computed per agent routing slot and summed.

### Thermals
$$rack\_temp\_c = 22 + \sum_{gpu \in rack} heat\_output \times 0.08$$
- `heat_output` = $heatIndex$ if active, else $heatIndex \times 0.1$.
- Rack temp $\ge 80^\circ$C causes thermal throttling ($gpu\_speedup \times 0.5$).
- Rack temp $\ge 95^\circ$C causes critical shutdown (all jobs fail, -200 Tensors penalty).

### Power Model
$$rack\_power\_w = \sum_{gpu \in rack} current\_power$$
- `current_power` = `idlePower` (+15W if `prefix_cache` active) when idle, or `peakPower` (+50W if `acc_parallel` active) when active.
- Datacenter limit = 5000W. If exceeded, the newest rack is shut down.

### Context Reusability (KV Cache Hit)
- Cache hit ratio $\in [0.0, 0.8]$ based on overlapping prefixGroups.
- Cache hit rewards:
  - VRAM savings: $effective\_vram = vram\_required \times (1 - hit\_ratio \times 0.7)$
  - Latency savings: $effective\_latency = latency \times (1 - hit\_ratio \times 0.5)$
  - Tensor bonus: $bonus = \lfloor hit\_ratio \times reward \times 0.3 \rfloor$

## NVIDIA Stack Mapping

| NVIDIA Product | Game Representation | Tab Location |
|---|---|---|
| **NeMo Retriever** | Semantic chunk extraction and composite ranking score | Tab 2: Context Pipeline |
| **NeMo Guardrails** | Input filtering, Output verification, and Freshness correction | Tab 4: Agent Mesh |
| **NeMo Evaluator** | LLM-as-a-Judge scorecard rating on 4 axes | Tab 5: Mission Control |
| **NIM Microservices** | Triton & TensorRT-LLM container execution badge | Tab 1: GPU Floor |
| **TensorRT-LLM** | Compilation speed-up optimization | Tab 3: Compiler Lab |
| **OpenACC** | `#pragma acc parallel` self-attention code diffs | Tab 3: Compiler Lab |
