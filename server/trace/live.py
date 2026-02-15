from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from queue import Queue
from threading import Lock
from typing import Dict, Tuple
from uuid import uuid4

from .schema import TraceSummary


class LiveTraceBroker:
    def __init__(self) -> None:
        self._lock = Lock()
        self._subscribers: Dict[str, Queue[dict]] = {}
        self._events_emitted = defaultdict(int)

    def subscribe(self) -> Tuple[str, Queue[dict]]:
        token = uuid4().hex
        queue: Queue[dict] = Queue()
        with self._lock:
            self._subscribers[token] = queue
        return token, queue

    def unsubscribe(self, token: str) -> None:
        with self._lock:
            self._subscribers.pop(token, None)

    def publish_trace(self, trace: TraceSummary) -> None:
        event = {
            "type": "trace",
            "publishedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "trace": trace.to_dict(),
        }
        with self._lock:
            subscribers = list(self._subscribers.items())
        for token, queue in subscribers:
            queue.put_nowait(event)
            self._events_emitted[token] += 1
