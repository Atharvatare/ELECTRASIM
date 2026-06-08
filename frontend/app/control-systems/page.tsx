"use client";

import React, { useState } from "react";
import { Sliders, RefreshCw, BarChart2, Zap, Settings, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type AnalysisMode = "PID" | "Bode" | "StateSpace" | "Nyquist";
type PlantType = "FirstOrder" | "SecondOrder";

export default function ControlSystemsStudio() {
  const [mode, setMode] = useState<AnalysisMode>("PID");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // PID Parameters
  const [kp, setKp] = useState("2.5");
  const [ki, setKi] = useState("1.0");
  const [kd, setKd] = useState("0.4");
  const [setpoint, setSetpoint] = useState("1.0");
  const [plant, setPlant] = useState<PlantType>("SecondOrder");
  
  // Plant parameters
  const [tau, setTau] = useState("0.5"); // for first order: G = 1 / (tau*s + 1)
  const [wn, setWn] = useState("4.0");   // for second order: G = wn^2 / (s^2 + 2*zeta*wn*s + wn^2)
  const [zeta, setZeta] = useState("0.4");

  // Bode Parameters
  const [bodeK, setBodeK] = useState("10");
  const [bodeT1, setBodeT1] = useState("0.2");
  const [bodeT2, setBodeT2] = useState("0.05");

  // State-Space Parameters
  const [ssA11, setSsA11] = useState("0");
  const [ssA12, setSsA12] = useState("1");
  const [ssA21, setSsA21] = useState("-8.0");
  const [ssA22, setSsA22] = useState("-2.0");
  const [ssB1, setSsB1] = useState("0");
  const [ssB2, setSsB2] = useState("1");
  const [ssC1, setSsC1] = useState("1");
  const [ssC2, setSsC2] = useState("0");
  const [ssK1, setSsK1] = useState("4.0");
  const [ssK2, setSsK2] = useState("1.5");
  const [ssSetpoint, setSsSetpoint] = useState("1.0");

  // Run PID Step Response simulation (using Euler)
  const runPIDSimulation = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const Kp = parseFloat(kp);
      const Ki = parseFloat(ki);
      const Kd = parseFloat(kd);
      const SP = parseFloat(setpoint);
      
      const t_stop = 6.0; // 6 seconds simulation
      const dt = 0.01;    // step size 10ms
      const steps = Math.round(t_stop / dt);
      
      const time: number[] = [];
      const output: number[] = [];
      const sp_arr: number[] = [];
      
      let y = 0.0;
      let x1 = 0.0;
      let x2 = 0.0;
      let integral = 0.0;
      let prev_error = 0.0;
      
      const Tau = parseFloat(tau);
      const Wn = parseFloat(wn);
      const Zeta = parseFloat(zeta);
      const Wn2 = Wn * Wn;
      
      for (let step = 0; step <= steps; step++) {
        const t = step * dt;
        time.push(parseFloat(t.toFixed(2)));
        sp_arr.push(SP);
        
        const error = SP - y;
        integral += error * dt;
        const derivative = (error - prev_error) / dt;
        prev_error = error;
        
        let u = Kp * error + Ki * integral + Kd * derivative;
        u = Math.max(-10, Math.min(10, u));
        
        if (plant === "FirstOrder") {
          const dy = (u - y) / Tau;
          y += dy * dt;
          output.push(parseFloat(y.toFixed(4)));
        } else {
          const dx1 = x2;
          const dx2 = -2.0 * Zeta * Wn * x2 - Wn2 * x1 + Wn2 * u;
          x1 += dx1 * dt;
          x2 += dx2 * dt;
          y = x1;
          output.push(parseFloat(y.toFixed(4)));
        }
      }
      
      const maxVal = Math.max(...output);
      const overshoot = maxVal > SP ? ((maxVal - SP) / SP) * 100 : 0;
      
      let settlingIdx = steps;
      const band = 0.02 * SP;
      for (let i = steps; i >= 0; i--) {
        if (Math.abs(output[i] - SP) > band) {
          settlingIdx = i;
          break;
        }
      }
      const settlingTime = settlingIdx * dt;
      
      let t10 = 0;
      let t90 = 0;
      for (let i = 0; i <= steps; i++) {
        if (output[i] >= 0.1 * SP && t10 === 0) t10 = i * dt;
        if (output[i] >= 0.9 * SP && t90 === 0) {
          t90 = i * dt;
          break;
        }
      }
      
      setResults({
        metrics: {
          overshoot: round(overshoot, 2),
          settling_time: round(settlingTime, 2),
          rise_time: round(t90 - t10, 2),
          peak_value: round(maxVal, 3),
          steady_state_error: round(Math.abs(SP - output[steps]), 4)
        },
        waveforms: time.map((t, idx) => ({
          time: t,
          "Setpoint": sp_arr[idx],
          "Response Output": output[idx]
        }))
      });
      setIsLoading(false);
    }, 400);
  };

  // Run Bode Plot frequency sweep
  const runBodePlot = () => {
    setIsLoading(true);
    setTimeout(() => {
      const K = parseFloat(bodeK);
      const T1 = parseFloat(bodeT1);
      const T2 = parseFloat(bodeT2);
      
      const points: any[] = [];
      const decades = 4;
      const numPoints = 100;
      
      for (let i = 0; i < numPoints; i++) {
        const logW = -1 + (decades * i) / (numPoints - 1);
        const w = Math.pow(10, logW);
        
        const mag = K / (w * Math.sqrt(1 + w*w*T1*T1) * Math.sqrt(1 + w*w*T2*T2));
        const magDb = 20 * Math.log10(mag);
        
        const phaseRad = -Math.PI / 2 - Math.atan(w * T1) - Math.atan(w * T2);
        let phaseDeg = (phaseRad * 180) / Math.PI;
        
        points.push({
          frequency: w.toFixed(2),
          "Magnitude (dB)": parseFloat(magDb.toFixed(2)),
          "Phase (deg)": parseFloat(phaseDeg.toFixed(1))
        });
      }
      
      setResults({
        waveforms: points
      });
      setIsLoading(false);
    }, 400);
  };

  // Run State Space Simulation
  const runStateSpaceSimulation = () => {
    setIsLoading(true);
    setTimeout(() => {
      const a11 = parseFloat(ssA11);
      const a12 = parseFloat(ssA12);
      const a21 = parseFloat(ssA21);
      const a22 = parseFloat(ssA22);
      const b1 = parseFloat(ssB1);
      const b2 = parseFloat(ssB2);
      const c1 = parseFloat(ssC1);
      const c2 = parseFloat(ssC2);
      const k1 = parseFloat(ssK1);
      const k2 = parseFloat(ssK2);
      const SP = parseFloat(ssSetpoint);

      const t_stop = 6.0;
      const dt = 0.01;
      const steps = Math.round(t_stop / dt);

      const time: number[] = [];
      const x1_arr: number[] = [];
      const x2_arr: number[] = [];
      const y_arr: number[] = [];
      const sp_arr: number[] = [];

      let x1 = 0.0;
      let x2 = 0.0;

      for (let step = 0; step <= steps; step++) {
        const t = step * dt;
        time.push(parseFloat(t.toFixed(2)));
        sp_arr.push(SP);
        x1_arr.push(parseFloat(x1.toFixed(4)));
        x2_arr.push(parseFloat(x2.toFixed(4)));

        const y = c1 * x1 + c2 * x2;
        y_arr.push(parseFloat(y.toFixed(4)));

        let u = SP - (k1 * x1 + k2 * x2);
        u = Math.max(-15, Math.min(15, u));

        const dx1 = a11 * x1 + a12 * x2 + b1 * u;
        const dx2 = a21 * x1 + a22 * x2 + b2 * u;

        x1 += dx1 * dt;
        x2 += dx2 * dt;
      }

      setResults({
        waveforms: time.map((t, idx) => ({
          time: t,
          "Setpoint": sp_arr[idx],
          "State x1 (Pos)": x1_arr[idx],
          "State x2 (Vel)": x2_arr[idx],
          "Output y": y_arr[idx]
        }))
      });
      setIsLoading(false);
    }, 400);
  };

  // Run Nyquist Plot
  const runNyquistPlot = () => {
    setIsLoading(true);
    setTimeout(() => {
      const K = parseFloat(bodeK);
      const T1 = parseFloat(bodeT1);
      const T2 = parseFloat(bodeT2);

      const points: any[] = [];
      const numPoints = 150;
      for (let i = 0; i < numPoints; i++) {
        const w = 0.05 * Math.pow(10, (3.8 * i) / (numPoints - 1));
        
        const d_real = -w * w * (T1 + T2);
        const d_imag = w * (1 - w * w * T1 * T2);
        const denom_sq = d_real * d_real + d_imag * d_imag;

        const real = (K * d_real) / denom_sq;
        const imag = (-K * d_imag) / denom_sq;

        if (Math.abs(real) < 100 && Math.abs(imag) < 100) {
          points.push({
            frequency: w.toFixed(2),
            "Real": parseFloat(real.toFixed(3)),
            "Imaginary": parseFloat(imag.toFixed(3))
          });
        }
      }

      setResults({
        waveforms: points
      });
      setIsLoading(false);
    }, 400);
  };

  const round = (num: number, dec: number) => {
    return parseFloat(num.toFixed(dec)) || 0;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: INPUT PARAMETERS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Sliders className="h-5 w-5 text-indigo-500" />
            <span>Control Systems</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Design controller feedback loops.</p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-1.5 border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
          {(["PID", "Bode", "StateSpace", "Nyquist"] as AnalysisMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setResults(null);
              }}
              className={`text-center py-1.5 rounded text-[11px] font-semibold transition-all ${
                mode === m
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {m === "PID" ? "PID Step" : m === "Bode" ? "Bode Plot" : m === "StateSpace" ? "State-Space" : "Nyquist Plot"}
            </button>
          ))}
        </div>

        {/* Dynamic Parameter Forms */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {mode === "PID" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Setpoint Target (SP)</label>
                <input type="number" value={setpoint} onChange={e => setSetpoint(e.target.value)} step="0.1" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Kp (P)</label>
                  <input type="number" value={kp} onChange={e => setKp(e.target.value)} step="0.1" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Ki (I)</label>
                  <input type="number" value={ki} onChange={e => setKi(e.target.value)} step="0.1" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Kd (D)</label>
                  <input type="number" value={kd} onChange={e => setKd(e.target.value)} step="0.1" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Plant Transfer Function</label>
                <select value={plant} onChange={e => setPlant(e.target.value as PlantType)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="FirstOrder">First Order: 1 / (τs + 1)</option>
                  <option value="SecondOrder">Second Order: ωn² / (s² + 2ζωns + ωn²)</option>
                </select>
              </div>
              {plant === "FirstOrder" ? (
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Time Constant τ (seconds)</label>
                  <input type="number" value={tau} onChange={e => setTau(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Nat Freq ωn (rad/s)</label>
                    <input type="number" value={wn} onChange={e => setWn(e.target.value)} step="0.5" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Damping ζ</label>
                    <input type="number" value={zeta} onChange={e => setZeta(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                  </div>
                </div>
              )}
              
              <button
                onClick={runPIDSimulation}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <Activity className="h-4 w-4" />
                <span>Simulate Step Response</span>
              </button>
            </>
          )}

          {mode === "Bode" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">System DC Gain K</label>
                <input type="number" value={bodeK} onChange={e => setBodeK(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">First Lag Pole T1 (s)</label>
                <input type="number" value={bodeT1} onChange={e => setBodeT1(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Second Lag Pole T2 (s)</label>
                <input type="number" value={bodeT2} onChange={e => setBodeT2(e.target.value)} step="0.01" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <button
                onClick={runBodePlot}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Plot Frequency Response</span>
              </button>
            </>
          )}

          {mode === "StateSpace" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Matrix A (Dynamics)</label>
                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  <input type="number" value={ssA11} onChange={e => setSsA11(e.target.value)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center font-bold" placeholder="a11" />
                  <input type="number" value={ssA12} onChange={e => setSsA12(e.target.value)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center font-bold" placeholder="a12" />
                  <input type="number" value={ssA21} onChange={e => setSsA21(e.target.value)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center font-bold" placeholder="a21" />
                  <input type="number" value={ssA22} onChange={e => setSsA22(e.target.value)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center font-bold" placeholder="a22" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Matrix B (Input)</label>
                  <div className="grid grid-rows-2 gap-1 font-mono">
                    <input type="number" value={ssB1} onChange={e => setSsB1(e.target.value)} className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center" />
                    <input type="number" value={ssB2} onChange={e => setSsB2(e.target.value)} className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center" />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Matrix C (Output)</label>
                  <div className="grid grid-cols-2 gap-1 font-mono">
                    <input type="number" value={ssC1} onChange={e => setSsC1(e.target.value)} className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center" />
                    <input type="number" value={ssC2} onChange={e => setSsC2(e.target.value)} className="p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Feedback Vector K</label>
                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  <input type="number" value={ssK1} onChange={e => setSsK1(e.target.value)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center font-bold text-indigo-500" placeholder="k1" />
                  <input type="number" value={ssK2} onChange={e => setSsK2(e.target.value)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center font-bold text-indigo-500" placeholder="k2" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Reference Setpoint (r)</label>
                <input type="number" value={ssSetpoint} onChange={e => setSsSetpoint(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <button
                onClick={runStateSpaceSimulation}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <Activity className="h-4 w-4" />
                <span>Simulate State-Space</span>
              </button>
            </>
          )}

          {mode === "Nyquist" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">System DC Gain K</label>
                <input type="number" value={bodeK} onChange={e => setBodeK(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">First Lag Pole T1 (s)</label>
                <input type="number" value={bodeT1} onChange={e => setBodeT1(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Second Lag Pole T2 (s)</label>
                <input type="number" value={bodeT2} onChange={e => setBodeT2(e.target.value)} step="0.01" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <button
                onClick={runNyquistPlot}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <BarChart2 className="h-4 w-4" />
                <span>Plot Nyquist Path</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. MAIN PANEL: TRANSIENT CURVE / BODE / NYQUIST GRAPH */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white capitalize">
              {mode === "PID" ? "PID Step Response" : mode === "Bode" ? "Open-Loop Bode Plot" : mode === "StateSpace" ? "State-Space Transient Trajectories" : "Nyquist Polar Diagram"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">Calculates closed-loop feedback stability and damping margins.</p>
          </div>
        </div>

        {results ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            {/* Transient performance metrics column */}
            {mode === "PID" && (
              <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center space-x-1">
                  <Settings className="h-4 w-4" />
                  <span>Transient Step Metrics</span>
                </h3>
                
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Max Overshoot (Mp)</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{results.metrics.overshoot} %</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Settling Time (Ts, 2% band)</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{results.metrics.settling_time} s</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Rise Time (Tr, 10%-90%)</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{results.metrics.rise_time} s</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-bold">Steady-State Error</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{results.metrics.steady_state_error}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Graphs Column */}
            <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 ${
              mode === "PID" ? "lg:col-span-2" : "lg:col-span-3"
            } h-96 flex flex-col`}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3 flex items-center space-x-1.5">
                <BarChart2 className="h-4.5 w-4.5" />
                <span>
                  {mode === "PID" ? "Step Response Plot" : mode === "Bode" ? "Logarithmic Frequency Response (dB & deg)" : mode === "StateSpace" ? "Dynamic State Trajectories" : "Nyquist Polar Diagram (Imag vs Real)"}
                </span>
              </h3>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="95%">
                  {mode === "PID" ? (
                    <LineChart data={results.waveforms} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Setpoint" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="Response Output" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  ) : mode === "Bode" ? (
                    <LineChart data={results.waveforms} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="frequency" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Magnitude (dB)" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Phase (deg)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  ) : mode === "StateSpace" ? (
                    <LineChart data={results.waveforms} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Setpoint" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="State x1 (Pos)" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="State x2 (Vel)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="Output y" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  ) : (
                    <LineChart data={results.waveforms} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      {/* Nyquist: Real on X-Axis, Imaginary on Y-Axis */}
                      <XAxis dataKey="Real" type="number" domain={['auto', 'auto']} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis dataKey="Imaginary" type="number" domain={['auto', 'auto']} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Imaginary" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
            <Sliders className="h-10 w-10 text-slate-350 dark:text-slate-700 animate-pulse" />
            <h4 className="mt-4 font-bold text-slate-600 dark:text-slate-400">Simulation not evaluated</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Select an analysis model on the left sidebar, adjust gains or pole constants, and click simulate to plot dynamic responses.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
