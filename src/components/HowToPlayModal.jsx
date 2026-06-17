import React, { useState } from 'react';
import { Cpu, Server, Zap, Shield, BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function HowToPlayModal({ onClose }) {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to TensorTycoon",
      subtitle: "The Context Engineering Suite",
      icon: <BookOpen size={48} style={{ color: 'var(--nvidia-green)' }} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            Welcome, Lead Architect! You are in charge of a high-performance **GPU Context Ops Center**.
          </p>
          <p>
            Your mission is to process complex LLM workloads from enterprise clients under strict **Service Level Agreements (SLAs)**.
          </p>
          <div className="panel" style={{ padding: '12px 16px', background: 'rgba(118, 185, 0, 0.05)', borderColor: 'rgba(118, 185, 0, 0.2)' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--nvidia-green)', display: 'block', marginBottom: '4px' }}>
              💡 The Core Objective:
            </span>
            Balance **Latency (SLA)**, **Response Quality (LLM Judge)**, and **GPU VRAM Capacity** to earn Tensors and scale your infrastructure.
          </div>
        </div>
      )
    },
    {
      title: "GPU Floor & Power Limits",
      subtitle: "Hardware & Thermal Management",
      icon: <Server size={48} style={{ color: 'var(--accent-cyan)' }} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            Deploy high-end NVIDIA chips (**L40S**, **A100**, **H100**, and **B200**) to process incoming context tokens.
          </p>
          <ul>
            <li>**Peak Power**: GPUs consume massive power when active.</li>
            <li>**Thermal Throttling**: Racks that exceed **80°C** suffer a **50% speed penalty**.</li>
            <li>**5,000W Power Limit**: Exceeding 5,000W will trigger a safety shutdown on the newest rack, immediately aborting all active workloads!</li>
          </ul>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            *Tip: Buy racks to expand slot capacity, but watch your total power draw!*
          </p>
        </div>
      )
    },
    {
      title: "KV Cache & Knapsack DP",
      subtitle: "The Context Reusability Hack",
      icon: <Cpu size={48} style={{ color: 'var(--accent-indigo)' }} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            Loading context documents into VRAM is expensive. However, once a model processes a client's document, its prefix tokens are stored in the **GPU KV Cache**.
          </p>
          <div className="panel" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderColor: '#272a37' }}>
            <strong style={{ color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}>
              ⚡ The Cache-Aware Knapsack:
            </strong>
            If a new contract shares a warm prefix cache group on the GPU, its token weight drops to **0 marginal tokens** in the solver! You can serve huge compliance audits on cheap GPUs without running out of VRAM (OOM).
          </div>
          <p>
            Purchase **Prefix Cache Manager** or **Context Library** from the Compiler Lab to unlock the Cache-Aware Knapsack optimization.
          </p>
        </div>
      )
    },
    {
      title: "Agent Mesh & Guardrails",
      subtitle: "Workflow & Safety Tradeoffs",
      icon: <Shield size={48} style={{ color: 'var(--neon-purple)' }} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            Workloads flow through a multi-agent network: **Orchestrator ➜ Research ➜ Analysis ➜ Drafting**.
          </p>
          <ul>
            <li>**Routing**: Assigning agents to different GPUs speeds up throughput but adds handoff latency.</li>
            <li>**Propagation Rules**: Enabling raw sharing between Research & Drafting reduces latency by 30% but risks **security leakage**.</li>
            <li>**NeMo Guardrails**: Activate NeMo Input/Output rails to block hallucinations, protect quality, and auto-evict stale cache entries.</li>
          </ul>
        </div>
      )
    },
    {
      title: "Contracts & Progress",
      subtitle: "Choose Your Path to Glory",
      icon: <Zap size={48} style={{ color: 'var(--neon-amber)' }} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p>
            In **Tycoon Mode**, you accept client contracts on the **Contracts Board**:
          </p>
          <p>
            1. Review contracts from PharmaCorp, CRM Loop, Compliance Corp, and FinTech Inc.
            <br />
            2. Match contracts to GPUs with a warm cache (affinity badge is highlighted!).
            <br />
            3. Sign & Route to start processing. Watch out for breach penalties!
          </p>
          <p>
            Complete funding round milestones (Seed Startup ➜ Venture Scaleup ➜ Sovereign AI cluster) to secure your position as the ultimate GPU Tycoon.
          </p>
        </div>
      )
    }
  ];

  const current = slides[slide];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="panel" style={{
        width: '580px',
        maxWidth: '90%',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        padding: '24px 32px',
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Skip Guide"
        >
          <X size={20} />
        </button>

        {/* Slide Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #1e2230', paddingBottom: '16px' }}>
          {current.icon}
          <div>
            <span style={{ fontSize: '11px', color: 'var(--nvidia-green)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'var(--font-mono)' }}>
              GUIDE: SLIDE {slide + 1} OF {slides.length}
            </span>
            <h2 style={{ color: 'var(--text-primary)', margin: '4px 0 0 0', fontSize: '20px' }}>
              {current.title}
            </h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {current.subtitle}
            </span>
          </div>
        </div>

        {/* Slide Body */}
        <div style={{ minHeight: '220px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          {current.content}
        </div>

        {/* Slide Footer / Navigation */}
        <div className="flex-between" style={{ borderTop: '1px solid #1e2230', paddingTop: '16px', marginTop: '10px' }}>
          {/* Progress Indicators */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {slides.map((_, i) => (
              <div 
                key={i} 
                onClick={() => setSlide(i)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: i === slide ? 'var(--nvidia-green)' : '#1e2230',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease'
                }}
              />
            ))}
          </div>

          <div className="flex-gap-sm">
            {slide > 0 && (
              <button className="btn btn-secondary" onClick={() => setSlide(slide - 1)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            
            {slide < slides.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setSlide(slide + 1)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 20px', background: 'var(--nvidia-green)', borderColor: 'var(--nvidia-green)' }}>
                Start Tycoon Mode!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
