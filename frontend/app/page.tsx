import Link from "next/link";
import { Cpu, Zap, Activity, Brain, ArrowRight, BookOpen, Layers, Users, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]"></div>
      </div>

      {/* --- HERO SECTION --- */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 sm:pt-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-6 animate-bounce">
            <span>🚀 Next-Gen Electrical Engineering SaaS</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-slate-900 dark:text-white leading-tight">
            AI-Powered Electrical Engineering <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Simulation</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Design, simulate, and analyze circuits, electrical machines, and power electronics in the browser. Powered by Modified Nodal Analysis (MNA) and step-by-step AI derivations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/studio"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Launch Circuit Studio</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#about"
              className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Learn More <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* --- PRODUCT FEATURES GRID --- */}
      <div className="py-16 sm:py-24 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400 uppercase tracking-widest">Workspace Modules</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Everything you need for circuit design and analysis
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4 sm:grid-cols-2">
              
              {/* Studio */}
              <div className="flex flex-col bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-950 dark:text-white">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Circuit Studio
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600 dark:text-slate-400">
                  <p className="flex-auto text-sm">Drag and drop components (RLC, sources, semiconductor devices, meters) on a grid and run DC operating point or transient solvers.</p>
                  <p className="mt-6">
                    <Link href="/studio" className="text-sm font-semibold leading-6 text-blue-600 dark:text-blue-400 hover:underline">Open Studio →</Link>
                  </p>
                </dd>
              </div>

              {/* Machines */}
              <div className="flex flex-col bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-950 dark:text-white">
                  <Cpu className="h-5 w-5 text-indigo-600" />
                  Machine Studio
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600 dark:text-slate-400">
                  <p className="flex-auto text-sm">Analyze DC Motors, Induction Motors, Synchronous Motors, and Transformers using engineering-grade equivalent circuit solvers.</p>
                  <p className="mt-6">
                    <Link href="/machines" className="text-sm font-semibold leading-6 text-indigo-600 dark:text-indigo-400 hover:underline">Open Analyzer →</Link>
                  </p>
                </dd>
              </div>

              {/* Power Electronics */}
              <div className="flex flex-col bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-950 dark:text-white">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  Power Electronics
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600 dark:text-slate-400">
                  <p className="flex-auto text-sm">Simulate single-phase controlled/uncontrolled rectifiers, square-wave/SPWM inverters, and Buck/Boost chopper converters.</p>
                  <p className="mt-6">
                    <Link href="/power-electronics" className="text-sm font-semibold leading-6 text-emerald-600 dark:text-emerald-400 hover:underline">Open Simulator →</Link>
                  </p>
                </dd>
              </div>

              {/* AI Copilot */}
              <div className="flex flex-col bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-slate-950 dark:text-white">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Assistant
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600 dark:text-slate-400">
                  <p className="flex-auto text-sm">Ask formulas, request step-by-step mathematical node solutions, get design feedback, and check for open circuits automatically.</p>
                  <p className="mt-6">
                    <Link href="/ai-assistant" className="text-sm font-semibold leading-6 text-purple-600 dark:text-purple-400 hover:underline">Chat with Copilot →</Link>
                  </p>
                </dd>
              </div>

            </dl>
          </div>
        </div>
      </div>

      {/* --- ABOUT SECTION (Atharva Ravindra Tare) --- */}
      <div id="about" className="py-24 sm:py-32 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-16 items-center">
          <div>
            <h2 className="text-base font-semibold leading-7 text-blue-600 dark:text-blue-400 uppercase tracking-widest">About the Company</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Building the Future of Electrical CAD
            </p>
            <p className="mt-6 text-base leading-7 text-slate-600 dark:text-slate-400">
              ElectraSim AI is dedicated to providing high-fidelity, interactive, and intelligent software utilities for students, educators, and electrical design professionals worldwide. By bridging numerical ODE algorithms with conversational LLMs, we make complex circuit design, machine modeling, and power converter math accessible from any web browser.
            </p>
            
            <div className="mt-8 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-slate-900 rounded-lg text-blue-600 dark:text-blue-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-950 dark:text-white text-sm">Founding Leadership</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Founded and spearheaded by **Atharva Ravindra Tare**, our team is comprised of hardware architects, machine learning engineers, and software experts focused on making electrical simulation highly visual and interactive.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 dark:bg-slate-900 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-950 dark:text-white text-sm">Engineering Rigor</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Every calculation is derived from first principles using standard SPICE nodal solvers, companion models, and phasor circuits, ensuring that simulations match actual laboratory conditions.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Mockup Visual */}
          <div className="relative p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <span className="text-xs font-mono text-slate-500">Ohm's Law Engine</span>
            </div>
            
            <div className="mt-6 flex flex-col md:flex-row gap-6 items-center">
              {/* Formula Panel */}
              <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-center py-6 font-serif text-2xl text-blue-400">
                  $$V = I \times R$$
                </div>
                <div className="space-y-3 mt-4 text-xs font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Vs (Source Voltage):</span>
                    <span className="text-white">12.0 V</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded">
                    <div className="bg-blue-500 h-1.5 rounded" style={{ width: "60%" }}></div>
                  </div>
                  <div className="flex justify-between">
                    <span>R (Resistance):</span>
                    <span className="text-white">6.0 Ω</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded">
                    <div className="bg-blue-500 h-1.5 rounded" style={{ width: "30%" }}></div>
                  </div>
                  <div className="border-t border-slate-800 pt-3 mt-2 text-blue-400 flex justify-between">
                    <span>Result Current I:</span>
                    <span className="text-emerald-400 font-bold">2.00 A</span>
                  </div>
                </div>
              </div>
              
              {/* Circuit Drawing */}
              <div className="flex-1 border border-slate-800 p-4 rounded-xl bg-slate-950/50 flex flex-col items-center">
                <div className="text-xs text-slate-500 mb-2 font-mono">Schematic Layout</div>
                <svg width="150" height="100" viewBox="0 0 150 100" className="text-slate-400">
                  {/* AC/DC Source */}
                  <circle cx="30" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text x="30" y="55" textAnchor="middle" fill="currentColor" fontSize="14">+</text>
                  <text x="30" y="45" textAnchor="middle" fill="currentColor" fontSize="8">-</text>
                  {/* Resistor */}
                  <rect x="90" y="40" width="30" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text x="105" y="32" textAnchor="middle" fill="currentColor" fontSize="8" className="font-mono">R=6Ω</text>
                  {/* Connection Wires */}
                  <line x1="30" y1="35" x2="30" y2="15" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="30" y1="15" x2="105" y2="15" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="105" y1="15" x2="105" y2="40" stroke="currentColor" strokeWidth="1.5" />
                  
                  <line x1="30" y1="65" x2="30" y2="85" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="30" y1="85" x2="105" y2="85" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="105" y1="85" x2="105" y2="60" stroke="currentColor" strokeWidth="1.5" />
                  
                  {/* Current Arrow */}
                  <path d="M 60,10 L 70,15 L 60,20 Z" fill="currentColor" />
                  <text x="65" y="32" textAnchor="middle" fill="currentColor" fontSize="8" className="font-mono">I=2.00A</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
