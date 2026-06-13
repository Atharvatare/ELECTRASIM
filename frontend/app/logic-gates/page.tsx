"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Plus, Trash2, HelpCircle, Activity, Play } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface LogicGate {
  id: string;
  type: "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR";
  input1_source: string; // "A", "B", "C" or another Gate ID (e.g., "G1")
  input2_source: string; // not used for NOT
  label: string;
}

export default function LogicGatesLab() {
  // Input switches states
  const [switchA, setSwitchA] = useState<boolean>(false);
  const [switchB, setSwitchB] = useState<boolean>(true);
  const [switchC, setSwitchC] = useState<boolean>(false);

  // Gates List
  const [gates, setGates] = useState<LogicGate[]>([
    { id: "G1", type: "AND", input1_source: "A", input2_source: "B", label: "Gate 1 (AND)" },
    { id: "G2", type: "OR", input1_source: "G1", input2_source: "C", label: "Gate 2 (OR)" }
  ]);

  // Solved outputs state: maps source name ("A", "G1" etc) to boolean
  const [logicStates, setLogicStates] = useState<Record<string, boolean>>({});
  const [truthTable, setTruthTable] = useState<any[]>([]);
  const [timingData, setTimingData] = useState<any[]>([]);

  // Simulation execution cycle
  useEffect(() => {
    // 1. Solve active circuit states
    const states = solveLogicCircuit(switchA, switchB, switchC, gates);
    setLogicStates(states);

    // 2. Generate Truth Table for all combinations of A, B, C
    const table: any[] = [];
    const combinations = [
      [false, false, false],
      [false, false, true],
      [false, true, false],
      [false, true, true],
      [true, false, false],
      [true, false, true],
      [true, true, false],
      [true, true, true]
    ];

    combinations.forEach(([a, b, c]) => {
      const rowStates = solveLogicCircuit(a, b, c, gates);
      const rowData: Record<string, any> = {
        A: a ? 1 : 0,
        B: b ? 1 : 0,
        C: c ? 1 : 0
      };
      // add gate outputs to rowData
      gates.forEach((g) => {
        rowData[g.id] = rowStates[g.id] ? 1 : 0;
      });
      table.push(rowData);
    });
    setTruthTable(table);
  }, [switchA, switchB, switchC, gates]);

  // Generate continuous timing diagram data (toggles inputs periodically)
  useEffect(() => {
    const data: any[] = [];
    // 20 time steps
    for (let t = 0; t < 20; t++) {
      // Create arbitrary input switching sequences
      const a = t >= 5 && t < 15; // A is high between 5 and 15
      const b = (t % 8) < 4;       // B toggles every 4 steps
      const c = (t % 4) < 2;       // C toggles every 2 steps

      const states = solveLogicCircuit(a, b, c, gates);
      const dataPoint: Record<string, any> = {
        time: t,
        "Switch A": a ? 1 : 0,
        "Switch B": b ? 1 : 0,
        "Switch C": c ? 1 : 0
      };
      
      // Save all gate outputs
      gates.forEach((g) => {
        dataPoint[g.label] = states[g.id] ? 1 : 0;
      });

      data.push(dataPoint);
    }
    setTimingData(data);
  }, [gates]);

  // Solver algorithm
  const solveLogicCircuit = (a: boolean, b: boolean, c: boolean, gatesList: LogicGate[]) => {
    const states: Record<string, boolean> = {
      A: a,
      B: b,
      C: c
    };

    // To handle dependencies correctly, we run multiple evaluation passes
    // (maximum 5 passes to resolve propagation through series gates)
    for (let pass = 0; pass < 5; pass++) {
      gatesList.forEach((gate) => {
        const in1 = !!states[gate.input1_source];
        const in2 = !!states[gate.input2_source];

        let out = false;
        if (gate.type === "AND") {
          out = in1 && in2;
        } else if (gate.type === "OR") {
          out = in1 || in2;
        } else if (gate.type === "NOT") {
          out = !in1;
        } else if (gate.type === "NAND") {
          out = !(in1 && in2);
        } else if (gate.type === "NOR") {
          out = !(in1 || in2);
        } else if (gate.type === "XOR") {
          out = in1 !== in2;
        }

        states[gate.id] = out;
      });
    }

    return states;
  };

  // Logic Gates management
  const addGate = (type: LogicGate["type"]) => {
    const nextNum = gates.length + 1;
    const nextId = `G${nextNum}`;
    const newGate: LogicGate = {
      id: nextId,
      type,
      input1_source: "A",
      input2_source: "B",
      label: `Gate ${nextNum} (${type})`
    };
    setGates([...gates, newGate]);
  };

  const removeGate = (id: string) => {
    setGates(gates.filter((g) => g.id !== id));
  };

  const updateGateSource = (id: string, field: "input1_source" | "input2_source", source: string) => {
    setGates(gates.map((g) => (g.id === id ? { ...g, [field]: source } : g)));
  };

  const availableSources = ["A", "B", "C", ...gates.map((g) => g.id)];

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT TOOLBOX & CIRCUIT BUILDER */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4 shrink-0 overflow-y-auto">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Cpu className="h-5 w-5 text-indigo-500 animate-pulse" />
            <span>Logic Gates Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Design and verify digital combinational logic systems.</p>
        </div>

        {/* Input Switch controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl border-slate-200 dark:border-slate-850 space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Input Switches</h3>
          
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Switch A:</span>
            <button
              onClick={() => setSwitchA(!switchA)}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${switchA ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
            >
              {switchA ? "HIGH (1)" : "LOW (0)"}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Switch B:</span>
            <button
              onClick={() => setSwitchB(!switchB)}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${switchB ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
            >
              {switchB ? "HIGH (1)" : "LOW (0)"}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">Switch C:</span>
            <button
              onClick={() => setSwitchC(!switchC)}
              className={`px-3 py-1 rounded-lg font-bold text-xs ${switchC ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}
            >
              {switchC ? "HIGH (1)" : "LOW (0)"}
            </button>
          </div>
        </div>

        {/* Gate Adder buttons */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Add Logic Gate</label>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            {["AND", "OR", "NOT", "NAND", "NOR", "XOR"].map((type) => (
              <button
                key={type}
                onClick={() => addGate(type as LogicGate["type"])}
                className="py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-sm transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Active Gates Editor */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gates Configuration</label>
          {gates.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-250 dark:border-slate-800 text-slate-400 rounded-xl text-xs">
              No gates in workbench.
            </div>
          ) : (
            gates.map((gate) => (
              <div
                key={gate.id}
                className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-400 text-[10px] font-mono">{gate.id}: {gate.type} Gate</span>
                  <button
                    onClick={() => removeGate(gate.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Input 1 Source:</span>
                    <select
                      value={gate.input1_source}
                      onChange={(e) => updateGateSource(gate.id, "input1_source", e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono"
                    >
                      {availableSources
                        .filter((src) => src !== gate.id) // Avoid direct self feedback
                        .map((src) => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                    </select>
                  </div>

                  {gate.type !== "NOT" && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Input 2 Source:</span>
                      <select
                        value={gate.input2_source}
                        onChange={(e) => updateGateSource(gate.id, "input2_source", e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono"
                      >
                        {availableSources
                          .filter((src) => src !== gate.id)
                          .map((src) => (
                            <option key={src} value={src}>{src}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Local resolved state output */}
                <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-slate-800/40 pt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Output State:</span>
                  <span className={`font-mono font-bold ${logicStates[gate.id] ? "text-emerald-400" : "text-slate-650"}`}>
                    {logicStates[gate.id] ? "1 (HIGH)" : "0 (LOW)"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. MIDDLE TIMING CHART & TRUTH TABLES */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="border-b pb-4 border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-bold text-slate-950 dark:text-white">Digital Timing Diagram</h1>
          <p className="text-xs text-slate-400 mt-1">Visual logic transition diagrams over simulated clock cycles.</p>
        </div>

        {/* Timing Diagram Charts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 h-64 shrink-0 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
              <XAxis dataKey="time" label={{ value: "Clock Ticks", position: "insideBottom", offset: -5 }} stroke="#64748b" fontSize={10} />
              <YAxis domain={[-0.2, 1.2]} ticks={[0, 1]} stroke="#64748b" fontSize={10} />
              <Line type="stepAfter" dataKey="Switch A" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              <Line type="stepAfter" dataKey="Switch B" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
              {gates.length > 0 && (
                <Line type="stepAfter" dataKey={gates[gates.length - 1].label} stroke="#10b981" strokeWidth={3} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 text-[10px] font-bold mt-2">
            <span className="text-blue-500">── Switch A</span>
            <span className="text-purple-500">── Switch B</span>
            {gates.length > 0 && <span className="text-emerald-500">── Final Output ({gates[gates.length - 1].id})</span>}
          </div>
        </div>

        {/* Dynamic Truth Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col min-h-[250px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Logic Truth Table</h3>
          
          <div className="flex-1 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-bold text-slate-450 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2 text-center font-mono">A</th>
                  <th className="px-4 py-2 text-center font-mono">B</th>
                  <th className="px-4 py-2 text-center font-mono">C</th>
                  {gates.map((g) => (
                    <th key={g.id} className="px-4 py-2 text-center font-mono text-blue-600 dark:text-blue-400">
                      {g.id} ({g.type})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/40 font-mono">
                {truthTable.map((row, idx) => {
                  // highlight row matching current switch values
                  const isCurrent = 
                    (row.A === (switchA ? 1 : 0)) && 
                    (row.B === (switchB ? 1 : 0)) && 
                    (row.C === (switchC ? 1 : 0));

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors ${isCurrent ? "bg-blue-50/50 dark:bg-blue-950/20 font-bold" : ""}`}
                    >
                      <td className="px-4 py-2 text-center">{row.A}</td>
                      <td className="px-4 py-2 text-center">{row.B}</td>
                      <td className="px-4 py-2 text-center">{row.C}</td>
                      {gates.map((g) => (
                        <td key={g.id} className={`px-4 py-2 text-center ${row[g.id] ? "text-emerald-500" : "text-slate-500"}`}>
                          {row[g.id]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
