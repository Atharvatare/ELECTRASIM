import { create } from "zustand";

export interface CircuitComponent {
  id: string;
  type: "resistor" | "capacitor" | "inductor" | "dc_source" | "ac_source" | "current_source" | "diode";
  value: number;
  nodes: [number, number]; // [positive_node, negative_node]
  frequency?: number;       // only for ac_source
}

interface CircuitState {
  components: CircuitComponent[];
  nodesCount: number;
  selectedComponentId: string | null;
  simulationResults: any | null;
  isLoading: boolean;
  error: string | null;
  theme: "dark" | "light";
  
  // Actions
  addComponent: (comp: Omit<CircuitComponent, "id">) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  clearCircuit: () => void;
  selectComponent: (id: string | null) => void;
  setNodesCount: (count: number) => void;
  setSimulationResults: (results: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  toggleTheme: () => void;
}

export const useCircuitStore = create<CircuitState>((set) => ({
  components: [
    { id: "V1", type: "dc_source", value: 12.0, nodes: [1, 0] },
    { id: "R1", type: "resistor", value: 6.0, nodes: [1, 0] }
  ],
  nodesCount: 1,
  selectedComponentId: null,
  simulationResults: null,
  isLoading: false,
  error: null,
  theme: "dark",

  addComponent: (comp) => set((state) => {
    // Generate a unique ID based on type
    const prefix = comp.type === "dc_source" || comp.type === "ac_source" ? "V" : 
                   comp.type === "resistor" ? "R" : 
                   comp.type === "capacitor" ? "C" : 
                   comp.type === "inductor" ? "L" : 
                   comp.type === "current_source" ? "I" : "D";
    
    // Find highest index
    const matching = state.components.filter(c => c.id.startsWith(prefix));
    let nextNum = 1;
    if (matching.length > 0) {
      const nums = matching.map(c => parseInt(c.id.replace(prefix, "")) || 0);
      nextNum = Math.max(...nums) + 1;
    }
    const id = `${prefix}${nextNum}`;
    
    // Auto-update nodesCount based on component nodes
    const maxNode = Math.max(...comp.nodes);
    const newNodesCount = Math.max(state.nodesCount, maxNode);

    return {
      components: [...state.components, { ...comp, id }],
      nodesCount: newNodesCount,
      simulationResults: null // clear old results
    };
  }),

  removeComponent: (id) => set((state) => {
    const updated = state.components.filter((c) => c.id !== id);
    // Recalculate max node index
    let maxNode = 0;
    updated.forEach(c => {
      maxNode = Math.max(maxNode, c.nodes[0], c.nodes[1]);
    });
    return {
      components: updated,
      nodesCount: Math.max(1, maxNode),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      simulationResults: null
    };
  }),

  updateComponent: (id, updates) => set((state) => {
    const updated = state.components.map((c) => 
      c.id === id ? { ...c, ...updates } as CircuitComponent : c
    );
    
    // Recalculate max node index if nodes changed
    let maxNode = 0;
    updated.forEach(c => {
      maxNode = Math.max(maxNode, c.nodes[0], c.nodes[1]);
    });

    return {
      components: updated,
      nodesCount: Math.max(state.nodesCount, maxNode),
      simulationResults: null
    };
  }),

  clearCircuit: () => set({
    components: [],
    nodesCount: 1,
    selectedComponentId: null,
    simulationResults: null,
    error: null
  }),

  selectComponent: (id) => set({ selectedComponentId: id }),
  setNodesCount: (count) => set({ nodesCount: count }),
  setSimulationResults: (results) => set({ simulationResults: results }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (err) => set({ error: err }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("light", nextTheme === "light");
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
    return { theme: nextTheme };
  })
}));
