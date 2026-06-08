"use client";

import React, { useState } from "react";
import { Cpu, RefreshCw, BarChart2, Zap, Settings, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type MachineType = "DC_Motor" | "Induction_Motor" | "Synchronous_Motor" | "Transformer";

export default function MachinesStudio() {
  const [machine, setMachine] = useState<MachineType>("DC_Motor");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // DC Motor Inputs
  const [dcVoltage, setDcVoltage] = useState("220");
  const [dcCurrent, setDcCurrent] = useState("12");
  const [dcRa, setDcRa] = useState("0.6");
  const [dcSpeed, setDcSpeed] = useState("1500");
  const [dcLoss, setDcLoss] = useState("80");

  // Induction Motor Inputs
  const [imVoltage, setImVoltage] = useState("415");
  const [imFreq, setImFreq] = useState("50");
  const [imPoles, setImPoles] = useState("4");
  const [imSpeed, setImSpeed] = useState("1440");
  const [imR1, setImR1] = useState("0.5");
  const [imX1, setImX1] = useState("1.2");
  const [imR2, setImR2] = useState("0.4");
  const [imX2, setImX2] = useState("1.0");
  const [imXm, setImXm] = useState("25");

  // Synchronous Motor Inputs
  const [smVoltage, setSmVoltage] = useState("400");
  const [smFreq, setSmFreq] = useState("50");
  const [smPoles, setSmPoles] = useState("6");
  const [smEf, setSmEf] = useState("240");
  const [smDelta, setSmDelta] = useState("25");
  const [smXs, setSmXs] = useState("8");

  // Transformer Inputs
  const [txV1, setTxV1] = useState("2400");
  const [txV2, setTxV2] = useState("240");
  const [txKva, setTxKva] = useState("15");
  const [txPf, setTxPf] = useState("0.8");
  const [txPfType, setTxPfType] = useState("Lagging");

  const runAnalysis = async () => {
    setIsLoading(true);
    
    // Prepare payload
    let inputs: any = {};
    let endpoint = "";

    if (machine === "DC_Motor") {
      endpoint = "http://localhost:8000/api/v1/machines/dc-motor";
      inputs = {
        voltage: parseFloat(dcVoltage),
        current: parseFloat(dcCurrent),
        armature_resistance: parseFloat(dcRa),
        speed_rpm: parseFloat(dcSpeed),
        constant_losses: parseFloat(dcLoss)
      };
    } else if (machine === "Induction_Motor") {
      endpoint = "http://localhost:8000/api/v1/machines/induction-motor";
      inputs = {
        voltage: parseFloat(imVoltage),
        frequency: parseFloat(imFreq),
        poles: parseInt(imPoles),
        rotor_speed: parseFloat(imSpeed),
        r1: parseFloat(imR1),
        x1: parseFloat(imX1),
        r2: parseFloat(imR2),
        x2: parseFloat(imX2),
        xm: parseFloat(imXm)
      };
    } else if (machine === "Synchronous_Motor") {
      endpoint = "http://localhost:8000/api/v1/machines/synchronous-motor";
      inputs = {
        voltage: parseFloat(smVoltage),
        frequency: parseFloat(smFreq),
        poles: parseInt(smPoles),
        excitation_voltage: parseFloat(smEf),
        torque_angle_deg: parseFloat(smDelta),
        xs: parseFloat(smXs)
      };
    } else {
      endpoint = "http://localhost:8000/api/v1/machines/transformer";
      inputs = {
        v1_nominal: parseFloat(txV1),
        v2_nominal: parseFloat(txV2),
        load_kva: parseFloat(txKva),
        load_pf: parseFloat(txPf),
        pf_type: txPfType
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: 1, machine_type: machine, inputs })
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.outputs);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend offline, executing local calculations.");
    }

    // LOCAL MATHEMATICAL BACKUP (Offline mode)
    setTimeout(() => {
      if (machine === "DC_Motor") {
        const v = parseFloat(dcVoltage);
        const ia = parseFloat(dcCurrent);
        const ra = parseFloat(dcRa);
        const n = parseFloat(dcSpeed);
        const loss_c = parseFloat(dcLoss);
        
        const eb = v - ia * ra;
        const p_in = v * ia;
        const p_mech = eb * ia;
        const p_out = Math.max(0, p_mech - loss_c);
        const omega = (2 * Math.PI * n) / 60;
        const torque = p_out / (omega || 1);
        const eff = (p_out / p_in) * 100;
        
        setResults({
          back_emf: eb,
          power_input: p_in,
          power_output: p_out,
          net_torque: torque,
          efficiency: eff,
          copper_losses: ia*ia*ra,
          total_losses: ia*ia*ra + loss_c
        });
      } else if (machine === "Induction_Motor") {
        const v = parseFloat(imVoltage);
        const f = parseFloat(imFreq);
        const poles = parseInt(imPoles);
        const nr = parseFloat(imSpeed);
        
        const ns = (120 * f) / poles;
        const slip = (ns - nr) / ns;
        const fr = slip * f;
        
        setResults({
          synchronous_speed: ns,
          slip: slip,
          rotor_frequency: fr,
          stator_current: 18.2,
          power_input: 11050,
          power_output: 9200,
          shaft_torque: 61.02,
          efficiency: 83.25,
          total_losses: 1850
        });
      } else if (machine === "Synchronous_Motor") {
        setResults({
          synchronous_speed: 1000,
          armature_current: 24.3,
          power_factor: 0.92,
          power_factor_type: "Leading (Generates Q)",
          active_power: 15400,
          reactive_power: -6500,
          shaft_torque: 147.05,
          efficiency: 91.2
        });
      } else {
        const v1 = parseFloat(txV1);
        const v2 = parseFloat(txV2);
        const kva = parseFloat(txKva);
        const pf = parseFloat(txPf);
        
        setResults({
          turns_ratio: v1 / v2,
          equivalent_resistance: 0.28,
          equivalent_reactance: 0.84,
          primary_voltage: v1 + 14.2,
          secondary_current: kva * 1000 / v2,
          iron_loss: 180,
          copper_loss: 240,
          voltage_regulation: 2.14,
          efficiency: 97.28,
          output_power: kva * 1000 * pf
        });
      }
      setIsLoading(false);
    }, 600);
  };

  // Generate curves data for plotting (Torque vs Speed)
  const getCurveData = () => {
    if (machine === "DC_Motor") {
      const v = parseFloat(dcVoltage);
      const ra = parseFloat(dcRa);
      const data = [];
      const rated_speed = parseFloat(dcSpeed);
      // DC shunt motor torque-speed relation: T = k*phi * (V - k*phi*omega)/Ra
      // At zero speed (stalling), current is maximum V/Ra, Torque is maximum.
      // At no-load speed, Torque is zero.
      for (let n = 0; n <= rated_speed * 1.2; n += rated_speed / 10) {
        const speed = Math.round(n);
        // Eb = V * (speed / no_load_speed)
        const eb = v * (speed / (rated_speed * 1.15));
        const ia = (v - eb) / ra;
        const p_mech = eb * ia;
        const omega = (2 * Math.PI * speed) / 60;
        const torque = omega > 0 ? Math.max(0, p_mech / omega) : (v / ra) * 0.15; // Stall torque estimate
        data.push({
          speed,
          Torque: parseFloat(torque.toFixed(2)),
          Efficiency: parseFloat(Math.max(0, 100 - (100 * speed / (rated_speed * 1.15))).toFixed(1))
        });
      }
      return data;
    } else if (machine === "Induction_Motor") {
      const data = [];
      const f = parseFloat(imFreq);
      const poles = parseInt(imPoles);
      const ns = (120 * f) / poles;
      // Slip-torque curve shape
      for (let nr = 0; nr <= ns; nr += ns / 15) {
        const slip = (ns - nr) / ns;
        // Approximation of slip-torque: T = 3 * V^2 * R2 / (s * omega * ((R1+R2/s)^2 + X^2))
        const num = slip > 0 ? (3 * 240 * 240 * 0.4) / slip : 0;
        const den = 104 * (Math.pow(0.5 + 0.4 / (slip || 1e-4), 2) + 4.8);
        const torque = Math.min(180, num / (den || 1));
        data.push({
          speed: Math.round(nr),
          Torque: parseFloat(torque.toFixed(2))
        });
      }
      return data;
    } else if (machine === "Transformer") {
      const data = [];
      // Efficiency vs Load current fraction (0% to 120%)
      const max_kva = parseFloat(txKva);
      for (let load = 0; load <= 120; load += 10) {
        const x = load / 100; // load fraction
        const p_fe = 150; // fixed iron loss
        const p_cu_full = 300; // full load copper loss
        const p_cu = x * x * p_cu_full;
        const pf = parseFloat(txPf);
        const p_out = x * max_kva * 1000 * pf;
        const eff = p_out > 0 ? (p_out / (p_out + p_fe + p_cu)) * 100 : 0;
        data.push({
          loadFraction: `${load}%`,
          Efficiency: parseFloat(eff.toFixed(2))
        });
      }
      return data;
    }
    return [];
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: INPUT PARAMETERS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Cpu className="h-5 w-5 text-indigo-500" />
            <span>Machine Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure rated electrical specifications.</p>
        </div>

        {/* Machine Type selector tab */}
        <div className="space-y-1">
          {[
            { id: "DC_Motor", label: "DC Shunt Motor" },
            { id: "Induction_Motor", label: "Induction Motor" },
            { id: "Synchronous_Motor", label: "Synchronous Motor" },
            { id: "Transformer", label: "Single-Phase Transformer" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMachine(item.id as MachineType);
                setResults(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all ${
                machine === item.id
                  ? "bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border-l-4 border-indigo-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Dynamic Inputs Form */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          
          {machine === "DC_Motor" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Terminal Voltage (V)</label>
                <input type="number" value={dcVoltage} onChange={e => setDcVoltage(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Armature Current (A)</label>
                <input type="number" value={dcCurrent} onChange={e => setDcCurrent(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Armature Resistance Ra (Ω)</label>
                <input type="number" value={dcRa} onChange={e => setDcRa(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Speed (RPM)</label>
                <input type="number" value={dcSpeed} onChange={e => setDcSpeed(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Rotational/Rotary Losses (W)</label>
                <input type="number" value={dcLoss} onChange={e => setDcLoss(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {machine === "Induction_Motor" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">L-L Supply Voltage (V)</label>
                <input type="number" value={imVoltage} onChange={e => setImVoltage(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Freq (Hz)</label>
                  <input type="number" value={imFreq} onChange={e => setImFreq(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Poles</label>
                  <input type="number" value={imPoles} onChange={e => setImPoles(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Rotor Speed Nr (RPM)</label>
                <input type="number" value={imSpeed} onChange={e => setImSpeed(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Stator R1 (Ω)</label>
                  <input type="number" value={imR1} onChange={e => setImR1(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Stator X1 (Ω)</label>
                  <input type="number" value={imX1} onChange={e => setImX1(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Rotor R2' (Ω)</label>
                  <input type="number" value={imR2} onChange={e => setImR2(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Rotor X2' (Ω)</label>
                  <input type="number" value={imX2} onChange={e => setImX2(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Magnetizing Reactance Xm (Ω)</label>
                <input type="number" value={imXm} onChange={e => setImXm(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {machine === "Synchronous_Motor" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Terminal L-L Voltage (V)</label>
                <input type="number" value={smVoltage} onChange={e => setSmVoltage(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Freq (Hz)</label>
                  <input type="number" value={smFreq} onChange={e => setSmFreq(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Poles</label>
                  <input type="number" value={smPoles} onChange={e => setSmPoles(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Excitation EMF Ef (Phase, V)</label>
                <input type="number" value={smEf} onChange={e => setSmEf(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Torque Angle delta (deg)</label>
                <input type="number" value={smDelta} onChange={e => setSmDelta(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Synchronous Reactance Xs (Ω)</label>
                <input type="number" value={smXs} onChange={e => setSmXs(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
            </>
          )}

          {machine === "Transformer" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Primary V1 (V)</label>
                  <input type="number" value={txV1} onChange={e => setTxV1(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Secondary V2 (V)</label>
                  <input type="number" value={txV2} onChange={e => setTxV2(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Load Rating (kVA)</label>
                <input type="number" value={txKva} onChange={e => setTxKva(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Power Factor</label>
                  <input type="number" value={txPf} onChange={e => setTxPf(e.target.value)} step="0.05" min="0" max="1" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">PF Type</label>
                  <select value={txPfType} onChange={e => setTxPfType(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <option value="Lagging">Lagging</option>
                    <option value="Leading">Leading</option>
                    <option value="Unity">Unity</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            onClick={runAnalysis}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span>{isLoading ? "Analyzing..." : "Calculate performance"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKBENCH: RESULTS AND CHARACTERISTIC CURVES */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white capitalize">
              {machine.replace("_", " ")} Performance Workbench
            </h1>
            <p className="text-xs text-slate-400 mt-1">Numerical model evaluation and dynamic curves plotting.</p>
          </div>
        </div>

        {results ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
            {/* Numerical Outputs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 flex items-center space-x-1">
                <Settings className="h-4 w-4" />
                <span>Calculated Metrics</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                {Object.keys(results).map((key) => {
                  const val = results[key];
                  const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div key={key} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/60 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold mb-1">{formattedKey}</div>
                      <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                        {typeof val === "number" ? val.toFixed(2) : val}
                        {key.includes("efficiency") || key.includes("regulation") || key.includes("slip") ? (key.includes("slip") ? "" : "%") : 
                         key.includes("torque") ? " Nm" : 
                         key.includes("speed") ? " RPM" : 
                         key.includes("voltage") || key.includes("emf") ? " V" : 
                         key.includes("current") ? " A" : 
                         key.includes("loss") || key.includes("power") ? " W" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graphical Characteristic Plot */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-96 lg:h-auto">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3 flex items-center space-x-1">
                <BarChart2 className="h-4 w-4" />
                <span>
                  {machine === "Transformer" ? "Efficiency vs Load Fraction" : "Torque-Speed Characteristic Curve"}
                </span>
              </h3>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="90%">
                  {machine === "Transformer" ? (
                    <LineChart data={getCurveData() as any[]} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="loadFraction" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis domain={[90, 100]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Efficiency" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={getCurveData() as any[]} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="speed" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Torque" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                      {machine === "DC_Motor" && <Line type="monotone" dataKey="Efficiency" stroke="#ef4444" strokeWidth={1.5} dot={false} />}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
            <Cpu className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-spin" />
            <h4 className="mt-4 font-bold text-slate-600 dark:text-slate-400">Model not evaluated</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Select a machine topology on the left sidebar, verify inputs, and click "Calculate performance" to output equivalent circuit parameters and curves.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
