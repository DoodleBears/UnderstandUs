import requests

from app.core.config import settings


class SpeechToTextService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1/speech-to-text"
        
    def convert_audio_to_text(self, audio_data: bytes) -> str:
        """
        Convert audio data to text using ElevenLabs Speech to Text API
        
        Args:
            audio_data (bytes): Raw audio data
            
        Returns:
            str: Transcribed text
        """
        headers = {
            "xi-api-key": self.api_key,
        }
        
        files = {
            'audio': ('audio.wav', audio_data, 'audio/wav')
        }
        
        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                files=files
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("text", "")
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Error converting speech to text: {str(e)}")

speech_to_text_service = SpeechToTextService() 