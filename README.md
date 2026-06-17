# TensorTycoon: GPU Context Optimizer

A playable tycoon-style simulation showing how **Context Engineering** and **NVIDIA AI Stack** optimizations behave on raw GPU hardware. 

## ⚡ The "Aha!" Gameplay Loop (Context Reusability)
In the world of Generative AI, loading long documents (context) into GPU memory (VRAM) is expensive and slow. **NVIDIA TensorTycoon** teaches context reusability:

1. **Client SLAs**: Sign compute contracts from enterprise clients (PharmaCorp, FinTech Inc, Compliance Corp, CRM Loop).
2. **KV Caching**: Serving a client's workload caches their prefix group (documents, system prompts) on the target GPU.
3. **The Cache-Aware Knapsack**: If you route a new contract to a GPU slot with a warm cache, its token weight drops to **0 marginal tokens** in the knapsack solver! 
4. **Hardware Arbitrage**: Match warm caches to run massive compliance models (128k+ tokens) on cheap **L40S** chips without triggering Out-Of-Memory (OOM) events, maximizing your Tensor margins.

---

## 🛠️ Key Game Components

1. **⚙️ GPU Floor**: Purchase server racks, deploy NVIDIA GPUs (**L40S**, **A100**, **H100**, **B200**), and manage the data center's **5,000W power safety limit** and thermal throttling.
2. **📋 Contracts Board**: Accept corporate SLAs with different context sizes, reward payouts, and breach penalties. Track your progression through funding rounds (Seed Startup ➜ Venture-Backed ➜ Sovereign AI cluster).
3. **🔀 Context Pipeline**: View active workload intents and select relevant chunks manually, via Greedy DP, standard Knapsack, or Cache-Aware Knapsack.
4. **💻 Compiler Lab**: Purchase optimizations like `#pragma acc parallel loop` speedups, PagedAttention VRAM savings, and compile TensorRT-LLM runtimes.
5. **🕸️ Agent Mesh**: Route Orchestrator, Research, Analysis, and Drafting agents to hardware nodes. Toggle propagation rules (e.g., raw sharing vs CRM isolation) and activate NeMo Guardrails to secure prompt leakages.
6. **📊 Mission Control**: Start stress tests, monitor dual-axis timelines, and view evaluator radar charts analyzing LLM Judge quality vs freshness decay.

---

## 🚀 Getting Started

### Local Setup
1. Clone the repository and navigate into it.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Run the engine's deterministic state verification suite:
   ```bash
   npm run test
   ```

### Production Build
To bundle the project into optimized, minified static files:
```bash
npm run build
```
This compiles assets into the `dist/` directory.

---

## 🌐 GitHub Pages Deployment
The project is pre-configured with `gh-pages` and relative base path routing.

1. Link your remote repository:
   ```bash
   git remote add origin https://github.com/BlazeAxel99/tensor-tycoon.git
   ```
2. Build and push the branch:
   ```bash
   npm run deploy
   ```
   This will automatically trigger a production build and push the assets to the `gh-pages` branch on your GitHub repository.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
