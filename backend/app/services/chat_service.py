from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.pinned_memory import PinnedMemory
from app.schemas.chat_session import ChatSessionCreate, ChatSessionUpdate
from app.schemas.chat_message import ChatMessageCreate

def create_chat_session(db: Session, user_id: UUID, session_in: ChatSessionCreate) -> ChatSession:
    db_session = ChatSession(
        user_id=user_id,
        story_id=session_in.story_id,
        character_id=session_in.character_id,
        active_chapter_id=session_in.active_chapter_id,
        persona_id=session_in.persona_id,
        title=session_in.title,
        status="active"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_chat_session(db: Session, session_id: UUID) -> Optional[ChatSession]:
    return db.query(ChatSession).filter(ChatSession.id == session_id).first()

def get_chat_sessions_by_story(db: Session, story_id: UUID, character_id: Optional[UUID] = None, skip: int = 0, limit: int = 100) -> List[ChatSession]:
    query = db.query(ChatSession).filter(ChatSession.story_id == story_id)
    if character_id:
        query = query.filter(ChatSession.character_id == character_id)
    return query.order_by(ChatSession.started_at.desc()).offset(skip).limit(limit).all()

def update_chat_session(db: Session, db_session: ChatSession, session_in: ChatSessionUpdate) -> ChatSession:
    update_data = session_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_session, field, value)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def create_chat_message(db: Session, session_id: UUID, message_in: ChatMessageCreate, memory_context_snapshot: dict = None) -> ChatMessage:
    import re
    response_content = message_in.content
    if message_in.role == "character":
        # 1. Safely fix spaces inside paired asterisks (e.g., * text * -> *text*)
        response_content = re.sub(r'\*\s+([^\*]+?)\s+\*', r'*\1*', response_content)
        response_content = re.sub(r'\*\s+([^\*]+?)\*', r'*\1*', response_content)
        response_content = re.sub(r'\*([^\*]+?)\s+\*', r'*\1*', response_content)
        # 2. Fix glued dialogue (e.g., *text.*"Dialogue" -> *text.*\n\n"Dialogue")
        response_content = re.sub(r'(\*|\w)[\.\,\!\?]*\*\"', r'\1* \n\n"', response_content)
        # 3. Ensure space after closing asterisk if followed by a letter or quote (e.g., *text*word -> *text* word)
        response_content = re.sub(r'\*(?=[A-Za-z\"])', '* ', response_content)
        # Trim leading/trailing whitespace
        response_content = response_content.strip()

    # 4. Save character message
    db_message = ChatMessage(
        session_id=session_id,
        role=message_in.role,
        content=response_content,
        is_system=message_in.is_system,
        trigger_event=message_in.trigger_event,
        memory_context_snapshot=memory_context_snapshot,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_chat_messages(db: Session, session_id: UUID, user_id: UUID, skip: int = 0, limit: int = 100) -> List[ChatMessage]:
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).offset(skip).limit(limit).all()
    # Attach pinned status
    pinned = db.query(PinnedMemory).filter(PinnedMemory.chat_session_id == session_id, PinnedMemory.user_id == user_id, PinnedMemory.source_type == 'chat_message', PinnedMemory.is_active == True).all()
    pinned_ids = {p.chat_message_id for p in pinned}
    for m in messages:
        m.is_pinned = m.id in pinned_ids
    return messages

def get_recent_chat_messages(db: Session, session_id: UUID, limit: int = 10) -> List[ChatMessage]:
    """Fetches the latest N messages and returns them in chronological order."""
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    return list(reversed(messages))

def delete_session_messages(db: Session, session_id: UUID) -> None:
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.commit()

def delete_chat_session(db: Session, session_id: UUID) -> bool:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        # Delete child messages first to avoid FK constraint violations
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.delete(session)
        db.commit()
        return True
    return False

def delete_chat_message(db: Session, session_id: UUID, message_id: UUID) -> bool:
    message = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id == message_id
    ).first()
    if message:
        db.delete(message)
        db.commit()
        return True
    return False

def pin_chat_message(db: Session, session_id: UUID, message_id: UUID, user_id: UUID) -> bool:
    # Check if already pinned and active
    existing = db.query(PinnedMemory).filter_by(chat_message_id=message_id, user_id=user_id, source_type='chat_message').first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
        return True

    # Get message content to store in pinned memory
    message = db.query(ChatMessage).filter_by(id=message_id).first()
    if not message:
        return False
        
    session = get_chat_session(db, session_id)
    title = f"Message with {session.character.name}" if session and session.character else "Chat Message"

    pin = PinnedMemory(
        title=title,
        content=message.content,
        memory_type='other',
        story_id=session.story_id if session else None,
        character_id=session.character_id if session else None,
        user_id=user_id,
        chat_session_id=session_id,
        chat_message_id=message_id,
        source_type='chat_message'
    )
    db.add(pin)
    db.commit()
    return True

def unpin_chat_message(db: Session, session_id: UUID, message_id: UUID, user_id: UUID) -> bool:
    # Soft delete unpin by setting is_active = False to preserve history if desired
    # or hard delete. We will just hard delete to keep it clean as requested for manual pins.
    db.query(PinnedMemory).filter_by(chat_message_id=message_id, user_id=user_id, source_type='chat_message').delete()
    db.commit()
    return True

def get_pinned_chat_messages(db: Session, session_id: UUID, user_id: UUID) -> List[ChatMessage]:
    pins = db.query(PinnedMemory).filter_by(chat_session_id=session_id, user_id=user_id, source_type='chat_message', is_active=True).all()
    message_ids = [p.chat_message_id for p in pins]
    messages = db.query(ChatMessage).filter(ChatMessage.id.in_(message_ids)).order_by(ChatMessage.created_at).all()
    for m in messages:
        m.is_pinned = True
    return messages

def branch_chat_session(db: Session, session_id: UUID, message_id: UUID, user_id: UUID) -> ChatSession:
    original_session = get_chat_session(db, session_id)
    if not original_session:
        return None
        
    # Create new session
    new_session = ChatSession(
        user_id=user_id,
        story_id=original_session.story_id,
        character_id=original_session.character_id,
        active_chapter_id=original_session.active_chapter_id,
        persona_id=original_session.persona_id,
        title=f"{original_session.title} (Branched)",
        status="active"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Copy messages up to message_id
    cutoff_message = db.query(ChatMessage).filter_by(id=message_id, session_id=session_id).first()
    if not cutoff_message:
        return new_session
        
    messages_to_copy = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.created_at <= cutoff_message.created_at
    ).order_by(ChatMessage.created_at).all()
    
    for old_m in messages_to_copy:
        new_m = ChatMessage(
            session_id=new_session.id,
            role=old_m.role,
            content=old_m.content,
            is_system=old_m.is_system,
            trigger_event=old_m.trigger_event,
            memory_context_snapshot=old_m.memory_context_snapshot,
            created_at=old_m.created_at  # preserve order
        )
        db.add(new_m)
        
    db.commit()
    return new_session

def edit_and_prune_message(db: Session, session_id: UUID, message_id: UUID, new_content: str) -> Optional[ChatMessage]:
    message = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id == message_id
    ).first()
    
    if not message:
        return None
        
    # Update content
    message.content = new_content
    
    # Prune all later messages in this session
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.created_at > message.created_at
    ).delete()
    
    db.commit()
    db.refresh(message)
    return message

def process_chat_turn(db: Session, session: ChatSession, latest_user_message: str) -> ChatMessage:
    """
    Orchestrates a single turn of chat:
    1. Builds full context payload from memory layers
    2. Orchestrates memory layer selection (Memory Orchestrator)
    3. Formats the system prompt
    4. Calls LLMService to generate reply
    5. Saves and returns the assistant message
    """
    from app.services.context_assembly_service import ContextAssemblyService
    from app.services.llm_service import LLMService
    from app.services.character_service import get_character
    from app.services.memory_orchestrator import MemoryOrchestrator
    
    # 1. Assemble Context
    assembler = ContextAssemblyService(db)
    context_payload = assembler.assemble_context(
        character_id=session.character_id,
        story_id=session.story_id,
        chapter_id=session.active_chapter_id,
        session_id=session.id,
        latest_user_message=latest_user_message
    )
    
    # Get character name for prompt
    character = get_character(db, session.character_id)
    character_name = character.name if character else "Character"
    
    # 2. Orchestrate Memory Layer Selection
    orchestrator = MemoryOrchestrator(db)
    orchestrated_context = orchestrator.orchestrate_context(
        context_payload=context_payload,
        user_message=latest_user_message,
        character_name=character_name,
        chat_history=[]  # TODO: Pass actual chat history for conversational continuity
    )
    
    # 3. Format system prompt
    system_prompt = assembler.format_as_system_prompt(orchestrated_context, character_name)
    
    # 3b. Build debug snapshot for writer inspector (uses orchestrated context to show filtered layers)
    debug_snapshot = assembler.build_debug_snapshot(orchestrated_context, character)
    
    # 3. Get recent chat history
    # 8 messages is enough for conversational continuity.
    # 20 was too many: stale early answers competed with newer story facts.
    recent_history = get_recent_chat_messages(db, session.id, limit=8)

    # 4. Generate Character Reply
    llm = LLMService()
    reply_content = llm.generate_character_reply(
        system_prompt=system_prompt,
        recent_history=recent_history,
        user_input=latest_user_message
    )
    
    # 5. Save and return character message (with debug snapshot attached)
    char_msg_in = ChatMessageCreate(
        role="character",
        content=reply_content,
        is_system=False,
        trigger_event=None
    )
    
    char_message = create_chat_message(db=db, session_id=session.id, message_in=char_msg_in, memory_context_snapshot=debug_snapshot)
    return char_message
