from fastapi import APIRouter
from pydantic import BaseModel

from app.services.agent_service import chat

router = APIRouter(prefix="/agent", tags=["agent"])


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    map_context: dict | None = None
    history: list[HistoryMessage] | None = None


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(body: ChatRequest):
    history_dicts = (
        [{"role": m.role, "content": m.content} for m in body.history]
        if body.history
        else None
    )
    reply = await chat(body.message, body.map_context, history_dicts)
    return ChatResponse(reply=reply)
