import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List

import psutil

logger = logging.getLogger(__name__)

@dataclass
class ConnectionMetrics:
    total_connections: int
    connections_per_room: Dict[str, int]
    timestamp: datetime

@dataclass
class LatencyMetrics:
    avg_latency_ms: float
    max_latency_ms: float
    min_latency_ms: float
    timestamp: datetime

@dataclass
class SystemMetrics:
    cpu_percent: float
    memory_percent: float
    timestamp: datetime

class MetricsCollector:
    def __init__(self, history_size: int = 100):
        self._connection_history: deque[ConnectionMetrics] = deque(maxlen=history_size)
        self._latency_history: deque[LatencyMetrics] = deque(maxlen=history_size)
        self._system_history: deque[SystemMetrics] = deque(maxlen=history_size)
        self._message_timestamps: Dict[str, float] = {}
        self._running = False

    async def start(self):
        """启动指标收集"""
        self._running = True
        asyncio.create_task(self._collect_system_metrics())

    async def stop(self):
        """停止指标收集"""
        self._running = False

    def record_connection_metrics(self, total: int, per_room: Dict[str, int]):
        """记录连接指标"""
        metrics = ConnectionMetrics(
            total_connections=total,
            connections_per_room=per_room.copy(),
            timestamp=datetime.now()
        )
        self._connection_history.append(metrics)

    def record_message_sent(self, message_id: str):
        """记录消息发送时间"""
        self._message_timestamps[message_id] = time.time()

    def record_message_received(self, message_id: str):
        """记录消息接收时间并计算延迟"""
        if message_id in self._message_timestamps:
            sent_time = self._message_timestamps.pop(message_id)
            latency_ms = (time.time() - sent_time) * 1000
            
            # 如果历史记录为空，创建新的指标
            if not self._latency_history:
                metrics = LatencyMetrics(
                    avg_latency_ms=latency_ms,
                    max_latency_ms=latency_ms,
                    min_latency_ms=latency_ms,
                    timestamp=datetime.now()
                )
            else:
                last_metrics = self._latency_history[-1]
                metrics = LatencyMetrics(
                    avg_latency_ms=(last_metrics.avg_latency_ms + latency_ms) / 2,
                    max_latency_ms=max(last_metrics.max_latency_ms, latency_ms),
                    min_latency_ms=min(last_metrics.min_latency_ms, latency_ms),
                    timestamp=datetime.now()
                )
            self._latency_history.append(metrics)

    async def _collect_system_metrics(self):
        """收集系统指标"""
        while self._running:
            try:
                metrics = SystemMetrics(
                    cpu_percent=psutil.cpu_percent(),
                    memory_percent=psutil.virtual_memory().percent,
                    timestamp=datetime.now()
                )
                self._system_history.append(metrics)
            except Exception as e:
                logger.error(f"收集系统指标失败: {str(e)}")
            await asyncio.sleep(5)  # 每5秒收集一次

    def get_connection_metrics(self, limit: int = 10) -> List[ConnectionMetrics]:
        """获取最近的连接指标"""
        return list(self._connection_history)[-limit:]

    def get_latency_metrics(self, limit: int = 10) -> List[LatencyMetrics]:
        """获取最近的延迟指标"""
        return list(self._latency_history)[-limit:]

    def get_system_metrics(self, limit: int = 10) -> List[SystemMetrics]:
        """获取最近的系统指标"""
        return list(self._system_history)[-limit:]

    def log_error(self, error_type: str, error_message: str):
        """记录错误日志"""
        logger.error(f"[{error_type}] {error_message}")

# 创建全局指标收集器实例
metrics_collector = MetricsCollector() 