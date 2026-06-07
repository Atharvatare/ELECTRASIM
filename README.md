# ElectraSim AI

### AI-Powered Electrical Engineering Simulation Platform
ElectraSim AI is a browser-based electrical engineering simulation environment that merges the capabilities of spice simulators (Falstad, LTSpice), machine modeling frameworks (MATLAB Simulink), and AI-guided tutors into a cohesive modern SaaS platform. Founded by **Atharva Ravindra Tare**.

---

## Key Features

- **Circuit Design Studio**: Drag-and-drop circuit editor with passive components, AC/DC/current sources, diodes, switches, and meters. Solved using Modified Nodal Analysis (MNA).
- **Machine Studio**: Analysis of DC Motors, Induction Motors, Synchronous Motors, and Transformers using physical equivalent circuits.
- **Power Electronics Workbench**: Modeling of controlled/uncontrolled rectifiers, square-wave/SPWM single-phase inverters, and Buck/Boost chopper converters.
- **AI Engineering Assistant**: Step-by-step mathematical nodal derivation, formula explanations, and fault detection (e.g. open circuit checks).
- **Oscilloscope Waveforms**: Time-series charts representing transient voltage and current potentials using Recharts.
- **Engineering PDF Reports**: Formatted ReportLab exports summarizing simulation outputs, math, and AI reviews.

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Visualization**: Recharts, Custom SVG renderers

### Backend
- **Framework**: FastAPI
- **Math/Simulation**: NumPy, SciPy, SymPy, cmath
- **Database ORM**: SQLAlchemy, PostgreSQL
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
│   │   ├── machines/          # DC, IM, SM, and Transformer models
│   │   ├── power_electronics/ # Rectifiers, inverters, and choppers
│   │   ├── reports/
│   │   │   └── pdf_generator.py # ReportLab PDF compiler
│   │   └── routes/            # API routing submodules
│   ├── tests/
│   │   └── test_simulation.py # pytest verification cases
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── studio/            # Circuit editor workbench
│   │   ├── machines/          # Machines analyzer workbench
│   │   ├── power-electronics/ # Power electronics workbench
│   │   ├── ai-assistant/      # AI copilot chat interface
│   │   ├── library/           # Formula Reference index
│   │   ├── reports/           # PDF compile dashboard
│   │   ├── layout.tsx         # Next.js root layout wrapper
│   │   └── page.tsx           # Premium Landing & About page
│   ├── components/
│   │   └── Navbar.tsx         # Global navigation & theme toggle
│   ├── store/
│   │   └── circuitStore.ts    # Zustand global state store
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

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

---

## Environment Variables Configuration

| Variable Name | Purpose | Required/Optional | Example / Default Value |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Optional | `sqlite:///./electrasim.db` |
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
