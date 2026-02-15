from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

StepType = Literal["llm_call", "tool_call", "decision", "handoff", "guardrail"]
StepStatus = Literal["pending", "running", "completed", "failed"]
TraceStatus = Literal["running", "completed", "failed"]
ReplayStrategy = Literal["recorded", "live", "hybrid", "merge"]


@dataclass
class TraceMetadata:
    source: str
    agentName: str
    modelId: str
    wallTimeMs: int
    workTimeMs: Optional[int] = None
    totalTokens: Optional[int] = None
    totalCostUsd: Optional[float] = None
    errorCount: Optional[int] = None
    retryCount: Optional[int] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TraceMetadata":
        return cls(
            source=data.get("source", "manual"),
            agentName=data.get("agentName", "unknown"),
            modelId=data.get("modelId", "unknown"),
            wallTimeMs=int(data.get("wallTimeMs", 0)),
            workTimeMs=data.get("workTimeMs"),
            totalTokens=data.get("totalTokens"),
            totalCostUsd=data.get("totalCostUsd"),
            errorCount=data.get("errorCount"),
            retryCount=data.get("retryCount"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                "source": self.source,
                "agentName": self.agentName,
                "modelId": self.modelId,
                "wallTimeMs": self.wallTimeMs,
                "workTimeMs": self.workTimeMs,
                "totalTokens": self.totalTokens,
                "totalCostUsd": self.totalCostUsd,
                "errorCount": self.errorCount,
                "retryCount": self.retryCount,
            }
        )


@dataclass
class StepMetrics:
    tokensTotal: Optional[int] = None
    costUsd: Optional[float] = None

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["StepMetrics"]:
        if not data:
            return None
        return cls(tokensTotal=data.get("tokensTotal"), costUsd=data.get("costUsd"))

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none({"tokensTotal": self.tokensTotal, "costUsd": self.costUsd})


@dataclass
class StepPreview:
    title: Optional[str] = None
    subtitle: Optional[str] = None
    inputPreview: Optional[str] = None
    outputPreview: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["StepPreview"]:
        if not data:
            return None
        return cls(
            title=data.get("title"),
            subtitle=data.get("subtitle"),
            inputPreview=data.get("inputPreview"),
            outputPreview=data.get("outputPreview"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                "title": self.title,
                "subtitle": self.subtitle,
                "inputPreview": self.inputPreview,
                "outputPreview": self.outputPreview,
            }
        )


@dataclass
class StepIo:
    emittedToolCallIds: List[str] = field(default_factory=list)
    consumedToolCallIds: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["StepIo"]:
        if not data:
            return None
        return cls(
            emittedToolCallIds=list(data.get("emittedToolCallIds", []) or []),
            consumedToolCallIds=list(data.get("consumedToolCallIds", []) or []),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                "emittedToolCallIds": self.emittedToolCallIds,
                "consumedToolCallIds": self.consumedToolCallIds,
            }
        )


@dataclass
class StepSummary:
    id: str
    index: int
    type: StepType
    name: str
    startedAt: str
    endedAt: Optional[str]
    durationMs: Optional[int] = None
    status: StepStatus = "completed"
    error: Optional[str] = None
    parentStepId: Optional[str] = None
    childStepIds: List[str] = field(default_factory=list)
    attempt: Optional[int] = None
    retryOfStepId: Optional[str] = None
    metrics: Optional[StepMetrics] = None
    preview: Optional[StepPreview] = None
    io: Optional[StepIo] = None
    toolCallId: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StepSummary":
        return cls(
            id=data["id"],
            index=int(data.get("index", 0)),
            type=data.get("type", "llm_call"),
            name=data.get("name", ""),
            startedAt=data.get("startedAt", ""),
            endedAt=data.get("endedAt"),
            durationMs=data.get("durationMs"),
            status=data.get("status", "completed"),
            error=data.get("error"),
            parentStepId=data.get("parentStepId"),
            childStepIds=list(data.get("childStepIds", []) or []),
            attempt=data.get("attempt"),
            retryOfStepId=data.get("retryOfStepId"),
            metrics=StepMetrics.from_dict(data.get("metrics")),
            preview=StepPreview.from_dict(data.get("preview")),
            io=StepIo.from_dict(data.get("io")),
            toolCallId=data.get("toolCallId"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                "id": self.id,
                "index": self.index,
                "type": self.type,
                "name": self.name,
                "startedAt": self.startedAt,
                "endedAt": self.endedAt,
                "durationMs": self.durationMs,
                "status": self.status,
                "error": self.error,
                "parentStepId": self.parentStepId,
                "childStepIds": self.childStepIds,
                "attempt": self.attempt,
                "retryOfStepId": self.retryOfStepId,
                "metrics": self.metrics.to_dict() if self.metrics else None,
                "preview": self.preview.to_dict() if self.preview else None,
                "io": self.io.to_dict() if self.io else None,
                "toolCallId": self.toolCallId,
            }
        )


@dataclass
class ReplayInfo:
    strategy: ReplayStrategy
    modifiedStepId: str
    modifications: Dict[str, Any]
    createdAt: str
    checkpoints: Optional[Dict[str, str]] = None
    mergedFromTraceIds: Optional[List[str]] = None

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["ReplayInfo"]:
        if not data:
            return None
        return cls(
            strategy=data.get("strategy", "recorded"),
            modifiedStepId=data.get("modifiedStepId", ""),
            modifications=data.get("modifications", {}),
            createdAt=data.get("createdAt", ""),
            checkpoints=data.get("checkpoints"),
            mergedFromTraceIds=data.get("mergedFromTraceIds"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                "strategy": self.strategy,
                "modifiedStepId": self.modifiedStepId,
                "modifications": self.modifications,
                "createdAt": self.createdAt,
                "checkpoints": self.checkpoints,
                "mergedFromTraceIds": self.mergedFromTraceIds,
            }
        )


@dataclass
class TraceSummary:
    id: str
    name: str
    startedAt: str
    endedAt: Optional[str]
    status: TraceStatus
    metadata: TraceMetadata
    steps: List[StepSummary]
    parentTraceId: Optional[str] = None
    branchPointStepId: Optional[str] = None
    replay: Optional[ReplayInfo] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TraceSummary":
        return cls(
            id=data["id"],
            name=data.get("name", ""),
            startedAt=data.get("startedAt", ""),
            endedAt=data.get("endedAt"),
            status=data.get("status", "completed"),
            metadata=TraceMetadata.from_dict(data.get("metadata", {})),
            steps=[StepSummary.from_dict(s) for s in data.get("steps", [])],
            parentTraceId=data.get("parentTraceId"),
            branchPointStepId=data.get("branchPointStepId"),
            replay=ReplayInfo.from_dict(data.get("replay")),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                "id": self.id,
                "name": self.name,
                "startedAt": self.startedAt,
                "endedAt": self.endedAt,
                "status": self.status,
                "metadata": self.metadata.to_dict(),
                "steps": [s.to_dict() for s in self.steps],
                "parentTraceId": self.parentTraceId,
                "branchPointStepId": self.branchPointStepId,
                "replay": self.replay.to_dict() if self.replay else None,
            }
        )


@dataclass
class RedactionField:
    path: str
    kind: Literal["secret", "pii", "token"]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RedactionField":
        return cls(path=data.get("path", ""), kind=data.get("kind", "secret"))

    def to_dict(self) -> Dict[str, Any]:
        return {"path": self.path, "kind": self.kind}


@dataclass
class RedactionInfo:
    mode: Literal["redacted", "raw"]
    fieldsRedacted: List[RedactionField] = field(default_factory=list)
    revealedFields: List[RedactionField] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["RedactionInfo"]:
        if not data:
            return None
        return cls(
            mode=data.get("mode", "redacted"),
            fieldsRedacted=[RedactionField.from_dict(f) for f in data.get("fieldsRedacted", [])],
            revealedFields=[RedactionField.from_dict(f) for f in data.get("revealedFields", [])],
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "fieldsRedacted": [f.to_dict() for f in self.fieldsRedacted],
            "revealedFields": [f.to_dict() for f in self.revealedFields],
        }


@dataclass
class StepDetails:
    id: str
    index: int
    type: StepType
    name: str
    startedAt: str
    endedAt: Optional[str]
    durationMs: Optional[int]
    status: StepStatus
    error: Optional[str]
    parentStepId: Optional[str]
    childStepIds: List[str]
    attempt: Optional[int]
    retryOfStepId: Optional[str]
    metrics: Optional[StepMetrics]
    preview: Optional[StepPreview]
    io: Optional[StepIo]
    toolCallId: Optional[str]
    data: Dict[str, Any]
    redaction: Optional[RedactionInfo] = None

    @classmethod
    def from_summary(cls, summary: StepSummary, data: Dict[str, Any]) -> "StepDetails":
        return cls(
            id=summary.id,
            index=summary.index,
            type=summary.type,
            name=summary.name,
            startedAt=summary.startedAt,
            endedAt=summary.endedAt,
            durationMs=summary.durationMs,
            status=summary.status,
            error=summary.error,
            parentStepId=summary.parentStepId,
            childStepIds=summary.childStepIds,
            attempt=summary.attempt,
            retryOfStepId=summary.retryOfStepId,
            metrics=summary.metrics,
            preview=summary.preview,
            io=summary.io,
            toolCallId=summary.toolCallId,
            data=data,
        )

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StepDetails":
        return cls(
            id=data["id"],
            index=int(data.get("index", 0)),
            type=data.get("type", "llm_call"),
            name=data.get("name", ""),
            startedAt=data.get("startedAt", ""),
            endedAt=data.get("endedAt"),
            durationMs=data.get("durationMs"),
            status=data.get("status", "completed"),
            error=data.get("error"),
            parentStepId=data.get("parentStepId"),
            childStepIds=list(data.get("childStepIds", []) or []),
            attempt=data.get("attempt"),
            retryOfStepId=data.get("retryOfStepId"),
            metrics=StepMetrics.from_dict(data.get("metrics")),
            preview=StepPreview.from_dict(data.get("preview")),
            io=StepIo.from_dict(data.get("io")),
            toolCallId=data.get("toolCallId"),
            data=data.get("data", {}),
            redaction=RedactionInfo.from_dict(data.get("redaction")),
        )

    def to_dict(self) -> Dict[str, Any]:
        return _strip_none(
            {
                **StepSummary(
                    id=self.id,
                    index=self.index,
                    type=self.type,
                    name=self.name,
                    startedAt=self.startedAt,
                    endedAt=self.endedAt,
                    durationMs=self.durationMs,
                    status=self.status,
                    error=self.error,
                    parentStepId=self.parentStepId,
                    childStepIds=self.childStepIds,
                    attempt=self.attempt,
                    retryOfStepId=self.retryOfStepId,
                    metrics=self.metrics,
                    preview=self.preview,
                    io=self.io,
                    toolCallId=self.toolCallId,
                ).to_dict(),
                "data": self.data,
                "redaction": self.redaction.to_dict() if self.redaction else None,
            }
        )


def _strip_none(payload: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in payload.items() if v is not None}
