import pytest
import math
from app.control_systems.ss_solvers import StateSpaceSolver
from app.routes.power_systems import calculate_three_phase, ThreePhaseRequest

def test_state_space_analysis():
    # Stable second order system: s^2 + 2s + 8
    # x1_dot = x2
    # x2_dot = -8*x1 - 2*x2 + u
    A = [[0.0, 1.0], [-8.0, -2.0]]
    B = [[0.0], [1.0]]
    C = [[1.0, 0.0]]
    
    res = StateSpaceSolver.analyze_system(A, B, C)
    
    assert "error" not in res
    assert res["n"] == 2
    assert res["is_controllable"] is True
    assert res["is_observable"] is True
    assert res["is_stable"] is True
    
    # Poles must be: s = -1 +- j2.6457
    poles = res["poles"]
    assert math.isclose(poles[0]["real"], -1.0, abs_tol=1e-5)
    assert math.isclose(abs(poles[0]["imag"]), math.sqrt(7.0), abs_tol=1e-3)

def test_state_space_uncontrollable():
    # Uncontrollable system
    A = [[1.0, 0.0], [0.0, 2.0]]
    B = [[0.0], [0.0]]
    C = [[1.0, 1.0]]
    
    res = StateSpaceSolver.analyze_system(A, B, C)
    assert res["is_controllable"] is False

def test_pole_placement_design():
    A = [[0.0, 1.0], [0.0, 0.0]]
    B = [[0.0], [1.0]]
    desired_poles = [-2.0, -3.0]
    
    res = StateSpaceSolver.design_pole_placement(A, B, desired_poles)
    
    assert "error" not in res
    # K matrix should be [6, 5]
    # Check: phi(s) = (s+2)(s+3) = s^2 + 5s + 6
    # A - B*K = [[0, 1], [-k1, -k2]]
    # char poly is s^2 + k2*s + k1. So k1=6, k2=5.
    assert math.isclose(res["K"][0], 6.0, abs_tol=1e-5)
    assert math.isclose(res["K"][1], 5.0, abs_tol=1e-5)

def test_three_phase_star():
    # Balanced Star load with 415V LL, Z = 12 + j9 ohms (Z_mag = 15)
    req = ThreePhaseRequest(
        connection="star",
        v_ll=415.0,
        z_a_r=12.0,
        z_a_x=9.0,
        z_b_r=12.0,
        z_b_x=9.0,
        z_c_r=12.0,
        z_c_x=9.0,
        frequency=50.0,
        target_pf=0.95
    )
    
    # Bypass API router auth dependency by calling the function directly
    res = calculate_three_phase(req, current_user=None)
    
    assert "error" not in res
    assert res["connection"] == "star"
    
    # V_ln = 415 / sqrt(3) = 239.6 V
    # I = 239.6 / 15 = 15.97 A
    # Total Active Power P = 3 * I^2 * R = 3 * (15.97)^2 * 12 = 9184 W = 9.18 kW
    assert 9100.0 < res["total_power"]["P"] < 9300.0
    assert 0.79 < res["total_power"]["pf"] < 0.81  # cos(atan(9/12)) = 0.8
    assert res["pfc"]["cap_per_phase_mfd"] > 0
