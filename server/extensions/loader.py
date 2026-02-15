from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any, Dict

from ..trace.schema import TraceSummary
from .types import ExtensionMeta, LoadedExtension


class ExtensionRegistry:
    def __init__(self, plugin_dir: Path | None = None) -> None:
        self.plugin_dir = plugin_dir or (Path(__file__).parent / "plugins")
        self._extensions: Dict[str, LoadedExtension] = {}
        self.discover()

    def discover(self) -> None:
        self._extensions.clear()
        if not self.plugin_dir.exists():
            return
        for path in sorted(self.plugin_dir.glob("*.py")):
            if path.name.startswith("_"):
                continue
            loaded = self._load_module(path)
            if loaded:
                self._extensions[loaded.meta.id] = loaded

    def list_extensions(self) -> list[dict[str, str]]:
        return [loaded.meta.to_dict() for loaded in sorted(self._extensions.values(), key=lambda item: item.meta.id)]

    def run_extension(self, extension_id: str, trace: TraceSummary) -> Dict[str, Any]:
        loaded = self._extensions.get(extension_id)
        if not loaded:
            raise ValueError(f"Unknown extension: {extension_id}")
        result = loaded.run(trace)
        if not isinstance(result, dict):
            raise ValueError(f"Extension {extension_id} returned non-object payload")
        return result

    def _load_module(self, path: Path) -> LoadedExtension | None:
        module_name = f"agent_director_extension_{path.stem}"
        spec = importlib.util.spec_from_file_location(module_name, path)
        if not spec or not spec.loader:
            return None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        extension_id = getattr(module, "PLUGIN_ID", path.stem)
        extension_name = getattr(module, "PLUGIN_NAME", extension_id)
        extension_description = getattr(module, "PLUGIN_DESCRIPTION", "")
        run_fn = getattr(module, "run", None)
        if not isinstance(extension_id, str) or not extension_id.strip():
            return None
        if not callable(run_fn):
            return None
        meta = ExtensionMeta(
            id=extension_id.strip(),
            name=str(extension_name).strip() or extension_id.strip(),
            description=str(extension_description).strip(),
        )
        return LoadedExtension(meta=meta, run=run_fn)
