# packages/orgni-ontology/ontology/store/dlq.py
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from ontology.telemetry import logger


class DLQStorageBackend(ABC):
    """Abstract interface for persistent DLQ backends."""

    @abstractmethod
    async def write_failure(self, record: Dict[str, Any]) -> None:
        """Persist a failed payload record to the target backend."""
        pass


class InMemoryDLQAdapter(DLQStorageBackend):
    """Fallback in-memory storage (ideal for local testing and CI runs)."""

    def __init__(self) -> None:
        self.records: List[Dict[str, Any]] = []

    async def write_failure(self, record: Dict[str, Any]) -> None:
        self.records.append(record)


class PostgresDLQAdapter(DLQStorageBackend):
    """Persistent PostgreSQL adapter for Docker/K8s worker deployments.
    
    Requires asyncpg or SQLAlchemy async session passed at init.
    """

    def __init__(self, db_pool: Any) -> None:
        self.pool = db_pool

    async def write_failure(self, record: Dict[str, Any]) -> None:
        query = """
            INSERT INTO dlq_failures (token_id, stage, error_message, payload, created_at)
            VALUES ($1, $2, $3, $4, $5);
        """
        async with self.pool.acquire() as connection:
            await connection.execute(
                query,
                record["token_id"],
                record["stage"],
                record["error"],
                json.dumps(record["raw_payload"]),
                datetime.fromisoformat(record["timestamp"]),
            )


class DeadLetterQueue:
    """Production Dead-Letter Queue wrapper routing failures to a pluggable persistent sink."""

    def __init__(self, backend: Optional[DLQStorageBackend] = None) -> None:
        self.backend = backend or InMemoryDLQAdapter()

    async def route_to_dlq(
        self,
        raw_payload: Dict[str, Any],
        error: Exception,
        stage: str,
        token_id: str = "unknown",
    ) -> None:
        record = {
            "token_id": token_id,
            "stage": stage,
            "error": str(error),
            "raw_payload": raw_payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            await self.backend.write_failure(record)
            logger.info("dlq_failure_persisted", token_id=token_id, stage=stage)
        except Exception as write_err:
            # Fallback stdout log so errors are never lost if DB is down
            logger.critical(
                "dlq_persistence_failed",
                token_id=token_id,
                write_error=str(write_err),
                original_error=str(error),
            )