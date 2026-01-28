#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from server.config import data_dir
from server.trace.store import TraceStore


def parse_date(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def cleanup(store: TraceStore, keep: int, older_than_days: int | None) -> int:
    traces = store.list_traces()
    if older_than_days is not None:
        cutoff = datetime.now(timezone.utc).timestamp() - older_than_days * 86400
        to_delete = [trace for trace in traces if parse_date(trace.startedAt).timestamp() < cutoff]
    else:
        to_delete = traces[:-keep] if keep >= 0 else []

    for trace in to_delete:
        store.delete_trace(trace.id)
    return len(to_delete)


def snapshot(store: TraceStore, output: Path) -> Path:
    return store.export_snapshot(output)


def main() -> int:
    parser = argparse.ArgumentParser(description="Agent Director store maintenance")
    parser.add_argument("--data-dir", type=Path, default=data_dir())

    subparsers = parser.add_subparsers(dest="command", required=True)

    cleanup_parser = subparsers.add_parser("cleanup", help="Remove old traces")
    cleanup_parser.add_argument("--keep", type=int, default=20, help="Number of newest traces to keep")
    cleanup_parser.add_argument("--older-than-days", type=int, default=None, help="Delete traces older than N days")

    snapshot_parser = subparsers.add_parser("snapshot", help="Export a zipped snapshot")
    snapshot_parser.add_argument("--output", type=Path, required=True, help="Output zip path")

    args = parser.parse_args()
    store = TraceStore(args.data_dir)

    if args.command == "cleanup":
        deleted = cleanup(store, args.keep, args.older_than_days)
        print(f"Deleted {deleted} traces.")
        return 0
    if args.command == "snapshot":
        path = snapshot(store, args.output)
        print(f"Snapshot written to {path}")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
