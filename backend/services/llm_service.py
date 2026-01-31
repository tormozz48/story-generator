import ollama
from typing import Generator, Optional
import logging
from config import settings

logger = logging.getLogger(__name__)


class LLMService:
  """Service for interacting with Ollama LLM"""
  
  def __init__(self):
    self.client = None
    self.model_name = settings.OLLAMA_MODEL
    self._initialize()
  
  def _initialize(self):
    """Initialize Ollama client"""
    try:
      self.client = ollama.Client(host=settings.ollama_base_url)
      logger.info(f"Initialized Ollama client at {settings.ollama_base_url}")
    
      # Check if model is available
      self._check_model_availability()
      
    except Exception as e:
      logger.error(f"Failed to initialize Ollama client: {str(e)}")
      raise
  
  def _check_model_availability(self):
    """Check if the required model is available"""
    try:
      models = self.client.list()
      model_names = [model['name'] for model in models.get('models', [])]
    
      if self.model_name not in model_names:
        logger.warning(f"Model {self.model_name} not found. Available models: {model_names}")
        logger.info(f"Pulling model {self.model_name}...")
        self.client.pull(self.model_name)
        logger.info(f"Successfully pulled model {self.model_name}")
      else:
        logger.info(f"Model {self.model_name} is available")
    
    except Exception as e:
      logger.error(f"Error checking model availability: {str(e)}")
  
  def generate(
    self,
    prompt: str,
    temperature: float = 0.8,
    top_p: float = 0.95,
    max_tokens: int = 2000,
    stream: bool = False
  ) -> str:
    """Generate text from prompt"""
    try:
      response = self.client.generate(
      model=self.model_name,
      prompt=prompt,
      options={
        'temperature': temperature,
        'top_p': top_p,
        'num_predict': max_tokens,
        'num_ctx': settings.OLLAMA_CONTEXT_LENGTH
      },
      stream=stream
      )
      
      if stream:
        return response
      else:
        return response['response']
    
    except Exception as e:
      logger.error(f"Error generating text: {str(e)}")
      raise
  
  def generate_stream(
    self,
    prompt: str,
    temperature: float = 0.8,
    top_p: float = 0.95,
    max_tokens: int = 2000
  ) -> Generator[str, None, None]:
    """Generate text from prompt with streaming"""
    try:
      stream = self.client.generate(
        model=self.model_name,
        prompt=prompt,
        options={
          'temperature': temperature,
          'top_p': top_p,
          'num_predict': max_tokens,
          'num_ctx': settings.OLLAMA_CONTEXT_LENGTH
        },
        stream=True
      )
    
      for chunk in stream:
        if 'response' in chunk:
          yield chunk['response']
        
    except Exception as e:
      logger.error(f"Error in streaming generation: {str(e)}")
      raise
  
  def chat(
    self,
    messages: list,
    temperature: float = 0.8,
    top_p: float = 0.95,
    max_tokens: int = 2000
  ) -> str:
    """Chat-based generation"""
    try:
      response = self.client.chat(
        model=self.model_name,
        messages=messages,
        options={
          'temperature': temperature,
          'top_p': top_p,
          'num_predict': max_tokens,
          'num_ctx': settings.OLLAMA_CONTEXT_LENGTH
        }
      )
    
      return response['message']['content']
    
    except Exception as e:
      logger.error(f"Error in chat generation: {str(e)}")
      raise
  
  def health_check(self) -> bool:
    """Check if Ollama service is healthy"""
    try:
      models = self.client.list()
      return True
    except Exception as e:
      logger.error(f"Ollama health check failed: {str(e)}")
      return False


# Create global instance
llm_service = LLMService()
