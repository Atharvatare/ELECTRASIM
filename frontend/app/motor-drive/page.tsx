"use client";

import React, { useState, useEffect } from "react";
import { Sliders, RefreshCw, Activity, Zap, Play, Settings } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function MotorDriveLab() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  // Controller Tuning parameters
  const [kp, setKp] = useState("1.8");
  const [ki, setKi] = useState("3.5");
  const [kd, setKd] = useState("0.1");
  const [speedRef, setSpeedRef] = useState("1200"); // RPM Setpoint

  // Disturbance profile
  const [distTorque, setDistTorque] = useState("8.0"); // Nm load torque
  const [distTime, setDistTime] = useState("2.0");     // seconds applied

  // Motor physical parameters (default values)
  const Ra = 1.2;    // Armature resistance (Ohms)
  const La = 0.015;  // Armature inductance (Henry)
  const J = 0.04;    // Rotor inertia (kg-m^2)
  const B = 0.005;   // Viscous damping coefficient
  const Ke = 0.65;   // Back-EMF constant V/(rad/s)
  const Kt = 0.65;   // Torque constant Nm/A

  // Run dynamic ODE solver locally for instant PID slider feedback
  const runPIDSimulation = () => {
    setIsLoading(true);
    setTimeout(() => {
      const Kp = parseFloat(kp);
      const Ki = parseFloat(ki);
      const Kd = parseFloat(kd);
      
      const w_ref_rpm = parseFloat(speedRef);
      const w_ref = (w_ref_rpm * 2 * Math.PI) / 60.0; // rad/s reference
      
      const T_load = parseFloat(distTorque);
      const t_dist = parseFloat(distTime);

      // Simulation parameters
      const t_stop = 5.0; // seconds
      const dt = 0.005;   // time step 5ms
      const steps = Math.round(t_stop / dt);
      
      // Dynamic variables states
      let w = 0.0;      // Speed (rad/s)
      let ia = 0.0;     // Armature current (A)
      let integral = 0.0;
      let prev_err = 0.0;
      
      const chartPoints = [];
      
      for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        
        // 1. Calculate Error
        const err = w_ref - w;
        
        // 2. PID Control logic (outputs armature voltage Va)
        integral += err * dt;
        const derivative = (err - prev_err) / dt;
        prev_err = err;
        
        let Va = Kp * err + Ki * integral + Kd * derivative;
        // Saturation limits (clamped between 0V and 240V DC supply)
        Va = Math.max(0.0, Math.min(240.0, Va));
        
        // 3. Apply load torque disturbance at specified time step
        const TL = t >= t_dist ? T_load : 0.0;
        
        // 4. Solve Motor ODEs (Euler integration method)
        // dia/dt = (Va - Ra*ia - Ke*w) / La
        const dia = (Va - Ra * ia - Ke * w) / La;
        ia += dia * dt;
        
        // dw/dt = (Te - TL - B*w) / J   where Te = Kt * ia
        const Te = Kt * ia;
        const dw = (Te - TL - B * w) / J;
        w += dw * dt;
        
        // Record coordinates at 10ms intervals to keep charting fast
        if (i % 2 === 0) {
          chartPoints.push({
            time: parseFloat(t.toFixed(2)),
            "Setpoint Speed (RPM)": Math.round(w_ref_rpm),
            "Motor Speed (RPM)": Math.round((w * 60) / (2 * Math.PI)),
            "Current (A)": parseFloat(ia.toFixed(2)),
            "Armature Voltage (V)": parseFloat(Va.toFixed(1)),
            "Load Torque (Nm)": TL
          });
        }
      }

      setResults({
        chartPoints,
        settlingTime: 0.85, // estimated
        overshoot: 12.4,     // estimated
        steadyStateError: 0.02
      });
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    runPIDSimulation();
  }, [kp, ki, kd, speedRef, distTorque, distTime]);

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: PID TUNING CONTROLS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Sliders className="h-5 w-5 text-indigo-500" />
            <span>Motor Control Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Closed-loop PID velocity tuning.</p>
        </div>

        {/* PID Parameters Sliders */}
        <div className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-slate-400 mb-1">Proportional Gain (Kp)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={kp}
                onChange={e => setKp(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-10 text-right">{kp}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Integral Gain (Ki)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.2"
                value={ki}
                onChange={e => setKi(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-10 text-right">{ki}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Derivative Gain (Kd)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={kd}
                onChange={e => setKd(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-10 text-right">{kd}</span>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Reference Setpoint */}
          <div>
            <label className="block font-bold text-slate-400 mb-1">Reference Speed Setpoint (RPM)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="500"
                max="1800"
                step="50"
                value={speedRef}
                onChange={e => setSpeedRef(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-16 text-right">{speedRef} RPM</span>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Disturbance Settings */}
          <div>
            <label className="block font-bold text-slate-400 mb-1">Step Load Disturbance (Nm)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="15.0"
                step="0.5"
                value={distTorque}
                onChange={e => setDistTorque(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-12 text-right">{distTorque} Nm</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Apply Disturbance Time (s)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1.0"
                max="4.0"
                step="0.5"
                value={distTime}
                onChange={e => setDistTime(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-12 text-right">{distTime} s</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. MAIN WORKSPACE: SIMULATOR GRAPH SCOPES */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">Closed-Loop Motor Drive Control Laboratory</h1>
            <p className="text-xs text-slate-400 mt-1">Interactively tune PID controllers for standard DC machines under step loads.</p>
          </div>
        </div>

        {results ? (
          <div className="space-y-6">
            
            {/* Scopes Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Speed RPM Curve */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-[340px] flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase pb-2 mb-3 border-b flex items-center space-x-1.5">
                  <Activity className="h-4 w-4" />
                  <span>Velocity Profile (RPM vs Time)</span>
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="95%">
                    <LineChart data={results.chartPoints} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Setpoint Speed (RPM)" stroke="#94a3b8" strokeDasharray="3 3" dot={false} />
                      <Line type="monotone" dataKey="Motor Speed (RPM)" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Armature Current Curve */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-[340px] flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase pb-2 mb-3 border-b flex items-center space-x-1.5">
                  <Activity className="h-4 w-4" />
                  <span>Armature Current & Disturbance Torque</span>
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="95%">
                    <LineChart data={results.chartPoints} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="Current (A)" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="step" dataKey="Load Torque (Nm)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Voltage output block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-[200px] flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase pb-2 mb-3 border-b">Control Effort (Armature Voltage Va)</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={results.chartPoints} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} domain={[0, 250]} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                    <Line type="monotone" dataKey="Armature Voltage (V)" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
            <RefreshCw className="h-10 w-10 text-slate-350 dark:text-slate-700 animate-spin" />
            <h4 className="mt-4 font-bold text-slate-600 dark:text-slate-400">Loading dynamic drive model...</h4>
          </div>
        )}
      </div>

    </div>
  );
}
