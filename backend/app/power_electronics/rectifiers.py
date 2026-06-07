import math
import numpy as np

class RectifierSimulator:
    @staticmethod
    def simulate(
        topology: str,          # half_wave, full_wave, bridge
        is_controlled: bool,    # True (SCR) or False (Diode)
        voltage_rms: float, 
        frequency: float, 
        load_r: float, 
        firing_angle_deg: float = 0.0,
        cycles_to_plot: float = 2.0
    ):
        """
        Simulates single-phase rectifiers with resistive loads.
        """
        if voltage_rms <= 0 or frequency <= 0 or load_r <= 0:
            return {"error": "Voltage, frequency, and load resistance must be positive."}
        
        vm = voltage_rms * math.sqrt(2.0)
        alpha = math.radians(firing_angle_deg) if is_controlled else 0.0
        
        # 1. Analytical calculations
        if topology == "half_wave":
            # Vdc = (Vm / 2pi) * (1 + cos(alpha))
            vdc = (vm / (2.0 * math.pi)) * (1.0 + math.cos(alpha))
            # Vrms = Vm * sqrt((1 / 4pi) * (pi - alpha + sin(2*alpha)/2))
            vrms = vm * math.sqrt((1.0 / (4.0 * math.pi)) * (math.pi - alpha + 0.5 * math.sin(2.0 * alpha)))
        else: # full_wave or bridge
            # Vdc = (Vm / pi) * (1 + cos(alpha))
            vdc = (vm / math.pi) * (1.0 + math.cos(alpha))
            # Vrms = Vm * sqrt((1 / 2pi) * (pi - alpha + sin(2*alpha)/2))
            vrms = vm * math.sqrt((1.0 / (2.0 * math.pi)) * (math.pi - alpha + 0.5 * math.sin(2.0 * alpha)))
            
        idc = vdc / load_r
        irms = vrms / load_r
        
        form_factor = vrms / vdc if vdc > 0 else 0.0
        # Ripple Factor = sqrt(FF^2 - 1)
        ripple_factor = math.sqrt(max(0.0, form_factor**2 - 1.0))
        
        # Rectification Efficiency = P_dc / P_ac = (Vdc * Idc) / (Vrms * Irms) = Vdc^2 / Vrms^2
        efficiency = (vdc**2 / vrms**2) * 100.0 if vrms > 0 else 0.0
        
        # 2. Time-series waveform generation
        t_stop = cycles_to_plot / frequency
        t_steps = 400
        t_arr = np.linspace(0, t_stop, t_steps)
        omega = 2.0 * math.pi * frequency
        
        v_input = []
        v_output = []
        i_output = []
        
        for t in t_arr:
            theta = (omega * t) % (2.0 * math.pi)
            vin = vm * math.sin(omega * t)
            v_input.append(float(vin))
            
            vout = 0.0
            if topology == "half_wave":
                # Conducts only during positive half-cycle, and after firing angle
                if alpha <= theta <= math.pi:
                    vout = vin
            else: # full_wave or bridge
                # Conducts in first half-cycle after alpha, or second half-cycle after (pi + alpha)
                if alpha <= theta <= math.pi:
                    vout = vin
                elif (math.pi + alpha) <= theta <= (2.0 * math.pi):
                    vout = -vin  # rectified
            
            v_output.append(float(vout))
            i_output.append(float(vout / load_r))
            
        return {
            "average_voltage": round(vdc, 2),
            "rms_voltage": round(vrms, 2),
            "average_current": round(idc, 3),
            "rms_current": round(irms, 3),
            "ripple_factor": round(ripple_factor, 3),
            "form_factor": round(form_factor, 3),
            "efficiency": round(efficiency, 2),
            "waveforms": {
                "time": t_arr.tolist(),
                "input_voltage": v_input,
                "output_voltage": v_output,
                "output_current": i_output
            }
        }
