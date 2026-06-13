# ElectraSim AI

### AI-Powered Electrical Engineering Simulation Platform
ElectraSim AI is a browser-based electrical engineering simulation environment that merges the capabilities of spice simulators (Falstad, LTSpice), machine modeling frameworks (MATLAB Simulink), industrial automation systems, and AI-guided tutors into a cohesive modern SaaS platform. 

Founded and spearheaded by **Atharva Ravindra Tare**.

---

## Key Features

- **Circuit Design Studio**: Drag-and-drop circuit editor with passive components, AC/DC/current sources, diodes, switches, and meters. Solved using Modified Nodal Analysis (MNA).
- **Machine Studio**: Analysis of DC Motors, Induction Motors, Synchronous Motors, and Transformers using physical equivalent circuits.
- **Power Electronics Workbench**: Modeling of controlled/uncontrolled rectifiers, square-wave/SPWM single-phase inverters, and Buck/Boost chopper converters.
- **Power Systems Lab**: Transmission lines ABCD parameters calculators (Short, Medium, Long models), symmetrical/unsymmetrical fault current calculations, Gauss-Seidel 3-bus load flow solvers, and unbalanced Three-Phase Star/Delta phasor calculators with power factor corrector (PFC) sizing.
- **Programmable PLC & SCADA Simulator**: Fully interactive Ladder Logic Builder with series Normally Open/Closed contacts, parallel latch branches, output coils, and On-Delay TON Timers, dynamically driving a real-time SVG SCADA water tank level simulation.
- **Analog & Digital Workbench**: Solves RC components for active Sallen-Key Butterworth low-pass/high-pass filters, simulates R-2R DAC ladder networks, and simulates 3-bit Flash ADCs.
- **RF Smith Chart Designer**: Interactive visual RF Smith Chart tool enabling constant resistance/reactance SVG rendering, impedance mapping, matching networks calculations (series/shunt L/C, transmission lines), and real-time reflection coefficient tracing.
- **Digital Logic Gates Workbench**: Drag-and-drop digital logic builder simulating basic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR) with dynamic truth tables and Line-series timing diagrams.
- **Control Systems Studio**: Linear system state-space controllability/observability analyzer and pole placement (Ackermann's method) feedback gain solver.
- **Motor Drive Studio**: Continuous ODE PID speed control simulation of a DC shunt motor under step torque disturbances.
- **Fourier Signal Lab**: Time/Frequency domain analysis showing harmonic synthesis.
- **AI Engineering Assistant**: Step-by-step mathematical nodal derivation, formula explanations, and fault detection (e.g. open circuit checks).
- **Oscilloscope Waveforms**: Time-series charts representing transient voltage and current potentials using Recharts.
- **Engineering PDF Reports**: Formatted ReportLab exports summarizing simulation outputs, math, and AI reviews.
- **Secure Authentication**: Next-gen glassmorphic Login and Registration pages linked directly to FastAPI JWT database authentication endpoints (`/auth/register`, `/auth/login`, `/auth/me`).


---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand (Global stores for circuits, simulator configurations, and sessions)
- **Visualization**: Recharts, Custom SVG renderers

### Backend
- **Framework**: FastAPI
- **Math/Simulation**: NumPy, SciPy, SymPy, cmath
- **Database ORM**: SQLAlchemy, SQLite (Development), PostgreSQL (Production)
- **Security**: python-jose (JWT), passlib[bcrypt]
- **Reporting**: ReportLab

### DevOps & Infrastructure
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Database**: PostgreSQL (alpine)

---

## Directory Structure

```
ELECTRASIM/
├── .github/
│   └── workflows/
│       └── main.yml           # GitHub Actions CI/CD Pipeline
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI main entrypoint
│   │   ├── config.py          # App settings & env variables
│   │   ├── database.py        # SQLAlchemy models and connection
│   │   ├── schemas.py         # Pydantic validation schemas
│   │   ├── ai/
│   │   │   └── assistant.py   # AI Assistant & symbolic solver
│   │   ├── control_systems/
│   │   │   └── ss_solvers.py  # Controllability, observability, pole solvers
│   │   ├── machines/          # DC, IM, SM, and Transformer models
│   │   ├── power_electronics/ # Rectifiers, inverters, and choppers
│   │   ├── power_systems/     # Transmission lines parameters and solvers
│   │   ├── reports/
│   │   │   └── pdf_generator.py # ReportLab PDF compiler
│   │   └── routes/            # API routing submodules (control_systems.py, etc.)
│   ├── tests/
│   │   ├── test_simulation.py # pytest verification cases
│   │   ├── test_power_systems.py
│   │   └── test_advanced_labs.py # pytest for control & advanced power systems
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── studio/            # Circuit editor workbench
│   │   ├── machines/          # Machines analyzer workbench
│   │   ├── power-electronics/ # Power electronics workbench
│   │   ├── power-systems/     # Power systems analyzer
│   │   ├── plc-scada/         # Programmable PLC editor and SCADA animation
│   │   ├── analog-digital/    # Filters, DAC, and ADC designer
│   │   ├── motor-drive/       # Closed-loop DC PID controller
│   │   ├── fourier-lab/       # Fourier signal analyzer
│   │   ├── smith-chart/       # Interactive RF Smith Chart builder
│   │   ├── logic-gates/       # Drag-and-drop Digital Logic simulator
│   │   ├── ai-assistant/      # AI copilot chat interface
│   │   ├── library/           # Formula Reference index
│   │   ├── reports/           # PDF compile dashboard
│   │   ├── login/             # User sign in card
│   │   ├── register/          # User sign up card
│   │   ├── layout.tsx         # Next.js root layout wrapper
│   │   └── page.tsx           # Premium Landing & About page
│   ├── components/
│   │   └── Navbar.tsx         # Global navigation & theme toggle
│   ├── store/
│   │   ├── circuitStore.ts    # Zustand global state store
│   │   └── authStore.ts       # Zustand user authentication store
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

---

## Core API Endpoints Reference

### 1. User Authentication
*   `POST /api/v1/auth/register` - Create user profile and generate token session.
*   `POST /api/v1/auth/login` - Verify user credentials and return bearer JWT.
*   `GET /api/v1/auth/me` - Fetch verified profile details of the active session (Requires Bearer token header).

### 2. Simulation & Calculation Engines
*   `POST /api/v1/circuits/solve` - Run MNA SPICE solver for DC/Transient analysis.
*   `POST /api/v1/control-systems/analyze` - State-space controllability/observability/stability parameters.
*   `POST /api/v1/control-systems/design-pole` - Pole placement gains $K$ via Ackermann's method.
*   `POST /api/v1/power-systems/transmission` - Solve Short, Medium, Long line ABCD parameters.
*   `POST /api/v1/power-systems/fault` - Compute symmetrical/unsymmetrical fault currents.
*   `POST /api/v1/power-systems/load-flow` - Run Gauss-Seidel load flow equations on a 3-bus grid.
*   `POST /api/v1/power-systems/three-phase` - Compute unbalanced/balanced phase and line parameter phasors.
*   `POST /api/v1/power-systems/pfc` - Determine delta-connected capacitor values for target power factor correction.
*   `POST /api/v1/reports/generate` - Compile engineering PDF sheets using ReportLab.

---

## Programmable PLC Tag Address Maps

When building custom programs in the **Ladder Logic diagram workspace**, the execution cycle maps contacts and coil variables to these internal registers:

| Address Tag Name | Type | Description |
| --- | --- | --- |
| `Start_PB` | Input (Momentary) | Closes (TRUE) when user clicks and holds Start button. |
| `Stop_PB` | Input (Fail-safe) | Opens (FALSE) when user clicks Stop button. Conducts (TRUE) otherwise. |
| `High_Level_Sensor` | Input (Limit) | Automatically closes (TRUE) when water level reaches $\ge 90\%$. |
| `Low_Level_Sensor` | Input (Limit) | Automatically closes (TRUE) when water level is $> 15\%$. |
| `Fill_Valve` | Output (Actuator) | Solenoid filling valve. Controls inflow rate. |
| `Drain_Valve` | Output (Actuator) | Solenoid drainage valve. Controls outflow rate. |
| `Alarm_Light` | Output (Indicator) | Excites warning systems on overflow levels. |
| `T1_DN` | Timer Status | Done bit. Closes (TRUE) when TON timer `T1` reaches its preset time. |
| `T2_DN` | Timer Status | Done bit. Closes (TRUE) when TON timer `T2` reaches its preset time. |

---

## Local Development Setup

### Prerequisite Dependencies
- Node.js (v20+)
- Python (3.11+)
- Git

### 1. Backend Service Setup
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API documentation will be active at `http://localhost:8000/api/v1/docs`.

### 2. Frontend Next.js Setup
1. Open a terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The application dashboard will be active at `http://localhost:3000`.

### 3. Running Backend Verification Tests
Verify all calculation routers and models pass:
```bash
cd backend
venv\Scripts\python -m pytest
```

---

## Environment Variables Configuration

| Variable Name | Purpose | Required/Optional | Example / Default Value |
| --- | --- | --- | --- |
| `DATABASE_URL` | SQLAlchemy connection string | Optional | `sqlite:///./electrasim.db` |
| `SECRET_KEY` | JWT signature token key | Required in Prod | `super_secret_production_key_4758392019` |
| `OPENAI_API_KEY` | OpenAI API key for AI Copilot | Optional (fallback to SymPy) | `sk-proj-...` |

---

## Deployment Guide

Deploying the stack using Docker Compose:
```bash
# Build and spin up all containers (Database, FastAPI, Next.js)
docker-compose up --build
```
This launches:
- Next.js client on `http://localhost:3000`
- FastAPI server on `http://localhost:8000`
- PostgreSQL mapped on `localhost:5432`
