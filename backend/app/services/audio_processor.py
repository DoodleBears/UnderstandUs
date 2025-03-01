import io
from typing import List, Tuple

import numpy as np
import soundfile as sf
import torch

from app.services.speech_to_text import speech_to_text_service


class AudioBuffer:
    def __init__(self, max_duration: float = 30.0, sample_rate: int = 16000):
        self.max_samples = int(max_duration * sample_rate)
        self.buffer = np.array([], dtype=np.float32)
        self.sample_rate = sample_rate

    def add_audio(self, audio_data: np.ndarray) -> None:
        """添加音频数据到缓冲区"""
        self.buffer = np.concatenate([self.buffer, audio_data])
        
        # 如果缓冲区超过最大长度，保留最后的部分
        if len(self.buffer) > self.max_samples:
            self.buffer = self.buffer[-self.max_samples:]
    
    def get_audio(self) -> np.ndarray:
        """获取缓冲区中的音频数据"""
        return self.buffer
    
    def clear(self) -> None:
        """清空缓冲区"""
        self.buffer = np.array([], dtype=np.float32)

class AudioProcessor:
    def __init__(self):
        self.sample_rate = 16000  # Silero VAD 要求 16kHz
        self.buffer = AudioBuffer(max_duration=30.0, sample_rate=self.sample_rate)
        
        # 初始化 Silero VAD
        self.vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                             model='silero_vad',
                                             force_reload=False)
        
        self.vad_model.eval()  # 设置为评估模式
        self.get_speech_timestamps = utils[0]  # 获取语音时间戳的函数
        
    def extract_speech_segments(self, audio_data: np.ndarray) -> List[np.ndarray]:
        """
        从音频数据中提取语音片段
        
        Args:
            audio_data: 音频数据 numpy 数组
            
        Returns:
            List[np.ndarray]: 语音片段列表
        """
        # 确保音频数据是浮点型且范围在 [-1, 1]
        if audio_data.dtype != np.float32:
            audio_data = audio_data.astype(np.float32)
        
        # 转换为 PyTorch tensor
        tensor = torch.from_numpy(audio_data)
        
        # 获取语音时间戳
        speech_timestamps = self.get_speech_timestamps(
            tensor,
            self.vad_model,
            sampling_rate=self.sample_rate,
            min_speech_duration_ms=500,  # 最小语音持续时间（毫秒）
            min_silence_duration_ms=500,  # 最小静音持续时间（毫秒）
            window_size_samples=512  # 窗口大小（采样点）
        )
        
        # 提取语音片段
        segments = []
        for ts in speech_timestamps:
            start_sample, end_sample = ts['start'], ts['end']
            segment = audio_data[start_sample:end_sample]
            segments.append(segment)
            
        return segments
    
    def process_audio_chunk(self, audio_data: bytes) -> List[Tuple[str, bool]]:
        """
        处理音频数据块，返回检测到的语音片段的转录文本
        
        Args:
            audio_data: 原始音频数据
            
        Returns:
            List[Tuple[str, bool]]: 转录文本列表，每个元素是 (文本, 是否是完整句子)
        """
        try:
            # 将字节数据转换为 numpy 数组
            with io.BytesIO(audio_data) as buf:
                audio_array, _ = sf.read(buf)
            
            # 添加到缓冲区
            self.buffer.add_audio(audio_array)
            
            # 从缓冲区获取完整的音频数据
            full_audio = self.buffer.get_audio()
            
            # 提取语音片段
            segments = self.extract_speech_segments(full_audio)
            
            results = []
            for segment in segments:
                # 将语音片段转换为字节数据
                with io.BytesIO() as buf:
                    sf.write(buf, segment, self.sample_rate, format='WAV')
                    segment_bytes = buf.getvalue()
                
                # 转换为文本
                text = speech_to_text_service.convert_audio_to_text(segment_bytes)
                if text and text.strip():
                    # 检查是否是完整句子
                    is_complete = any(text.strip().endswith(p) for p in ['.', '!', '?', '。', '！', '？'])
                    results.append((text, is_complete))
            
            # 如果检测到完整句子，清空缓冲区
            if any(is_complete for _, is_complete in results):
                self.buffer.clear()
            
            return results
            
        except Exception as e:
            print(f"Error processing audio chunk: {str(e)}")
            return []

audio_processor = AudioProcessor() 