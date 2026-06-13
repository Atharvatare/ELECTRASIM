import numpy as np
from typing import List, Dict, Any

class StateSpaceSolver:
    """
    Solves State-Space system characteristics:
      - Controllability Matrix & Rank
      - Observability Matrix & Rank
      - Poles (Eigenvalues) & Stability
      - State feedback gain (K) using Ackermann's Pole Placement
    """

    @staticmethod
    def analyze_system(
        A_list: List[List[float]], 
        B_list: List[List[float]], 
        C_list: List[List[float]]
    ) -> Dict[str, Any]:
        """
        Analyze a state space system given A, B, C matrices.
        """
        A = np.array(A_list, dtype=float)
        B = np.array(B_list, dtype=float)
        C = np.array(C_list, dtype=float)

        n = A.shape[0]
        if A.shape[1] != n:
            return {"error": "Matrix A must be square (n x n)."}
        if B.shape[0] != n:
            return {"error": f"Matrix B must have {n} rows."}
        if C.shape[1] != n:
            return {"error": f"Matrix C must have {n} columns."}

        # 1. Controllability Matrix
        # Pc = [B  AB  A^2B ... A^(n-1)B]
        Pc_cols = [B]
        temp = B
        for _ in range(1, n):
            temp = A @ temp
            Pc_cols.append(temp)
        
        # Concatenate columns
        Pc = np.hstack(Pc_cols)
        pc_rank = int(np.linalg.matrix_rank(Pc))
        is_controllable = (pc_rank == n)

        # 2. Observability Matrix
        # Po = [C; CA; CA^2; ...; CA^(n-1)]
        Po_rows = [C]
        temp = C
        for _ in range(1, n):
            temp = temp @ A
            Po_rows.append(temp)
        
        Po = np.vstack(Po_rows)
        po_rank = int(np.linalg.matrix_rank(Po))
        is_observable = (po_rank == n)

        # 3. Poles (Eigenvalues of A)
        poles = np.linalg.eigvals(A)
        poles_list = [{"real": float(p.real), "imag": float(p.imag)} for p in poles]
        
        # Stability check (Hurwitz: all real parts < 0)
        is_stable = all(p.real < -1e-9 for p in poles)

        return {
            "n": n,
            "controllability_matrix": Pc.tolist(),
            "controllability_rank": pc_rank,
            "is_controllable": is_controllable,
            "observability_matrix": Po.tolist(),
            "observability_rank": po_rank,
            "is_observable": is_observable,
            "poles": poles_list,
            "is_stable": is_stable
        }

    @staticmethod
    def design_pole_placement(
        A_list: List[List[float]], 
        B_list: List[List[float]], 
        desired_poles: List[float]
    ) -> Dict[str, Any]:
        """
        Designs state feedback controller u = -Kx + r
        using Ackermann's formula: K = [0 0 ... 1] * Pc^-1 * phi(A)
        """
        A = np.array(A_list, dtype=float)
        B = np.array(B_list, dtype=float)
        desired = np.array(desired_poles, dtype=complex)

        n = A.shape[0]
        if B.shape[1] != 1:
            return {"error": "Ackermann's formula requires a single-input system (B must be n x 1)."}

        # 1. Controllability check
        Pc_cols = [B]
        temp = B
        for _ in range(1, n):
            temp = A @ temp
            Pc_cols.append(temp)
        Pc = np.hstack(Pc_cols)
        
        if np.linalg.matrix_rank(Pc) < n:
            return {"error": "System is not controllable. Pole placement is impossible."}

        # 2. Desired characteristic polynomial coefficients
        poly_coeffs = np.poly(desired)
        
        # 3. Compute matrix polynomial phi(A)
        phi_A = np.zeros_like(A, dtype=float)
        for i, coeff in enumerate(poly_coeffs):
            power = n - i
            coeff_val = float(coeff.real)
            if power > 0:
                phi_A += coeff_val * np.linalg.matrix_power(A, power)
            else:
                phi_A += coeff_val * np.eye(n)

        # 4. Apply Ackermann's
        Pc_inv = np.linalg.inv(Pc)
        last_row = Pc_inv[-1, :]
        K = last_row @ phi_A

        return {
            "K": K.tolist(),
            "controllability_matrix": Pc.tolist()
        }
