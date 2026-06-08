"use client";

import React, { useState } from "react";
import { Cpu, Activity, RefreshCw, BarChart2, Zap, Settings, HelpCircle } from "lucide-react";

type SubModule = "filter" | "dac" | "adc";

export default function AnalogDigitalLab() {
  const [subModule, setSubModule] = useState<SubModule>("filter");
  const [isLoading, setIsLoading] = useState(false);

  // Active Filter Designer states
  const [filterType, setFilterType] = useState("lowpass");
  const [filterOrder, setFilterOrder] = useState("2");
  const [cutoffFreq, setCutoffFreq] = useState("1000"); // Hz
  const [capacitorVal, setCapacitorVal] = useState("0.1"); // uF
  const [calculatedRes, setCalculatedRes] = useState<any | null>(null);

  // R-2R DAC states (4-bit: D3, D2, D1, D0)
  const [dacBits, setDacBits] = useState<[boolean, boolean, boolean, boolean]>([true, false, true, false]); // 1010
  const dacVref = 5.0; // V

  // Flash ADC states
  const [adcVin, setAdcVin] = useState("3.2"); // V
  const adcVref = 5.0; // V

  // Calculate Filter values
  const designFilter = () => {
    setIsLoading(true);
    setTimeout(() => {
      const fc = parseFloat(cutoffFreq);
      const C = parseFloat(capacitorVal) * 1e-6; // convert uF to Farads
      
      // Equal components design: R = 1 / (2 * pi * fc * C)
      const R = 1.0 / (2.0 * Math.PI * fc * C);
      
      // Opamp gain resistors for 2nd order Butterworth (Av = 1.586 => Rf = 0.586 * Ri)
      const Ri = 10000; // 10k standard
      const Rf = 5860;  // 5.86k

      setCalculatedRes({
        R: R.toFixed(1),
        Ri: Ri.toFixed(1),
        Rf: Rf.toFixed(1),
        gain: 1.586
      });
      setIsLoading(false);
    }, 400);
  };

  // 1. Calculate DAC output voltage
  const calculateDacVoltage = () => {
    // Vout = Vref * (D3/2 + D2/4 + D1/8 + D0/16)
    const [d3, d2, d1, d0] = dacBits;
    const fraction = (d3 ? 8 : 0) + (d2 ? 4 : 0) + (d1 ? 2 : 0) + (d0 ? 1 : 0);
    const vout = dacVref * (fraction / 16.0);
    
    // Node voltages inside the R-2R ladder network
    // Simple node voltage approximations for display
    const vNodes = [
      (d0 ? dacVref : 0) * 0.33,
      (d1 ? dacVref : 0) * 0.5 + (d0 ? dacVref : 0) * 0.16,
      (d2 ? dacVref : 0) * 0.5 + (d1 ? dacVref : 0) * 0.25,
      vout
    ];

    return {
      vout: parseFloat(vout.toFixed(3)),
      vNodes: vNodes.map(v => parseFloat(v.toFixed(2)))
    };
  };

  // 2. Calculate Flash ADC Comparator states
  const calculateAdcStates = () => {
    const vin = parseFloat(adcVin);
    const steps = 7;
    const comparators = [];
    
    for (let k = steps; k >= 1; k--) {
      // Tap voltage: Vref * (k / 8)
      const vtap = adcVref * (k / 8.0);
      const isActive = vin >= vtap;
      comparators.push({
        id: k,
        v_tap: parseFloat(vtap.toFixed(3)),
        isActive
      });
    }

    // Encoder logic (Binary representation)
    const fraction = Math.floor((vin / adcVref) * 8.0);
    const clampedFraction = Math.max(0, Math.min(7, fraction));
    const binaryStr = clampedFraction.toString(2).padStart(3, "0");

    return {
      comparators,
      binaryStr,
      fraction: clampedFraction
    };
  };

  const dacOutputs = calculateDacVoltage();
  const adcOutputs = calculateAdcStates();

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT SIDEBAR: CONFIGURATORS */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Cpu className="h-5 w-5 text-indigo-500" />
            <span>Analog & Digital Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Design active filters & converters.</p>
        </div>

        {/* Tab switcher */}
        <div className="space-y-1">
          {[
            { id: "filter", label: "Active Filter Designer" },
            { id: "dac", label: "R-2R Ladder DAC" },
            { id: "adc", label: "3-Bit Flash ADC" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSubModule(tab.id as SubModule);
                setCalculatedRes(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-all ${
                subModule === tab.id
                  ? "bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 border-l-4 border-indigo-500"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Inputs */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          
          {subModule === "filter" && (
            <>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Filter Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="lowpass">Butterworth Low-Pass</option>
                  <option value="highpass">Butterworth High-Pass</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Order</label>
                <select value={filterOrder} onChange={e => setFilterOrder(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <option value="1">1st Order (20 dB/dec)</option>
                  <option value="2">2nd Order (40 dB/dec - Sallen-Key)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Cutoff Frequency (Hz)</label>
                <input type="number" value={cutoffFreq} onChange={e => setCutoffFreq(e.target.value)} className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Capacitance C (μF)</label>
                <input type="number" value={capacitorVal} onChange={e => setCapacitorVal(e.target.value)} step="0.01" className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono" />
              </div>

              <button
                onClick={designFilter}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                <span>Calculate Component Values</span>
              </button>
            </>
          )}

          {subModule === "dac" && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Input Bits (D3-D0)</label>
              <div className="grid grid-cols-4 gap-2">
                {dacBits.map((bit, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const newBits = [...dacBits] as [boolean, boolean, boolean, boolean];
                      newBits[idx] = !newBits[idx];
                      setDacBits(newBits);
                    }}
                    className={`py-2 text-center rounded-lg text-xs font-bold font-mono transition-all ${
                      bit 
                        ? "bg-emerald-600 text-white shadow-sm border border-emerald-500" 
                        : "bg-slate-100 text-slate-500 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    D{3 - idx}
                    <div className="text-[10px]">{bit ? "1" : "0"}</div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 leading-relaxed pt-2">
                *Click inputs to toggle values from 0V (LO) to 5V (HI). Watch output level shift.
              </div>
            </div>
          )}

          {subModule === "adc" && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Analog Input Voltage Vin (V)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="5.0"
                    step="0.1"
                    value={adcVin}
                    onChange={e => setAdcVin(e.target.value)}
                    className="w-full accent-indigo-500"
                  />
                  <span className="font-mono text-xs w-12 text-right">{adcVin} V</span>
                </div>
              </div>
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 rounded-xl">
                <div className="text-[10px] font-bold text-indigo-500 uppercase mb-0.5">Reference Voltage (Vref)</div>
                <div className="text-base font-bold font-mono">{adcVref.toFixed(1)} V</div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. MAIN WORKSPACE: GRAPHIC & MATH SCHEMATICS */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">
              {subModule === "filter" ? "Active Filter Component Workspace" : subModule === "dac" ? "4-Bit R-2R Resistor Ladder DAC" : "3-Bit Parallel Flash ADC"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">Steady-state parameters, voltage scaling, and binary encoding logic.</p>
          </div>
        </div>

        {/* --- 2.1 ACTIVE FILTER DESIGNER WORKSPACE --- */}
        {subModule === "filter" && (
          <div className="space-y-6">
            {calculatedRes ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Series Resistors R1 & R2</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">{parseFloat(calculatedRes.R).toLocaleString()} Ω</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Feedback Resistor Rf</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">{parseFloat(calculatedRes.Rf).toLocaleString()} Ω</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Op-Amp Gain</div>
                  <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">{calculatedRes.gain}</div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                Configure Cutoff parameters and click "Calculate Component Values" to design the active filter.
              </div>
            )}

            {/* Filter Sallen-key SVG schematic placeholder */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[200px]">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Active Filter Circuit Layout</span>
              
              <svg width="280" height="130" viewBox="0 0 280 130" className="text-slate-400 dark:text-slate-500">
                {/* Inputs */}
                <line x1="10" y1="65" x2="40" y2="65" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="65" r="3" fill="currentColor" />
                <text x="10" y="55" fontSize="7" className="font-mono fill-slate-400 font-bold">Vin</text>

                {/* Resistor R1 */}
                <rect x="40" y="59" width="30" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <text x="55" y="77" textAnchor="middle" fontSize="6" className="font-mono fill-slate-400">R1</text>

                {/* Resistor R2 */}
                <line x1="70" y1="65" x2="95" y2="65" stroke="currentColor" strokeWidth="1.5" />
                <rect x="95" y="59" width="30" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <text x="110" y="77" textAnchor="middle" fontSize="6" className="font-mono fill-slate-400">R2</text>

                <line x1="125" y1="65" x2="160" y2="65" stroke="currentColor" strokeWidth="1.5" />

                {/* Opamp */}
                <polygon points="160,45 160,85 200,65" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <text x="166" y="55" fontSize="7" className="font-bold fill-slate-400">-</text>
                <text x="166" y="78" fontSize="7" className="font-bold fill-slate-400">+</text>

                {/* Output */}
                <line x1="200" y1="65" x2="240" y2="65" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="240" cy="65" r="3" fill="currentColor" />
                <text x="248" y="68" fontSize="7" className="font-mono fill-slate-400 font-bold">Vout</text>

                {/* Shunt capacitor C2 */}
                <line x1="82" y1="65" x2="82" y2="90" stroke="currentColor" strokeWidth="1.5" />
                <line x1="74" y1="90" x2="90" y2="90" stroke="currentColor" strokeWidth="2.5" />
                <line x1="74" y1="96" x2="90" y2="96" stroke="currentColor" strokeWidth="2.5" />
                <line x1="82" y1="96" x2="82" y2="110" stroke="currentColor" strokeWidth="1.5" />
                <line x1="76" y1="110" x2="88" y2="110" stroke="currentColor" strokeWidth="1.5" />
                <line x1="79" y1="114" x2="85" y2="114" stroke="currentColor" strokeWidth="1.5" />
                <text x="96" y="100" fontSize="6" className="font-mono fill-slate-400">C2</text>
              </svg>
            </div>
          </div>
        )}

        {/* --- 2.2 R-2R DAC WORKSPACE --- */}
        {subModule === "dac" && (
          <div className="space-y-6">
            
            {/* Visual stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Input Binary Code</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {dacBits.map(b => b ? "1" : "0").join("")} (B)
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Analog Output Voltage Vout</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">{dacOutputs.vout} V</div>
              </div>
            </div>

            {/* R-2R ladder schematic */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[260px]">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-4">4-Bit R-2R Ladder Network</span>

              <div className="w-full flex justify-between items-center px-4 font-mono text-xs border-b pb-3 border-slate-100 dark:border-slate-800 text-slate-400">
                <span>D0 (LSB) Node: {dacOutputs.vNodes[0]}V</span>
                <span>D1 Node: {dacOutputs.vNodes[1]}V</span>
                <span>D2 Node: {dacOutputs.vNodes[2]}V</span>
                <span>D3 (MSB) Node: {dacOutputs.vNodes[3]}V</span>
              </div>

              {/* Progress bar illustrating level */}
              <div className="w-full max-w-md mt-6 space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Analog Output Level</span>
                  <span>{((dacOutputs.vout / dacVref) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(dacOutputs.vout / dacVref) * 100}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- 2.3 FLASH ADC WORKSPACE --- */}
        {subModule === "adc" && (
          <div className="space-y-6">
            
            {/* Visual stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Input Voltage Vin</div>
                <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">{parseFloat(adcVin).toFixed(2)} V</div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border rounded-2xl border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Binary Output Code (3-Bit)</div>
                <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {adcOutputs.binaryStr} (Decimal: {adcOutputs.fraction})
                </div>
              </div>
            </div>

            {/* Comparators array */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-3">Comparator Array Taps</h3>
              
              <div className="space-y-2">
                {adcOutputs.comparators.map((comp) => (
                  <div key={comp.id} className="flex justify-between items-center text-xs font-mono py-1.5 px-3 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950">
                    <span className="text-slate-400 font-bold">Comparator C{comp.id}</span>
                    <span className="text-slate-500">Tap Voltage: {comp.v_tap}V</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      comp.isActive 
                        ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-500/30" 
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                    }`}>
                      {comp.isActive ? "HI (Vin > Vtap)" : "LO (Vin < Vtap)"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
