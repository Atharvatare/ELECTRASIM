from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, AIConversation, Project
from ..schemas import AIAskRequest, AIAskResponse, AIChatMessage
from .auth import get_current_user, User
from ..ai.assistant import AIAssistant

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/ask", response_model=AIAskResponse)
def ask_assistant(req: AIAskRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify project
    proj = db.query(Project).filter(Project.id == req.project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Get conversation history
    conv = db.query(AIConversation).filter(AIConversation.project_id == req.project_id).order_by(AIConversation.id.desc()).first()
    
    # Format context of previous messages
    context = ""
    history_messages = []
    if conv:
        history_messages = conv.messages
        # Take last 6 messages as context
        last_msgs = history_messages[-6:]
        for m in last_msgs:
            context += f"{m['role'].upper()}: {m['content']}\n"
            
    # Run query
    res = AIAssistant.ask(question=req.question, netlist=req.netlist, project_context=context)
    
    # Save to history
    new_user_msg = {"role": "user", "content": req.question}
    new_assistant_msg = {"role": "assistant", "content": res["answer"]}
    
    updated_messages = history_messages + [new_user_msg, new_assistant_msg]
    
    if conv:
        conv.messages = updated_messages
        db.commit()
    else:
        new_conv = AIConversation(
            project_id=req.project_id,
            messages=updated_messages
        )
        db.add(new_conv)
        db.commit()
        
    return AIAskResponse(
        answer=res["answer"],
        steps=res.get("steps", [])
    )

@router.get("/history/{project_id}", response_model=List[AIChatMessage])
def get_chat_history(project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    conv = db.query(AIConversation).filter(AIConversation.project_id == project_id).order_by(AIConversation.id.desc()).first()
    if not conv:
        return []
        
    chat_list = []
    for msg in conv.messages:
        chat_list.append(AIChatMessage(role=msg["role"], content=msg["content"]))
    return chat_list
