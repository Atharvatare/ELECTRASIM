import pytest
import math
from app.simulation.mna import CircuitSolver
from app.machines.dc_motor import DCMotorAnalyzer
from app.machines.induction_motor import InductionMotorAnalyzer
from app.machines.synchronous_motor import SynchronousMotorAnalyzer
from app.machines.transformer import TransformerAnalyzer
from app.power_electronics.rectifiers import RectifierSimulator
from app.power_electronics.inverters import InverterSimulator
from app.power_electronics.choppers import ChopperSimulator

def test_dc_ohms_law():
    # Test circuit: 12V source in series with a 6 Ohm resistor
    # Nodes: Node 1 (connected to positive of V1), Node 0 (ground)
    components = [
        {"id": "V1", "type": "dc_source", "value": 12.0, "nodes": [1, 0]},
        {"id": "R1", "type": "resistor", "value": 6.0, "nodes": [1, 0]}
    ]
    sol = CircuitSolver.solve_dc(components, nodes_count=1)
    
    assert "error" not in sol
    # Node 1 voltage must be 12.0V
    assert math.isclose(sol["voltages"]["1"], 12.0, abs_tol=1e-5)
    # Current through resistor R1 must be 12V / 6 Ohm = 2.0A
    assert math.isclose(sol["currents"]["R1"], 2.0, abs_tol=1e-5)
    # Current through source V1 must be -2.0A (MNA convention: current entering positive terminal)
    assert math.isclose(sol["currents"]["V1"], -2.0, abs_tol=1e-5)
    # Resistor power = V*I = 12 * 2 = 24W
    assert math.isclose(sol["power"]["R1"], 24.0, abs_tol=1e-5)
    # Source power = V * -I = 12 * 2 = 24W delivered (-24W absorbed)
    assert math.isclose(sol["power"]["V1"], -24.0, abs_tol=1e-5)

def test_dc_parallel_resistors():
    # Test circuit: 10V source, two 10 Ohm resistors in parallel
    # Node 1 = positive terminal, Node 0 = ground
    components = [
        {"id": "V1", "type": "dc_source", "value": 10.0, "nodes": [1, 0]},
        {"id": "R1", "type": "resistor", "value": 10.0, "nodes": [1, 0]},
        {"id": "R2", "type": "resistor", "value": 10.0, "nodes": [1, 0]}
    ]
    sol = CircuitSolver.solve_dc(components, nodes_count=1)
    
    assert "error" not in sol
    assert math.isclose(sol["voltages"]["1"], 10.0, abs_tol=1e-5)
    assert math.isclose(sol["currents"]["R1"], 1.0, abs_tol=1e-5)
    assert math.isclose(sol["currents"]["R2"], 1.0, abs_tol=1e-5)
    assert math.isclose(sol["currents"]["V1"], -2.0, abs_tol=1e-5)

def test_transient_rc_step():
    # Test transient: 10V DC source connected via switch to series RC circuit (R=1000 Ohm, C=10uF)
    # Time constant tau = R*C = 1000 * 10e-6 = 0.01 seconds
    # After t = 0.01s, capacitor voltage should be V_source * (1 - e^-1) ~ 10 * 0.63212 = 6.32V
    # Nodes: Node 1 (connected to V1), Node 2 (node between R1 and C1), Node 0 (ground)
    components = [
        {"id": "V1", "type": "dc_source", "value": 10.0, "nodes": [1, 0]},
        {"id": "R1", "type": "resistor", "value": 1000.0, "nodes": [1, 2]},
        {"id": "C1", "type": "capacitor", "value": 10e-6, "nodes": [2, 0]}
    ]
    
    # Run simulation for 0.01 seconds, with step size 1e-4 seconds
    sol = CircuitSolver.solve_transient(components, nodes_count=2, t_stop=0.0101, step=1e-4)
    
    time_series = sol["time"]
    v_cap = sol["voltages"]["2"]
    
    # Find index closest to t = 0.01s (which is index 100)
    idx_10ms = min(range(len(time_series)), key=lambda i: abs(time_series[i] - 0.01))
    
    v_cap_10ms = v_cap[idx_10ms]
    expected_v = 10.0 * (1.0 - math.exp(-1.0)) # ~ 6.3212V
    
    assert math.isclose(v_cap_10ms, expected_v, rel_tol=1e-2)

def test_dc_motor_analysis():
    # 220V motor, 10A current, 0.5 Ohm armature resistance, 1500 RPM
    res = DCMotorAnalyzer.analyze(voltage=220.0, current=10.0, armature_resistance=0.5, speed_rpm=1500.0, constant_losses=100.0)
    
    # Eb = 220 - 10 * 0.5 = 215V
    assert res["back_emf"] == 215.0
    # Pin = 220 * 10 = 2200W
    assert res["power_input"] == 2200.0
    # gross_torque = (215 * 10) / (2 * pi * 1500 / 60) = 2150 / 157.079 = 13.687 Nm
    assert math.isclose(res["gross_torque"], 13.69, abs_tol=1e-1)
    
def test_rectifier_simulation():
    # Single-phase uncontrolled half-wave rectifier, 120V RMS, 60Hz, 10 Ohm load
    # Vdc should be Vm / pi ~ 120*sqrt(2) / pi = 54.02V (wait: for half-wave it is Vm / 2pi ~ 27.01V)
    res = RectifierSimulator.simulate(topology="half_wave", is_controlled=False, voltage_rms=120.0, frequency=60.0, load_r=10.0)
    
    expected_vdc = (120.0 * math.sqrt(2.0)) / (2.0 * math.pi) # ~ 27.01V
    assert math.isclose(res["average_voltage"], expected_vdc, rel_tol=1e-2)
    # Output arrays must have elements
    assert len(res["waveforms"]["time"]) == 400
