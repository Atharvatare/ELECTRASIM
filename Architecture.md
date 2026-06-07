# System Architecture

This document details the high-level software architecture, data flow diagram, and mathematical formulations underlying the ElectraSim AI engineering suite.

---

## Architecture Flow Diagram

```mermaid
graph TD
    subgraph Client Layer (Next.js 16)
        UI[Landing / About Page]
        Studio[Circuit Design Studio]
        Machines[Machine Analyzer]
        PE[Power Electronics Workbench]
        Library[Formula Library]
        AI_UI[AI Chat Client]
    end

    subgraph Service API Layer (FastAPI)
        Auth[Auth Service / JWT]
        SimSvc[Simulation Service]
        MachSvc[Machine Analysis Service]
        PESvc[Power Electronics Service]
        AISvc[AI Copilot Service]
        RepSvc[Report Compiler]
    end

    subgraph Simulation Engines
        MNA[Modified Nodal Analysis]
        Euler[Backward Euler Integrator]
        NR[Newton-Raphson Solver]
    end

    subgraph Database Layer
        PG[(PostgreSQL db)]
    end

    Studio -->|JSON Netlist| SimSvc
    Machines -->|Params POST| MachSvc
    PE -->|Params POST| PESvc
    AI_UI -->|Ask prompt| AISvc
    
    SimSvc --- MNA
    MNA --- Euler
    MNA --- NR
    
    Auth --> PG
    SimSvc --> PG
    MachSvc --> PG
    RepSvc --> PG
```

---

## 1. Simulation Engine Formulation (MNA)

The Circuit Simulation engine compiles a netlist into the standard Modified Nodal Analysis (MNA) matrix system:

$$A \cdot X = Z$$

Where:
- **$A$ (conductance matrix)** is sized $(N + M) \times (N + M)$ for $N$ active nodes (ground Node 0 is excluded) and $M$ independent voltage sources:
  $$A = \begin{bmatrix} G & B \\ C & D \end{bmatrix}$$
  - $G$ contains conductances connected to and between nodes.
  - $B$ and $C$ map terminal node connections for independent voltage sources.
  - $D$ represents source dependencies (zero for independent sources).
- **$X$ (solution vector)** contains the unknown node voltages and the currents flowing through the voltage sources:
  $$X = \begin{bmatrix} v_1 & v_2 & \dots & v_N & i_{V_1} & \dots & i_{V_M} \end{bmatrix}^T$$
- **$Z$ (input source vector)** contains independent node current injections and voltage source set potentials:
  $$Z = \begin{bmatrix} I_{node\_1} & \dots & I_{node\_N} & V_{source\_1} & \dots & V_{source\_M} \end{bmatrix}^T$$

### 1.1 Companion Models (Transient Simulation)
To simulate time-dependent components (capacitors and inductors), we discretize differential equations using the **Backward Euler** integration method at each time-step $\Delta t$:

1. **Capacitor ($C$):**
   $$i_c(t) = C \frac{v_c(t) - v_c(t - \Delta t)}{\Delta t} \implies i_c(t) = G_{eq} \cdot v_c(t) - I_{eq}$$
   - Companion resistor: $R_{eq} = \frac{\Delta t}{C}$ (conductance $G_{eq} = \frac{C}{\Delta t}$)
   - Companion current source: $I_{eq} = \frac{C}{\Delta t} v_c(t - \Delta t)$ connected in parallel.
   
2. **Inductor ($L$):**
   $$v_l(t) = L \frac{i_l(t) - i_l(t - \Delta t)}{\Delta t} \implies i_l(t) = G_{eq} \cdot v_l(t) + I_{eq}$$
   - Companion resistor: $R_{eq} = \frac{L}{\Delta t}$ (conductance $G_{eq} = \frac{\Delta t}{L}$)
   - Companion current source: $I_{eq} = i_l(t - \Delta t)$ connected in parallel.

### 1.2 Nonlinear Components (Newton-Raphson)
Diodes are solved using iterative linearization. At iteration $k$:
$$I_d \approx I_d(V_d^k) + G_d \cdot (V_d - V_d^k)$$
Where:
- Conductance $G_d = \frac{I_s}{n V_t} e^{V_d^k / (n V_t)}$
- Equivalent current source: $I_{eq} = G_d \cdot V_d^k - I_d(V_d^k)$ in parallel.
The solver iterates until node voltages converge ($|V_d^{k+1} - V_d^k| < 10^{-5}$).

---

## 2. Service Separation & Data Contracts

- **Stateless Solvers**: Circuit, Machine, and Power Electronics engines do not maintain session memory. They parse connection models from incoming request bodies and respond with numerical curves and averages.
- **Stateful Management**: The FastAPI router manages authentication credentials via JWT (cookie/header bearer tokens) and uses SQLAlchemy sessions to write users, project configurations, saved circuits, and generated PDF file paths to the PostgreSQL database.
