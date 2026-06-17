# NVIDIA TensorTycoon: GPU Context Optimizer

A playable simulation showcasing how **Context Engineering** works on NVIDIA GPU hardware. Built for the closed NVIDIA OpenACC Hackathon.

## Background

Context Engineering Studio teaches 6 modules of LLM context optimization. **NVIDIA TensorTycoon** brings these concepts into a playable tycoon-style simulation where context budgets are mapped to raw GPU memory (VRAM), and latency is determined by compute power (TFLOPS), optimizations (PagedAttention, OpenACC), and context reusability (KV Cache hits).

## Tech Stack

- **Core**: React + Vite + Vanilla CSS
- **Visualization**: Recharts (Radar charts, dual-axis timelines, sparklines)
- **State Machine**: Pure Javascript engine monolith (`src/game/engine.js`)
- **Themes**: Obsidian and NVIDIA green styling

## Key Features

1. **GPU Floor**: Purchase racks and scale from L40S cards to enterprise B200 units, managing power limits and thermals.
2. **Context Pipeline**: Decompose user intents into PharmaCorp context chunks, using manual/greedy/knapsack algorithms to optimize GPU VRAM budgets.
3. **Compiler Lab**: Inject `#pragma acc` parallel loops and compare compressed vs. raw prompts with an LLM-Judge Radar.
4. **Agent Mesh**: Configure Orchester-Research-Analysis-Drafting GPU pipelines, routing agents to different hardware, managing TTL, and applying NeMo Guardrails.
5. **Mission Control**: Monitor LLM Judge scores, Cache Hit rates, and run stress tests to achieve "NVIDIA Elite Developer" tier.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Run test suite:
   ```bash
   npm run test
   ```
