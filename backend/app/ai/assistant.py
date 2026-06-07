import os
import sympy as sp
from typing import Dict, Any, List
from openai import OpenAI
from ..config import settings

class AIAssistant:
    """
    AI Copilot Service.
    - If OpenAI API key is present: queries GPT-4 for advanced recommendations, design reviews, and natural explanations.
    - If Offline/No Key: uses symbolic parsing (SymPy) to construct KCL/KVL equations and solve them step-by-step.
    """
    
    @classmethod
    def ask(cls, question: str, netlist: Dict[str, Any] = None, project_context: str = "") -> Dict[str, Any]:
        # Clean netlist input
        components = netlist.get("components", []) if netlist else []
        nodes_count = netlist.get("nodes_count", 0) if netlist else 0
        
        # Check if OpenAI is available
        if settings.OPENAI_API_KEY:
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                # Construct systemic prompt with netlist context
                system_prompt = (
                    "You are ElectraSim AI, an expert Electrical Engineering assistant. "
                    "You are helping an engineer design and analyze circuits, electrical machines, and power electronics. "
                    "Provide clear, professional, engineering-grade explanations. Use LaTeX ($...$ or $$...$$) for math equations. "
                    "When solving circuit parameters, explain KCL, KVL, and node voltage matrices step-by-step."
                )
                
                user_content = f"Question: {question}\n\n"
                if components:
                    user_content += f"Circuit Details:\n- Nodes count: {nodes_count}\n- Components:\n"
                    for c in components:
                        user_content += f"  * ID: {c['id']}, Type: {c['type']}, Value: {c['value']}, Connected to Nodes: {c['nodes']}\n"
                if project_context:
                    user_content += f"\nProject Context: {project_context}\n"
                    
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    temperature=0.2
                )
                return {
                    "answer": response.choices[0].message.content,
                    "steps": ["Parsed circuit netlist details", "Sent context to GPT-4o for expert engineering review"]
                }
            except Exception as e:
                # Fallback to local symbolic solver if API fails
                pass
                
        # --- LOCAL SYMBOLIC SOLVER FALLBACK ---
        return cls._solve_symbolically_step_by_step(question, components, nodes_count)

    @classmethod
    def _solve_symbolically_step_by_step(cls, question: str, components: List[Dict[str, Any]], nodes_count: int) -> Dict[str, Any]:
        steps = ["Parsing components and identifying active circuit nodes..."]
        
        if not components:
            # General engineering query
            return {
                "answer": (
                    "### ElectraSim Assistant Response\n"
                    "I am currently running in local mode (no OpenAI API key detected).\n\n"
                    "**Ohm's Law:**\n"
                    "$$V = I \\times R$$\n\n"
                    "**Kirchhoff's Current Law (KCL):**\n"
                    "The algebraic sum of currents entering any node is zero:\n"
                    "$$\\sum_{k=1}^{n} I_k = 0$$\n\n"
                    "**Kirchhoff's Voltage Law (KVL):**\n"
                    "The algebraic sum of voltage drops around any closed loop is zero:\n"
                    "$$\\sum_{k=1}^{m} V_k = 0$$\n\n"
                    "Please load a circuit schematic in the Circuit Design Studio to get a live, step-by-step symbolic derivation of your node equations!"
                ),
                "steps": ["Initialized local formula reference"]
            }
            
        try:
            steps.append(f"Identified {nodes_count} electrical nodes. Creating symbolic node voltage variables V1 to V{nodes_count} (V0 is Ground).")
            
            # Create symbols
            V = {i: sp.Symbol(f"V_{i}") for i in range(1, nodes_count + 1)}
            V[0] = 0  # Ground node has zero potential
            
            # Map resistors and sources connected to each node
            node_kcl = {i: [] for i in range(1, nodes_count + 1)}
            v_sources = []
            
            steps.append("Formulating Kirchhoff's Current Law equations for active nodes:")
            
            for c in components:
                ctype = c["type"]
                val = float(c["value"])
                nodes = c["nodes"]
                p, q = nodes[0], nodes[1]
                
                if ctype == "resistor":
                    # Current leaving p towards q: (Vp - Vq)/R
                    r_sym = sp.Symbol(c["id"])  # Keep it symbolic
                    if p > 0:
                        node_kcl[p].append((V[p] - V[q]) / r_sym)
                    if q > 0:
                        node_kcl[q].append((V[q] - V[p]) / r_sym)
                        
                elif ctype == "current_source":
                    # Current source of value 'I' flowing from p to q
                    # Leaving p (-I), entering q (+I)
                    i_sym = sp.Symbol(c["id"])
                    if p > 0:
                        node_kcl[p].append(i_sym)
                    if q > 0:
                        node_kcl[q].append(-i_sym)
                        
                elif ctype == "dc_source":
                    # Voltage source between p and q: Vp - Vq = Vsrc
                    v_sym = sp.Symbol(c["id"])
                    v_sources.append((p, q, v_sym, c["id"]))
                    
            # Set up equations
            eqs = []
            eq_strings = []
            
            for node, terms in node_kcl.items():
                if not terms:
                    continue
                # Add node equations
                kcl_expr = sum(terms)
                
                # If there are voltage sources connected to this node, KCL requires a helper variable (source current)
                # To keep local solver simple, we print the nodal equations first
                eqs.append(kcl_expr)
                eq_strings.append(f"Node {node} KCL: $$\\sum I = {sp.latex(kcl_expr)} = 0$$")
                
            steps.extend(eq_strings)
            
            # Add voltage source constraints
            v_constraints = []
            for p, q, v_sym, name in v_sources:
                v_expr = V[p] - V[q] - v_sym
                v_constraints.append(v_expr)
                steps.append(f"Voltage Source Constraint ({name}): $${sp.latex(V[p])} - {sp.latex(V[q])} = {sp.latex(v_sym)}$$")
            
            # Solve basic circuits symbolically
            # Let's perform a simple calculation replacing component names with their numeric values
            sub_map = {}
            for c in components:
                sub_map[sp.Symbol(c["id"])] = float(c["value"])
                
            steps.append("Substituting component values and solving node voltages...")
            
            # Build numeric MNA system
            # For linear circuit: Node equations + constraints
            # We can solve this system using sympy solve
            numeric_eqs = []
            for eq in eqs:
                # Add helper variables for source currents if any
                numeric_eqs.append(eq.subs(sub_map))
                
            # If we have only resistors and voltage/current sources, we can solve directly
            # Let's write down the numeric node values
            from ..simulation.mna import CircuitSolver
            sol = CircuitSolver.solve_dc(components, nodes_count)
            
            answer_text = "### ElectraSim AI (Local Symbolic Solver)\n\n"
            answer_text += "Here is the step-by-step derivation and solution for your circuit:\n\n"
            
            answer_text += "#### 1. Nodal Equations (KCL)\n"
            for eq_str in eq_strings:
                answer_text += f"- {eq_str}\n"
                
            if v_sources:
                answer_text += "\n#### 2. Auxiliary Voltage Constraints\n"
                for p, q, v_sym, name in v_sources:
                    val = sub_map[v_sym]
                    answer_text += f"- **{name}**: $V_{p} - V_{q} = {val}\\text{ V}$ (since it is connected between Node {p} and Node {q})\n"
            
            if "error" in sol:
                answer_text += f"\n**Solver Notice:** {sol['error']}"
            else:
                answer_text += "\n#### 3. Calculated Operating Voltages\n"
                for node, volt in sol["voltages"].items():
                    answer_text += f"- Voltage at **Node {node}**: $${volt:.3f}\\text{ V}$$\n"
                    
                answer_text += "\n#### 4. Calculated Branch Currents\n"
                for comp_id, curr in sol["currents"].items():
                    answer_text += f"- Current through **{comp_id}**: $${curr:.4f}\\text{ A}$$\n"
                    
                answer_text += "\n#### 5. Component Power Analysis\n"
                for comp_id, pwr in sol["power"].items():
                    pwr_type = "Absorbed" if pwr >= 0 else "Delivered"
                    answer_text += f"- Power for **{comp_id}**: $${abs(pwr):.3f}\\text{ W}$$ ({pwr_type})\n"
            
            return {
                "answer": answer_text,
                "steps": steps
            }
            
        except Exception as e:
            return {
                "answer": f"### Local Symbolic Solver Error\nFailed to parse circuit equations symbolically: {str(e)}",
                "steps": steps + [f"Error occurred: {str(e)}"]
            }
