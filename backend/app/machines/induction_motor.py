import math
import cmath

class InductionMotorAnalyzer:
    @staticmethod
    def analyze(
        voltage: float, 
        frequency: float, 
        poles: int, 
        rotor_speed: float, 
        r1: float = 0.5, 
        x1: float = 1.2, 
        r2: float = 0.4, 
        x2: float = 1.0, 
        xm: float = 25.0,
        rotational_losses: float = 150.0
    ):
        """
        Calculates 3-Phase Induction Motor characteristics using equivalent circuit parameters.
        - voltage (V, Line-to-Line RMS)
        - frequency (Hz)
        - poles (integer)
        - rotor_speed (RPM)
        - r1, x1: Stator resistance, reactance (Ohms)
        - r2, x2: Rotor resistance, reactance referred to stator (Ohms)
        - xm: Magnetizing reactance (Ohms)
        - rotational_losses (W) - core, windage, and friction losses
        """
        if poles <= 0 or poles % 2 != 0:
            return {"error": "Poles must be a positive even integer."}
        if frequency <= 0:
            return {"error": "Frequency must be greater than 0 Hz."}
        
        # Synchronous Speed Ns = 120 * f / P
        ns = (120.0 * frequency) / poles
        
        # Slip s = (Ns - Nr) / Ns
        slip = (ns - rotor_speed) / ns
        
        # Handle edge cases for slip
        if slip <= 0:
            # Generator or synchronous speed
            slip = 1e-6
        if slip > 1.0:
            # Plugging
            slip = 1.0
            
        # Rotor frequency fr = s * f
        f_rotor = slip * frequency
        
        # Phase voltage (assume star connection)
        v_phase = voltage / math.sqrt(3.0)
        
        # Complex impedances
        z_stator = complex(r1, x1)
        z_rotor = complex(r2 / slip, x2)
        z_mag = complex(0, xm)
        
        # Parallel combination of z_mag and z_rotor: Z_parallel = (Z_mag * Z_rotor) / (Z_mag + Z_rotor)
        z_parallel = (z_mag * z_rotor) / (z_mag + z_rotor)
        
        # Total equivalent input impedance per phase
        z_eq = z_stator + z_parallel
        
        # Stator Phase Current (I1)
        i1 = v_phase / z_eq
        i1_mag = abs(i1)
        
        # Power factor
        pf = math.cos(cmath.phase(z_eq))
        
        # Input Power Pin = 3 * V_phase * I1 * PF
        p_in = 3.0 * v_phase * i1_mag * pf
        
        # Magnetizing branch voltage E1 = V_phase - I1 * Z_stator
        e1 = v_phase - i1 * z_stator
        
        # Rotor Current (I2 referred to stator) = E1 / Z_rotor
        i2 = e1 / z_rotor
        i2_mag = abs(i2)
        
        # Air Gap Power Pag = 3 * I2^2 * R2 / s
        p_airgap = 3.0 * (i2_mag ** 2) * (r2 / slip)
        
        # Mechanical power developed Pmech = (1 - s) * Pag
        p_mech = (1.0 - slip) * p_airgap
        
        # Net mechanical output power Pout = Pmech - rotational_losses
        p_out = max(0.0, p_mech - rotational_losses)
        
        # Synchronous angular speed omega_s = 2 * pi * Ns / 60
        omega_s = (2.0 * math.pi * ns) / 60.0
        
        # Rotor mechanical speed omega_r = 2 * pi * Nr / 60
        omega_r = (2.0 * math.pi * rotor_speed) / 60.0
        
        # Developed torque T_dev = P_mech / omega_r = P_airgap / omega_s
        torque_dev = p_airgap / omega_s if omega_s > 0 else 0.0
        
        # Shaft net torque T_shaft = P_out / omega_r
        torque_shaft = p_out / omega_r if omega_r > 0 else 0.0
        
        # Efficiency
        efficiency = (p_out / p_in) * 100.0 if p_in > 0 else 0.0
        efficiency = max(0.0, min(100.0, efficiency))
        
        # Losses
        loss_stator_cu = 3.0 * (i1_mag ** 2) * r1
        loss_rotor_cu = 3.0 * (i2_mag ** 2) * r2
        total_losses = loss_stator_cu + loss_rotor_cu + rotational_losses
        
        return {
            "synchronous_speed": round(ns, 1),
            "slip": round(slip, 4),
            "rotor_frequency": round(f_rotor, 2),
            "stator_current": round(i1_mag, 2),
            "rotor_current": round(i2_mag, 2),
            "power_factor": round(pf, 3),
            "power_input": round(p_in, 1),
            "power_output": round(p_out, 1),
            "developed_torque": round(torque_dev, 2),
            "shaft_torque": round(torque_shaft, 2),
            "stator_copper_losses": round(loss_stator_cu, 1),
            "rotor_copper_losses": round(loss_rotor_cu, 1),
            "total_losses": round(total_losses, 1),
            "efficiency": round(efficiency, 2)
        }
