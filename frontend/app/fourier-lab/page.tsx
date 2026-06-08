"use client";

import React, { useState, useEffect } from "react";
import { Activity, BarChart2, Sliders, RefreshCw, HelpCircle, Zap } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type WaveformType = "Square" | "Triangle" | "Sawtooth" | "Rectified";

export default function FourierLaboratory() {
  const [waveType, setWaveType] = useState<WaveformType>("Square");
  const [frequency, setFrequency] = useState("10"); // Hz
  const [amplitude, setAmplitude] = useState("5.0"); // V peak
  const [harmonics, setHarmonics] = useState(7); // N max
  const [timeData, setTimeData] = useState<any[]>([]);
  const [freqData, setFreqData] = useState<any[]>([]);

  useEffect(() => {
    calculateFourierSeries();
  }, [waveType, frequency, amplitude, harmonics]);

  const calculateFourierSeries = () => {
    const f0 = parseFloat(frequency) || 10;
    const A = parseFloat(amplitude) || 5.0;
    const N = harmonics;
    
    const T = 1.0 / f0; // Period
    const steps = 300;
    const t_stop = 2 * T; // Plot 2 cycles
    
    // 1. Time-Domain Waveform Synthesis
    const timePoints = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i * t_stop) / steps;
      const omega0 = 2 * Math.PI * f0;
      
      // Calculate Ideal wave value
      let ideal = 0;
      const phase = (omega0 * t) % (2 * Math.PI);
      
      if (waveType === "Square") {
        ideal = Math.sin(omega0 * t) >= 0 ? A : -A;
      } else if (waveType === "Triangle") {
        // Triangle wave centered around 0
        const norm = phase / (2 * Math.PI); // 0 to 1
        if (norm < 0.25) {
          ideal = 4 * A * norm;
        } else if (norm < 0.75) {
          ideal = A * (2 - 4 * norm);
        } else {
          ideal = A * (4 * norm - 4);
        }
      } else if (waveType === "Sawtooth") {
        // Sawtooth centered around 0
        const norm = phase / (2 * Math.PI); // 0 to 1
        ideal = A * (2 * norm - 1);
      } else { // Rectified
        ideal = A * Math.abs(Math.sin(omega0 * t / 2));
      }
      
      // Calculate Reconstructed Fourier Approximation
      let approx = 0;
      if (waveType === "Square") {
        // v(t) = 4A/pi * sum_odd( sin(n*w0*t) / n )
        for (let n = 1; n <= N; n += 2) {
          approx += (4 * A / Math.PI) * (Math.sin(n * omega0 * t) / n);
        }
      } else if (waveType === "Triangle") {
        // v(t) = 8A/pi^2 * sum_odd( (-1)^((n-1)/2) * sin(n*w0*t) / n^2 )
        for (let n = 1; n <= N; n += 2) {
          const sign = Math.pow(-1, (n - 1) / 2);
          approx += (8 * A / (Math.PI * Math.PI)) * sign * (Math.sin(n * omega0 * t) / (n * n));
        }
      } else if (waveType === "Sawtooth") {
        // v(t) = 2A/pi * sum_all( (-1)^(n+1) * sin(n*w0*t) / n )
        for (let n = 1; n <= N; n++) {
          const sign = Math.pow(-1, n + 1);
          approx += (2 * A / Math.PI) * sign * (Math.sin(n * omega0 * t) / n);
        }
      } else { // Rectified
        // v(t) = 2A/pi - 4A/pi * sum_even( cos(n*w0*t) / (n^2 - 1) )
        // Let's use f0 as the base frequency of the rectified pulse (half original)
        approx = (2 * A) / Math.PI;
        for (let n = 2; n <= N; n += 2) {
          approx -= (4 * A / Math.PI) * (Math.cos(n * (omega0 / 2) * t) / (n * n - 1));
        }
      }
      
      timePoints.push({
        time: parseFloat(t.toFixed(5)),
        "Ideal Waveform": parseFloat(ideal.toFixed(3)),
        "Fourier Reconstructed": parseFloat(approx.toFixed(3))
      });
    }
    setTimeData(timePoints);

    // 2. Frequency-Domain Harmonic Spectrum
    const freqPoints = [];
    if (waveType === "Square") {
      for (let n = 1; n <= Math.max(15, N); n++) {
        const amplitude = n % 2 !== 0 ? (4 * A) / (Math.PI * n) : 0;
        freqPoints.push({
          harmonic: `H${n}`,
          "Amplitude (V)": parseFloat(amplitude.toFixed(3))
        });
      }
    } else if (waveType === "Triangle") {
      for (let n = 1; n <= Math.max(15, N); n++) {
        const amplitude = n % 2 !== 0 ? (8 * A) / (Math.PI * Math.PI * n * n) : 0;
        freqPoints.push({
          harmonic: `H${n}`,
          "Amplitude (V)": parseFloat(amplitude.toFixed(3))
        });
      }
    } else if (waveType === "Sawtooth") {
      for (let n = 1; n <= Math.max(15, N); n++) {
        const amplitude = (2 * A) / (Math.PI * n);
        freqPoints.push({
          harmonic: `H${n}`,
          "Amplitude (V)": parseFloat(amplitude.toFixed(3))
        });
      }
    } else { // Rectified
      // DC component
      freqPoints.push({ harmonic: "DC", "Amplitude (V)": parseFloat(((2 * A) / Math.PI).toFixed(3)) });
      for (let n = 2; n <= Math.max(16, N); n += 2) {
        const amplitude = (4 * A) / (Math.PI * (n * n - 1));
        freqPoints.push({
          harmonic: `H${n}`,
          "Amplitude (V)": parseFloat(amplitude.toFixed(3))
        });
      }
    }
    setFreqData(freqPoints);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: SIGNAL SETTINGS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Activity className="h-5 w-5 text-indigo-500" />
            <span>Fourier Signal Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Explore harmonic signal synthesis.</p>
        </div>

        <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {(["Square", "Triangle", "Sawtooth", "Rectified"] as WaveformType[]).map((type) => (
            <button
              key={type}
              onClick={() => setWaveType(type)}
              className={`flex-1 text-center py-2 text-[10px] font-bold transition-all ${
                waveType === type
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-400 mb-1">Fundamental Frequency (f0)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="100"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-12 text-right">{frequency} Hz</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Peak Amplitude (A)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={amplitude}
                onChange={(e) => setAmplitude(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-12 text-right">{amplitude} V</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-400 mb-1">Number of Harmonics (N)</label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="49"
                step="2"
                value={harmonics}
                onChange={(e) => setHarmonics(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <span className="font-mono text-xs w-12 text-right">{harmonics}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Adjust to see Gibbs phenomenon ripple changes.</span>
          </div>

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-xl space-y-2">
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
              <Zap className="h-3.5 w-3.5" />
              <span>Harmonic Series Model</span>
            </h4>
            <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {waveType === "Square" && (
                <span>v(t) = (4A/π) × [sin(ωt) + sin(3ωt)/3 + sin(5ωt)/5 + ...]</span>
              )}
              {waveType === "Triangle" && (
                <span>v(t) = (8A/π²) × [sin(ωt) - sin(3ωt)/9 + sin(5ωt)/25 - ...]</span>
              )}
              {waveType === "Sawtooth" && (
                <span>v(t) = (2A/π) × [sin(ωt) - sin(2ωt)/2 + sin(3ωt)/3 - ...]</span>
              )}
              {waveType === "Rectified" && (
                <span>v(t) = (2A/π) - (4A/π) × [cos(2ωt)/3 + cos(4ωt)/15 + ...]</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: WAVE GRAPHS */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">
              Fourier Waveform Analysis Laboratory
            </h1>
            <p className="text-xs text-slate-400 mt-1">Interactively synthesize periodic wave signals through sinusoidal harmonics superposition.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Time Domain Synthesis Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-[340px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3 flex items-center space-x-1.5">
              <Activity className="h-4 w-4" />
              <span>Time-Domain Synthesized Waveform (V vs t)</span>
            </h3>
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="95%">
                <LineChart data={timeData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Ideal Waveform" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="Fourier Reconstructed" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Frequency Domain Spectrum Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-[340px] flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-3 flex items-center space-x-1.5">
              <BarChart2 className="h-4 w-4" />
              <span>Frequency-Domain Harmonic Spectrum (RMS Amplitude)</span>
            </h3>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="95%">
                <BarChart data={freqData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="harmonic" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ fontSize: 11, background: "#0f172a", color: "#fff" }} />
                  <Bar dataKey="Amplitude (V)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Fourier Theorem explanation block */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <h3 className="font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <HelpCircle className="h-4 w-4 text-blue-500" />
            <span>Fourier's Theorem in Electrical Engineering</span>
          </h3>
          <p>
            Fourier analysis states that any periodic waveform can be decomposed into an infinite sum of simple sine and cosine waves. 
            The fundamental frequency ($f_0$) determines the period of the wave, while the higher-frequency terms (harmonics at integer multiples like $2f_0$, $3f_0$, $5f_0$) provide the sharp transitions and details.
          </p>
          <p>
            When synthesizing sharp waveforms like a Square wave with a finite number of harmonics, high-frequency ripples appear at the step boundaries. 
            This mathematical behavior is known as the **Gibbs Phenomenon**. As the number of harmonics ($N$) approaches infinity, the overshoot amplitude remains constant at approximately $8.95\%$, but the ripples compress closer to the transition point.
          </p>
        </div>

      </div>

    </div>
  );
}
