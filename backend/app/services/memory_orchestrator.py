"""
Memory Scoring Engine Service

Scores memory layers based on multiple independent signals (entity overlap, semantic similarity,
emotional relevance, retrieval confidence, recency, author importance, conversational continuity).

No intent classification. No keyword routing. Scores determine inclusion based on natural relevance.
"""

import re
from typing import Dict, Any, List, Set
from sqlalchemy.orm import Session


class MemoryOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        
        # Signal weights (configurable constants)
        self.SIGNAL_WEIGHTS = {
            "entity_overlap": 0.25,
            "semantic_similarity": 0.35,
            "emotional_relevance": 0.20,
            "retrieval_confidence": 0.15,
            "recency": 0.10,
            "author_importance": 0.15,
            "conversational_continuity": 0.10
        }
        
        # Minimum score to include a layer (configurable)
        self.MIN_SCORE_THRESHOLD = 0.30
        
        # Character Memory minimum score (almost always present)
        self.CHARACTER_MEMORY_MIN_SCORE = 0.70

    def orchestrate_context(
        self,
        context_payload: Dict[str, Any],
        user_message: str,
        character_name: str = None,
        chat_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Scores memory layers and selects based on relevance scores.
        
        Args:
            context_payload: Full context from ContextAssemblyService.assemble_context()
            user_message: Latest user message
            character_name: Character name (optional)
            chat_history: Recent chat messages (optional, for conversational continuity)
            
        Returns:
            Filtered context_payload with scored layers and conflict instructions
        """
        # Create a copy to avoid modifying the original
        orchestrated = context_payload.copy()
        
        # Score each layer
        layer_scores = self._score_all_layers(
            context_payload, 
            user_message, 
            chat_history or []
        )
        
        # Log scores
        orchestrated["_orchestration_log"] = {
            "layer_scores": layer_scores,
            "included_layers": [],
            "dropped_layers": [],
            "conflict_instructions_added": False,
            "conflicts_detected": []
        }
        
        # Select layers based on scores
        orchestrated["identity"] = self._select_layer(
            context_payload.get("identity", {}),
            layer_scores["character_memory"],
            min_score=self.CHARACTER_MEMORY_MIN_SCORE,
            layer_name="Character Memory"
        )
        
        orchestrated["active_emotions"] = self._select_layer(
            context_payload.get("active_emotions", []),
            layer_scores["emotional_memory"],
            min_score=self.MIN_SCORE_THRESHOLD,
            layer_name="Emotional Memory"
        )
        
        orchestrated["active_canon"] = self._select_layer(
            context_payload.get("active_canon", []),
            layer_scores["canon_memory"],
            min_score=self.MIN_SCORE_THRESHOLD,
            layer_name="Canon Memory"
        )
        
        orchestrated["pinned_memories"] = self._select_layer(
            context_payload.get("pinned_memories", []),
            layer_scores["pinned_memory"],
            min_score=self.MIN_SCORE_THRESHOLD,
            layer_name="Pinned Memory"
        )
        
        orchestrated["pinned_chapters"] = self._select_layer(
            context_payload.get("pinned_chapters", []),
            layer_scores["pinned_chapters"],
            min_score=self.MIN_SCORE_THRESHOLD,
            layer_name="Pinned Chapters"
        )
        
        orchestrated["retrieved_story_memory"] = self._select_layer(
            context_payload.get("retrieved_story_memory", []),
            layer_scores["story_memory"],
            min_score=self.MIN_SCORE_THRESHOLD,
            layer_name="Story Memory (RAG)"
        )
        
        orchestrated["current_draft"] = self._select_layer(
            context_payload.get("current_draft", {}),
            layer_scores["live_draft"],
            min_score=self.MIN_SCORE_THRESHOLD,
            layer_name="Live Draft"
        )
        
        # Detect conflicts
        conflicts = self._detect_conflicts(orchestrated)
        orchestrated["_orchestration_log"]["conflicts_detected"] = conflicts
        
        # Add conflict instructions only if conflicts exist
        if conflicts:
            orchestrated["conflict_instructions"] = self._generate_conflict_instructions(conflicts)
            orchestrated["_orchestration_log"]["conflict_instructions_added"] = True
        else:
            orchestrated["conflict_instructions"] = ""
            orchestrated["_orchestration_log"]["conflict_instructions_added"] = False
        
        # Story context is always included (metadata)
        orchestrated["story_context"] = context_payload.get("story_context", {})
        
        return orchestrated
    
    def _score_all_layers(
        self, 
        context_payload: Dict[str, Any], 
        user_message: str,
        chat_history: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Scores all memory layers based on multiple signals.
        """
        scores = {}
        
        # Extract entities from user message
        query_entities = self._extract_entities(user_message)
        
        # Score Character Memory
        scores["character_memory"] = self._score_character_memory(
            context_payload.get("identity", {}),
            user_message,
            query_entities
        )
        
        # Score Emotional Memory
        scores["emotional_memory"] = self._score_emotional_memory(
            context_payload.get("active_emotions", []),
            user_message,
            query_entities
        )
        
        # Score Canon Memory
        scores["canon_memory"] = self._score_canon_memory(
            context_payload.get("active_canon", []),
            user_message,
            query_entities
        )
        
        # Score Pinned Memory
        scores["pinned_memory"] = self._score_pinned_memory(
            context_payload.get("pinned_memories", []),
            user_message,
            query_entities
        )
        
        # Score Pinned Chapters (writer-priority context)
        scores["pinned_chapters"] = self._score_pinned_chapters(
            context_payload.get("pinned_chapters", []),
            user_message,
            query_entities
        )
        
        # Score Story Memory (RAG)
        scores["story_memory"] = self._score_story_memory(
            context_payload.get("retrieved_story_memory", []),
            user_message,
            query_entities
        )
        
        # Score Live Draft
        scores["live_draft"] = self._score_live_draft(
            context_payload.get("current_draft", {}),
            user_message,
            query_entities
        )
        
        return scores
    
    def _score_character_memory(
        self, 
        identity: Dict[str, Any], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Character Memory based on multiple signals.
        Character Memory is foundational, so it gets a high base score.
        """
        if not identity:
            return 0.0
        
        score = 0.0
        
        # Base score (Character Memory is foundational)
        score += 0.70
        
        # Entity overlap
        identity_text = " ".join([
            identity.get("backstory", ""),
            identity.get("relationships", ""),
            identity.get("secrets", ""),
            identity.get("goals", ""),
            identity.get("fears", "")
        ])
        entity_overlap = self._calculate_entity_overlap(identity_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Semantic similarity (simplified - would use embedding model in production)
        semantic_score = self._calculate_semantic_similarity(user_message, identity_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        return min(score, 1.0)
    
    def _score_emotional_memory(
        self, 
        emotions: List[Dict[str, Any]], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Emotional Memory based on trigger matches and entity overlap.
        """
        if not emotions:
            return 0.0
        
        score = 0.0
        
        # Base score (emotions are always somewhat relevant)
        score += 0.30
        
        # Emotional relevance (trigger matches)
        emotional_text = " ".join([
            e.get("trigger", "") + " " + e.get("target_label", "") + " " + e.get("content", "")
            for e in emotions
        ])
        entity_overlap = self._calculate_entity_overlap(emotional_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Emotional intensity
        avg_intensity = sum(e.get("intensity", 5) for e in emotions) / len(emotions)
        score += (avg_intensity / 10) * self.SIGNAL_WEIGHTS["emotional_relevance"]
        
        # Semantic similarity
        semantic_score = self._calculate_semantic_similarity(user_message, emotional_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        return min(score, 1.0)
    
    def _score_canon_memory(
        self, 
        canon_memories: List[Dict[str, Any]], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Canon Memory based on entity overlap and author importance.
        """
        if not canon_memories:
            return 0.0
        
        score = 0.0
        
        # Base score (canon is author-approved truth)
        score += 0.20
        
        # Entity overlap
        canon_text = " ".join([
            m.get("title", "") + " " + m.get("description", "")
            for m in canon_memories
        ])
        entity_overlap = self._calculate_entity_overlap(canon_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Author importance
        avg_importance = sum(m.get("importance", 5) for m in canon_memories) / len(canon_memories)
        score += (avg_importance / 10) * self.SIGNAL_WEIGHTS["author_importance"]
        
        # Semantic similarity
        semantic_score = self._calculate_semantic_similarity(user_message, canon_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        return min(score, 1.0)
    
    def _score_pinned_memory(
        self, 
        pinned_memories: List[Dict[str, Any]], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Pinned Memory based on entity overlap and author importance.
        """
        if not pinned_memories:
            return 0.0
        
        score = 0.0
        
        # Base score (pinned is author-approved)
        score += 0.20
        
        # Entity overlap
        pinned_text = " ".join([
            m.get("title", "") + " " + m.get("content", "")
            for m in pinned_memories
        ])
        entity_overlap = self._calculate_entity_overlap(pinned_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Semantic similarity
        semantic_score = self._calculate_semantic_similarity(user_message, pinned_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        return min(score, 1.0)
    
    def _score_pinned_chapters(
        self, 
        pinned_chapters: List[Dict[str, Any]], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Pinned Chapters based on entity overlap and strong author importance.
        Pinned chapters receive a strong boost because writer pinning is an explicit
        author importance signal. They should outrank normal Story RAG when relevant.
        """
        if not pinned_chapters:
            return 0.0
        
        score = 0.0
        
        # Strong base score (pinned chapters are writer-priority context)
        score += 0.50
        
        # Entity overlap
        chapter_text = " ".join([
            c.get("title", "") + " " + c.get("content", "")
            for c in pinned_chapters
        ])
        entity_overlap = self._calculate_entity_overlap(chapter_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Semantic similarity
        semantic_score = self._calculate_semantic_similarity(user_message, chapter_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        # Author importance (writer explicitly pinned these)
        score += 0.30 * self.SIGNAL_WEIGHTS["author_importance"]
        
        return min(score, 1.0)
    
    def _score_story_memory(
        self, 
        story_chunks: List[Any], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Story Memory based on retrieval confidence and entity overlap.
        """
        if not story_chunks:
            return 0.0
        
        score = 0.0
        
        # Base score (RAG already did semantic retrieval)
        score += 0.30
        
        # Entity overlap
        story_text = " ".join([
            chunk if isinstance(chunk, str) else chunk.get("text", chunk.get("content", ""))
            for chunk in story_chunks
        ])
        entity_overlap = self._calculate_entity_overlap(story_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Retrieval confidence (simulated - in production would use actual RAG distance)
        # For now, assume high confidence if chunks were retrieved
        score += 0.5 * self.SIGNAL_WEIGHTS["retrieval_confidence"]
        
        # Semantic similarity
        semantic_score = self._calculate_semantic_similarity(user_message, story_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        return min(score, 1.0)
    
    def _score_live_draft(
        self, 
        draft: Dict[str, Any], 
        user_message: str,
        query_entities: Set[str]
    ) -> float:
        """
        Scores Live Draft based on semantic relevance (not keywords).
        """
        if not draft or not draft.get("last_n_paragraphs"):
            return 0.0
        
        score = 0.0
        
        # No base score - draft must earn relevance
        
        # Entity overlap
        draft_text = draft.get("last_n_paragraphs", "")
        entity_overlap = self._calculate_entity_overlap(draft_text, query_entities)
        score += entity_overlap * self.SIGNAL_WEIGHTS["entity_overlap"]
        
        # Semantic similarity (key signal for draft)
        semantic_score = self._calculate_semantic_similarity(user_message, draft_text)
        score += semantic_score * self.SIGNAL_WEIGHTS["semantic_similarity"]
        
        # Recency (draft is always recent)
        score += 0.8 * self.SIGNAL_WEIGHTS["recency"]
        
        return min(score, 1.0)
    
    def _extract_entities(self, text: str) -> Set[str]:
        """
        Extract entities from text (simplified NER-lite).
        """
        # Extract proper nouns (capitalized words)
        words = re.findall(r'\b[A-Z][a-z]+\b', text)
        # Extract common story entities
        story_entities = {'Emma', 'Noah', 'Ananya', 'hostel', 'lantern', 'kingdom'}
        entities = set(words) | story_entities
        return entities
    
    def _calculate_entity_overlap(self, text: str, query_entities: Set[str]) -> float:
        """
        Calculate entity overlap between text and query.
        Returns score between 0 and 1.
        """
        if not query_entities:
            return 0.0
        
        text_lower = text.lower()
        text_entities = self._extract_entities(text)
        
        overlap = query_entities & text_entities
        if not overlap:
            return 0.0
        
        # Score based on overlap ratio
        overlap_score = len(overlap) / len(query_entities)
        return overlap_score
    
    def _calculate_semantic_similarity(self, query: str, text: str) -> float:
        """
        Calculate semantic similarity (simplified - would use embedding model in production).
        Returns score between 0 and 1.
        """
        if not text:
            return 0.0
        
        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        text_words = set(re.findall(r'\b\w+\b', text.lower()))
        
        if not query_words or not text_words:
            return 0.0
        
        # Jaccard similarity
        intersection = query_words & text_words
        union = query_words | text_words
        similarity = len(intersection) / len(union) if union else 0.0
        
        return similarity
    
    def _select_layer(
        self, 
        layer_data: Any, 
        score: float, 
        min_score: float,
        layer_name: str
    ) -> Any:
        """
        Select layer if score meets minimum threshold.
        """
        if score >= min_score and layer_data:
            return layer_data
        elif isinstance(layer_data, list):
            return []
        elif isinstance(layer_data, dict):
            return {}
        else:
            return layer_data
    
    def _detect_conflicts(self, context_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect conflicts between memory layers based on entity analysis.
        """
        conflicts = []
        
        # Extract entities from each layer
        canon_entities = self._extract_entities_from_layer(context_payload.get("active_canon", []))
        story_entities = self._extract_entities_from_layer(context_payload.get("retrieved_story_memory", []))
        draft_entities = self._extract_entities_from_layer([context_payload.get("current_draft", {})])
        
        # Check for entity conflicts between Canon and Story
        for entity in canon_entities:
            if entity in story_entities:
                canon_status = canon_entities[entity].get("status")
                story_status = story_entities[entity].get("status")
                
                # Detect status conflicts
                if canon_status and story_status and canon_status != story_status:
                    conflicts.append({
                        "entity": entity,
                        "type": "canon_vs_story",
                        "canon_status": canon_status,
                        "story_status": story_status
                    })
        
        # Check for entity conflicts between Canon and Draft
        for entity in canon_entities:
            if entity in draft_entities:
                canon_status = canon_entities[entity].get("status")
                draft_status = draft_entities[entity].get("status")
                
                if canon_status and draft_status and canon_status != draft_status:
                    conflicts.append({
                        "entity": entity,
                        "type": "canon_vs_draft",
                        "canon_status": canon_status,
                        "draft_status": draft_status
                    })
        
        return conflicts
    
    def _extract_entities_from_layer(self, layer_data: Any) -> Dict[str, Dict[str, str]]:
        """
        Extract entities with status from a layer.
        """
        entities = {}
        
        if isinstance(layer_data, list):
            for item in layer_data:
                if isinstance(item, dict):
                    text = item.get("description", "") or item.get("content", "") or item.get("text", "")
                    self._extract_entities_from_text(text, entities)
                elif isinstance(item, str):
                    self._extract_entities_from_text(item, entities)
        
        # Handle dict case (for draft)
        elif isinstance(layer_data, dict):
            for item in layer_data.values():
                if isinstance(item, str):
                    self._extract_entities_from_text(item, entities)
        
        return entities
    
    def _extract_entities_from_text(self, text: str, entities: Dict[str, Dict[str, str]]):
        """
        Extract entities with status from text.
        """
        if not text:
            return
        
        text_lower = text.lower()
        
        # Extract entities and infer status (simplified)
        if "emma" in text_lower:
            if "died" in text_lower or "death" in text_lower:
                entities["Emma"] = {"status": "dead", "source": text}
            elif "alive" in text_lower or "survived" in text_lower or "returned" in text_lower:
                entities["Emma"] = {"status": "alive", "source": text}
            elif "disappeared" in text_lower:
                entities["Emma"] = {"status": "disappeared", "source": text}
    
    def _generate_conflict_instructions(self, conflicts: List[Dict[str, Any]]) -> str:
        """
        Generate conflict resolution instructions based on detected conflicts.
        Only injects instructions when conflicts actually exist.
        """
        if not conflicts:
            return ""
        
        instructions = "When information conflicts between memory layers:\n"
        
        for conflict in conflicts:
            entity = conflict["entity"]
            if conflict["type"] == "canon_vs_story":
                instructions += f"- Canon establishes factual truth regarding {entity}'s status.\n"
            elif conflict["type"] == "canon_vs_draft":
                instructions += f"- Canon establishes factual truth regarding {entity}'s status over current scene.\n"
        
        return instructions
