"""
Base LLM Provider Interface

Abstract base class defining the contract for all LLM providers.
All providers must implement these methods to ensure compatibility
with the existing application architecture.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.models.chat_message import ChatMessage


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    
    All LLM providers (Groq, OpenAI, Anthropic, etc.) must inherit from this
    class and implement the required methods. This ensures the rest of the
    application can interact with any provider through a consistent interface.
    """
    
    def __init__(self, api_key: str, model: str):
        """
        Initialize the provider with credentials and model.
        
        Args:
            api_key: API key for the provider
            model: Model identifier to use
        """
        self.api_key = api_key
        self.model = model
    
    @abstractmethod
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
        pass
    
    @abstractmethod
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
        pass
    
    @abstractmethod
    def stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500
    ):
        """
        Stream a chat completion response.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Yields:
            Text chunks as they are generated
        """
        pass
    
    def summarize(
        self,
        text: str,
        max_length: int = 200
    ) -> str:
        """
        Summarize text (optional implementation).
        
        Args:
            text: Text to summarize
            max_length: Maximum length of summary
            
        Returns:
            Summary text
        """
        # Default implementation uses chat with a summarization prompt
        prompt = f"Summarize the following text in {max_length} characters or less:\n\n{text}"
        return self.chat([{"role": "user", "content": prompt}])
    
    def extract(
        self,
        text: str,
        extraction_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 900
    ) -> str:
        """
        Extract structured information from text.
        
        Args:
            text: Text to extract from
            extraction_prompt: Prompt describing what to extract
            temperature: Sampling temperature (lower for structured output)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Extracted information (typically JSON)
        """
        full_prompt = f"{extraction_prompt}\n\nTEXT:\n{text}"
        return self.chat([{"role": "user", "content": full_prompt}], temperature=temperature, max_tokens=max_tokens)
