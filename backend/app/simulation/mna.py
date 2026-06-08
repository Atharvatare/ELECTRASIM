import numpy as np
import math

class CircuitSolver:
    """
    ElectraSim Core Circuit Simulation Engine using Modified Nodal Analysis (MNA).
    Supports:
      - Resistors, Capacitors, Inductors
      - DC Voltage Sources, AC Voltage Sources, Current Sources
      - Diodes (Nonlinear solver using Newton-Raphson)
    """
    
    @staticmethod
    def solve_dc(components, nodes_count):
        """
        Solves the DC operating point of a circuit.
        components: List of dicts representing circuit components, e.g.:
          {"id": "R1", "type": "resistor", "value": 10.0, "nodes": [1, 2]}
          {"id": "V1", "type": "dc_source", "value": 12.0, "nodes": [1, 0]}
        nodes_count: Maximum node index in the circuit (Node 0 is always Ground).
        """
        # Map complex/sensor/IC components to MNA primitives
        mna_components = []
        for c in components:
            ctype = c["type"]
            cid = c["id"]
            nodes = c["nodes"]
            val = float(c["value"])
            
            if ctype in ("resistor", "ldr", "thermistor", "bjt", "mosfet", "relay"):
                mna_components.append({"id": cid, "type": "resistor", "value": val, "nodes": nodes})
            elif ctype == "hall_sensor":
                mna_components.append({"id": cid, "type": "resistor", "value": 0.01, "nodes": nodes})
            elif ctype == "lm7805":
                mna_components.append({"id": cid, "type": "dc_source", "value": 5.0, "nodes": nodes})
            elif ctype == "lm35":
                v_out = val * 0.01 if val > 2.0 else val
                mna_components.append({"id": cid, "type": "dc_source", "value": v_out, "nodes": nodes})
            elif ctype == "timer555":
                mna_components.append({"id": cid, "type": "ac_source", "value": 5.0, "frequency": 50.0, "nodes": nodes})
            elif ctype == "opamp":
                mna_components.append({"id": cid, "type": "resistor", "value": 100000.0, "nodes": nodes})
            elif ctype in ("and_gate", "or_gate", "not_gate"):
                mna_components.append({"id": cid, "type": "resistor", "value": 1000.0, "nodes": nodes})
            else:
                mna_components.append({"id": cid, "type": ctype, "value": val, "nodes": nodes})
                
        components = mna_components

        # 1. Map nodes. Ground node is index 0. Active nodes are 1 to nodes_count.
        # N is the number of active nodes (excluding ground).
        N = nodes_count
        
        # 2. Count independent voltage sources (which require adding active equations in MNA)
        v_sources = [c for c in components if c["type"] in ("dc_source", "ac_source")]
        M = len(v_sources)
        
        # Total size of the MNA matrix: (N + M) x (N + M)
        dim = N + M
        if dim == 0:
            return {"voltages": {}, "currents": {}, "power": {}}
            
        A = np.zeros((dim, dim))
        Z = np.zeros(dim)
        
        # Helper map: voltage source ID -> MNA index offset (from N)
        v_source_map = {vs["id"]: idx for idx, vs in enumerate(v_sources)}
        
        # 3. Handle nonlinear devices (Diodes). 
        # For simplicity, we initialize diodes with a linear conductance.
        # If diodes exist, we use Newton-Raphson iteration.
        diodes = [c for c in components if c["type"] == "diode"]
        has_nonlinear = len(diodes) > 0
        
        # Diode parameters
        Is = 1e-12  # Saturation current (A)
        Vt = 0.026  # Thermal voltage at room temp (V)
        n = 1.0     # Emission coefficient
        
        # Store diode operating voltage for iteration
        v_diode_prev = {d["id"]: 0.6 for d in diodes}
        
        max_iters = 50
        tol = 1e-5
        converged = False
        
        # Solution vectors
        X = np.zeros(dim)
        
        for iteration in range(max_iters if has_nonlinear else 1):
            A.fill(0)
            Z.fill(0)
            
            # Formulate linear parts
            for comp in components:
                ctype = comp["type"]
                nodes = comp["nodes"]
                val = float(comp["value"])
                
                # Resistors
                if ctype == "resistor":
                    g = 1.0 / max(val, 1e-9)
                    p, q = nodes[0], nodes[1]
                    if p > 0:
                        A[p-1, p-1] += g
                    if q > 0:
                        A[q-1, q-1] += g
                    if p > 0 and q > 0:
                        A[p-1, q-1] -= g
                        A[q-1, p-1] -= g
                        
                # Current sources
                elif ctype == "current_source":
                    # Current flows from node[0] to node[1] (convention)
                    p, q = nodes[0], nodes[1]
                    if p > 0:
                        Z[p-1] -= val  # Leaving node p
                    if q > 0:
                        Z[q-1] += val  # Entering node q
                        
                # Voltage sources
                elif ctype in ("dc_source", "ac_source"):
                    # For AC source in DC analysis, we treat it as its DC value (or offset)
                    vs_idx = v_source_map[comp["id"]]
                    p, q = nodes[0], nodes[1]
                    # Connect to A matrix columns/rows (N + vs_idx)
                    if p > 0:
                        A[p-1, N + vs_idx] = 1.0
                        A[N + vs_idx, p-1] = 1.0
                    if q > 0:
                        A[q-1, N + vs_idx] = -1.0
                        A[N + vs_idx, q-1] = -1.0
                    Z[N + vs_idx] = val
                    
                # Capacitors in DC: Open circuit (do nothing)
                # Inductors in DC: Short circuit (conductance is very large, or treated as 0V voltage source)
                elif ctype == "inductor":
                    # Treat as a resistor with a very small resistance (1e-6 ohms)
                    g = 1e6
                    p, q = nodes[0], nodes[1]
                    if p > 0:
                        A[p-1, p-1] += g
                    if q > 0:
                        A[q-1, q-1] += g
                    if p > 0 and q > 0:
                        A[p-1, q-1] -= g
                        A[q-1, p-1] -= g
                        
                elif ctype == "capacitor":
                    # Open circuit, very high resistance (1e-9 mhos / 1G ohms)
                    g = 1e-9
                    p, q = nodes[0], nodes[1]
                    if p > 0:
                        A[p-1, p-1] += g
                    if q > 0:
                        A[q-1, q-1] += g
                    if p > 0 and q > 0:
                        A[p-1, q-1] -= g
                        A[q-1, p-1] -= g
            
            # Formulate nonlinear parts (Diodes)
            for d in diodes:
                p, q = d["nodes"][0], d["nodes"][1]
                vd_prev = v_diode_prev[d["id"]]
                
                # Linearized diode model: Id = Id(Vd_prev) + Gd*(Vd - Vd_prev)
                # Gd = Is * e^(Vd_prev / (n*Vt)) / (n*Vt)
                # Id(Vd_prev) = Is * (e^(Vd_prev / (n*Vt)) - 1)
                # Equivalent to conductance Gd in parallel with current source Ieq = Gd * Vd_prev - Id(Vd_prev)
                # Limit exponential argument to prevent numerical overflow
                exp_arg = min(vd_prev / (n * Vt), 40)
                exp_val = math.exp(exp_arg)
                
                gd = (Is / (n * Vt)) * exp_val
                id_val = Is * (exp_val - 1.0)
                ieq = gd * vd_prev - id_val
                
                # Apply Gd to conductance matrix
                if p > 0:
                    A[p-1, p-1] += gd
                if q > 0:
                    A[q-1, q-1] += gd
                if p > 0 and q > 0:
                    A[p-1, q-1] -= gd
                    A[q-1, p-1] -= gd
                
                # Apply Ieq (current leaves p and enters q)
                if p > 0:
                    Z[p-1] -= ieq
                if q > 0:
                    Z[q-1] += ieq
            
            # Solve system
            try:
                # Add tiny diagonal regularization to avoid singular matrices if user makes a mistake
                A_reg = A + np.eye(dim) * 1e-12
                X_new = np.linalg.solve(A_reg, Z)
            except np.linalg.LinAlgError:
                # Singular matrix, circuit is floating or invalid
                return {"error": "Singular matrix. Ensure the circuit is properly grounded and has valid connection paths."}
            
            # Check convergence for nonlinear devices
            if has_nonlinear:
                diff = 0.0
                for d in diodes:
                    p, q = d["nodes"][0], d["nodes"][1]
                    vp = X_new[p-1] if p > 0 else 0.0
                    vq = X_new[q-1] if q > 0 else 0.0
                    vd_new = vp - vq
                    
                    # Damping updates to stabilize convergence
                    vd_new = 0.5 * vd_new + 0.5 * v_diode_prev[d["id"]]
                    
                    diff = max(diff, abs(vd_new - v_diode_prev[d["id"]]))
                    v_diode_prev[d["id"]] = vd_new
                    
                X = X_new
                if diff < tol:
                    converged = True
                    break
            else:
                X = X_new
                converged = True
                break
                
        # 4. Extract voltages and branch currents
        voltages = {"0": 0.0}
        for i in range(N):
            voltages[str(i+1)] = float(X[i])
            
        currents = {}
        for vs in v_sources:
            idx = v_source_map[vs["id"]]
            # Note: MNA current is defined as flowing into the positive terminal of the voltage source
            currents[vs["id"]] = float(X[N + idx])
            
        # Calculate branch currents through passive components and diodes
        for comp in components:
            ctype = comp["type"]
            nodes = comp["nodes"]
            val = float(comp["value"])
            p, q = nodes[0], nodes[1]
            vp = voltages[str(p)]
            vq = voltages[str(q)]
            v_diff = vp - vq
            
            if ctype == "resistor":
                currents[comp["id"]] = v_diff / max(val, 1e-9)
            elif ctype == "capacitor":
                currents[comp["id"]] = 0.0  # Steady state DC
            elif ctype == "inductor":
                # Current can be anything, but we estimate it or set it to zero for simple DC OP
                currents[comp["id"]] = v_diff / 1e-6  # modeled short
            elif ctype == "current_source":
                currents[comp["id"]] = val
            elif ctype == "diode":
                exp_arg = min(v_diff / (n * Vt), 40)
                currents[comp["id"]] = Is * (math.exp(exp_arg) - 1.0)
                
        # Calculate power P = V * I
        power = {}
        for comp in components:
            nodes = comp["nodes"]
            p, q = nodes[0], nodes[1]
            vp = voltages[str(p)]
            vq = voltages[str(q)]
            v_diff = vp - vq
            i_comp = currents.get(comp["id"], 0.0)
            
            # Power delivered/absorbed (convention: positive is power absorbed/lost)
            if comp["type"] in ("dc_source", "ac_source"):
                # Current through source flows from negative terminal to positive terminal usually,
                # but MNA output is defined as current entering positive node.
                # So P = v_diff * (-i_comp)
                power[comp["id"]] = v_diff * i_comp
            else:
                power[comp["id"]] = v_diff * i_comp
                
        return {
            "voltages": voltages,
            "currents": currents,
            "power": power,
            "converged": converged
        }

    @staticmethod
    def solve_transient(components, nodes_count, t_stop=0.01, step=5e-5):
        """
        Solves the circuit in time domain (Transient analysis) using Backward Euler integration.
        Returns a time series of node voltages and branch currents.
        """
        # Map complex/sensor/IC components to MNA primitives
        mna_components = []
        for c in components:
            ctype = c["type"]
            cid = c["id"]
            nodes = c["nodes"]
            val = float(c["value"])
            
            if ctype in ("resistor", "ldr", "thermistor", "bjt", "mosfet", "relay"):
                mna_components.append({"id": cid, "type": "resistor", "value": val, "nodes": nodes})
            elif ctype == "hall_sensor":
                mna_components.append({"id": cid, "type": "resistor", "value": 0.01, "nodes": nodes})
            elif ctype == "lm7805":
                mna_components.append({"id": cid, "type": "dc_source", "value": 5.0, "nodes": nodes})
            elif ctype == "lm35":
                v_out = val * 0.01 if val > 2.0 else val
                mna_components.append({"id": cid, "type": "dc_source", "value": v_out, "nodes": nodes})
            elif ctype == "timer555":
                mna_components.append({"id": cid, "type": "ac_source", "value": 5.0, "frequency": 50.0, "nodes": nodes})
            elif ctype == "opamp":
                mna_components.append({"id": cid, "type": "resistor", "value": 100000.0, "nodes": nodes})
            elif ctype in ("and_gate", "or_gate", "not_gate"):
                mna_components.append({"id": cid, "type": "resistor", "value": 1000.0, "nodes": nodes})
            else:
                mna_components.append({"id": cid, "type": ctype, "value": val, "nodes": nodes})
                
        components = mna_components

        # Time steps array
        time_steps = np.arange(0, t_stop, step)
        steps_count = len(time_steps)
        
        N = nodes_count
        v_sources = [c for c in components if c["type"] in ("dc_source", "ac_source")]
        M = len(v_sources)
        dim = N + M
        
        if dim == 0:
            return {"time": [], "voltages": {}, "currents": {}}
            
        v_source_map = {vs["id"]: idx for idx, vs in enumerate(v_sources)}
        
        # State variables for history tracking:
        # Capacitors: store past voltage v_c
        # Inductors: store past current i_l
        caps = [c for c in components if c["type"] == "capacitor"]
        inducts = [c for c in components if c["type"] == "inductor"]
        diodes = [c for c in components if c["type"] == "diode"]
        
        # Historical state dictionaries
        v_cap_history = {c["id"]: 0.0 for c in caps}  # initial condition = 0V
        i_ind_history = {i["id"]: 0.0 for i in inducts}  # initial condition = 0A
        
        # Output containers
        results = {
            "time": time_steps.tolist(),
            "voltages": {str(node): [] for node in range(nodes_count + 1)},
            "currents": {comp["id"]: [] for comp in components}
        }
        
        # Simulation loop over time
        for step_idx, t in enumerate(time_steps):
            # Formulate the companion circuit for this time-step
            # For nonlinear circuits with diodes, we also run Newton-Raphson inside the time loop
            v_diode_prev = {d["id"]: 0.6 for d in diodes}
            
            tol = 1e-4
            max_iters = 25
            X_t = np.zeros(dim)
            
            for iteration in range(max_iters if len(diodes) > 0 else 1):
                A = np.zeros((dim, dim))
                Z = np.zeros(dim)
                
                # Assemble linear parts + companion models
                for comp in components:
                    ctype = comp["type"]
                    nodes = comp["nodes"]
                    val = float(comp["value"])
                    p, q = nodes[0], nodes[1]
                    
                    if ctype == "resistor":
                        g = 1.0 / max(val, 1e-9)
                        if p > 0: A[p-1, p-1] += g
                        if q > 0: A[q-1, q-1] += g
                        if p > 0 and q > 0:
                            A[p-1, q-1] -= g
                            A[q-1, p-1] -= g
                            
                    elif ctype == "current_source":
                        if p > 0: Z[p-1] -= val
                        if q > 0: Z[q-1] += val
                        
                    elif ctype == "dc_source":
                        vs_idx = v_source_map[comp["id"]]
                        if p > 0:
                            A[p-1, N + vs_idx] = 1.0
                            A[N + vs_idx, p-1] = 1.0
                        if q > 0:
                            A[q-1, N + vs_idx] = -1.0
                            A[N + vs_idx, q-1] = -1.0
                        Z[N + vs_idx] = val
                        
                    elif ctype == "ac_source":
                        # Value of AC source at time t: val * sin(2 * pi * freq * t)
                        # Expects parameters: frequency. Let's look for frequency in parameters or assume 50Hz
                        freq = float(comp.get("frequency", 50.0))
                        ac_val = val * math.sin(2.0 * math.pi * freq * t)
                        
                        vs_idx = v_source_map[comp["id"]]
                        if p > 0:
                            A[p-1, N + vs_idx] = 1.0
                            A[N + vs_idx, p-1] = 1.0
                        if q > 0:
                            A[q-1, N + vs_idx] = -1.0
                            A[N + vs_idx, q-1] = -1.0
                        Z[N + vs_idx] = ac_val
                        
                    elif ctype == "capacitor":
                        # Companion model (Backward Euler):
                        # G_eq = C / step
                        # I_eq = (C / step) * v_c_past
                        g_eq = val / step
                        ieq = g_eq * v_cap_history[comp["id"]]
                        
                        if p > 0:
                            A[p-1, p-1] += g_eq
                            Z[p-1] += ieq  # current flows out of p (or is it entering? 
                            # Since current is G_eq*V_new - G_eq*V_past, the current source G_eq*V_past
                            # is connected in parallel. Current flows from positive node to negative node.
                            # So it injects current into q and extracts from p.
                            # So: p loses current (-ieq), q gains current (+ieq).
                        if q > 0:
                            A[q-1, q-1] += g_eq
                            Z[q-1] -= ieq
                        if p > 0 and q > 0:
                            A[p-1, q-1] -= g_eq
                            A[q-1, p-1] -= g_eq
                            
                        # If p is ground, then capacitor node is q. 
                        # We need to make sure signs match: v_c = vp - vq.
                        # G_eq*(vp - vq) - I_eq = current flowing from p to q.
                        # KCL at p: G_eq*(vp - vq) - I_eq = 0 => (G_eq)vp - (G_eq)vq = I_eq => Z[p] += I_eq
                        # KCL at q: -G_eq*(vp - vq) + I_eq = 0 => -(G_eq)vp + (G_eq)vq = -I_eq => Z[q] -= I_eq
                        # Yes! Z[p] += ieq, Z[q] -= ieq is correct.
                        
                    elif ctype == "inductor":
                        # Companion model (Backward Euler):
                        # G_eq = step / L
                        # I_eq = i_l_past
                        # Current flows from p to q.
                        # G_eq*(vp - vq) + I_eq = current flowing from p to q.
                        # KCL at p: Z[p] -= I_eq
                        # KCL at q: Z[q] += I_eq
                        g_eq = step / val
                        ieq = i_ind_history[comp["id"]]
                        
                        if p > 0:
                            A[p-1, p-1] += g_eq
                            Z[p-1] -= ieq
                        if q > 0:
                            A[q-1, q-1] += g_eq
                            Z[q-1] += ieq
                        if p > 0 and q > 0:
                            A[p-1, q-1] -= g_eq
                            A[q-1, p-1] -= g_eq
                
                # Assemble Nonlinear diodes
                for d in diodes:
                    p, q = d["nodes"][0], d["nodes"][1]
                    vd_prev = v_diode_prev[d["id"]]
                    Is = 1e-12
                    Vt = 0.026
                    n = 1.0
                    
                    exp_arg = min(vd_prev / (n * Vt), 40)
                    exp_val = math.exp(exp_arg)
                    gd = (Is / (n * Vt)) * exp_val
                    id_val = Is * (exp_val - 1.0)
                    ieq = gd * vd_prev - id_val
                    
                    if p > 0: A[p-1, p-1] += gd
                    if q > 0: A[q-1, q-1] += gd
                    if p > 0 and q > 0:
                        A[p-1, q-1] -= gd
                        A[q-1, p-1] -= gd
                    if p > 0: Z[p-1] -= ieq
                    if q > 0: Z[q-1] += ieq
                
                # Solve equations
                try:
                    A_reg = A + np.eye(dim) * 1e-12
                    X_new = np.linalg.solve(A_reg, Z)
                except np.linalg.LinAlgError:
                    # Fallback to zero
                    X_new = np.zeros(dim)
                
                if len(diodes) > 0:
                    diff = 0.0
                    for d in diodes:
                        p, q = d["nodes"][0], d["nodes"][1]
                        vp = X_new[p-1] if p > 0 else 0.0
                        vq = X_new[q-1] if q > 0 else 0.0
                        vd_new = 0.5 * (vp - vq) + 0.5 * v_diode_prev[d["id"]]
                        diff = max(diff, abs(vd_new - v_diode_prev[d["id"]]))
                        v_diode_prev[d["id"]] = vd_new
                    X_t = X_new
                    if diff < tol:
                        break
                else:
                    X_t = X_new
                    break
            
            # Record results for this time-step
            curr_voltages = {0: 0.0}
            for node in range(1, nodes_count + 1):
                v_node = float(X_t[node-1])
                curr_voltages[node] = v_node
                results["voltages"][str(node)].append(v_node)
            results["voltages"]["0"].append(0.0)
            
            # Update history states and compute currents
            for comp in components:
                ctype = comp["type"]
                nodes = comp["nodes"]
                val = float(comp["value"])
                p, q = nodes[0], nodes[1]
                vp = curr_voltages[p]
                vq = curr_voltages[q]
                v_diff = vp - vq
                
                i_comp = 0.0
                if ctype == "resistor":
                    i_comp = v_diff / max(val, 1e-9)
                elif ctype == "current_source":
                    i_comp = val
                elif ctype == "dc_source":
                    vs_idx = v_source_map[comp["id"]]
                    i_comp = float(X_t[N + vs_idx])
                elif ctype == "ac_source":
                    vs_idx = v_source_map[comp["id"]]
                    i_comp = float(X_t[N + vs_idx])
                elif ctype == "capacitor":
                    # i_c = (C/step) * (v_c_new - v_c_past)
                    i_comp = (val / step) * (v_diff - v_cap_history[comp["id"]])
                    v_cap_history[comp["id"]] = v_diff  # save state
                elif ctype == "inductor":
                    # i_l = (step/L) * v_l_new + i_l_past
                    i_comp = (step / val) * v_diff + i_ind_history[comp["id"]]
                    i_ind_history[comp["id"]] = i_comp  # save state
                elif ctype == "diode":
                    Is = 1e-12
                    Vt = 0.026
                    n = 1.0
                    exp_arg = min(v_diff / (n * Vt), 40)
                    i_comp = Is * (math.exp(exp_arg) - 1.0)
                    
                results["currents"][comp["id"]].append(i_comp)
                
        return results
