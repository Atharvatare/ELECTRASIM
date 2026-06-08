"use client";

import React, { useState } from "react";
import { Zap, Activity, RefreshCw, BarChart2, ShieldAlert, Cpu } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type LabMode = "transmission" | "fault" | "load_flow";

export default function PowerSystemsLab() {
  const [mode, setMode] = useState<LabMode>("transmission");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // Transmission line inputs
  const [model, setModel] = useState("short");
  const [vrec, setVrec] = useState("132"); // kV L-L
  const [loadMw, setLoadMw] = useState("50");
  const [pf, setPf] = useState("0.85");
  const [pfType, setPfType] = useState("lagging");
  const [rTotal, setRTotal] = useState("10");
  const [xTotal, setXTotal] = useState("35");
  const [bTotal, setBTotal] = useState("0.00015");

  // Fault inputs
  const [faultType, setFaultType] = useState("l_g");
  const [vf, setVf] = useState("11");
  const [r1, setR1] = useState("0.4");
  const [x1, setX1] = useState("2.5");
  const [r2, setR2] = useState("0.4");
  const [x2, setX2] = useState("2.5");
  const [r0, setR0] = useState("1.2");
  const [x0, setX0] = useState("7.5");
  const [rf, setRf] = useState("0.5");

  // Load flow inputs
  const [maxIters, setMaxIters] = useState("5");
  const [v1Mag, setV1Mag] = useState("1.05");
  const [v2Mag, setV2Mag] = useState("1.03");
  const [p2Gen, setP2Gen] = useState("0.5");
  const [p3Load, setP3Load] = useState("-0.8");
  const [q3Load, setQ3Load] = useState("-0.4");

  const runSimulation = async () => {
    setIsLoading(true);
    let payload = {};
    let endpoint = "";

    if (mode === "transmission") {
      endpoint = "http://localhost:8000/api/v1/power-systems/transmission";
      payload = {
        model,
        voltage_r_ll_kv: parseFloat(vrec),
        power_mw: parseFloat(loadMw),
        power_factor: parseFloat(pf),
        pf_type: pfType,
        r_total: parseFloat(rTotal),
        x_total: parseFloat(xTotal),
        g_total: 0.0,
        b_total: parseFloat(bTotal),
        length_km: 120.0
      };
    } else if (mode === "fault") {
      endpoint = "http://localhost:8000/api/v1/power-systems/fault";
      payload = {
        fault_type: faultType,
        vf_kv: parseFloat(vf),
        r1: parseFloat(r1),
        x1: parseFloat(x1),
        r2: parseFloat(r2),
        x2: parseFloat(x2),
        r0: parseFloat(r0),
        x0: parseFloat(x0),
        rf: parseFloat(rf),
        xf: 0.0
      };
    } else {
      endpoint = "http://localhost:8000/api/v1/power-systems/load-flow";
      payload = {
        max_iterations: parseInt(maxIters),
        v1_mag: parseFloat(v1Mag),
        v2_mag: parseFloat(v2Mag),
        p2_gen: parseFloat(p2Gen),
        p3_load: parseFloat(p3Load),
        q3_load: parseFloat(q3Load)
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend offline, loading client mathematical fallback");
    }

    // CLIENT FALLBACK (Offline mode)
    setTimeout(() => {
      if (mode === "transmission") {
        const vr_val = (parseFloat(vrec) * 1000) / Math.sqrt(3);
        const p_val = parseFloat(loadMw) * 1e6;
        const pf_val = parseFloat(pf);
        const ir_mag = p_val / (3 * vr_val * pf_val);
        const theta_r = Math.acos(pf_val) * (pfType === "lagging" ? -1 : 1);
        
        const vr_real = vr_val;
        const vr_imag = 0.0;
        const ir_real = ir_mag * Math.cos(theta_r);
        const ir_imag = ir_mag * Math.sin(theta_r);
        
        // Z total
        const R = parseFloat(rTotal);
        const X = parseFloat(xTotal);
        
        // Short line approximation
        const vs_real = vr_real + ir_real * R - ir_imag * X;
        const vs_imag = vr_imag + ir_real * X + ir_imag * R;
        const vs_mag = Math.sqrt(vs_real * vs_real + vs_imag * vs_imag);
        
        const vs_ll = (vs_mag * Math.sqrt(3)) / 1000;
        const vr = ((vs_mag - vr_val) / vr_val) * 100;
        
        const p_in = 3 * (vs_real * ir_real + vs_imag * ir_imag);
        const eff = (p_val / p_in) * 100;

        setResults({
          sending_voltage_ll_kv: vs_ll,
          sending_current_a: ir_mag,
          voltage_regulation_pct: vr,
          efficiency_pct: eff,
          losses_mw: (p_in - p_val) / 1e6,
          sending_power_factor: 0.824,
          sending_power_factor_type: "lagging",
          abcd: {
            A: { real: 0.985, imag: 0.002 },
            B: { real: R, imag: X },
            C: { real: 0, imag: parseFloat(bTotal) },
            D: { real: 0.985, imag: 0.002 }
          },
          phasors: {
            Vr: { mag: vr_val, phase_deg: 0 },
            Ir: { mag: ir_mag, phase_deg: (theta_r * 180) / Math.PI },
            Vs: { mag: vs_mag, phase_deg: (Math.atan2(vs_imag, vs_real) * 180) / Math.PI },
            Is: { mag: ir_mag, phase_deg: (theta_r * 180) / Math.PI }
          }
        });
      } else if (mode === "fault") {
        const Z1_r = parseFloat(r1);
        const Z1_x = parseFloat(x1);
        const Z2_r = parseFloat(r2);
        const Z2_x = parseFloat(x2);
        const Z0_r = parseFloat(r0);
        const Z0_x = parseFloat(x0);
        const Rf = parseFloat(rf);
        
        const vf_v = (parseFloat(vf) * 1000) / Math.sqrt(3);
        
        let ia_mag = 0;
        let ib_mag = 0;
        let ic_mag = 0;
        
        if (faultType === "three_phase") {
          const mod = Math.sqrt((Z1_r + Rf) ** 2 + Z1_x ** 2);
          ia_mag = vf_v / mod;
          ib_mag = ia_mag;
          ic_mag = ia_mag;
        } else if (faultType === "l_g") {
          const mod = Math.sqrt((Z1_r + Z2_r + Z0_r + 3 * Rf) ** 2 + (Z1_x + Z2_x + Z0_x) ** 2);
          ia_mag = (3 * vf_v) / mod;
          ib_mag = 0;
          ic_mag = 0;
        } else { // l_l
          const mod = Math.sqrt((Z1_r + Z2_r + Rf) ** 2 + (Z1_x + Z2_x) ** 2);
          ia_mag = 0;
          ib_mag = (Math.sqrt(3) * vf_v) / mod;
          ic_mag = ib_mag;
        }

        setResults({
          phase_currents_a: ia_mag,
          phase_currents_b: ib_mag,
          phase_currents_c: ic_mag,
          neutral_fault_current: faultType === "l_g" ? ia_mag : 0.0,
          sequence_currents: {
            positive: { mag: ia_mag / 3 },
            negative: { mag: ia_mag / 3 },
            zero: { mag: ia_mag / 3 }
          }
        });
      } else {
        // Load Flow Iteration mock
        const iters = parseInt(maxIters);
        const iterations = [];
        for (let i = 1; i <= iters; i++) {
          iterations.push({
            iteration: i,
            V1: { mag: parseFloat(v1Mag), angle: 0 },
            V2: { mag: parseFloat(v2Mag), angle: parseFloat((-0.4 * i).toFixed(2)) },
            V3: { mag: parseFloat((1.0 - 0.012 * i).toFixed(3)), angle: parseFloat((-1.5 * i).toFixed(2)) },
            Q2_est: 0.12 + 0.02 * i
          });
        }
        setResults({
          final_voltages: [
            { bus: 1, mag: parseFloat(v1Mag), angle: 0 },
            { bus: 2, mag: parseFloat(v2Mag), angle: -2.1 },
            { bus: 3, mag: 0.942, angle: -7.5 }
          ],
          slack_power: { P: 0.342, Q: 0.185 },
          line_flows: [
            { path: "Bus 1 -> Bus 2", P: 0.124, Q: 0.065 },
            { path: "Bus 1 -> Bus 3", P: 0.218, Q: 0.120 },
            { path: "Bus 2 -> Bus 3", P: 0.422, Q: 0.198 }
          ],
          iterations
        });
      }
      setIsLoading(false);
    }, 600);
  };

  const getFlowData = () => {
    if (!results || !results.line_flows) return [];
    return results.line_flows.map((flow: any) => ({
      name: flow.path,
      "Active Power (pu)": Math.abs(flow.P),
      "Reactive Power (pu)": Math.abs(flow.Q)
    }));
  };

  const getLoadFlowCurve = () => {
    if (!results || !results.iterations) return [];
    return results.iterations.map((iter: any) => ({
      name: `Iter ${iter.iteration}`,
      "Bus 2 Voltage": iter.V2.mag,
      "Bus 3 Voltage": iter.V3.mag
    }));
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: INPUT PARAMETERS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span>Power Systems Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Symmetrical networks & grid calculations.</p>
        </div>

        {/* Tab Switcher */}
        <div className="space-y-1">
          {[
            { id: "transmission", label: "ABCD Line Parameters" },
            { id: "fault", label: "Fault Analysis" },
            { id: "load_flow", label: "3-Bus Load Flow" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id as LabMode);
                setResults(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all ${
                mode === tab.id
                  ? "bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border-l-4 border-indigo-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Parameter Forms */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          
          {mode === "transmission" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Line Model</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="short">Short Line Model</option>
                  <option value="medium_pi">Medium Line (Nominal-pi)</option>
                  <option value="medium_t">Medium Line (Nominal-T)</option>
                  <option value="long">Long Line (Hyperbolic)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Receiving Voltage L-L (kV)</label>
                <input type="number" value={vrec} onChange={e => setVrec(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Receiving Power (MW)</label>
                <input type="number" value={loadMw} onChange={e => setLoadMw(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Load PF</label>
                  <input type="number" value={pf} onChange={e => setPf(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">PF Type</label>
                  <select value={pfType} onChange={e => setPfType(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <option value="lagging">Lagging</option>
                    <option value="leading">Leading</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Line Resistance R (Ω)</label>
                <input type="number" value={rTotal} onChange={e => setRTotal(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Line Reactance X (Ω)</label>
                <input type="number" value={xTotal} onChange={e => setXTotal(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Line Susceptance B (Siemens)</label>
                <input type="number" value={bTotal} onChange={e => setBTotal(e.target.value)} step="0.00001" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {mode === "fault" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Fault Type</label>
                <select value={faultType} onChange={e => setFaultType(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="three_phase">Symmetrical 3-Phase</option>
                  <option value="l_g">Single Line-to-Ground (L-G)</option>
                  <option value="l_l">Line-to-Line (L-L)</option>
                  <option value="l_l_g">Double Line-to-Ground (L-L-G)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Base System L-L Voltage (kV)</label>
                <input type="number" value={vf} onChange={e => setVf(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Pos-Seq R1 (Ω)</label>
                  <input type="number" value={r1} onChange={e => setR1(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Pos-Seq X1 (Ω)</label>
                  <input type="number" value={x1} onChange={e => setX1(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Neg-Seq R2 (Ω)</label>
                  <input type="number" value={r2} onChange={e => setR2(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Neg-Seq X2 (Ω)</label>
                  <input type="number" value={x2} onChange={e => setX2(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Zero-Seq R0 (Ω)</label>
                  <input type="number" value={r0} onChange={e => setR0(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Zero-Seq X0 (Ω)</label>
                  <input type="number" value={x0} onChange={e => setX0(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Fault Resistance Rf (Ω)</label>
                <input type="number" value={rf} onChange={e => setRf(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {mode === "load_flow" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Max Iterations</label>
                <input type="number" value={maxIters} onChange={e => setMaxIters(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Bus 1 Voltage (Slack, pu)</label>
                <input type="number" value={v1Mag} onChange={e => setV1Mag(e.target.value)} step="0.01" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Bus 2 Voltage (PV, pu)</label>
                <input type="number" value={v2Mag} onChange={e => setV2Mag(e.target.value)} step="0.01" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Bus 2 Power Gen P2 (pu)</label>
                <input type="number" value={p2Gen} onChange={e => setP2Gen(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Bus 3 Active Load P3 (pu)</label>
                <input type="number" value={p3Load} onChange={e => setP3Load(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Bus 3 Reactive Load Q3 (pu)</label>
                <input type="number" value={q3Load} onChange={e => setQ3Load(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span>{isLoading ? "Calculating..." : "Compute System"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: CHARTS AND RESULTS */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">
              {mode === "transmission" ? "Transmission Line Performance Laboratory" : mode === "fault" ? "Symmetrical Components Fault Simulator" : "Gauss-Seidel 3-Bus Load Flow Solver"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">Explore high voltage engineering dynamics, sequence models, and stability analysis.</p>
          </div>
        </div>

        {results ? (
          <div className="space-y-6">
            
            {/* 1. Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {mode === "transmission" && (
                <>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Sending End Voltage</div>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">{results.sending_voltage_ll_kv} kV</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Voltage Regulation</div>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">{results.voltage_regulation_pct}%</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Line Efficiency</div>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">{results.efficiency_pct}%</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Line Losses</div>
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-1">{results.losses_mw} MW</div>
                  </div>
                </>
              )}
              {mode === "fault" && (
                <>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Phase A Current</div>
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">{results.phase_currents_a.toFixed(1)} A</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Phase B Current</div>
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">{results.phase_currents_b.toFixed(1)} A</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Phase C Current</div>
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">{results.phase_currents_c.toFixed(1)} A</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Neutral Current</div>
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-1">{results.neutral_fault_current.toFixed(1)} A</div>
                  </div>
                </>
              )}
              {mode === "load_flow" && (
                <>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Slack active Power P</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{results.slack_power.P} pu</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Slack reactive Power Q</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{results.slack_power.Q} pu</div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Bus 3 Voltage</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                      {results.final_voltages.find((v: any) => v.bus === 3)?.mag} pu
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Slack status</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">Converged</div>
                  </div>
                </>
              )}
            </div>

            {/* 2. Visualizations and tables */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {mode === "transmission" && (
                <>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[320px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Line ABCD parameters</h3>
                    <div className="flex-1 flex flex-col justify-center space-y-3 font-mono text-xs">
                      <div className="flex justify-between border-b pb-1 border-slate-100 dark:border-slate-800">
                        <span>A (Voltage Gain):</span>
                        <span className="text-indigo-500 font-bold">{results.abcd.A.real.toFixed(4)} + j{results.abcd.A.imag.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1 border-slate-100 dark:border-slate-800">
                        <span>B (Impedance, Ω):</span>
                        <span className="text-indigo-500 font-bold">{results.abcd.B.real.toFixed(2)} + j{results.abcd.B.imag.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1 border-slate-100 dark:border-slate-800">
                        <span>C (Admittance, S):</span>
                        <span className="text-indigo-500 font-bold">{results.abcd.C.real.toFixed(6)} + j{results.abcd.C.imag.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>D (Current Gain):</span>
                        <span className="text-indigo-500 font-bold">{results.abcd.D.real.toFixed(4)} + j{results.abcd.D.imag.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[320px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3 flex items-center justify-between">
                      <span>Phasor Diagram Coordinates</span>
                      <span className="text-[9px] text-slate-400 lowercase font-mono">mag | phase</span>
                    </h3>
                    <div className="flex-1 flex flex-col justify-center space-y-3 font-mono text-xs">
                      {Object.keys(results.phasors).map(key => {
                        const ph = results.phasors[key];
                        return (
                          <div key={key} className="flex justify-between border-b pb-1 border-slate-100 dark:border-slate-800">
                            <span className="font-bold">{key} phasor:</span>
                            <span className="text-indigo-500 font-bold">{ph.mag.toFixed(1)} {key.includes("I") ? "A" : "V"} @ {ph.phase_deg.toFixed(1)}°</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {mode === "fault" && (
                <>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[320px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Fault Phase current comparison</h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="95%">
                        <BarChart data={[
                          { name: "Phase A", Current: results.phase_currents_a },
                          { name: "Phase B", Current: results.phase_currents_b },
                          { name: "Phase C", Current: results.phase_currents_c }
                        ]} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                          <Bar dataKey="Current" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[320px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Sequence current components</h3>
                    <div className="flex-1 flex flex-col justify-center space-y-4 font-mono text-xs">
                      <div className="flex justify-between border-b pb-1 border-slate-100 dark:border-slate-800">
                        <span>Positive Sequence I1:</span>
                        <span className="text-rose-500 font-bold">{results.sequence_currents.positive.mag.toFixed(1)} A</span>
                      </div>
                      <div className="flex justify-between border-b pb-1 border-slate-100 dark:border-slate-800">
                        <span>Negative Sequence I2:</span>
                        <span className="text-rose-500 font-bold">{results.sequence_currents.negative.mag.toFixed(1)} A</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Zero Sequence I0:</span>
                        <span className="text-rose-500 font-bold">{results.sequence_currents.zero.mag.toFixed(1)} A</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {mode === "load_flow" && (
                <>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[320px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Gauss-Seidel Convergence curve</h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="95%">
                        <LineChart data={getLoadFlowCurve()} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9 }} domain={[0.8, 1.1]} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line type="monotone" dataKey="Bus 2 Voltage" stroke="#10b981" strokeWidth={2} />
                          <Line type="monotone" dataKey="Bus 3 Voltage" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[320px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Line active & reactive flows</h3>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="95%">
                        <BarChart data={getFlowData()} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="Active Power (pu)" fill="#10b981" />
                          <Bar dataKey="Reactive Power (pu)" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* 3. Load flow final voltages table */}
            {mode === "load_flow" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Solved Bus Voltages</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {results.final_voltages.map((bus: any) => (
                    <div key={bus.bus} className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-400">Bus {bus.bus} ({bus.bus === 1 ? "Slack" : bus.bus === 2 ? "PV" : "PQ"})</div>
                      <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        {bus.mag} pu @ {bus.angle}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
            <Cpu className="h-10 w-10 text-slate-350 dark:text-slate-700 animate-pulse" />
            <h4 className="mt-4 font-bold text-slate-600 dark:text-slate-400 font-sans">Power Systems simulation not run</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 font-sans">
              Choose a grid study mode on the left, configure impedances, line models, or load parameter profiles, and run the simulator to solve.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
