"""
Groq LLM Provider Implementation

Implements the BaseLLMProvider interface using Groq's API.
"""

import logging
from typing import List, Dict, Any, Iterator
from groq import Groq
from .base import BaseLLMProvider

logger = logging.getLogger(__name__)


class GroqProvider(BaseLLMProvider):
    """
    Groq LLM provider implementation.
    
    Uses the Groq Python SDK to interact with Groq's fast inference API.
    """
    
    def __init__(self, api_key: str, model: str):
        """
        Initialize the Groq provider.
        
        Args:
            api_key: Groq API key
            model: Model identifier (e.g., "openai/gpt-oss-120b", "llama-3.3-70b-versatile")
        """
        super().__init__(api_key, model)
        
        if not self.api_key:
            raise ValueError("Groq API key is required")
        
        try:
            self.client = Groq(api_key=self.api_key)
            logger.info(f"[GroqProvider] Initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"[GroqProvider] Failed to initialize Groq client: {e}")
            raise
    
    def generate(
        self,
        system_prompt: str,
        user_input: str,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """
        Generate a response from the LLM.
        
        Args:
            system_prompt: System prompt to guide the LLM
            user_input: User input/message
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ]
        
        return self.chat(messages, temperature=temperature, max_tokens=max_tokens)
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """
        Generate a chat completion response.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            content = response.choices[0].message.content
            
            if not content or not content.strip():
                logger.warning("[GroqProvider.chat] LLM returned empty content.")
                return ""
            
            return content
            
        except Exception as e:
            logger.exception(f"[GroqProvider.chat] LLM generation failed: {e}")
            raise
    
    def stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Iterator[str]:
        """
        Stream a chat completion response.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Yields:
            Text chunks as they are generated
        """
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.exception(f"[GroqProvider.stream] Streaming failed: {e}")
            raise
