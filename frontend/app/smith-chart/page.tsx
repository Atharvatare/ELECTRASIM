"use client";

import React, { useState, useEffect } from "react";
import { Activity, Plus, Trash2, HelpCircle, ShieldCheck, Zap } from "lucide-react";

interface MatchingComponent {
  id: string;
  type: "series_l" | "series_c" | "shunt_l" | "shunt_c" | "t_line";
  value: number; // nH, pF, or electrical length in degrees
}

export default function SmithChartLab() {
  const [z0, setZ0] = useState<number>(50);
  const [rl, setRl] = useState<number>(25);
  const [xl, setXl] = useState<number>(40);
  const [frequency, setFrequency] = useState<number>(2.4); // 2.4 GHz
  const [matchingList, setMatchingList] = useState<MatchingComponent[]>([
    { id: "1", type: "series_c", value: 2.5 }, // 2.5 pF
    { id: "2", type: "shunt_l", value: 5.0 }   // 5 nH
  ]);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [tracePoints, setTracePoints] = useState<{ x: number; y: number; label: string }[]>([]);

  // Calculate impedance trace path
  useEffect(() => {
    const w = 2.0 * Math.PI * frequency * 1e9; // rad/s
    let z = complex(rl, xl);

    const points: { x: number; y: number; label: string }[] = [];
    
    // Helper to add point
    const addPoint = (zVal: { r: number; i: number }, label: string) => {
      // Gamma = (z - z0) / (z + z0)
      const num = cSub(zVal, complex(z0, 0));
      const den = cAdd(zVal, complex(z0, 0));
      const gamma = cDiv(num, den);
      
      // Map to SVG coordinates: center is (200, 200), radius is 180
      const x = 200 + 180 * gamma.r;
      const y = 200 - 180 * gamma.i;
      points.push({ x, y, label });
    };

    // Initial point
    addPoint(z, "Load");

    // Process matching components
    matchingList.forEach((comp, idx) => {
      if (comp.type === "series_l") {
        const xl_add = w * comp.value * 1e-9; // L is in nH
        z = cAdd(z, complex(0, xl_add));
        addPoint(z, `Comp ${idx + 1}`);
      } else if (comp.type === "series_c") {
        const xc_add = -1.0 / (w * comp.value * 1e-12); // C is in pF
        z = cAdd(z, complex(0, xc_add));
        addPoint(z, `Comp ${idx + 1}`);
      } else if (comp.type === "shunt_l") {
        const y = cDiv(complex(1, 0), z);
        const yl_add = -1.0 / (w * comp.value * 1e-9);
        const y_new = cAdd(y, complex(0, yl_add));
        z = cDiv(complex(1, 0), y_new);
        addPoint(z, `Comp ${idx + 1}`);
      } else if (comp.type === "shunt_c") {
        const y = cDiv(complex(1, 0), z);
        const yc_add = w * comp.value * 1e-12;
        const y_new = cAdd(y, complex(0, yc_add));
        z = cDiv(complex(1, 0), y_new);
        addPoint(z, `Comp ${idx + 1}`);
      } else if (comp.type === "t_line") {
        // Transmission line rotates gamma clockwise (electrical length in degrees)
        const num = cSub(z, complex(z0, 0));
        const den = cAdd(z, complex(z0, 0));
        let gamma = cDiv(num, den);
        
        // theta = -2 * beta * d (beta * d in rad = electrical length * pi / 180)
        const rad = -2.0 * (comp.value * Math.PI / 180.0);
        const cos_r = Math.cos(rad);
        const sin_r = Math.sin(rad);
        
        gamma = {
          r: gamma.r * cos_r - gamma.i * sin_r,
          i: gamma.r * sin_r + gamma.i * cos_r
        };
        
        // Back to Z: z = z0 * (1 + gamma) / (1 - gamma)
        const one_plus_g = cAdd(complex(1, 0), gamma);
        const one_minus_g = cSub(complex(1, 0), gamma);
        const z_norm = cDiv(one_plus_g, one_minus_g);
        z = { r: z_norm.r * z0, i: z_norm.i * z0 };
        addPoint(z, `Comp ${idx + 1}`);
      }
    });

    setTracePoints(points);
  }, [rl, xl, z0, frequency, matchingList]);

  // Complex operations helpers
  const complex = (r: number, i: number) => ({ r, i });
  const cAdd = (a: { r: number; i: number }, b: { r: number; i: number }) => ({ r: a.r + b.r, i: a.i + b.i });
  const cSub = (a: { r: number; i: number }, b: { r: number; i: number }) => ({ r: a.r - b.r, i: a.i - b.i });
  const cMul = (a: { r: number; i: number }, b: { r: number; i: number }) => ({
    r: a.r * b.r - a.i * b.i,
    i: a.r * b.i + a.i * b.r
  });
  const cDiv = (a: { r: number; i: number }, b: { r: number; i: number }) => {
    const denom = b.r * b.r + b.i * b.i;
    if (denom < 1e-12) return { r: 0, i: 0 };
    return {
      r: (a.r * b.r + a.i * b.i) / denom,
      i: (a.i * b.r - a.r * b.i) / denom
    };
  };

  // Editable lists methods
  const addComponent = (type: MatchingComponent["type"]) => {
    const defaultVal = type.includes("_l") ? 5.0 : type === "t_line" ? 45.0 : 2.5;
    const nextId = (matchingList.length + 1).toString();
    setMatchingList([...matchingList, { id: nextId, type, value: defaultVal }]);
  };

  const removeComponent = (id: string) => {
    setMatchingList(matchingList.filter((c) => c.id !== id));
  };

  const updateComponentValue = (id: string, value: number) => {
    setMatchingList(
      matchingList.map((c) => (c.id === id ? { ...c, value: Math.max(0.01, value) } : c))
    );
  };

  // Resistance circles metadata
  const rCircles = [0.2, 0.5, 1.0, 2.0, 5.0];
  const xCircles = [0.2, 0.5, 1.0, 2.0, 5.0, -0.2, -0.5, -1.0, -2.0, -5.0];

  // Final impedance calculation
  const getFinalImpedance = () => {
    if (tracePoints.length === 0) return "50 + j0 Ω";
    const lastPt = tracePoints[tracePoints.length - 1];
    
    // Map back from SVG coordinates to gamma
    const gammaX = (lastPt.x - 200) / 180;
    const gammaY = -(lastPt.y - 200) / 180;
    const gamma = complex(gammaX, gammaY);
    
    // z = z0 * (1 + gamma) / (1 - gamma)
    const num = cAdd(complex(1, 0), gamma);
    const den = cSub(complex(1, 0), gamma);
    const z_norm = cDiv(num, den);
    const z_actual = { r: z_norm.r * z0, i: z_norm.i * z0 };

    return `${z_actual.r.toFixed(1)} ${z_actual.i >= 0 ? "+" : "-"} j${Math.abs(z_actual.i).toFixed(1)} Ω`;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT CONTROLS PANEL */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-5 shrink-0 overflow-y-auto">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
            <span>Smith Chart RF Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Impedance matching and stub tuner simulation.</p>
        </div>

        {/* Input variables */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Load Parameters</h3>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">R Load (Ω)</label>
              <input
                type="number"
                value={rl}
                onChange={(e) => setRl(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">X Load (Ω)</label>
              <input
                type="number"
                value={xl}
                onChange={(e) => setXl(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-center font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Z0 (Ω)</label>
              <input
                type="number"
                value={z0}
                onChange={(e) => setZ0(parseFloat(e.target.value) || 50)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Freq (GHz)</label>
              <input
                type="number"
                step="0.1"
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value) || 2.4)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-center font-bold"
              />
            </div>
          </div>
        </div>

        {/* Component Adder */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Add Matching Component</label>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              onClick={() => addComponent("series_l")}
              className="py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-sm transition-all"
            >
              + Series L
            </button>
            <button
              onClick={() => addComponent("series_c")}
              className="py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-sm transition-all"
            >
              + Series C
            </button>
            <button
              onClick={() => addComponent("shunt_l")}
              className="py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-sm transition-all"
            >
              + Shunt L
            </button>
            <button
              onClick={() => addComponent("shunt_c")}
              className="py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-sm transition-all"
            >
              + Shunt C
            </button>
          </div>
          <button
            onClick={() => addComponent("t_line")}
            className="w-full py-1.5 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-white hover:border-slate-450 rounded-lg font-bold text-[10px] transition-all"
          >
            + Transmission Line Segment
          </button>
        </div>

        {/* Matching Components List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matching Network Network</label>
          {matchingList.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-250 dark:border-slate-800 text-slate-400 rounded-xl text-xs">
              Direct connection (no matching).
            </div>
          ) : (
            matchingList.map((comp, idx) => (
              <div
                key={comp.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs"
              >
                <div>
                  <div className="font-bold text-slate-400 uppercase text-[9px]">
                    {comp.type.replace("_", " ")}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1 font-mono">
                    <input
                      type="number"
                      step="0.1"
                      value={comp.value}
                      onChange={(e) => updateComponentValue(comp.id, parseFloat(e.target.value) || 0)}
                      className="w-16 bg-transparent border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                    />
                    <span className="text-[10px] text-slate-400">
                      {comp.type.endsWith("_l") ? "nH" : comp.type.endsWith("_c") ? "pF" : "deg"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeComponent(comp.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Instructions toggle */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors w-full"
        >
          {showHelp ? "Hide Help" : "Lab Instructions"}
        </button>
      </div>

      {/* 2. MIDDLE SMITH CHART VISUALIZATION */}
      <div className="flex-1 flex flex-col p-6 space-y-6 justify-center items-center overflow-y-auto">
        
        {showHelp && (
          <div className="w-full max-w-lg p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-xs text-slate-650 dark:text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
              <Zap className="h-4 w-4 text-blue-500" />
              <span>RF Impedance Matching Guide:</span>
            </h4>
            <p>
              The center of the chart represents matching ($50\ \Omega$, or normalized $1.0 + j0$). The goal of matching is to add series and shunt components to pull the load impedance point to the exact center.
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Series L/C</strong>: Moves along Constant Resistance circles.</li>
              <li><strong>Shunt L/C</strong>: Moves along Constant Conductance circles.</li>
              <li><strong>Transmission Line</strong>: Rotates clockwise towards generator.</li>
            </ul>
          </div>
        )}

        {/* SVG Smith Chart */}
        <div className="relative p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl w-[420px] h-[420px] flex items-center justify-center shrink-0">
          <svg width="390" height="390" viewBox="0 0 400 400" className="text-slate-200 dark:text-slate-800 select-none">
            
            {/* Clip path to unit circle */}
            <clipPath id="unit-circle">
              <circle cx="200" cy="200" r="180" />
            </clipPath>

            {/* Outer boundary circle */}
            <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" strokeWidth="2.5" />
            
            {/* Horizontal real axis */}
            <line x1="20" y1="200" x2="380" y2="200" stroke="currentColor" strokeWidth="1.5" />

            {/* Render constant resistance circles (clipped to unit circle) */}
            <g clipPath="url(#unit-circle)">
              {rCircles.map((r) => {
                const rSvg = 180 / (1 + r);
                const cx = 200 + 180 * (r / (1 + r));
                return (
                  <circle
                    key={`r-${r}`}
                    cx={cx}
                    cy="200"
                    r={rSvg}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeDasharray={r === 1.0 ? "0" : "2 2"}
                    className={r === 1.0 ? "text-slate-400 dark:text-slate-600" : ""}
                  />
                );
              })}

              {/* Constant Reactance circles */}
              {xCircles.map((x) => {
                const rSvg = 180 / Math.abs(x);
                const cx = 380;
                const cy = 200 - 180 / x;
                return (
                  <circle
                    key={`x-${x}`}
                    cx={cx}
                    cy={cy}
                    r={rSvg}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                );
              })}
            </g>

            {/* Render Impedance Trace path */}
            {tracePoints.length > 1 && (
              <path
                d={`M ${tracePoints.map(p => `${p.x} ${p.y}`).join(" L ")}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]"
              />
            )}

            {/* Trace points bulbs */}
            {tracePoints.map((pt, idx) => (
              <g key={`pt-${idx}`}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={idx === tracePoints.length - 1 ? "6.5" : "4.5"}
                  fill={idx === 0 ? "#3b82f6" : idx === tracePoints.length - 1 ? "#ef4444" : "#10b981"}
                  className="stroke-white dark:stroke-slate-900 stroke-2"
                />
                <text
                  x={pt.x + 8}
                  y={pt.y - 8}
                  fontSize="8"
                  className="fill-slate-400 dark:fill-slate-500 font-mono font-bold"
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {/* Center target center point (1 + j0) */}
            <circle cx="200" cy="200" r="3.5" fill="#f59e0b" />
          </svg>
        </div>

        {/* Dynamic results cards */}
        <div className="w-full max-w-lg grid grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Input Impedance (ZL)</span>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {rl} + j{xl} Ω
            </span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Final Input Impedance</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {getFinalImpedance()}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
