"use client";

import React, { useState } from "react";
import { BatteryCharging, RefreshCw, Activity, Sliders, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type ConverterType = "Rectifier" | "Inverter" | "Chopper";

export default function PowerElectronicsStudio() {
  const [converter, setConverter] = useState<ConverterType>("Rectifier");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // Rectifier Input States
  const [recTopology, setRecTopology] = useState("bridge_rectifier");
  const [recControlled, setRecControlled] = useState(false);
  const [recVrms, setRecVrms] = useState("120");
  const [recFreq, setRecFreq] = useState("60");
  const [recR, setRecR] = useState("10");
  const [recAlpha, setRecAlpha] = useState("45");

  // Inverter Input States
  const [invType, setInvType] = useState("spwm");
  const [invVdc, setInvVdc] = useState("100");
  const [invFreq, setInvFreq] = useState("50");
  const [invR, setInvR] = useState("12");
  const [invMa, setInvMa] = useState("0.85");
  const [invFc, setInvFc] = useState("1200");

  // Chopper Input States
  const [chTopology, setChTopology] = useState("buck");
  const [chVin, setChVin] = useState("48");
  const [chDuty, setChDuty] = useState("0.6");
  const [chFreq, setChFreq] = useState("20000"); // 20kHz
  const [chR, setChR] = useState("8");
  const [chL, setChL] = useState("0.0015"); // 1.5mH
  const [chC, setChC] = useState("0.00022"); // 220uF

  const runSimulation = async () => {
    setIsLoading(true);
    let payload: any = {};
    const endpoint = "http://localhost:8000/api/v1/power-electronics/simulate";

    if (converter === "Rectifier") {
      payload = {
        converter_type: recTopology,
        inputs: {
          is_controlled: recControlled,
          voltage_rms: parseFloat(recVrms),
          frequency: parseFloat(recFreq),
          load_r: parseFloat(recR),
          firing_angle_deg: parseFloat(recAlpha)
        }
      };
    } else if (converter === "Inverter") {
      payload = {
        converter_type: "inverter",
        inputs: {
          inverter_type: invType,
          vdc: parseFloat(invVdc),
          frequency: parseFloat(invFreq),
          load_r: parseFloat(invR),
          modulation_index: parseFloat(invMa),
          carrier_frequency: parseFloat(invFc)
        }
      };
    } else {
      payload = {
        converter_type: chTopology,
        inputs: {
          vin: parseFloat(chVin),
          duty_cycle: parseFloat(chDuty),
          frequency: parseFloat(chFreq),
          load_r: parseFloat(chR),
          inductance_h: parseFloat(chL),
          capacitance_f: parseFloat(chC)
        }
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
      console.warn("Backend offline, running local mock simulator.");
    }

    // LOCAL MATHEMATICAL BACKUP (Offline mode)
    setTimeout(() => {
      // Create waveforms lists manually
      const t_stop = 0.04; // 2 cycles at 50Hz
      const steps = 150;
      const time = Array.from({ length: steps }, (_, i) => parseFloat((i * (t_stop / steps)).toFixed(5)));
      
      if (converter === "Rectifier") {
        const vm = parseFloat(recVrms) * Math.sqrt(2);
        const f = parseFloat(recFreq);
        const r = parseFloat(recR);
        const alpha_rad = (recControlled || recTopology === "ac_voltage_controller") ? (parseFloat(recAlpha) * Math.PI) / 180 : 0;
        
        let vdc = 0;
        let vrms = 0;
        let v_in: number[] = [];
        let v_in_b: number[] = [];
        let v_in_c: number[] = [];
        let v_out: number[] = [];

        if (recTopology === "three_phase_bridge_rectifier") {
          const vm_ll = vm * Math.sqrt(3);
          v_in = time.map(t => vm * Math.sin(2 * Math.PI * f * t));
          v_in_b = time.map(t => vm * Math.sin(2 * Math.PI * f * t - (2 * Math.PI) / 3));
          v_in_c = time.map(t => vm * Math.sin(2 * Math.PI * f * t + (2 * Math.PI) / 3));
          v_out = time.map((t) => {
            const theta = (2 * Math.PI * f * t) % (2 * Math.PI);
            const phi = ((theta - alpha_rad - Math.PI / 6) % (Math.PI / 3)) - Math.PI / 6;
            let vout = vm_ll * Math.cos(phi);
            return vout < 0 ? 0 : vout;
          });
          const sum_vout = v_out.reduce((sum, val) => sum + val, 0);
          vdc = sum_vout / v_out.length;
          const sum_sq_vout = v_out.reduce((sum, val) => sum + val * val, 0);
          vrms = Math.sqrt(sum_sq_vout / v_out.length);
        } else {
          if (recTopology === "half_wave_rectifier") {
            vdc = (vm / (2 * Math.PI)) * (1 + Math.cos(alpha_rad));
            vrms = vm * Math.sqrt((1 / (4 * Math.PI)) * (Math.PI - alpha_rad + 0.5 * Math.sin(2 * alpha_rad)));
          } else if (recTopology === "ac_voltage_controller") {
            vdc = 0.0;
            vrms = parseFloat(recVrms) * Math.sqrt(1 - (alpha_rad / Math.PI) + Math.sin(2 * alpha_rad) / (2 * Math.PI));
          } else {
            vdc = (vm / Math.PI) * (1 + Math.cos(alpha_rad));
            vrms = vm * Math.sqrt((1 / (2 * Math.PI)) * (Math.PI - alpha_rad + 0.5 * Math.sin(2 * alpha_rad)));
          }
          v_in = time.map(t => vm * Math.sin(2 * Math.PI * f * t));
          v_out = time.map((t) => {
            const theta = (2 * Math.PI * f * t) % (2 * Math.PI);
            const vin = vm * Math.sin(2 * Math.PI * f * t);
            if (recTopology === "half_wave_rectifier") {
              return alpha_rad <= theta && theta <= Math.PI ? vin : 0;
            } else if (recTopology === "ac_voltage_controller") {
              if (alpha_rad <= theta && theta <= Math.PI) return vin;
              if ((Math.PI + alpha_rad) <= theta && theta <= (2 * Math.PI)) return vin;
              return 0;
            } else {
              if (alpha_rad <= theta && theta <= Math.PI) return vin;
              if ((Math.PI + alpha_rad) <= theta && theta <= (2 * Math.PI)) return -vin;
              return 0;
            }
          });
        }

        setResults({
          outputs: {
            average_voltage: vdc,
            rms_voltage: vrms,
            average_current: vdc / r,
            rms_current: vrms / r,
            ripple_factor: vdc > 0 ? Math.sqrt(Math.max(0, Math.pow(vrms/vdc, 2) - 1)) : 0.0,
            efficiency: vrms > 0 ? (vdc*vdc) / (vrms*vrms) * 100 : 0.0
          },
          waveforms: {
            time,
            input_voltage: v_in,
            input_voltage_b: v_in_b.length > 0 ? v_in_b : undefined,
            input_voltage_c: v_in_c.length > 0 ? v_in_c : undefined,
            output_voltage: v_out
          }
        });
      } else if (converter === "Inverter") {
        const vdc = parseFloat(invVdc);
        const f = parseFloat(invFreq);
        const ma = parseFloat(invMa);
        
        let vrms = vdc;
        let v1_rms = invType === "square_wave" ? (4 * vdc) / (Math.sqrt(2) * Math.PI) : (ma * vdc) / Math.sqrt(2);
        
        // PWM mock
        const v_out = time.map((t) => {
          const sin_val = Math.sin(2 * Math.PI * f * t);
          if (invType === "square_wave") {
            return sin_val >= 0 ? vdc : -vdc;
          } else {
            // High frequency carrier mock comparison
            const carrier = Math.sin(2 * Math.PI * parseFloat(invFc) * t);
            return (ma * sin_val >= carrier) ? vdc : -vdc;
          }
        });

        setResults({
          outputs: {
            total_rms_voltage: vrms,
            fundamental_rms_voltage: v1_rms,
            thd: Math.sqrt(Math.max(0, Math.pow(vrms/v1_rms, 2) - 1)) * 100,
            output_frequency: f
          },
          waveforms: {
            time,
            output_voltage: v_out
          }
        });
      } else {
        const vin = parseFloat(chVin);
        const d = parseFloat(chDuty);
        const f = parseFloat(chFreq);
        const r = parseFloat(chR);
        const L = parseFloat(chL);
        const C = parseFloat(chC);
        
        let vout = 0;
        let delta_i = 0;
        let delta_v = 0;
        
        if (chTopology === "buck") {
          vout = d * vin;
          delta_i = (vin * d * (1 - d)) / (L * f);
          delta_v = (vin * d * (1 - d)) / (8 * L * C * f * f);
        } else if (chTopology === "boost") {
          vout = vin / (1 - d);
          delta_i = (vin * d) / (L * f);
          delta_v = (vout * d) / (r * C * f);
        } else if (chTopology === "cuk") {
          vout = - (vin * d) / (1 - d);
          delta_i = (vin * d) / (L * f);
          delta_v = (Math.abs(vout) * d) / (r * C * f);
        } else { // buck_boost and sepic
          vout = (vin * d) / (1 - d);
          delta_i = (vin * d) / (L * f);
          delta_v = (vout * d) / (r * C * f);
        }

        // Generate triangular ripple waves
        const v_out = time.map((t) => {
          const t_cycle = (t * f) % 1;
          const ripple = t_cycle < d ? (delta_v * (t_cycle/d - 0.5)) : (delta_v * ((1 - t_cycle)/(1 - d) - 0.5));
          return vout + (chTopology === "cuk" ? -ripple : ripple);
        });

        const v_sw = time.map((t) => {
          const t_cycle = (t * f) % 1;
          if (chTopology === "buck") {
            return t_cycle < d ? vin : 0.0;
          } else if (chTopology === "boost") {
            return t_cycle < d ? 0.0 : vout;
          } else if (chTopology === "cuk") {
            return t_cycle < d ? vin : vout;
          } else {
            return t_cycle < d ? 0.0 : (vin + vout);
          }
        });

        setResults({
          outputs: {
            average_output_voltage: vout,
            output_ripple_voltage: delta_v,
            inductor_ripple_current: delta_i,
            average_output_current: Math.abs(vout) / r
          },
          waveforms: {
            time,
            switch_voltage: v_sw,
            output_voltage: v_out
          }
        });
      }
      setIsLoading(false);
    }, 600);
  };

  const getChartData = () => {
    if (!results || !results.waveforms) return [];
    
    const time = results.waveforms.time;
    const data: any[] = [];
    
    for (let i = 0; i < time.length; i++) {
      const entry: any = { time: time[i] };
      if (converter === "Rectifier") {
        if (results.waveforms.input_voltage_b) {
          entry["Input Phase A (V)"] = parseFloat(results.waveforms.input_voltage[i]?.toFixed(2) || "0");
          entry["Input Phase B (V)"] = parseFloat(results.waveforms.input_voltage_b[i]?.toFixed(2) || "0");
          entry["Input Phase C (V)"] = parseFloat(results.waveforms.input_voltage_c[i]?.toFixed(2) || "0");
        } else {
          entry["Input Voltage (V)"] = parseFloat(results.waveforms.input_voltage[i]?.toFixed(2) || "0");
        }
        entry["Output Voltage (V)"] = parseFloat(results.waveforms.output_voltage[i]?.toFixed(2) || "0");
      } else if (converter === "Inverter") {
        entry["Output Voltage (V)"] = parseFloat(results.waveforms.output_voltage[i]?.toFixed(2) || "0");
      } else {
        entry["Switching Node (V)"] = parseFloat(results.waveforms.switch_voltage[i]?.toFixed(2) || "0");
        entry["Output Voltage (V)"] = parseFloat(results.waveforms.output_voltage[i]?.toFixed(3) || "0");
      }
      data.push(entry);
    }
    return data;
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: INPUT PARAMETERS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <BatteryCharging className="h-5 w-5 text-emerald-500" />
            <span>Power Electronics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure switching & circuit parameters.</p>
        </div>

        {/* Tab Selector */}
        <div className="space-y-1">
          {["Rectifier", "Inverter", "Chopper"].map((type) => (
            <button
              key={type}
              onClick={() => {
                setConverter(type as ConverterType);
                setResults(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all ${
                converter === type
                  ? "bg-emerald-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400 border-l-4 border-emerald-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {type} Simulator
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          
          {converter === "Rectifier" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Topology</label>
                <select value={recTopology} onChange={e => setRecTopology(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="half_wave_rectifier">Half Wave Rectifier</option>
                  <option value="full_wave_rectifier">Full Wave (Center-Tapped)</option>
                  <option value="bridge_rectifier">Bridge Rectifier</option>
                  <option value="three_phase_bridge_rectifier">Three-Phase Bridge Rectifier</option>
                  <option value="ac_voltage_controller">AC Voltage Controller (Phase Control)</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 py-1">
                <input type="checkbox" id="controlled" checked={recControlled} onChange={e => setRecControlled(e.target.checked)} className="rounded border-slate-350" />
                <label htmlFor="controlled" className="font-bold text-slate-400">Controlled Rectifier (SCR)</label>
              </div>
              {(recControlled || recTopology === "ac_voltage_controller") && (
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Firing Angle alpha (deg)</label>
                  <input type="number" value={recAlpha} onChange={e => setRecAlpha(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-400 mb-1">Supply RMS Voltage (V)</label>
                <input type="number" value={recVrms} onChange={e => setRecVrms(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Supply Frequency (Hz)</label>
                <input type="number" value={recFreq} onChange={e => setRecFreq(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Load Resistance R (Ω)</label>
                <input type="number" value={recR} onChange={e => setRecR(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {converter === "Inverter" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Inverter Type</label>
                <select value={invType} onChange={e => setInvType(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="square_wave">Square Wave Inverter</option>
                  <option value="spwm">Sinusoidal PWM (SPWM)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Input DC Voltage Vdc (V)</label>
                <input type="number" value={invVdc} onChange={e => setInvVdc(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Desired Frequency (Hz)</label>
                <input type="number" value={invFreq} onChange={e => setInvFreq(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              {invType === "spwm" && (
                <>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Modulation Index ma (0-1.1)</label>
                    <input type="number" value={invMa} onChange={e => setInvMa(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-400 mb-1">Carrier frequency fc (Hz)</label>
                    <input type="number" value={invFc} onChange={e => setInvFc(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                  </div>
                </>
              )}
              <div>
                <label className="block font-bold text-slate-400 mb-1">Load Resistance R (Ω)</label>
                <input type="number" value={invR} onChange={e => setInvR(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {converter === "Chopper" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Topology</label>
                <select value={chTopology} onChange={e => setChTopology(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="buck">Buck (Step-down)</option>
                  <option value="boost">Boost (Step-up)</option>
                  <option value="buck_boost">Buck-Boost (Inverting)</option>
                  <option value="cuk">Cuk Converter</option>
                  <option value="sepic">SEPIC Converter</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Input DC Voltage Vin (V)</label>
                <input type="number" value={chVin} onChange={e => setChVin(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Duty Cycle D (0.05 - 0.95)</label>
                <input type="number" value={chDuty} onChange={e => setChDuty(e.target.value)} step="0.05" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Switching Frequency fs (Hz)</label>
                <input type="number" value={chFreq} onChange={e => setChFreq(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Filter Inductance L (H)</label>
                <input type="number" value={chL} onChange={e => setChL(e.target.value)} step="0.0001" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Filter Capacitance C (F)</label>
                <input type="number" value={chC} onChange={e => setChC(e.target.value)} step="0.00001" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Load Resistance R (Ω)</label>
                <input type="number" value={chR} onChange={e => setChR(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span>{isLoading ? "Running..." : "Simulate Converter"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN PANEL: ANALYSIS METRICS AND PLOTTED WAVEFORMS */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white capitalize">
              {converter} Simulator Laboratory
            </h1>
            <p className="text-xs text-slate-400 mt-1">Steady-state mathematical analysis and oscilloscope plotting.</p>
          </div>
        </div>

        {results ? (
          <div className="space-y-6 min-h-0">
            {/* Output Metrics Row */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3 flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>Steady-State Operating Metrics</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                {Object.keys(results.outputs).map((key) => {
                  const val = results.outputs[key];
                  const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div key={key} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/60 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold mb-0.5">{formattedKey}</div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {typeof val === "number" ? val.toFixed(3) : val}
                        {key.includes("efficiency") || key.includes("thd") ? "%" : 
                         key.includes("frequency") ? " Hz" : 
                         key.includes("voltage") || key.includes("ripple_voltage") ? " V" : 
                         key.includes("current") ? " A" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Waveform Graph Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[350px]">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3 flex items-center space-x-1">
                <Activity className="h-4 w-4" />
                <span>Oscilloscope Waveform Display</span>
              </h3>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="95%">
                  <LineChart data={getChartData()} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {converter === "Rectifier" && (
                      <>
                        {results?.waveforms?.input_voltage_b ? (
                          <>
                            <Line type="monotone" dataKey="Input Phase A (V)" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                            <Line type="monotone" dataKey="Input Phase B (V)" stroke="#eab308" strokeWidth={1.5} dot={false} />
                            <Line type="monotone" dataKey="Input Phase C (V)" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                          </>
                        ) : (
                          <Line type="monotone" dataKey="Input Voltage (V)" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                        )}
                        <Line type="monotone" dataKey="Output Voltage (V)" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                      </>
                    )}
                    {converter === "Inverter" && (
                      <Line type="step" dataKey="Output Voltage (V)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    )}
                    {converter === "Chopper" && (
                      <>
                        <Line type="step" dataKey="Switching Node (V)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="Output Voltage (V)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
            <BatteryCharging className="h-10 w-10 text-slate-350 dark:text-slate-700 animate-pulse" />
            <h4 className="mt-4 font-bold text-slate-600 dark:text-slate-400">Simulation not executed</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Select a power electronic converter, configure supply or filter parameters, and click "Simulate Converter" to display mathematical calculations and node waveforms.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
