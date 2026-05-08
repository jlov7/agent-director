#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.evals import EvalStore
from server.mcp.tools.replay_from_step import execute as replay_execute
from server.trace.importers import SUPPORTED_IMPORT_SOURCES, import_trace
from server.trace.store import TraceStore

DEFAULT_CORPUS = ROOT / "server" / "tests" / "fixtures" / "real_trace_corpus.json"
DEFAULT_ARTIFACT = ROOT / "artifacts" / "dogfood-trace-evidence.json"


def run_corpus(corpus_path: Path = DEFAULT_CORPUS, artifact_path: Path = DEFAULT_ARTIFACT) -> dict[str, Any]:
    corpus = json.loads(corpus_path.read_text(encoding="utf-8"))
    fixtures = corpus.get("fixtures", [])
    if not isinstance(fixtures, list) or len(fixtures) < 8:
        raise AssertionError("dogfood corpus must contain at least 8 fixtures")

    with tempfile.TemporaryDirectory(prefix="agent-director-dogfood-") as temp_dir:
        trace_store = TraceStore(Path(temp_dir))
        eval_store = EvalStore()
        fixture_results: list[dict[str, Any]] = []
        case_ids: list[str] = []
        sources_seen: set[str] = set()
        warning_fixture_count = 0
        replay_truth: dict[str, Any] | None = None

        for fixture in fixtures:
            if not isinstance(fixture, dict):
                raise AssertionError("fixture entries must be objects")
            fixture_id = str(fixture.get("id") or "")
            source = str(fixture.get("source") or "")
            sources_seen.add(source)
            imported = import_trace(source, fixture.get("payload") or {})
            trace = imported.trace
            step_ids = [step.id for step in trace.steps]
            if len(step_ids) != len(set(step_ids)):
                raise AssertionError(f"{fixture_id} produced duplicate normalized step ids")
            if not trace.steps:
                raise AssertionError(f"{fixture_id} produced no steps")

            expected_warnings = [str(item) for item in fixture.get("expectedWarnings", [])]
            for expected in expected_warnings:
                if not any(expected in warning for warning in imported.warnings):
                    raise AssertionError(f"{fixture_id} missing expected importer warning: {expected}")
            if imported.warnings:
                warning_fixture_count += 1

            trace_store.ingest_trace(trace, imported.step_details)
            eval_spec = fixture.get("eval") if isinstance(fixture.get("eval"), dict) else {}
            step_id = str(eval_spec.get("stepId") or "")
            if step_id and step_id not in step_ids:
                raise AssertionError(f"{fixture_id} eval step {step_id} not present in normalized trace")
            evaluators = eval_spec.get("evaluators") if isinstance(eval_spec.get("evaluators"), list) else []
            case = eval_store.create_case_from_trace(
                trace_store,
                trace.id,
                tenant_id="dogfood",
                step_id=step_id or None,
                name=f"{fixture_id} regression",
                evaluators=evaluators,
            )
            case_ids.append(case.id)

            replay_spec = fixture.get("replay") if isinstance(fixture.get("replay"), dict) else None
            if replay_spec:
                replay_payload = replay_execute(
                    trace_store,
                    trace.id,
                    str(replay_spec.get("stepId") or step_ids[0]),
                    str(replay_spec.get("strategy") or "hybrid"),
                    dict(replay_spec.get("modifications") or {}),
                )["structuredContent"]["trace"]
                replay_info = replay_payload.get("replay") or {}
                execution_mode = replay_info.get("executionMode")
                truth_label = replay_info.get("truthLabel") or ""
                if execution_mode != "counterfactual_simulation":
                    raise AssertionError(f"{fixture_id} replay did not preserve counterfactual execution mode")
                if "not executed against a live agent runtime" not in truth_label:
                    raise AssertionError(f"{fixture_id} replay truth label is not explicit")
                if replay_payload.get("metadata", {}).get("providerTraceId") != trace.metadata.providerTraceId:
                    raise AssertionError(f"{fixture_id} replay dropped provider trace provenance")
                replay_truth = {
                    "fixtureId": fixture_id,
                    "traceId": replay_payload.get("id"),
                    "executionMode": execution_mode,
                    "truthLabel": truth_label,
                    "providerTraceId": replay_payload.get("metadata", {}).get("providerTraceId"),
                }

            fixture_results.append(
                {
                    "id": fixture_id,
                    "source": source,
                    "traceId": trace.id,
                    "status": trace.status,
                    "steps": len(trace.steps),
                    "warnings": imported.warnings,
                    "tokens": trace.metadata.totalTokens,
                    "costUsd": trace.metadata.totalCostUsd,
                    "providerTraceId": trace.metadata.providerTraceId,
                }
            )

        missing_sources = sorted(SUPPORTED_IMPORT_SOURCES - sources_seen)
        if missing_sources:
            raise AssertionError(f"dogfood corpus missing sources: {', '.join(missing_sources)}")
        if warning_fixture_count < 3:
            raise AssertionError("dogfood corpus must exercise at least 3 importer-warning fixtures")
        if replay_truth is None:
            raise AssertionError("dogfood corpus must include a replay truth proof fixture")

        run_one = eval_store.run_cases(trace_store, case_ids=case_ids, tenant_id="dogfood")
        run_two = eval_store.run_cases(trace_store, case_ids=case_ids, tenant_id="dogfood")
        normalized_one = _normalize_run(run_one.to_dict())
        normalized_two = _normalize_run(run_two.to_dict())
        if normalized_one != normalized_two:
            raise AssertionError("dogfood eval runs are not deterministic")
        if run_one.status != "passed":
            raise AssertionError("dogfood eval suite did not pass")

        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "corpus": str(corpus_path.relative_to(ROOT)),
            "fixtureCount": len(fixture_results),
            "sourceCoverage": sorted(sources_seen),
            "warningFixtureCount": warning_fixture_count,
            "evalRun": run_one.to_dict(),
            "deterministicEval": True,
            "replayTruth": replay_truth,
            "fixtures": fixture_results,
            "status": "pass",
        }

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def _normalize_run(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": run.get("status"),
        "caseCount": run.get("caseCount"),
        "passedCount": run.get("passedCount"),
        "failedCount": run.get("failedCount"),
        "scores": sorted(
            [
                {
                    "caseId": score.get("caseId"),
                    "traceId": score.get("traceId"),
                    "passed": score.get("passed"),
                    "score": score.get("score"),
                    "checks": [
                        {
                            "name": check.get("name"),
                            "passed": check.get("passed"),
                            "score": check.get("score"),
                        }
                        for check in score.get("checks", [])
                    ],
                }
                for score in run.get("scores", [])
            ],
            key=lambda item: str(item.get("caseId")),
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate real trace dogfood evidence.")
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT)
    args = parser.parse_args()

    payload = run_corpus(args.corpus, args.artifact)
    print(f"Wrote {args.artifact}")
    print(
        "Dogfood evidence: "
        f"{payload['fixtureCount']} fixtures, "
        f"{len(payload['sourceCoverage'])} sources, "
        f"{payload['evalRun']['passedCount']}/{payload['evalRun']['caseCount']} eval cases passed"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
