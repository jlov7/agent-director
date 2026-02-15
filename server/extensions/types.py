from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict

from ..trace.schema import TraceSummary


@dataclass
class ExtensionMeta:
    id: str
    name: str
    description: str

    def to_dict(self) -> Dict[str, str]:
        return {"id": self.id, "name": self.name, "description": self.description}


@dataclass
class LoadedExtension:
    meta: ExtensionMeta
    run: Callable[[TraceSummary], Dict[str, Any]]
