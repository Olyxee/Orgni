from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from packages.contracts.tokens import OrganizationalToken
from ontology.mappings import map_contract, map_invoice, map_payment
from ontology.mappings.common import commit
from ontology.store.dlq import DeadLetterQueue
from ontology.store.fact_store import FactStore
from ontology.telemetry import logger, tracer


class TokenWorkerProcessor:
    """Production ingestion worker featuring async batch execution, write locking,
    structured telemetry, and dead-letter queue (DLQ) fault isolation.
    """

    def __init__(
        self,
        store: FactStore,
        dlq: DeadLetterQueue,
        max_concurrency: int = 10,
    ) -> None:
        self.store = store
        self.dlq = dlq
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.commit_lock = asyncio.Lock()  # Prevents DB write race conditions during entity resolution

    async def process_queued_token(
        self,
        token: OrganizationalToken,
        source_id: str,
    ) -> dict[str, int]:
        """Processes a single OrganizationalToken with active tracing, exception isolation,
        and thread-safe transactional committing.
        """
        async with self.semaphore:
            token_id = getattr(token, "token_id", "unknown_id")
            token_type = getattr(token, "token_type", "UNKNOWN")

            with tracer.start_as_current_span("worker.process_queued_token") as span:
                span.set_attribute("token.id", token_id)
                span.set_attribute("token.type", token_type)
                span.set_attribute("source.id", source_id)

                logger.info("token_processing_started", token_id=token_id, token_type=token_type)

                try:
                    # 1. CPU-bound mapping / transformation stage
                    if token_type == "INVOICE":
                        mapping_result = await asyncio.to_thread(map_invoice, token, source_id=source_id)
                    elif token_type == "CONTRACT":
                        mapping_result = await asyncio.to_thread(map_contract, token, source_id=source_id)
                    elif token_type in ("PROOF_OF_PAYMENT", "PAYMENT"):
                        mapping_result = await asyncio.to_thread(map_payment, token, source_id=source_id)
                    else:
                        raise ValueError(f"Unimplemented mapping pipeline rule for type: {token_type}")

                    # 2. Synchronized database commit stage (protects entity resolution)
                    async with self.commit_lock:
                        commit_summary = await asyncio.to_thread(commit, self.store, mapping_result)

                    logger.info(
                        "token_processing_success",
                        token_id=token_id,
                        commit_summary=commit_summary,
                    )
                    return commit_summary

                except Exception as exc:
                    logger.error(
                        "token_processing_failed_routing_to_dlq",
                        token_id=token_id,
                        error=str(exc),
                        exc_info=True,
                    )

                    # 3. Fault isolation: route unparseable/corrupt payload to DLQ without crashing the pipeline
                    raw_payload = (
                        token.model_dump() if hasattr(token, "model_dump") else getattr(token, "__dict__", {})
                    )
                    await self.dlq.route_to_dlq(
                        raw_payload=raw_payload,
                        error=exc,
                        stage="worker_mapping_and_commit",
                        token_id=token_id,
                    )

                    return {"entities": 0, "relationships": 0, "assertions": 0}

    async def process_batch(
        self,
        token_batch: List[tuple[OrganizationalToken, str]],
    ) -> List[dict[str, int]]:
        """Consumes a stream/batch of tokens concurrently while preventing worker pipeline stalls."""
        with tracer.start_as_current_span("worker.process_batch") as span:
            span.set_attribute("batch.size", len(token_batch))
            logger.info("batch_processing_started", batch_size=len(token_batch))

            tasks = [
                self.process_queued_token(token=token, source_id=source_id)
                for token, source_id in token_batch
            ]

            results = await asyncio.gather(*tasks, return_exceptions=False)
            logger.info("batch_processing_completed", processed_count=len(results))
            return results


# Backward-compatible synchronous entry point
def process_queued_token(
    token: OrganizationalToken,
    store: FactStore,
    source_id: str,
) -> dict[str, int]:
    """Synchronous entry point that bridges legacy callers and tests
    with the async TokenWorkerProcessor pipeline.
    """
    dlq = DeadLetterQueue()
    processor = TokenWorkerProcessor(store=store, dlq=dlq)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # If an event loop is already running, execute synchronously inside the loop context
        return loop.run_until_complete(
            processor.process_queued_token(token=token, source_id=source_id)
        )
    else:
        return asyncio.run(
            processor.process_queued_token(token=token, source_id=source_id)
        )