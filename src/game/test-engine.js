import { initGame, tickGame } from "./engine.js";

function runTest() {
  console.log("Starting engine test...");
  
  const state = initGame();
  state.stressTestActive = true;
  
  // Assertions for initGame
  if (!state) {
    throw new Error("initGame returned null or undefined");
  }
  
  console.log("initGame State check:");
  console.log(" - Tensors:", state.tensors, "(Expected: 5000)");
  if (state.tensors !== 5000) throw new Error("Incorrect initial tensors");
  
  console.log(" - Racks count:", state.racks.length, "(Expected: 1)");
  if (state.racks.length !== 1) throw new Error("Incorrect initial racks count");
  
  console.log(" - Initial GPUs in Rack 1:", state.racks[0].gpus.length, "(Expected: 1)");
  if (state.racks[0].gpus.length !== 1) throw new Error("Incorrect initial GPU count");
  
  console.log(" - Initial GPU type:", state.racks[0].gpus[0].id, "(Expected: L40S)");
  if (state.racks[0].gpus[0].id !== "L40S") throw new Error("Incorrect initial GPU type");
  
  console.log(" - Initial tick:", state.tick, "(Expected: 0)");
  if (state.tick !== 0) throw new Error("Incorrect initial tick");
  
  console.log("Ticking game once (moving from tick 0 to 1)...");
  const nextState = tickGame(state);
  
  console.log("tickGame State check:");
  console.log(" - Next tick:", nextState.tick, "(Expected: 1)");
  if (nextState.tick !== 1) throw new Error("Incorrect tick after tickGame");
  
  console.log(" - Queue length:", nextState.workloadsQueue.length, "(Expected: 1, because 1 of the 2 is immediately dispatched)");
  console.log(" - Active workloads:", nextState.activeWorkloads.length, "(Expected: 1, running on the single L40S)");
  
  if (nextState.workloadsQueue.length !== 1 || nextState.activeWorkloads.length !== 1) {
    throw new Error("Workloads were not enqueued/dispatched correctly at tick 0");
  }
  
  console.log(" - Active job name:", nextState.activeWorkloads[0].job.name);
  console.log(" - Queued job name:", nextState.workloadsQueue[0].name);
  
  console.log("Engine validation: PASSED successfully!");
}

try {
  runTest();
} catch (error) {
  console.error("Engine validation FAILED:", error.message);
  process.exit(1);
}
