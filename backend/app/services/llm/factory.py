"""
LLM Provider Factory

Factory for creating LLM provider instances based on configuration.
Supports multiple providers (Groq, OpenAI, Anthropic, etc.) through
a unified interface.
"""

import logging
from typing import Optional
from app.core.config import settings
from .base import BaseLLMProvider
from .groq_provider import GroqProvider

logger = logging.getLogger(__name__)


class LLMProviderFactory:
    """
    Factory for creating LLM provider instances.
    
    This factory abstracts provider creation, allowing the application
    to switch between providers by changing configuration only.
    """
    
    _provider_instance: Optional[BaseLLMProvider] = None
    
    @classmethod
    def create_provider(cls) -> BaseLLMProvider:
        """
        Create and return an LLM provider instance based on configuration.
        
        Reads from settings.LLM_PROVIDER to determine which provider to use.
        Supported providers: groq
        
        Returns:
            BaseLLMProvider instance
            
        Raises:
            ValueError: If provider is not supported or credentials are missing
        """
        if cls._provider_instance is not None:
            return cls._provider_instance
        
        provider_name = settings.LLM_PROVIDER.lower()
        logger.info(f"[LLMProviderFactory] Creating provider: {provider_name}")
        
        if provider_name == "groq":
            api_key = settings.GROQ_API_KEY
            model = settings.LLM_MODEL
            
            if not api_key:
                raise ValueError("GROQ_API_KEY is required for Groq provider")
            
            cls._provider_instance = GroqProvider(api_key=api_key, model=model)
            return cls._provider_instance
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider_name}. Supported: groq")
    
    @classmethod
    def reset(cls):
        """
        Reset the singleton instance. Useful for testing or configuration changes.
        """
        cls._provider_instance = None
        logger.info("[LLMProviderFactory] Provider instance reset")


def get_llm_provider() -> BaseLLMProvider:
    """
    Convenience function to get the current LLM provider.
    
    Returns:
        BaseLLMProvider instance
    """
    return LLMProviderFactory.create_provider()
