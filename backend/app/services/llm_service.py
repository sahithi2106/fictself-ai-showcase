import json
import logging
import re
from typing import List, Dict, Any
from app.models.chat_message import ChatMessage
from app.services.llm import get_llm_provider

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Question type classifier — zero cost, no LLM call
# ─────────────────────────────────────────────────────────────────────────────

_EMOTIONAL_PATTERNS = [
    "how do you feel", "are you okay", "do you love", "does it hurt",
    "do you miss", "are you sad", "are you scared", "are you angry",
    "do you care", "do you hate", "does that bother", "what does it feel",
    "how are you feeling", "what's wrong", "what hurts", "are you afraid",
    "does it scare", "do you regret", "what do you feel",
]
_SECRET_PATTERNS = [
    "what are you not", "what aren't you", "what are you hiding",
    "what's really", "what are you keeping", "tell me the truth",
    "what's the real", "be honest", "you're not telling me",
    "what aren't you saying", "what do you know that",
]
_SCENE_PATTERNS = [
    "what's going on", "what are you doing", "what do you see",
    "right now", "what is happening", "where are you", "what can you hear",
    "look around", "what's around you", "describe what", "what's in front",
]
_RELATIONSHIP_PATTERNS = [
    "what do you think of", "how do you feel about", "what's your relationship",
    "do you trust", "do you like", "how well do you know", "what about",
    "how do you see", "what is [name] to you", "are you close",
]
_FACTUAL_PATTERNS = [
    "what happened", "when did", "where is", "who is", "what is",
    "tell me about", "explain", "describe", "what was", "how did",
    "where did", "who did", "what did", "why did", "how does",
]
_OPINION_PATTERNS = [
    "what do you think", "do you believe", "would you", "what's your opinion",
    "what would you do", "do you agree", "what's your take", "how do you see it",
    "in your opinion", "what would you choose", "if you could",
]

# Per-type framing notes injected as an assistant turn before the user message.
# These act as a director's note: concrete behavioral direction for THIS reply.
_FRAMING_NOTES = {
    "emotional": (
        "[Internal note, not spoken] This is an emotional question. "
        "Keep it short — one or two sentences. Do not explain your feelings. "
        "Show them through word choice, what you avoid saying, or a deflection. "
        "Never use the words 'feel', 'emotion', 'grief', or any abstract emotion label in your reply."
    ),
    "secret": (
        "[Internal note, not spoken] This question is probing something you guard. "
        "Do not confess. Deflect, redirect, or answer something adjacent. "
        "You can throw the question back. Stay brief. Let the deflection itself be the answer."
    ),
    "scene": (
        "[Internal note, not spoken] This question is about what is happening right now. "
        "Stay in the present moment. Use the current scene context. "
        "Answer in present tense. Be immediate and sensory."
    ),
    "relationship": (
        "[Internal note, not spoken] This is a question about how you relate to someone. "
        "Let your emotional history with them color your answer. "
        "If there is tension, it should show in restraint, word choice, or brevity. "
        "Do not describe the relationship from the outside — speak from inside it."
    ),
    "factual": (
        "[Internal note, not spoken] This is a factual question. "
        "Answer directly. Use what you know. No embellishment, no preamble. "
        "If you don't know something, say so plainly."
    ),
    "opinion": (
        "[Internal note, not spoken] This is asking for your genuine opinion or judgment. "
        "Give it plainly, in your voice. Don't hedge or balance both sides. "
        "Your character has a point of view — state it."
    ),
    "general": (
        "[Internal note, not spoken] Answer in character. "
        "Match the weight of the question — brief if it's light, deeper if it warrants it."
    ),
}


def classify_question(text: str) -> str:
    """
    Classifies the user's message into one of: emotional, secret, scene,
    relationship, factual, opinion, general.
    Uses keyword/pattern matching — zero cost, no LLM call.
    Returns the question type string.
    """
    lowered = text.lower().strip()

    def _matches(patterns):
        return any(p in lowered for p in patterns)

    # Priority order matters: check more specific types first
    if _matches(_SECRET_PATTERNS):
        return "secret"
    if _matches(_EMOTIONAL_PATTERNS):
        return "emotional"
    if _matches(_SCENE_PATTERNS):
        return "scene"
    if _matches(_RELATIONSHIP_PATTERNS):
        return "relationship"
    if _matches(_OPINION_PATTERNS):
        return "opinion"
    if _matches(_FACTUAL_PATTERNS):
        return "factual"
    return "general"


class LLMService:
    def __init__(self):
        """
        Initialize LLM service using the provider architecture.
        The provider is created by the factory based on environment configuration.
        """
        self.provider = None
        
        try:
            self.provider = get_llm_provider()
            logger.info("[LLMService Init] Provider initialized successfully")
        except Exception as e:
            logger.error(f"[LLMService Init] Failed to initialize provider: {e}")
            self.provider = None

    def generate_character_reply(
        self, 
        system_prompt: str, 
        recent_history: List[ChatMessage], 
        user_input: str
    ) -> str:
        """
        Generates a reply from the character using the provided system prompt and context.
        """
        if not self.provider:
            logger.error("[generate_character_reply] Provider not initialized. Returning fallback.")
            return "*The character remains silent. (LLM provider not configured correctly)*"

        # Build messages list
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add history
        for msg in recent_history:
            # Our db uses 'character' instead of 'assistant'
            role = "assistant" if msg.role == "character" else "user"
            messages.append({"role": role, "content": msg.content})
            
        # Classify the question type and inject a per-turn framing note.
        # This is injected as an assistant turn immediately before the user message —
        # a proven technique for steering response posture in chat-format models.
        # The framing note gives the character a concrete behavioral directive for
        # THIS specific question, not just a general style description.
        q_type = classify_question(user_input)
        framing_note = _FRAMING_NOTES.get(q_type, _FRAMING_NOTES["general"])
        messages.append({"role": "assistant", "content": framing_note})

        if not messages or messages[-1].get("role") != "user" or messages[-1].get("content") != user_input:
            messages.append({"role": "user", "content": user_input})
        
        try:
            # Using provider chat completion
            content = self.provider.chat(
                messages=messages,
                temperature=0.80,  # Slightly reduced from 0.85 for more consistent voice
                max_tokens=500
            )
            
            # Empty response safety handling
            if not content or not content.strip():
                logger.warning("[generate_character_reply] LLM returned empty content.")
                return "*The character goes quiet for a moment, as if the thought never fully formed.*"
                
            return content
        except Exception as e:
            logger.exception("[generate_character_reply] LLM generation failed.")
            return f"*The character looks confused and doesn't respond right now. (Model connection failed: {str(e)})*"

    def extract_memory_candidates(
        self,
        chapter_text: str,
        character_names: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Given a chapter excerpt and character names, asks the LLM to extract
        1-3 structured memory candidates as JSON.
        Returns a list of dicts (possibly empty) on any failure.
        Uses low temperature for factual/structured output.
        """
        if not self.provider:
            logger.warning("[extract_memory_candidates] LLM provider not initialised — skipping extraction.")
            return []

        char_list = ", ".join(character_names) if character_names else "(none listed)"

        system_prompt = (
            "You are a memory extraction assistant for a fiction writing tool called FictSelf. "
            "Your task is to read a chapter excerpt and identify 1 to 3 pieces of information "
            "that are genuinely valuable for a character's long-term memory system.\n\n"
            "STRICT RULES:\n"
            "- Only extract concrete FACTS, EVENTS, DECISIONS, EMOTIONAL STATES, WORLD RULES, or SECRETS.\n"
            "- Do NOT extract generic personality traits already obvious from the character's name or role.\n"
            "- Do NOT give writing advice, critique, or stylistic observations.\n"
            "- Do NOT invent facts not present in the text.\n"
            "- Each item must reflect something a character would actually remember or that shapes the world.\n"
            "- Prefer specificity. 'Aria chose to burn the letter' is good. 'The character has emotions' is not.\n\n"
            f"CHARACTERS IN THIS STORY: {char_list}\n\n"
            "SUGGESTION TYPES (pick exactly one per item):\n"
            "  canon_fact         — objective story event, decision, or consequence\n"
            "  pinned_fact        — a plot truth the author wants to pin as always-true\n"
            "  emotional_memory   — a character's emotional reaction or wound (requires character_name)\n"
            "  world_rule         — a law, rule, or norm of the fictional world\n"
            "  secret             — something deliberately hidden from other characters\n"
            "  relationship_update — a shift in how two characters relate to each other\n"
            "  object_fact        — a meaningful object's current state or significance\n\n"
            "OUTPUT FORMAT: Return ONLY a valid JSON array. No explanation, no markdown fences.\n"
            "[\n"
            "  {\n"
            "    \"title\": \"Short descriptive title (max 10 words)\",\n"
            "    \"content\": \"1-2 sentence factual description.\",\n"
            "    \"suggestion_type\": \"one of the types above\",\n"
            "    \"source_excerpt\": \"Direct quote from the text (max 120 chars)\",\n"
            "    \"importance_score\": 0.0,\n"
            "    \"proposed_target_label\": \"character/object/event name or null\",\n"
            "    \"proposed_target_type\": \"character|object|event|location|secret|self or null\",\n"
            "    \"character_name\": \"exact character name if emotional_memory, else null\"\n"
            "  }\n"
            "]\n\n"
            f"CHAPTER TEXT:\n{chapter_text}"
        )

        try:
            raw = self.provider.chat(
                messages=[{"role": "user", "content": system_prompt}],
                temperature=0.2,
                max_tokens=900,  # 700 was too tight for 3-item JSON with excerpts
            )
            raw = raw or ""
            raw = raw.strip()

            # Strip markdown fences if the model wraps in ```json ... ```
            if raw.startswith("```"):
                lines = raw.splitlines()
                raw = "\n".join(
                    line for line in lines
                    if not line.strip().startswith("```")
                ).strip()

            candidates = json.loads(raw)
            if not isinstance(candidates, list):
                logger.warning("[extract_memory_candidates] LLM did not return a JSON array.")
                return []

            # Clamp importance_score to valid range
            for c in candidates:
                score = c.get("importance_score", 0.5)
                try:
                    c["importance_score"] = max(0.0, min(1.0, float(score)))
                except (TypeError, ValueError):
                    c["importance_score"] = 0.5

            logger.info(f"[extract_memory_candidates] Extracted {len(candidates)} candidate(s).")
            return candidates[:3]  # hard cap

        except json.JSONDecodeError:
            logger.warning("[extract_memory_candidates] LLM response was not valid JSON — skipping.")
            return []
        except Exception as e:
            logger.exception(f"[extract_memory_candidates] Extraction failed: {e}")
            return []
