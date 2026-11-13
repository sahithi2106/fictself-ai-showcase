from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from app.api.deps import SessionDep, CurrentUser
from app.schemas.chat_session import ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse
from app.schemas.chat_message import ChatMessageCreate, ChatMessageResponse, ChatMessageEdit
from app.services import chat_service, story_service

router = APIRouter()

def _check_story_ownership(db: SessionDep, story_id: UUID, current_user: CurrentUser):
    story = story_service.get_story(db=db, story_id=story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

def _check_chat_session_ownership(db: SessionDep, session_id: UUID, current_user: CurrentUser):
    session = chat_service.get_chat_session(db=db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return session

@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_in: ChatSessionCreate,
) -> Any:
    """
    Create a new chat session.
    """
    _check_story_ownership(db, session_in.story_id, current_user)
    session = chat_service.create_chat_session(db=db, user_id=current_user.id, session_in=session_in)
    return session

@router.get("/story/{story_id}", response_model=List[ChatSessionResponse])
def read_chat_sessions(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    story_id: UUID,
    character_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve chat sessions for a specific story.
    """
    _check_story_ownership(db, story_id, current_user)
    sessions = chat_service.get_chat_sessions_by_story(db=db, story_id=story_id, character_id=character_id, skip=skip, limit=limit)
    return sessions

@router.get("/{session_id}", response_model=ChatSessionResponse)
def read_chat_session(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
) -> Any:
    """
    Get a specific chat session by id.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    return session

@router.put("/{session_id}", response_model=ChatSessionResponse)
def update_chat_session(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    session_in: ChatSessionUpdate,
) -> Any:
    """
    Update a chat session.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    session = chat_service.update_chat_session(db=db, db_session=session, session_in=session_in)
    return session

from app.services.context_assembly_service import ContextAssemblyService

@router.post("/{session_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def create_chat_message(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_in: ChatMessageCreate,
) -> Any:
    """
    Add a message to a chat session, assemble context, and return a character response.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    
    # 1. Save user message
    user_message = chat_service.create_chat_message(db=db, session_id=session.id, message_in=message_in)
    
    # 2. Process turn (Context + Gen + Save)
    char_message = chat_service.process_chat_turn(
        db=db, 
        session=session, 
        latest_user_message=message_in.content
    )
    
    return char_message

@router.get("/{session_id}/messages", response_model=List[ChatMessageResponse])
def read_chat_messages(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve messages for a specific chat session.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    messages = chat_service.get_chat_messages(db=db, session_id=session.id, user_id=current_user.id, skip=skip, limit=limit)
    return messages

@router.delete("/{session_id}/messages", status_code=status.HTTP_200_OK)
def delete_chat_messages(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
) -> Any:
    """
    Clear all messages in a chat session.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    chat_service.delete_session_messages(db=db, session_id=session.id)
    return {"detail": "Chat thread cleared successfully"}

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
) -> None:
    """
    Permanently delete an entire chat session and its messages.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    success = chat_service.delete_chat_session(db=db, session_id=session.id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete chat session")
    return None

@router.post("/{session_id}/messages/{message_id}/edit", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def edit_chat_message_and_regenerate(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_id: UUID,
    message_in: ChatMessageEdit,
) -> Any:
    """
    Edit a user message, prune subsequent messages, and regenerate character response.
    """
    session = _check_chat_session_ownership(db, session_id, current_user)
    
    updated_message = chat_service.edit_and_prune_message(
        db=db, 
        session_id=session.id, 
        message_id=message_id, 
        new_content=message_in.content
    )
    
    if not updated_message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # Process turn (Context + Gen + Save)
    char_message = chat_service.process_chat_turn(
        db=db, 
        session=session, 
        latest_user_message=updated_message.content
    )
    
    return char_message

@router.delete("/{session_id}/messages/{message_id}", status_code=status.HTTP_200_OK)
def delete_single_chat_message(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_id: UUID,
) -> Any:
    """Delete a specific message."""
    session = _check_chat_session_ownership(db, session_id, current_user)
    success = chat_service.delete_chat_message(db=db, session_id=session.id, message_id=message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"detail": "Message deleted successfully"}

@router.post("/{session_id}/messages/{message_id}/regenerate", response_model=ChatMessageResponse)
def regenerate_chat_message(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_id: UUID,
) -> Any:
    """Delete an assistant message and regenerate it based on history."""
    session = _check_chat_session_ownership(db, session_id, current_user)
    
    # Get history to find the previous user message
    messages = chat_service.get_chat_messages(db=db, session_id=session.id, user_id=current_user.id, skip=0, limit=1000)
    
    target_idx = -1
    for i, m in enumerate(messages):
        if m.id == message_id:
            target_idx = i
            break
            
    if target_idx == -1:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # We must have a previous user message
    if target_idx == 0:
        raise HTTPException(status_code=400, detail="Cannot regenerate first message without context")
        
    # Remove all messages from target_idx onwards to simulate rolling back
    cutoff_time = messages[target_idx].created_at
    from app.models.chat_message import ChatMessage
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id,
        ChatMessage.created_at >= cutoff_time
    ).delete()
    db.commit()
    
    # Find the last user message before cutoff
    last_user_message = next((m for m in reversed(messages[:target_idx]) if m.role == 'user'), None)
    if not last_user_message:
        raise HTTPException(status_code=400, detail="No user message found to respond to")
        
    char_message = chat_service.process_chat_turn(
        db=db,
        session=session,
        latest_user_message=last_user_message.content
    )
    return char_message

@router.post("/{session_id}/branch-from/{message_id}", response_model=ChatSessionResponse)
def branch_chat_session(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_id: UUID,
) -> Any:
    """Create a new session branching from a specific message."""
    session = _check_chat_session_ownership(db, session_id, current_user)
    new_session = chat_service.branch_chat_session(db=db, session_id=session.id, message_id=message_id, user_id=current_user.id)
    if not new_session:
        raise HTTPException(status_code=400, detail="Failed to branch session")
    return new_session

@router.post("/{session_id}/messages/{message_id}/pin", status_code=status.HTTP_200_OK)
def pin_chat_message(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_id: UUID,
) -> Any:
    """Pin a chat message."""
    session = _check_chat_session_ownership(db, session_id, current_user)
    chat_service.pin_chat_message(db=db, session_id=session.id, message_id=message_id, user_id=current_user.id)
    return {"detail": "Pinned successfully"}

@router.delete("/{session_id}/messages/{message_id}/pin", status_code=status.HTTP_200_OK)
def unpin_chat_message(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
    message_id: UUID,
) -> Any:
    """Unpin a chat message."""
    session = _check_chat_session_ownership(db, session_id, current_user)
    chat_service.unpin_chat_message(db=db, session_id=session.id, message_id=message_id, user_id=current_user.id)
    return {"detail": "Unpinned successfully"}

@router.get("/{session_id}/pinned", response_model=List[ChatMessageResponse])
def get_pinned_chat_messages(
    *,
    db: SessionDep,
    current_user: CurrentUser,
    session_id: UUID,
) -> Any:
    """Get all pinned messages for a session."""
    session = _check_chat_session_ownership(db, session_id, current_user)
    return chat_service.get_pinned_chat_messages(db=db, session_id=session.id, user_id=current_user.id)
