from __future__ import annotations

from typing import Any, Dict


def build_openapi_spec() -> Dict[str, Any]:
    return {
        "openapi": "3.1.0",
        "info": {
            "title": "Agent Director API",
            "version": "1.0.0",
            "description": "Operational API for trace analysis, replay jobs, governance, and telemetry ingestion.",
        },
        "servers": [{"url": "http://127.0.0.1:8787"}],
        "components": {
            "securitySchemes": {
                "ApiKeyAuth": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-API-Key",
                },
                "TenantHeader": {
                    "type": "apiKey",
                    "in": "header",
                    "name": "X-Tenant-Id",
                },
            }
        },
        "security": [{"ApiKeyAuth": [], "TenantHeader": []}],
        "paths": {
            "/api/health": {
                "get": {
                    "summary": "Health check",
                    "responses": {"200": {"description": "Service health status"}},
                    "security": [],
                }
            },
            "/api/openapi.json": {
                "get": {
                    "summary": "OpenAPI schema",
                    "responses": {"200": {"description": "OpenAPI document"}},
                    "security": [],
                }
            },
            "/api/traces": {
                "get": {
                    "summary": "List traces",
                    "responses": {"200": {"description": "Trace list"}},
                }
            },
            "/api/traces/import": {
                "post": {
                    "summary": "Import a normalized agent trace",
                    "description": (
                        "Accepts Agent Director JSON, OpenAI Agents-style spans, "
                        "OpenTelemetry GenAI spans, or OpenInference spans and normalizes "
                        "them into TraceSummary plus StepDetails records with provenance, "
                        "token, cost, and importer warning metadata."
                    ),
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["source", "payload"],
                                    "properties": {
                                        "source": {
                                            "type": "string",
                                            "enum": [
                                                "agent_director",
                                                "openai_agents",
                                                "otel_genai",
                                                "openinference",
                                            ],
                                        },
                                        "payload": {"type": "object"},
                                        "options": {"type": "object"},
                                    },
                                }
                            }
                        },
                    },
                    "responses": {
                        "201": {"description": "Imported trace with importer warnings"},
                        "400": {"description": "Unsupported source or invalid payload"},
                    },
                }
            },
            "/api/traces/{trace_id}": {
                "get": {
                    "summary": "Get trace summary",
                    "parameters": [
                        {
                            "name": "trace_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"200": {"description": "Trace summary"}},
                }
            },
            "/api/traces/{trace_id}/steps/{step_id}": {
                "get": {
                    "summary": "Get step details",
                    "parameters": [
                        {
                            "name": "trace_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        },
                        {
                            "name": "step_id",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        },
                    ],
                    "responses": {"200": {"description": "Step detail payload"}},
                }
            },
            "/api/replay-jobs": {
                "post": {
                    "summary": "Create replay job",
                    "description": (
                        "Creates deterministic replay or matrix scenarios. Replay output "
                        "includes executionMode/truthLabel metadata so recorded copies, "
                        "counterfactual simulations, and future executed replays are not conflated."
                    ),
                    "parameters": [
                        {
                            "name": "Idempotency-Key",
                            "in": "header",
                            "required": False,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"202": {"description": "Replay job queued"}},
                }
            },
            "/api/replay-jobs/{job_id}": {
                "get": {
                    "summary": "Fetch replay job",
                    "parameters": [
                        {"name": "job_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "Replay job"}},
                }
            },
            "/api/replay-jobs/{job_id}/matrix": {
                "get": {
                    "summary": "Fetch replay matrix summary",
                    "parameters": [
                        {"name": "job_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "Replay matrix"}},
                }
            },
            "/api/replay-jobs/{job_id}/dead-letters": {
                "get": {
                    "summary": "Fetch replay dead-letter records for a job",
                    "parameters": [
                        {"name": "job_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "Dead-letter records"}},
                }
            },
            "/api/replay-dead-letters": {
                "get": {
                    "summary": "List replay dead-letter records",
                    "responses": {"200": {"description": "Dead-letter records"}},
                }
            },
            "/api/replay-jobs/{job_id}/cancel": {
                "post": {
                    "summary": "Cancel replay job",
                    "parameters": [
                        {"name": "job_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "Replay job canceled"}},
                }
            },
            "/api/compare": {
                "post": {
                    "summary": "Compare traces",
                    "parameters": [
                        {
                            "name": "Idempotency-Key",
                            "in": "header",
                            "required": False,
                            "schema": {"type": "string"},
                        }
                    ],
                    "responses": {"200": {"description": "Comparison diff"}},
                }
            },
            "/api/telemetry/events": {
                "post": {
                    "summary": "Ingest telemetry events",
                    "responses": {"202": {"description": "Telemetry events accepted"}},
                }
            },
            "/api/eval-cases": {
                "get": {
                    "summary": "List eval cases",
                    "responses": {"200": {"description": "Tenant-scoped eval case list"}},
                }
            },
            "/api/eval-cases/from-trace": {
                "post": {
                    "summary": "Create an eval case from a trace",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["trace_id"],
                                    "properties": {
                                        "trace_id": {"type": "string"},
                                        "step_id": {"type": "string"},
                                        "name": {"type": "string"},
                                        "evaluators": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "required": ["type", "step_id", "expected"],
                                                "properties": {
                                                    "type": {
                                                        "type": "string",
                                                        "enum": ["text_contains", "semantic_similarity"],
                                                    },
                                                    "name": {"type": "string"},
                                                    "step_id": {"type": "string"},
                                                    "stepId": {"type": "string"},
                                                    "field": {
                                                        "type": "string",
                                                        "description": "error, name, preview.inputPreview, preview.outputPreview, or data.*",
                                                    },
                                                    "expected": {"type": "string"},
                                                    "minScore": {
                                                        "type": "number",
                                                        "minimum": 0,
                                                        "maximum": 1,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                }
                            }
                        },
                    },
                    "responses": {
                        "201": {"description": "Eval case created from trace evidence"},
                        "404": {"description": "Trace not found for tenant"},
                    },
                }
            },
            "/api/eval-runs": {
                "post": {
                    "summary": "Run deterministic eval cases",
                    "requestBody": {
                        "required": False,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "case_ids": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        }
                                    },
                                }
                            }
                        },
                    },
                    "responses": {
                        "201": {"description": "Eval run with deterministic scores"},
                        "400": {"description": "No cases available or unknown case"},
                    },
                }
            },
            "/api/eval-runs/{run_id}": {
                "get": {
                    "summary": "Fetch eval run",
                    "parameters": [
                        {"name": "run_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {
                        "200": {"description": "Eval run"},
                        "404": {"description": "Eval run not found for tenant"},
                    },
                }
            },
            "/api/admin/governance/retention": {
                "get": {
                    "summary": "Get retention policy",
                    "responses": {"200": {"description": "Retention policy"}},
                },
                "post": {
                    "summary": "Set retention policy",
                    "responses": {"200": {"description": "Retention policy updated"}},
                },
            },
            "/api/admin/governance/retention/apply": {
                "post": {
                    "summary": "Apply retention policy immediately",
                    "responses": {"200": {"description": "Retention policy applied"}},
                }
            },
            "/api/admin/audit-events": {
                "get": {
                    "summary": "List audit events",
                    "responses": {"200": {"description": "Audit events"}},
                }
            },
            "/api/admin/traces/{trace_id}/delete": {
                "post": {
                    "summary": "Delete a trace",
                    "parameters": [
                        {"name": "trace_id", "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {"200": {"description": "Trace deleted"}},
                }
            },
        },
    }
