# Changelog

All notable changes to the ElectraSim AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0-alpha] - 2026-06-07

### Added
- **MNA Simulation Engine**: Implemented Modified Nodal Analysis (MNA) solver supporting DC operating point and transient simulation in `backend/app/simulation/mna.py`. Integrates Backward Euler for capacitors/inductors and Newton-Raphson for nonlinear diodes.
- **Machine Analyzers**: Created equivalent circuit simulators for DC Motors (`dc_motor.py`), Induction Motors (`induction_motor.py`), Synchronous Motors (`synchronous_motor.py`), and Transformers (`transformer.py`).
- **Power Electronics simulators**: Created simulators for Controlled/Uncontrolled Rectifiers (`rectifiers.py`), Square/SPWM Inverters (`inverters.py`), and Buck/Boost Choppers (`choppers.py`).
- **AI Copilot & Symbolic Parser**: Developed AI assistant routing in `assistant.py` that utilizes OpenAI or falls back to a SymPy solver writing node equations step-by-step.
- **Next.js 16 Frontend Workbench**: Built the frontend dashboard including:
  - Landing Page & "About leadership" section featuring founder **Atharva Ravindra Tare**.
  - **Circuit Design Studio**: Custom real-time SVG schematic drawer, control panel, and Recharts oscilloscope.
  - **Machines Analyzer workbench** & **Power Electronics Simulator page** featuring input parameters control and plotting.
  - **Formula Library** & **AI Copilot chat window**.
  - **Reports Generation panel**.
  - Dark and Light theme global transitions using Zustand global store.
- **DevOps configurations**: Added `Dockerfile` configurations for frontend/backend, `docker-compose.yml` for multi-container database-app mapping, and `.github/workflows/main.yml` for CI/CD.
- **Test Suite**: Created pytest coverage cases verifying Ohm's law, transient RC decay, and motor/rectifier equations in `backend/tests/test_simulation.py`.
