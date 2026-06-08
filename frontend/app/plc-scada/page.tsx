"use client";

import React, { useState, useEffect } from "react";
import { Play, Square, Eye, HelpCircle, Activity, Zap, Plus, Trash2, Edit3, Sparkles } from "lucide-react";

interface Contact {
  name: string;
  type: "NO" | "NC"; // Normally Open or Normally Closed
}

interface Rung {
  id: number;
  label: string;
  contacts: Contact[];
  hasLatch: boolean;
  latchName: string;
  output: {
    name: string;
    type: "COIL" | "TON"; // Standard Output Coil or Timer On-Delay
    preset: number;      // Preset time in seconds
  };
}

export default function PLCSCADASimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const [tankLevel, setTankLevel] = useState(10); // 10% initially
  const [activePreset, setActivePreset] = useState("auto_fill");
  const [showHelp, setShowHelp] = useState(false);

  // PLC Variables Memory Map (Inputs, Outputs, Timers)
  const [ioStates, setIoStates] = useState<Record<string, boolean>>({
    Start_PB: false,      // Input Push Button (Momentary NO)
    Stop_PB: true,        // Input Push Button (Momentary NC - standard fail-safe)
    Low_Level_Sensor: false,  // NO contact closes when level > 15%
    High_Level_Sensor: false, // NO contact closes when level >= 90%
    Fill_Valve: false,    // Output Coil
    Drain_Valve: false,   // Output Coil
    Alarm_Light: false,   // Output Coil
    T1_DN: false,          // Timer 1 Done bit
    T2_DN: false           // Timer 2 Done bit
  });

  // TON timer storage: name -> { preset: 5, current: 0 }
  const [timerValues, setTimerValues] = useState<Record<string, { preset: number; current: number }>>({
    T1: { preset: 5, current: 0 },
    T2: { preset: 5, current: 0 }
  });

  // Default Rungs: Auto Fill & Drain Cycle
  const [rungs, setRungs] = useState<Rung[]>([
    {
      id: 1,
      label: "Rung 0: Fill Valve Control with Latch & High Cutoff",
      contacts: [
        { name: "Start_PB", type: "NO" },
        { name: "Stop_PB", type: "NO" }, // Stop PB conducts when not pressed
        { name: "High_Level_Sensor", type: "NC" }
      ],
      hasLatch: true,
      latchName: "Fill_Valve",
      output: { name: "Fill_Valve", type: "COIL", preset: 0 }
    },
    {
      id: 2,
      label: "Rung 1: Automatic Drain Valve Control at High Limit",
      contacts: [
        { name: "High_Level_Sensor", type: "NO" },
        { name: "Low_Level_Sensor", type: "NO" } // Keep draining until we drop below low sensor
      ],
      hasLatch: true,
      latchName: "Drain_Valve",
      output: { name: "Drain_Valve", type: "COIL", preset: 0 }
    },
    {
      id: 3,
      label: "Rung 2: High Level Indicator Alarm",
      contacts: [
        { name: "High_Level_Sensor", type: "NO" }
      ],
      hasLatch: false,
      latchName: "",
      output: { name: "Alarm_Light", type: "COIL", preset: 0 }
    }
  ]);

  // Load Presets
  const loadPreset = (presetName: string) => {
    setActivePreset(presetName);
    setIoStates({
      Start_PB: false,
      Stop_PB: true,
      Low_Level_Sensor: false,
      High_Level_Sensor: false,
      Fill_Valve: false,
      Drain_Valve: false,
      Alarm_Light: false,
      T1_DN: false,
      T2_DN: false
    });
    setTankLevel(10);
    setTimerValues({
      T1: { preset: 5, current: 0 },
      T2: { preset: 5, current: 0 }
    });

    if (presetName === "auto_fill") {
      setRungs([
        {
          id: 1,
          label: "Rung 0: Fill Valve Control with Latch & High Cutoff",
          contacts: [
            { name: "Start_PB", type: "NO" },
            { name: "Stop_PB", type: "NO" },
            { name: "High_Level_Sensor", type: "NC" }
          ],
          hasLatch: true,
          latchName: "Fill_Valve",
          output: { name: "Fill_Valve", type: "COIL", preset: 0 }
        },
        {
          id: 2,
          label: "Rung 1: Automatic Drain Valve Control at High Limit",
          contacts: [
            { name: "High_Level_Sensor", type: "NO" },
            { name: "Low_Level_Sensor", type: "NO" }
          ],
          hasLatch: true,
          latchName: "Drain_Valve",
          output: { name: "Drain_Valve", type: "COIL", preset: 0 }
        }
      ]);
    } else { // timer batch delay
      setRungs([
        {
          id: 1,
          label: "Rung 0: Start Filling Until High Sensor Reached",
          contacts: [
            { name: "Start_PB", type: "NO" },
            { name: "High_Level_Sensor", type: "NC" }
          ],
          hasLatch: true,
          latchName: "Fill_Valve",
          output: { name: "Fill_Valve", type: "COIL", preset: 0 }
        },
        {
          id: 2,
          label: "Rung 1: Trigger 5-Second Holding/Mixing Delay Timer",
          contacts: [
            { name: "High_Level_Sensor", type: "NO" },
            { name: "T1_DN", type: "NC" } // Reset timer once done to allow repeat
          ],
          hasLatch: false,
          latchName: "",
          output: { name: "T1", type: "TON", preset: 5 }
        },
        {
          id: 3,
          label: "Rung 2: Open Drain Valve Once Delay Timer Completes",
          contacts: [
            { name: "T1_DN", type: "NO" },
            { name: "Low_Level_Sensor", type: "NO" }
          ],
          hasLatch: true,
          latchName: "Drain_Valve",
          output: { name: "Drain_Valve", type: "COIL", preset: 0 }
        }
      ]);
    }
  };

  // Main PLC Execution Cycle (Evaluates custom rungs dynamically)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 1. Sync physical inputs based on water tank levels
      const nextIo = { ...ioStates };
      nextIo.Low_Level_Sensor = tankLevel > 15;
      nextIo.High_Level_Sensor = tankLevel >= 90;

      // Temporary local copy of timer values to mutate during evaluation
      const nextTimers = { ...timerValues };

      // 2. Evaluate Ladder Logic Rungs Sequentially
      rungs.forEach((rung) => {
        let conducts = true;

        if (rung.contacts.length === 0) {
          conducts = true;
        } else {
          // Evaluate first contact block with optional parallel latching
          const firstContact = rung.contacts[0];
          let firstBlockConducts = false;

          const evaluateContactValue = (c: Contact) => {
            if (c.name.endsWith("_DN")) {
              const timerName = c.name.split("_")[0];
              const t = nextTimers[timerName];
              const isDone = t ? t.current >= t.preset : false;
              return c.type === "NO" ? isDone : !isDone;
            } else {
              const val = !!nextIo[c.name];
              return c.type === "NO" ? val : !val;
            }
          };

          firstBlockConducts = evaluateContactValue(firstContact);

          if (rung.hasLatch && rung.latchName) {
            const latchVal = !!nextIo[rung.latchName];
            firstBlockConducts = firstBlockConducts || latchVal;
          }

          conducts = firstBlockConducts;

          // Evaluate subsequent contacts in series (AND logic)
          for (let i = 1; i < rung.contacts.length; i++) {
            conducts = conducts && evaluateContactValue(rung.contacts[i]);
          }
        }

        // Apply Rung Output
        const out = rung.output;
        if (out.type === "COIL") {
          nextIo[out.name] = conducts;
        } else if (out.type === "TON") {
          const tName = out.name;
          const tVal = nextTimers[tName] || { preset: out.preset, current: 0 };
          
          // Update preset value in timer state if user edited it
          tVal.preset = out.preset;

          if (conducts) {
            if (tVal.current < tVal.preset) {
              tVal.current = parseFloat((tVal.current + 0.1).toFixed(1));
            }
          } else {
            tVal.current = 0.0; // Reset timer on continuity loss
          }
          nextTimers[tName] = tVal;
          nextIo[`${tName}_DN`] = tVal.current >= tVal.preset;
        }
      });

      // 3. Process Physics Integration (Level rate simulation)
      let nextLevel = tankLevel;
      if (nextIo.Fill_Valve && !nextIo.Drain_Valve) {
        nextLevel = Math.min(100, tankLevel + 2.0); // Fill
      } else if (nextIo.Drain_Valve && !nextIo.Fill_Valve) {
        nextLevel = Math.max(0, tankLevel - 3.0); // Drain (faster)
      } else if (nextIo.Fill_Valve && nextIo.Drain_Valve) {
        nextLevel = Math.max(0, tankLevel - 1.0); // Net drain
      }

      setTankLevel(nextLevel);
      setIoStates(nextIo);
      setTimerValues(nextTimers);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, tankLevel, ioStates, rungs, timerValues]);

  // Momentary Push Button Handler
  const pressButton = (btnName: string, state: boolean) => {
    setIoStates((prev) => ({ ...prev, [btnName]: state }));
  };

  // Editable Ladder actions
  const addRung = () => {
    const nextId = rungs.length > 0 ? Math.max(...rungs.map((r) => r.id)) + 1 : 1;
    const newRung: Rung = {
      id: nextId,
      label: `Rung ${nextId - 1}: Custom User Program Description`,
      contacts: [{ name: "Start_PB", type: "NO" }],
      hasLatch: false,
      latchName: "Fill_Valve",
      output: { name: "Alarm_Light", type: "COIL", preset: 0 }
    };
    setRungs([...rungs, newRung]);
  };

  const deleteRung = (id: number) => {
    setRungs(rungs.filter((r) => r.id !== id));
  };

  const updateRungLabel = (id: number, label: string) => {
    setRungs(rungs.map((r) => (r.id === id ? { ...r, label } : r)));
  };

  const updateRungLatch = (id: number, hasLatch: boolean, latchName: string) => {
    setRungs(rungs.map((r) => (r.id === id ? { ...r, hasLatch, latchName } : r)));
  };

  const addContact = (rungId: number) => {
    setRungs(
      rungs.map((r) => {
        if (r.id === rungId) {
          return {
            ...r,
            contacts: [...r.contacts, { name: "High_Level_Sensor", type: "NO" }]
          };
        }
        return r;
      })
    );
  };

  const removeContact = (rungId: number, index: number) => {
    setRungs(
      rungs.map((r) => {
        if (r.id === rungId) {
          const nextContacts = [...r.contacts];
          nextContacts.splice(index, 1);
          return { ...r, contacts: nextContacts };
        }
        return r;
      })
    );
  };

  const updateContact = (rungId: number, index: number, updates: Partial<Contact>) => {
    setRungs(
      rungs.map((r) => {
        if (r.id === rungId) {
          const nextContacts = r.contacts.map((c, i) =>
            i === index ? ({ ...c, ...updates } as Contact) : c
          );
          return { ...r, contacts: nextContacts };
        }
        return r;
      })
    );
  };

  const updateOutput = (rungId: number, updates: Partial<Rung["output"]>) => {
    setRungs(
      rungs.map((r) => {
        if (r.id === rungId) {
          return {
            ...r,
            output: { ...r.output, ...updates } as Rung["output"]
          };
        }
        return r;
      })
    );
  };

  // Variable references lists
  const availableInputTags = ["Start_PB", "Stop_PB", "High_Level_Sensor", "Low_Level_Sensor", "T1_DN", "T2_DN"];
  const availableOutputTags = ["Fill_Valve", "Drain_Valve", "Alarm_Light", "T1", "T2"];

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT TOOLBOX & HMI OPERATOR PANEL */}
      <div className="w-full lg:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4 shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
            <Activity className="h-5 w-5 text-amber-500 animate-pulse" />
            <span>PLC & SCADA Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Industrial Ladder Logic builder & real-time tank animation loop.</p>
        </div>

        {/* Preset selections */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
            Choose Scenario Layout
          </label>
          <button
            onClick={() => loadPreset("auto_fill")}
            className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "auto_fill"
                ? "bg-amber-50 text-amber-600 dark:bg-slate-800/80 dark:text-amber-400 border-l-4 border-amber-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
            }`}
          >
            Auto Fill & Drain Cycle
          </button>
          <button
            onClick={() => loadPreset("timer_batch")}
            className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all ${
              activePreset === "timer_batch"
                ? "bg-amber-50 text-amber-600 dark:bg-slate-800/80 dark:text-amber-400 border-l-4 border-amber-500"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
            }`}
          >
            Timer-Delayed Batch Mixer
          </button>
        </div>

        {/* Operator panel simulation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl border-slate-200 dark:border-slate-850 space-y-3 shadow-inner">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HMI Panel</h3>
          
          <div className="flex space-x-2">
            <button
              onMouseDown={() => pressButton("Start_PB", true)}
              onMouseUp={() => pressButton("Start_PB", false)}
              onTouchStart={() => pressButton("Start_PB", true)}
              onTouchEnd={() => pressButton("Start_PB", false)}
              className={`flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95 select-none ${ioStates.Start_PB ? "ring-2 ring-emerald-400" : ""}`}
            >
              Start PB (NO)
            </button>
            <button
              onMouseDown={() => pressButton("Stop_PB", false)} // Pressing opens contacts
              onMouseUp={() => pressButton("Stop_PB", true)}
              onTouchStart={() => pressButton("Stop_PB", false)}
              onTouchEnd={() => pressButton("Stop_PB", true)}
              className={`flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95 select-none ${!ioStates.Stop_PB ? "ring-2 ring-rose-400" : ""}`}
            >
              Stop PB (NC)
            </button>
          </div>
          <p className="text-[9px] text-slate-400 leading-tight">
            *Push & hold buttons to close/open contacts.
          </p>
        </div>

        {/* Run control buttons */}
        <div className="pt-2 flex flex-col space-y-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow transition-all ${
              isRunning 
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10" 
                : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/10"
            }`}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4" />
                <span>Stop PLC Scan</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start PLC Scan</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-750 transition-all"
          >
            {showHelp ? "Hide Instructions" : "Ladder Instructions"}
          </button>
        </div>

        {/* PLC Debug values */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-[10px] space-y-2 font-mono">
          <div className="font-bold text-slate-400 uppercase tracking-wider mb-1">RAM Registers</div>
          {Object.keys(ioStates).map((key) => (
            <div key={key} className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/40 pb-0.5">
              <span className="text-slate-400">{key}:</span>
              <span className={ioStates[key] ? "text-emerald-400 font-bold" : "text-slate-600"}>
                {ioStates[key] ? "TRUE" : "FALSE"}
              </span>
            </div>
          ))}
          {Object.keys(timerValues).map((key) => (
            <div key={key} className="flex justify-between border-b border-slate-200/50 dark:border-slate-800/40 pb-0.5">
              <span className="text-slate-400">{key} (TON):</span>
              <span className="text-blue-400 font-bold">
                {timerValues[key].current.toFixed(1)}s / {timerValues[key].preset}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. MIDDLE LADDER DIAGRAM WORKSPACE (PROGRAMMABLE) */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto min-w-0">
        <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
              <span>Programmable Ladder Workspace</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Add rungs, modify excitation paths, toggle contact states, and build custom logic.
            </p>
          </div>
          <button
            onClick={addRung}
            className="flex items-center space-x-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Logic Rung</span>
          </button>
        </div>

        {/* Instructions banner */}
        {showHelp && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-950 dark:text-white">PLC Logic Builder Guide:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Rungs</strong> are evaluated top-to-bottom. If a path conducts, the output coil energizes.</li>
              <li><strong>Parallel Latch</strong> puts a contact in parallel with the first component (classic OR latch).</li>
              <li><strong>Contacts</strong>: Normally Open (NO) conducts when the tag is TRUE. Normally Closed (NC) conducts when tag is FALSE.</li>
              <li><strong>Timers (TON)</strong>: Accumulate time while input is TRUE. Once elapsed, the corresponding Done tag (e.g. T1_DN) triggers TRUE.</li>
            </ul>
          </div>
        )}

        {/* Programmable rungs list */}
        <div className="space-y-6">
          {rungs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
              No ladder logic compiled. Click "Add Logic Rung" to begin.
            </div>
          ) : (
            rungs.map((rung, rungIndex) => (
              <div
                key={rung.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow relative group"
              >
                {/* Rung metadata & header */}
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold font-mono">
                      RUNG {rungIndex}
                    </span>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={rung.label}
                        onChange={(e) => updateRungLabel(rung.id, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-350 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none text-xs font-bold text-slate-950 dark:text-white py-0.5 px-1 rounded transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Latch toggle */}
                    <div className="flex items-center space-x-1 text-[10px]">
                      <span className="text-slate-400">Parallel Latch:</span>
                      <input
                        type="checkbox"
                        checked={rung.hasLatch}
                        onChange={(e) => updateRungLatch(rung.id, e.target.checked, rung.latchName || "Fill_Valve")}
                        className="rounded border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                    </div>

                    <button
                      onClick={() => deleteRung(rung.id)}
                      className="p-1 rounded text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-colors"
                      title="Delete Rung"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Interactive diagram line */}
                <div className="flex items-stretch min-h-[5rem] w-full relative border-y border-slate-100/50 dark:border-slate-800/40 py-2">
                  {/* Left bus bar */}
                  <div className="w-1.5 bg-slate-400 dark:bg-slate-700 rounded-sm" />

                  {/* Program flow path */}
                  <div className="flex-1 flex items-center relative pl-2">
                    
                    {/* Electrical line line-through background */}
                    <div className="absolute left-0 right-0 h-0.5 bg-slate-300 dark:bg-slate-700/60 -z-10" />

                    {/* Contacts block wrapper */}
                    <div className="flex items-center flex-wrap gap-4 bg-white dark:bg-slate-900 pr-4 z-10 select-none">
                      
                      {/* First Contact with optional Latch */}
                      {rung.contacts.length > 0 && (
                        <div className="flex items-center relative pr-2">
                          
                          {/* Main Contact */}
                          <div className="flex flex-col space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl relative shadow-sm">
                            <div className="flex items-center space-x-1.5">
                              <select
                                value={rung.contacts[0].name}
                                onChange={(e) => updateContact(rung.id, 0, { name: e.target.value })}
                                className="bg-transparent text-[10px] font-bold font-mono focus:outline-none text-slate-700 dark:text-slate-350 pr-4"
                              >
                                {availableInputTags.map((tag) => (
                                  <option key={tag} value={tag} className="dark:bg-slate-900">{tag}</option>
                                ))}
                              </select>
                              
                              <button
                                onClick={() => updateContact(rung.id, 0, { type: rung.contacts[0].type === "NO" ? "NC" : "NO" })}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                  rung.contacts[0].type === "NO"
                                    ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20"
                                }`}
                                title="Toggle Contact Type"
                              >
                                {rung.contacts[0].type === "NO" ? "-[ ]-" : "-[/]-"}
                              </button>
                            </div>
                          </div>

                          {/* Parallel latch block rendering */}
                          {rung.hasLatch && (
                            <div className="absolute left-2 -bottom-10 bg-white dark:bg-slate-900 border-l border-b border-slate-300 dark:border-slate-700 pt-1.5 pl-3.5 pb-1 pr-1.5 rounded-bl-xl z-20 flex items-center space-x-1.5">
                              <span className="text-[7px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Latch:</span>
                              <select
                                value={rung.latchName}
                                onChange={(e) => updateRungLatch(rung.id, rung.hasLatch, e.target.value)}
                                className="bg-transparent text-[9px] font-mono font-bold focus:outline-none text-slate-600 dark:text-slate-450"
                              >
                                {availableOutputTags.map((tag) => (
                                  <option key={tag} value={tag} className="dark:bg-slate-900">{tag}</option>
                                ))}
                              </select>
                            </div>
                          )}

                        </div>
                      )}

                      {/* Subsequent contacts in series */}
                      {rung.contacts.slice(1).map((contact, idx) => {
                        const actualIndex = idx + 1;
                        return (
                          <div key={actualIndex} className="flex items-center space-x-1 relative group/contact bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
                            <select
                              value={contact.name}
                              onChange={(e) => updateContact(rung.id, actualIndex, { name: e.target.value })}
                              className="bg-transparent text-[10px] font-mono font-bold focus:outline-none text-slate-700 dark:text-slate-350 pr-4"
                            >
                              {availableInputTags.map((tag) => (
                                <option key={tag} value={tag} className="dark:bg-slate-900">{tag}</option>
                              ))}
                            </select>
                            
                            <button
                              onClick={() => updateContact(rung.id, actualIndex, { type: contact.type === "NO" ? "NC" : "NO" })}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                contact.type === "NO"
                                  ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {contact.type === "NO" ? "-[ ]-" : "-[/]-"}
                            </button>

                            <button
                              onClick={() => removeContact(rung.id, actualIndex)}
                              className="p-0.5 text-slate-400 hover:text-rose-500 rounded opacity-0 group-hover/contact:opacity-100 transition-opacity ml-1"
                              title="Delete Contact"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add contact button */}
                      <button
                        onClick={() => addContact(rung.id)}
                        className="py-1 px-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:border-slate-450 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center space-x-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-semibold">Contact</span>
                      </button>

                    </div>

                    {/* Spacer push to output coil */}
                    <div className="flex-1 min-w-[20px]" />

                    {/* Output device card */}
                    <div className="z-10 bg-white dark:bg-slate-900 pl-4 flex items-center space-x-3">
                      
                      {/* TON parameters settings */}
                      {rung.output.type === "TON" && (
                        <div className="flex flex-col space-y-0.5 text-[9px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 font-mono shadow-sm shrink-0">
                          <label className="text-slate-400">Preset (s):</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={rung.output.preset}
                            onChange={(e) => updateOutput(rung.id, { preset: parseInt(e.target.value) || 5 })}
                            className="w-12 bg-transparent text-slate-900 dark:text-white text-center focus:outline-none font-bold"
                          />
                        </div>
                      )}

                      <div className="flex flex-col space-y-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm select-none">
                        <div className="flex items-center space-x-1.5">
                          {/* Output variable */}
                          <select
                            value={rung.output.name}
                            onChange={(e) => updateOutput(rung.id, { name: e.target.value })}
                            className="bg-transparent text-[10px] font-mono font-bold focus:outline-none text-slate-700 dark:text-slate-350 pr-4"
                          >
                            {availableOutputTags.map((tag) => (
                              <option key={tag} value={tag} className="dark:bg-slate-900">{tag}</option>
                            ))}
                          </select>

                          {/* Output type (Coil vs TON) */}
                          <select
                            value={rung.output.type}
                            onChange={(e) => updateOutput(rung.id, { type: e.target.value as "COIL" | "TON" })}
                            className="bg-transparent text-[10px] font-mono font-bold focus:outline-none text-blue-600 dark:text-blue-450"
                          >
                            <option value="COIL" className="dark:bg-slate-900">-( )-</option>
                            <option value="TON" className="dark:bg-slate-900">[TON]</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right bus bar */}
                  <div className="w-1.5 bg-slate-400 dark:bg-slate-700 rounded-sm" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Informative educational content */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed shadow-sm">
          <h3 className="font-bold text-slate-950 dark:text-white flex items-center space-x-1.5 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Industrial PLC Ladder Logic Execution</span>
          </h3>
          <p>
            An industrial PLC compiles the graphical ladder schematic into sequential logic instructions. During each scan cycle, contact excitations solve for path electrical continuity (from the left rail to the right rail). Parallel branches execute OR operations while series elements perform AND operations. Latching blocks preserve output states even after momentary excitative inputs drop, which is highly critical for motor starters, valves, and latch alarms.
          </p>
        </div>
      </div>

      {/* 3. RIGHT PANEL: SCADA REAL-TIME ANIMATION */}
      <div className="w-full lg:w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4 shrink-0">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b pb-2 flex items-center space-x-1.5">
          <Eye className="h-4.5 w-4.5 text-blue-500" />
          <span>SCADA Tank Animation</span>
        </h3>

        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-inner min-h-[320px]">
          
          <div className="w-full text-center mb-3">
            <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-350">
              Tank Volume: {tankLevel.toFixed(1)}%
            </span>
          </div>

          {/* SVG Industrial Tank */}
          <svg width="180" height="260" viewBox="0 0 180 260" className="text-slate-350">
            {/* Inlet pipe */}
            <path
              d="M 10,25 L 90,25 L 90,40"
              fill="none"
              stroke={ioStates.Fill_Valve ? "#3b82f6" : "#475569"}
              strokeWidth="8"
              strokeDasharray={ioStates.Fill_Valve ? "4 4" : "0"}
              className="transition-colors duration-300"
            />
            
            {/* Outlet pipe */}
            <path
              d="M 90,220 L 90,245 L 170,245"
              fill="none"
              stroke={ioStates.Drain_Valve ? "#2563eb" : "#475569"}
              strokeWidth="8"
              strokeDasharray={ioStates.Drain_Valve ? "4 4" : "0"}
              className="transition-colors duration-300"
            />
            
            {/* Tank Shell */}
            <rect x="40" y="40" width="100" height="180" rx="12" fill="none" stroke="#64748b" strokeWidth="4" />
            
            {/* Water volume fill animation */}
            {tankLevel > 0 && (
              <rect
                x="44"
                y={216 - (1.72 * tankLevel)}
                width="92"
                height={1.72 * tankLevel}
                rx="6"
                className="fill-blue-500/70 dark:fill-blue-500/80 transition-all duration-100"
              />
            )}

            {/* High Level limit sensor */}
            <line x1="38" y1="60" x2="142" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="142" cy="60" r="4.5" fill={ioStates.High_Level_Sensor ? "#10b981" : "#ef4444"} className="transition-colors duration-300" />
            <text x="148" y="62" fontSize="6.5" className="fill-slate-400 font-mono">High Limit (90%)</text>
            
            {/* Low Level limit sensor */}
            <line x1="38" y1="190" x2="142" y2="190" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="142" cy="190" r="4.5" fill={ioStates.Low_Level_Sensor ? "#10b981" : "#ef4444"} className="transition-colors duration-300" />
            <text x="148" y="192" fontSize="6.5" className="fill-slate-400 font-mono">Low Limit (15%)</text>

            {/* Inlet valve state bulb */}
            <circle cx="45" cy="25" r="7.5" fill={ioStates.Fill_Valve ? "#10b981" : "#64748b"} className="transition-colors duration-300" />
            <text x="45" y="14" textAnchor="middle" fontSize="6.5" className="fill-slate-450 font-bold uppercase">Fill Valve</text>

            {/* Outlet valve state bulb */}
            <circle cx="135" cy="245" r="7.5" fill={ioStates.Drain_Valve ? "#10b981" : "#64748b"} className="transition-colors duration-300" />
            <text x="135" y="234" textAnchor="middle" fontSize="6.5" className="fill-slate-450 font-bold uppercase">Drain Valve</text>
          </svg>

          {/* Alarm diagnostic dashboard */}
          <div className="w-full mt-4 flex items-center justify-between px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
            <span className="font-bold text-slate-400">Alarm State:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              ioStates.Alarm_Light 
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450 animate-pulse border border-rose-500/20" 
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 text-slate-400"
            }`}>
              {ioStates.Alarm_Light ? "OVERFLOW ALERT" : "NORMAL"}
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
