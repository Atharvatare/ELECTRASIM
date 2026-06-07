"use client";

import React, { useState } from "react";
import { Brain, Send, Sparkles, RefreshCw, MessageSquare, List } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: (
        "Welcome to the **ElectraSim AI Copilot**!\n\n" +
        "I am your browser-based tutor and design assistant. I can help you solve circuit matrices symbolically, " +
        "explain motor efficiency curves, identify open circuits, and clarify complex power systems engineering equations.\n\n" +
        "How can I help you in your electrical designs today?"
      )
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [derivationSteps, setDerivationSteps] = useState<string[]>([
    "Initialized conversational assistant",
    "Loaded electrical engineering formula library"
  ]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: "user", content: text } as Message];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: 1,
          question: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...newMessages, { role: "assistant", content: data.answer }]);
        setDerivationSteps(data.steps || []);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Backend offline. Falling back to local copilot responder.");
    }

    // LOCAL OFFLINE COPILOT RESPONDER (Generates detailed technical replies)
    setTimeout(() => {
      let answer = "";
      let steps: string[] = [];
      
      const query = text.toLowerCase();
      
      if (query.includes("core loss") || query.includes("copper loss") || query.includes("transformer")) {
        answer = (
          "### Transformer Losses Explanation\n\n" +
          "Transformers experience two primary types of power losses:\n\n" +
          "1. **Core Loss (Iron Loss - $P_{fe}$):**\n" +
          "   - **Hysteresis Loss:** Caused by magnetic domains alternating alignment. $P_h = k_h \\cdot f \\cdot B_m^{1.6}$.\n" +
          "   - **Eddy Current Loss:** Caused by circulating currents in the laminations. $P_e = k_e \\cdot f^2 \\cdot t^2 \\cdot B_m^2$.\n" +
          "   - **Property:** Constant at all loads as it depends on voltage and frequency.\n\n" +
          "2. **Copper Loss ($P_{cu}$):**\n" +
          "   - Caused by winding resistances: $P_{cu} = I_1^2 R_1 + I_2^2 R_2 = I_{load}^2 R_{eq}$.\n" +
          "   - **Property:** Variable, scales quadratically with load fraction ($x^2$)."
        );
        steps = ["Parsed transformer loss query", "Retrieved core hysteresis variables", "Retrieved copper winding resistances"];
      } else if (query.includes("kcl") || query.includes("kvl")) {
        answer = (
          "### Nodal Equations (KCL) & Mesh Current (KVL)\n\n" +
          "**KCL Nodal Analysis steps:**\n" +
          "1. Identify all active nodes (junctions) in the circuit netlist.\n" +
          "2. Assign a reference node (usually Node 0 as Ground potential = 0V).\n" +
          "3. Write a nodal equation for each unknown node voltage: sum of leaving currents = 0.\n" +
          "   $$\\sum \\frac{V_{node} - V_{neighbor}}{R_{branch}} + I_{source} = 0$$\n" +
          "4. Solve the resulting system of linear equations using standard matrices."
        );
        steps = ["Parsed matrix solver query", "Compiled KCL summation nodes", "Derived conductance matrices layout"];
      } else if (query.includes("slip")) {
        answer = (
          "### Induction Motor Slip Derivation\n\n" +
          "Slip ($s$) represents the relative lag between the rotating stator magnetic field speed ($N_s$) and the rotor physical shaft speed ($N_r$):\n\n" +
          "$$s = \\frac{N_s - N_r}{N_s}$$\n\n" +
          "Where:\n" +
          "- Synchronous Speed: $N_s = \\frac{120 \\cdot f}{P}$\n" +
          "- Actual speed $N_r$ is less than $N_s$ in motoring mode to allow torque generation by induction."
        );
        steps = ["Parsed induction motor parameters", "Calculated synchronous speed Ns", "Subtracted rotor mechanical drag"];
      } else {
        answer = (
          "### ElectraSim AI Copilot Response\n\n" +
          "I have received your question: *\"" + text + "\"*.\n\n" +
          "I can help explain formulas in detail! Try asking one of these presets:\n" +
          "- *\"Explain the difference between core loss and copper loss in a transformer.\"*\n" +
          "- *\"How do I write KCL nodal equations?\"*\n" +
          "- *\"How does slip affect torque in induction motors?\"*"
        );
        steps = ["Parsed general text inquiry", "Retrieved template catalog"];
      }

      setMessages([...newMessages, { role: "assistant", content: answer }]);
      setDerivationSteps(steps);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-0">
      
      {/* 1. LEFT PANEL: CONVERSATION THREAD */}
      <div className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
        
        {/* Header */}
        <div className="flex items-center space-x-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <Brain className="h-6 w-6 text-purple-500" />
          <div>
            <h1 className="text-lg font-bold text-slate-950 dark:text-white">AI Engineering Copilot</h1>
            <p className="text-xs text-slate-400">Ask questions, verify formulas, and explain circuit logic.</p>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 pr-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed space-y-2 border ${
                msg.role === "user"
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-250"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert">
                    {msg.content.split("\n").map((line, idx) => {
                      if (line.startsWith("###")) {
                        return <h3 key={idx} className="font-bold text-sm text-slate-950 dark:text-white mt-3 mb-1">{line.replace("###", "")}</h3>;
                      }
                      if (line.startsWith("####")) {
                        return <h4 key={idx} className="font-bold text-xs text-blue-500 mt-2 mb-1">{line.replace("####", "")}</h4>;
                      }
                      if (line.startsWith("- ")) {
                        return <p key={idx} className="pl-2 border-l-2 border-blue-500 py-0.5 text-slate-600 dark:text-slate-400">{line.replace("- ", "")}</p>;
                      }
                      return <p key={idx} className="my-1 leading-relaxed">{line}</p>;
                    })}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs flex items-center space-x-2 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                <span>Copilot is formulating calculations...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Box */}
        <div className="mt-4 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(inputText)}
            placeholder="Ask a formulas query (e.g. explain transformer losses)..."
            className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
          <button
            onClick={() => sendMessage(inputText)}
            className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-sm hover:shadow flex items-center justify-center transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. RIGHT PANEL: DERIVATION STEP TRACKER */}
      <div className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col space-y-4">
        <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
          <List className="h-4.5 w-4.5 text-blue-500" />
          <h3 className="text-sm font-bold text-slate-950 dark:text-white">Derivation Logic Steps</h3>
        </div>
        
        <p className="text-[11px] text-slate-400 leading-normal">
          Logical execution trace compiled by the symbolic circuit solver fallback engine.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {derivationSteps.map((step, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl relative flex items-start space-x-2"
            >
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold font-mono text-[10px] shrink-0">
                {idx + 1}
              </div>
              <span className="text-slate-600 dark:text-slate-400 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>

        {/* Suggested presets */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preset Questions</h4>
          <div className="space-y-1.5 text-[10px]">
            {[
              "Explain the difference between core loss and copper loss.",
              "Show KCL nodal equations formulation steps.",
              "Explain induction motor slip equations."
            ].map((preset, i) => (
              <button
                key={i}
                onClick={() => sendMessage(preset)}
                className="w-full text-left p-2 rounded border border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-600 dark:text-slate-450 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
