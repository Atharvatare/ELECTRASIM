import math
import numpy as np

class ChopperSimulator:
    @staticmethod
    def simulate(
        topology: str,          # buck, boost, buck_boost
        vin: float, 
        duty_cycle: float, 
        frequency: float, 
        load_r: float,
        inductance_h: float = 1e-3,
        capacitance_f: float = 100e-6,
        cycles_to_plot: float = 3.0
    ):
        """
        Simulates DC-DC converters (choppers) in steady state continuous conduction mode.
        """
        if vin <= 0 or frequency <= 0 or load_r <= 0 or duty_cycle <= 0 or duty_cycle >= 1.0:
            return {"error": "All inputs must be positive and duty cycle must be between 0.0 and 1.0."}
            
        D = duty_cycle
        fs = frequency
        L = inductance_h
        C = capacitance_f
        R = load_r
        
        # 1. Analytical calculations (Continuous Conduction Mode)
        if topology == "buck":
            # Vout = D * Vin
            vout = D * vin
            # Inductor Ripple Current: delta_I = Vin * D * (1 - D) / (L * fs)
            delta_i = (vin * D * (1.0 - D)) / (L * fs)
            # Output Ripple Voltage: delta_V = Vin * D * (1 - D) / (8 * L * C * fs^2)
            delta_v = (vin * D * (1.0 - D)) / (8.0 * L * C * (fs ** 2))
            
        elif topology == "boost":
            # Vout = Vin / (1 - D)
            vout = vin / (1.0 - D)
            # Inductor Ripple Current: delta_I = Vin * D / (L * fs)
            delta_i = (vin * D) / (L * fs)
            # Output Ripple Voltage: delta_V = Iout * D / (C * fs) = Vout * D / (R * C * fs)
            iout = vout / R
            delta_v = (iout * D) / (C * fs)
            
        else: # buck_boost
            # Vout = Vin * D / (1 - D)
            vout = (vin * D) / (1.0 - D)
            # Inductor Ripple Current: delta_I = Vin * D / (L * fs)
            delta_i = (vin * D) / (L * fs)
            # Output Ripple Voltage: delta_V = Iout * D / (C * fs) = Vout * D / (R * C * fs)
            iout = vout / R
            delta_v = (iout * D) / (C * fs)
            
        i_avg_out = vout / R
        
        # 2. Time-series waveform generation
        t_stop = cycles_to_plot / fs
        t_steps = 600
        t_arr = np.linspace(0, t_stop, t_steps)
        period = 1.0 / fs
        
        v_sw = []   # switching node voltage
        v_out = []  # output capacitor voltage
        i_ind = []  # inductor current
        
        # Determine average inductor current
        if topology == "buck":
            i_ind_avg = i_avg_out
        elif topology == "boost":
            i_ind_avg = i_avg_out / (1.0 - D)
        else: # buck_boost
            i_ind_avg = i_avg_out / (1.0 - D)
            
        for t in t_arr:
            t_cycle = t % period
            is_on = t_cycle < (D * period)
            
            # Switch node voltage
            if topology == "buck":
                vsw = vin if is_on else 0.0
            elif topology == "boost":
                vsw = 0.0 if is_on else vout
            else: # buck_boost
                vsw = vin if is_on else -vout
            v_sw.append(float(vsw))
            
            # Inductor current waveform (triangular ripple)
            # rises during ON, falls during OFF
            if is_on:
                # rising slope
                i_val = (i_ind_avg - delta_i/2.0) + (delta_i / (D * period)) * t_cycle
            else:
                # falling slope
                i_val = (i_ind_avg + delta_i/2.0) - (delta_i / ((1.0 - D) * period)) * (t_cycle - D * period)
            
            i_ind.append(float(max(0.0, i_val)))
            
            # Output voltage ripple waveform (triangular, 90deg out of phase with inductor ripple or rising/falling based on switches)
            # Buck: capacitor current = i_L - i_out, so v_out integrates capacitor current.
            # Boost / Buck-Boost: during ON, capacitor discharges through R. During OFF, capacitor is charged by i_L - i_out.
            if topology == "buck":
                # Integrator of triangle wave is piecewise quadratic, but we can approximate it as triangular
                # for simple visualization. Peaks when i_L = i_out
                # Here we model a simple triangle ripple for output voltage
                if t_cycle < period / 2.0:
                    vo_val = vout - delta_v/2.0 + (delta_v / (period/2.0)) * t_cycle
                else:
                    vo_val = vout + delta_v/2.0 - (delta_v / (period/2.0)) * (t_cycle - period/2.0)
            else: # boost and buck_boost
                # discharges during ON, charges during OFF
                if is_on:
                    vo_val = (vout + delta_v/2.0) - (delta_v / (D * period)) * t_cycle
                else:
                    vo_val = (vout - delta_v/2.0) + (delta_v / ((1.0 - D) * period)) * (t_cycle - D * period)
                    
            v_out.append(float(vo_val))
            
        return {
            "average_output_voltage": round(vout, 2),
            "output_ripple_voltage": round(delta_v, 4),
            "inductor_ripple_current": round(delta_i, 3),
            "duty_cycle": round(D, 2),
            "average_output_current": round(i_avg_out, 3),
            "waveforms": {
                "time": t_arr.tolist(),
                "switch_voltage": v_sw,
                "output_voltage": v_out,
                "inductor_current": i_ind
            }
        }
