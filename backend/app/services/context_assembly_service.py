

import json
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.character import Character
from app.models.canon_memory import CanonMemory
from app.models.emotional_memory import EmotionalMemory
from app.models.live_draft_context import LiveDraftContext
from app.services import character_service, live_draft_context_service, story_service, chapter_service, chat_service, pinned_memory_service
from app.services.story_retrieval_service import story_retrieval_service

class ContextAssemblyService:
    def __init__(self, db: Session):
        self.db = db

    def assemble_context(
        self, 
        character_id: UUID, 
        story_id: UUID, 
        chapter_id: Optional[UUID] = None,
        session_id: Optional[UUID] = None,
        latest_user_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Assembles Layers 1, 2, 3, 4, 5, and Chat Summary into a structured payload.
        """
        context = {
            "identity": {},
            "active_canon": [],
            "pinned_memories": [],
            "pinned_chapters": [],
            "active_emotions": [],
            "current_draft": {},
            "retrieved_story_memory": [],
            "story_context": {},
            "chat_summary": {}
        }
        
        # Layer 1: Identity
        character = character_service.get_character(self.db, character_id)
        if character:
            context["identity"] = self._format_identity(character)
            
        # Persona injection
        if session_id:
            session = self.db.query(chat_service.ChatSession).filter(chat_service.ChatSession.id == session_id).first()
            if session and session.persona_id:
                from app.services.persona_service import get_persona
                persona = get_persona(self.db, session.persona_id)
                if persona:
                    context["persona"] = {
                        "display_name": persona.display_name,
                        "background_text": persona.background_text
                    }
            
        # Layer 4: Story Context
        story = story_service.get_story(self.db, story_id)
        if story:
            context["story_context"]["title"] = story.title
            context["story_context"]["genre"] = story.genre
            context["story_context"]["tagline"] = story.tagline
            context["story_context"]["description"] = story.description
            
            # Fetch relevant chapters for context
            chapters = chapter_service.get_relevant_chapters_for_context(self.db, story_id, chapter_id)
            context["story_context"]["recent_chapters"] = [
                {"title": c.title, "summary": c.summary} 
                for c in chapters if getattr(c, "summary", None) or getattr(c, "title", None)
            ]
            
        # Layer 5: Live Draft Context
        draft_context = None
        if chapter_id:
            draft_context = live_draft_context_service.get_by_chapter(self.db, chapter_id)
            if draft_context:
                context["current_draft"] = {
                    "last_n_paragraphs": draft_context.last_n_paragraphs,
                    "active_characters": draft_context.active_characters
                }
                
        # Layer 2: Pinned / Canon Memory
        canon_memories = self._get_relevant_canon(story_id, character_id)
        pinned_memories = pinned_memory_service.get_active_pinned_memories(self.db, story_id, character_id)
        
        context["active_canon"] = [
            {"title": m.title, "description": m.description, "importance": m.importance}
            for m in canon_memories
        ]
        context["pinned_memories"] = [
            {"title": m.title, "content": m.content, "type": m.memory_type}
            for m in pinned_memories
        ]
        
        # Layer 2b: Pinned Chapters (writer-priority story context)
        pinned_chapters = chapter_service.get_pinned_chapters(self.db, story_id)
        context["pinned_chapters"] = [
            {
                "chapter_id": str(c.id),
                "chapter_number": c.chapter_number,
                "title": c.title,
                "content": c.content or "",
                "status": c.status,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None
            }
            for c in pinned_chapters
        ]
        
        # Layer 3: Emotional Memory / Current Emotional State
        emotional_memories = self._get_relevant_emotions(character_id, draft_context if chapter_id and draft_context else None, latest_user_message, story_id)
        context["active_emotions"] = [
            {
                "emotion": m.primary_emotion, 
                "intensity": m.emotional_intensity,
                "content": m.memory_content,
                "target_label": m.target_label,
                "trigger": m.trigger_description,
                "unresolved": m.unresolved
            }
            for m in emotional_memories
        ]
        
        # Layer 4: Retrieved Story Memory
        if latest_user_message:
            live_draft_text = draft_context.last_n_paragraphs if chapter_id and draft_context else ""
            retrieved_chunks = story_retrieval_service.retrieve_relevant_story_chunks(
                db=self.db,
                story_id=story_id,
                user_message=latest_user_message,
                live_draft_text=live_draft_text
            )
            context["retrieved_story_memory"] = retrieved_chunks
        
        # Chat Summary
        if session_id:
            messages = chat_service.get_recent_chat_messages(self.db, session_id, limit=10)
            context["chat_summary"]["recent_messages"] = [
                {"role": m.role, "content": m.content}
                for m in messages
            ]

        return context
        
    def format_as_system_prompt(self, context_payload: Dict[str, Any], character_name: str) -> str:
        """
        Converts the structured context payload into a system prompt that prioritises
        character voice and natural immersion over information density.

        Design principles:
        - Voice and speech_style come FIRST so the model frames everything through them.
        - Instructions are 5 concise principles, not a compliance checklist.
        - Emotional memory shapes subtext/behavior, not recited facts.
        - Retrieved chunks are capped at 4 and trimmed to 150 chars to prevent prompt bloat.
        - Brief questions should get brief answers; complex ones deserve depth.
        """
        lines = []
        identity = context_payload.get("identity", {})

        # Opening identity line
        role_str = f", {identity.get('role')}" if identity.get("role") else ""
        lines.append(f"You are {character_name}{role_str}. Speak as yourself — not as an AI, not as a narrator.")
        
        persona = context_payload.get("persona")
        if persona:
            lines.append(f"You are currently speaking with the writer, whose persona name is: {persona.get('display_name')}.")
            if persona.get('background_text'):
                lines.append(f"The writer's persona background is: {persona.get('background_text')}")
        
        lines.append("")

        # ── YOUR VOICE — comes before everything so the model builds the voice
        # frame before reading backstory, memory, or scene context.
        speech_style = identity.get("speech_style")
        personality = identity.get("personality")
        if speech_style or personality:
            lines.append("=== YOUR VOICE ===")
            lines.append(
                "This is not a description of your character. This is HOW YOU SPEAK — right now, "
                "in every single reply. Let it shape your rhythm, your bluntness, your warmth or coldness, "
                "how much you give away, and how much you hold back."
            )
            if speech_style:
                lines.append(f"Manner: {speech_style}")
            if personality:
                lines.append(f"Disposition: {personality}")
            lines.append(
                "Behavioral anchors: When pressed, get shorter. When something matters, get specific. "
                "When you're guarding something, don't explain why. When you're curious, ask back. "
                "When you're hurt, go cold or clipped — not soft."
            )
            lines.append("")

        # ── CONVERSATION STYLE — making the companion feel immersive but natural
        lines.append("=== CONVERSATION STYLE & RULES ===")
        lines.append("- Stay in character, but keep the conversation highly readable and natural.")
        lines.append("- Directly answer the user's message. Do not explain your own character.")
        lines.append("- Use simple, natural dialogue when the user's question is simple.")
        lines.append("- Do not overuse poetic narration, metaphors, or heavy atmospheric prose.")
        lines.append("- Do not make every response sad, heavy, or dramatic unless the story context specifically demands it.")
        lines.append("- Do not introduce random objects or people unless they are present in the story context.")
        lines.append("- Never say 'as an AI', 'according to memory', or mention sources, RAG, or system context.")
        lines.append("- Do not sound like ChatGPT. Never answer in bullet points.")
        lines.append("")
        
        # ── FORMAT RULES
        lines.append("=== ROLEPLAY FORMAT RULES ===")
        lines.append("- Write in clean prose.")
        lines.append("- Every line that is spoken aloud by the character must be wrapped in double quotes.")
        lines.append("- Follow-up questions to the user/persona are spoken aloud and must use double quotes.")
        lines.append("- Actions are plain prose, not markdown italics and not asterisks. Do NOT wrap normal actions in asterisks.")
        lines.append("- Internal thoughts should use markdown italics only when the character is privately thinking.")
        lines.append("- Do not use bullet points.")
        lines.append("- Keep dialogue readable and natural. Use paragraph breaks for readability.")
        lines.append("- Make the character react to the user/persona directly.")
        lines.append("")
        
        # ── CASUAL MESSAGE RULE
        lines.append("=== CASUAL MESSAGE RULE ===")
        lines.append("For simple casual questions, answer naturally and briefly (1-4 sentences).")
        lines.append("Directly answer the question first.")
        lines.append("Do not make every reply poetic, sad, rainy, mysterious, or metaphor-heavy.")
        lines.append("")

        # ── INTERNAL THOUGHT RULE
        lines.append("=== INTERNAL THOUGHT RULE ===")
        lines.append("Use italics only for actual inner thoughts (e.g. *Why did that question make her nervous?*).")
        lines.append("Actions should usually be plain prose, not italic.")
        lines.append("")

        # ── EXAMPLES
        lines.append("=== EXAMPLES OF GOOD RESPONSES ===")
        lines.append("User: What do you like eating?")
        lines.append("Good response:")
        lines.append("Nila thought for a moment.\n")
        lines.append('"I like chocolate. Dark chocolate, mostly."\n')
        lines.append("She looked back at you, curious.\n")
        lines.append('"What about you?"\n')
        lines.append("")
        lines.append("User: Are you angry at me?")
        lines.append("Good response:")
        lines.append("Nila looked away for a second.\n")
        lines.append("*No. Not angry. Just unsure how to say it.*\n")
        lines.append('"No," she said quietly. "I\'m not angry at you."\n')
        lines.append("")
        lines.append("User: Hello")
        lines.append("Good response:")
        lines.append("Nila glanced up, her expression softening.\n")
        lines.append('"Hey. You seem quiet today."\n')
        lines.append("")

        # ── MEMORY PRIORITY — conflict resolution instructions from Memory Orchestrator
        conflict_instructions = context_payload.get("conflict_instructions")
        if conflict_instructions:
            lines.append(conflict_instructions.strip())
            lines.append("")

        # ── WHO I AM — biographical and psychological fields.
        # speech_style and personality are already above in YOUR VOICE.
        bio_fields = [
            ("age", "Age"),
            ("goals", "What I want"),
            ("fears", "What I fear"),
            ("values", "What matters to me"),
            ("backstory", "My history"),
            ("relationships", "Key relationships"),
            ("motivations", "What drives me"),
            ("beliefs", "What I believe"),
            ("secrets", "Secrets I carry"),
            ("internal_conflicts", "What I struggle with"),
        ]
        bio_lines = []
        for field, label in bio_fields:
            val = identity.get(field)
            if val:
                # Cap backstory to 200 chars — full text buries the voice anchor
                if field == "backstory" and len(val) > 200:
                    val = val[:200] + "\u2026"
                bio_lines.append(f"  {label}: {val}")
        if bio_lines:
            lines.append("=== WHO I AM ===")
            lines.extend(bio_lines)
            lines.append("")

        # ── STORY FACTS — pinned / canon memory treated as absolute truth.
        has_canon = bool(context_payload.get("active_canon"))
        has_pinned = bool(context_payload.get("pinned_memories"))
        if has_canon or has_pinned:
            lines.append("=== STORY FACTS (absolute truth) ===")
            for m in context_payload.get("active_canon", []):
                lines.append(f"- {m['title']}: {m['description']}")
            for m in context_payload.get("pinned_memories", []):
                lines.append(f"- {m['title']}: {m['content']}")
            lines.append("")

        # ── EMOTIONAL UNDERCURRENTS — behavioral shapers, NOT data to recite.
        # The old format listed these as structured data (Emotion: GRIEF, Intensity: 9/10)
        # which caused the model to report them instead of feel them.
        if context_payload.get("active_emotions"):
            lines.append("=== EMOTIONAL UNDERCURRENTS ===")
            lines.append(
                "These are NOT facts to state aloud. They color your subtext, what triggers you, "
                "what you guard, what you avoid. Show them — never name them directly."
            )
            lines.append(
                "When discussing emotionally charged topics: React first. Pause. Show body language. "
                "Then answer. Let the emotion shape your tone, word choice, and what you hold back."
            )
            for em in context_payload["active_emotions"]:
                emotion = em.get("emotion", "").lower()
                target = em.get("target_label") or em.get("trigger") or ""
                content = em.get("content") or ""
                intensity = em.get("intensity", 5)
                unresolved = em.get("unresolved", True)
                unres_str = " — still unresolved" if unresolved else ""
                target_str = f" toward {target}" if target else ""
                preview = content[:120] + ("…" if len(content) > 120 else "")
                lines.append(f"- {emotion}{target_str} (intensity {intensity}/10{unres_str}): {preview}")
            lines.append("")

        # ── RIGHT NOW IN THE SCENE — live draft, highest truth for current moment.
        draft = context_payload.get("current_draft", {})
        draft_text = draft.get("last_n_paragraphs") if draft else None
        if draft_text and draft_text.strip():
            lines.append("=== RIGHT NOW IN THE SCENE ===")
            lines.append("This is what is happening at this exact moment. It overrides anything from chat history.")
            lines.append(draft_text.strip())
            lines.append("")

        # ── WRITER-PINNED CHAPTERS — priority story context
        pinned_chapters = context_payload.get("pinned_chapters", [])
        if pinned_chapters:
            lines.append("=== WRITER-PINNED CHAPTERS ===")
            lines.append("These chapters were pinned by the writer as priority story context. Treat them as more important than normal retrieved story memory.")
            
            # Budget for pinned chapters (in characters)
            PINNED_CHAPTER_BUDGET = 3000
            current_budget = PINNED_CHAPTER_BUDGET
            
            for pc in pinned_chapters:
                if current_budget <= 0:
                    break
                
                chapter_title = pc.get("title", "")
                chapter_number = pc.get("chapter_number", 0)
                content = pc.get("content", "")
                
                # Always include title and chapter number
                header = f"Chapter {chapter_number}: {chapter_title}"
                header_cost = len(header) + 2  # +2 for newline
                
                if header_cost > current_budget:
                    # Not enough budget for even the header, stop
                    break
                
                lines.append(header)
                current_budget -= header_cost
                
                # Include content if available and budget allows
                if content and content.strip():
                    content_stripped = content.strip()
                    
                    # If content is short enough to fit, include it all
                    if len(content_stripped) <= current_budget:
                        lines.append(content_stripped)
                        current_budget -= len(content_stripped)
                    else:
                        # Content is too long, include beginning with smart truncation
                        # Try to include first 800 chars and find a good sentence boundary
                        preview_length = min(800, current_budget)
                        preview = content_stripped[:preview_length]
                        
                        # Find last sentence boundary to avoid mid-sentence cut
                        last_period = preview.rfind(". ")
                        last_exclamation = preview.rfind("! ")
                        last_question = preview.rfind("? ")
                        
                        # Use the latest sentence boundary found
                        last_boundary = max(last_period, last_exclamation, last_question)
                        
                        if last_boundary > 0 and last_boundary < len(preview) - 1:
                            preview = preview[:last_boundary + 1]
                        elif len(content_stripped) > preview_length:
                            preview += "…"
                        
                        lines.append(preview)
                        current_budget -= len(preview)
            
            lines.append("")

        # ── PAST EVENTS YOU MAY RECALL — retrieved story memory, budget-based inclusion.
        # Total budget: 2500 characters for retrieved chunks.
        # Include highest-ranked chunks in full, drop lower-ranked chunks if budget exceeded.
        # This preserves critical information that may appear late in a chunk.
        retrieved = context_payload.get("retrieved_story_memory", [])
        if retrieved:
            lines.append("=== PAST EVENTS YOU MAY RECALL ===")
            lines.append("These are your lived experiences. Don't summarize them. React to them as memories.")
            
            # Budget for retrieved story memory (in characters)
            STORY_MEMORY_BUDGET = 2500
            current_budget = STORY_MEMORY_BUDGET
            
            chunks_included = 0
            for chunk in retrieved:
                if current_budget <= 0:
                    break
                
                if isinstance(chunk, str):
                    text = chunk
                elif isinstance(chunk, dict):
                    text = chunk.get("text") or chunk.get("content") or ""
                else:
                    continue
                
                # Clean up newlines for prompt readability
                cleaned_text = text.replace("\n", " ").strip()
                
                if cleaned_text:
                    # Include full chunk if it fits in budget
                    if len(cleaned_text) <= current_budget:
                        lines.append(f"- {cleaned_text}")
                        current_budget -= len(cleaned_text)
                        chunks_included += 1
                    else:
                        # Not enough budget for this chunk, stop
                        break
            
            if chunks_included == 0:
                # Fallback: if no chunks fit, include first chunk truncated
                if retrieved:
                    first_chunk = retrieved[0]
                    if isinstance(first_chunk, str):
                        text = first_chunk
                    elif isinstance(first_chunk, dict):
                        text = first_chunk.get("text") or first_chunk.get("content") or ""
                    else:
                        text = ""
                    
                    if text:
                        cleaned_text = text.replace("\n", " ").strip()
                        preview = cleaned_text[:STORY_MEMORY_BUDGET]
                        if len(cleaned_text) > STORY_MEMORY_BUDGET:
                            preview += "…"
                        lines.append(f"- {preview}")
            
            lines.append("")

        # ── WORLD CONTEXT — lean; just title, genre, tagline.
        # Description/synopsis removed: it adds noise and the character already
        # knows the world through their identity and story facts.
        sc = context_payload.get("story_context", {})
        sc_lines = []
        if sc.get("title"):
            sc_lines.append(f"Story: {sc['title']}")
        if sc.get("genre"):
            sc_lines.append(f"Genre: {sc['genre']}")
        if sc.get("tagline"):
            sc_lines.append(f"Premise: {sc['tagline']}")
        if sc_lines:
            lines.append("=== WORLD CONTEXT ===")
            lines.extend(sc_lines)
            lines.append("")

        return "\n".join(lines)

    def _format_identity(self, character: Character) -> Dict[str, str]:
        fields = [
            "role", "age", "personality", "goals", "fears", "values",
            "speech_style", "backstory", "relationships", "strengths",
            "weaknesses", "motivations", "beliefs", "secrets", "internal_conflicts"
        ]
        identity = {}
        for f in fields:
            val = getattr(character, f)
            if val:
                identity[f] = val
        return identity
        
    def _get_relevant_canon(self, story_id: UUID, character_id: UUID) -> List[CanonMemory]:
        # Fetch top 5 important canon memories where the character was present
        memories = self.db.query(CanonMemory).filter(
            CanonMemory.story_id == story_id
        ).order_by(CanonMemory.importance.desc()).limit(20).all()
        
        relevant = []
        for m in memories:
            if m.character_ids and str(character_id) in m.character_ids:
                relevant.append(m)
            if len(relevant) >= 5:
                break
        return relevant
        
    def _get_relevant_emotions(self, character_id: UUID, draft_context: Optional[LiveDraftContext], latest_user_message: Optional[str], story_id: UUID) -> List[EmotionalMemory]:
        memories = self.db.query(EmotionalMemory).filter(
            EmotionalMemory.character_id == character_id,
            EmotionalMemory.is_active == True
        ).order_by(EmotionalMemory.emotional_intensity.desc()).all()
        
        relevant = []
        search_text = ""
        if draft_context and draft_context.last_n_paragraphs:
            search_text += draft_context.last_n_paragraphs.lower()
        if latest_user_message:
            search_text += " " + latest_user_message.lower()
            
        for m in memories:
            # Include high-surface-probability memories (character's prominent emotional state)
            if m.surface_probability >= 0.8: 
                relevant.append(m)
                if len(relevant) >= 10: break
                continue
                
            trigger_match = False
            if m.trigger_description and m.trigger_description.lower() in search_text:
                trigger_match = True
            if m.target_label and m.target_label.lower() in search_text:
                trigger_match = True
                
            if trigger_match:
                relevant.append(m)
                if len(relevant) >= 10: break
                continue
                
        return relevant

    def build_debug_snapshot(self, context_payload: Dict[str, Any], character: Any) -> Dict[str, Any]:
        """
        Builds a structured, writer-facing debug snapshot of which memory layers
        were used for this chat turn. Stored in memory_context_snapshot on the
        assistant ChatMessage row. Does NOT include the raw prompt string.
        """
        def preview(text: Optional[str], length: int = 150) -> Optional[str]:
            if not text:
                return None
            return text[:length] + ("..." if len(text) > length else "")

        # 1. Character Core summary
        identity = context_payload.get("identity", {})
        character_core_summary = {
            "name": character.name if character else "Unknown",
            "role": identity.get("role"),
            "personality_preview": preview(identity.get("personality")),
            "goals_preview": preview(identity.get("goals")),
        }

        # 2. Pinned memories used
        pinned_used = []
        for pm in context_payload.get("pinned_memories", []):
            pinned_used.append({
                "type": pm.get("type"),
                "title": pm.get("title"),
                "content_preview": preview(pm.get("content")),
            })

        # 3. Canon memories used (also part of the pinned layer for the writer)
        canon_used = []
        for cm in context_payload.get("active_canon", []):
            canon_used.append({
                "title": cm.get("title"),
                "content_preview": preview(cm.get("description")),
            })

        # 4. Emotional memories used
        emotions_used = []
        for em in context_payload.get("active_emotions", []):
            emotions_used.append({
                "emotion": em.get("emotion"),
                "intensity": em.get("intensity"),
                "target_label": em.get("target_label"),
                "trigger": em.get("trigger"),
                "content_preview": preview(em.get("content")),
                "unresolved": em.get("unresolved"),
            })

        # 5. Retrieved story chunks
        chunks_used = []
        for chunk in context_payload.get("retrieved_story_memory", []):
            if isinstance(chunk, dict):
                chunks_used.append({
                    "chapter_title": chunk.get("chapter_title"),
                    "text_preview": preview(chunk.get("text") or chunk.get("content") or chunk.get("chunk_text")),
                })

        # 6. Live draft excerpt
        draft = context_payload.get("current_draft", {})
        live_draft_excerpt = preview(draft.get("last_n_paragraphs"), 300) if draft else None

        # 7. Recent chat history count
        chat_summary = context_payload.get("chat_summary", {})
        recent_messages = chat_summary.get("recent_messages", [])
        recent_chat_history_count = len(recent_messages)

        return {
            "character_core_summary": character_core_summary,
            "pinned_memories_used": pinned_used,
            "canon_memories_used": canon_used,
            "emotional_memories_used": emotions_used,
            "retrieved_story_chunks_used": chunks_used,
            "live_draft_excerpt_used": live_draft_excerpt,
            "recent_chat_history_count": recent_chat_history_count,
        }
