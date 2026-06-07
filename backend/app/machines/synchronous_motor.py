import math

class SynchronousMotorAnalyzer:
    @staticmethod
    def analyze(
        voltage: float, 
        frequency: float, 
        poles: int, 
        excitation_voltage: float, 
        torque_angle_deg: float, 
        xs: float = 8.0, 
        ra: float = 0.4, 
        rotational_losses: float = 200.0
    ):
        """
        Calculates Cylindrical Rotor Synchronous Motor characteristics.
        - voltage (V, Line-to-Line RMS)
        - frequency (Hz)
        - poles (integer)
        - excitation_voltage (V, Phase RMS Back EMF Ef)
        - torque_angle_deg (delta, torque angle in degrees, positive for motor)
        - xs: Synchronous Reactance per phase (Ohms)
        - ra: Armature Resistance per phase (Ohms)
        - rotational_losses (W)
        """
        if poles <= 0 or poles % 2 != 0:
            return {"error": "Poles must be a positive even integer."}
        if frequency <= 0:
            return {"error": "Frequency must be greater than 0 Hz."}
        if xs <= 0:
            return {"error": "Synchronous reactance must be greater than 0."}
            
        ns = (120.0 * frequency) / poles
        omega_s = (2.0 * math.pi * ns) / 60.0
        
        delta = math.radians(torque_angle_deg)
        v_phase = voltage / math.sqrt(3.0)
        
        # Express phasor variables
        # V = V_phase + j0
        # Ef = Ef * cos(-delta) + j * Ef * sin(-delta) = Ef * cos(delta) - j * Ef * sin(delta)
        # Zs = Ra + jXs
        # Ia = (V - Ef) / Zs
        v_complex = complex(v_phase, 0.0)
        ef_complex = complex(excitation_voltage * math.cos(-delta), excitation_voltage * math.sin(-delta))
        zs_complex = complex(ra, xs)
        
        ia = (v_complex - ef_complex) / zs_complex
        ia_mag = abs(ia)
        ia_angle_deg = math.degrees(math.atan2(ia.imag, ia.real))
        
        # Input power per phase: S_in = V * Ia*
        s_in_phase = v_complex * ia.conjugate()
        p_in = 3.0 * s_in_phase.real
        q_in = 3.0 * s_in_phase.imag  # Q > 0 if absorbing lagging reactive power
        
        # Power factor
        pf = math.cos(math.atan2(q_in, p_in))
        pf_type = "Leading (Generates Q)" if q_in < 0 else "Lagging (Absorbs Q)"
        if abs(q_in) < 1e-2:
            pf_type = "Unity"
            
        # Copper losses P_cu = 3 * Ia^2 * Ra
        p_cu = 3.0 * (ia_mag ** 2) * ra
        
        # Mechanical power developed: P_mech = P_in - P_cu
        p_mech = p_in - p_cu
        
        # Net mechanical output power: P_out = P_mech - rotational_losses
        p_out = max(0.0, p_mech - rotational_losses)
        
        # Net shaft torque
        torque_shaft = p_out / omega_s if omega_s > 0 else 0.0
        
        # Gross torque
        torque_gross = p_mech / omega_s if omega_s > 0 else 0.0
        
        # Efficiency
        efficiency = (p_out / p_in) * 100.0 if p_in > 0 else 0.0
        efficiency = max(0.0, min(100.0, efficiency))
        
        return {
            "synchronous_speed": round(ns, 1),
            "armature_current": round(ia_mag, 2),
            "armature_current_angle": round(ia_angle_deg, 1),
            "power_factor": round(abs(pf), 3),
            "power_factor_type": pf_type,
            "power_input": round(p_in, 1),
            "power_output": round(p_out, 1),
            "active_power": round(p_in, 1),
            "reactive_power": round(q_in, 1),
            "copper_losses": round(p_cu, 1),
            "rotational_losses": round(rotational_losses, 1),
            "gross_torque": round(torque_gross, 2),
            "shaft_torque": round(torque_shaft, 2),
            "efficiency": round(efficiency, 2)
        }
