from __future__ import annotations

import pytest
from datetime import datetime, timezone
from packages.contracts.tokens import OrganizationalToken
from ontology.mappings import map_invoice
from ontology.mappings.common import commit
from ontology.store.fact_store import FactStore
from ontology.types import EntityType


def create_mock_invoice_token(token_id: str, supplier_name: str, invoice_num: str) -> OrganizationalToken:
    """Helper to generate standard invoice tokens with custom supplier payload."""
    return OrganizationalToken(
        token_id=token_id,
        token_type="INVOICE",
        payload={
            "invoice_number": invoice_num,
            "supplier_name": supplier_name,
            "amount": 1250.00,
            "currency": "USD"
        },
        timestamp=datetime.now(timezone.utc)
    )


def test_cross_document_entity_resolution_in_same_store():
    """
    Verifies that processing two separate documents with the same supplier name
    resolves to the exact same Supplier entity inside a shared FactStore.
    """
    store = FactStore()

    # Document 1: Invoice from "Acme Corp"
    token1 = create_mock_invoice_token("tok_001", "Acme Corp", "INV-101")
    res1 = map_invoice(token1, source_id="doc_001")
    commit(store, res1)

    # Document 2: Different Invoice, same normalized supplier "Acme Corp"
    token2 = create_mock_invoice_token("tok_002", "Acme Corp", "INV-102")
    res2 = map_invoice(token2, source_id="doc_002")
    commit(store, res2)

    supplier1 = next(e for e in res1.entities if e.type == EntityType.SUPPLIER)
    supplier2 = next(e for e in res2.entities if e.type == EntityType.SUPPLIER)

    assert supplier1.id == supplier2.id, (
        f"Supplier IDs diverged across documents! Got '{supplier1.id}' vs '{supplier2.id}'"
    )


def test_deterministic_entity_id_across_separate_runs():
    """
    Verifies that resolving the same normalized entity string across two completely 
    isolated FactStore instances yields the exact same deterministic ID.
    """
    # Run 1: Clean store environment
    store_a = FactStore()
    token_a = create_mock_invoice_token("tok_run1", "Global Logistics Ltd", "INV-201")
    res_a = map_invoice(token_a, source_id="doc_run1")
    commit(store_a, res_a)

    # Run 2: Completely separate store instance (simulating app restart / isolated process)
    store_b = FactStore()
    token_b = create_mock_invoice_token("tok_run2", "Global Logistics Ltd", "INV-202")
    res_b = map_invoice(token_b, source_id="doc_run2")
    commit(store_b, res_b)

    supplier_a = next(e for e in res_a.entities if e.type == EntityType.SUPPLIER)
    supplier_b = next(e for e in res_b.entities if e.type == EntityType.SUPPLIER)

    assert supplier_a.id == supplier_b.id, (
        "Entity resolution is non-deterministic across store re-instantiations!"
    )


def test_normalized_name_resolution_variations():
    """
    Verifies that casing or whitespace variations normalize to the same entity ID.
    """
    store = FactStore()

    # Note space/case differences
    token1 = create_mock_invoice_token("tok_var1", "  Olyxee Tech  ", "INV-301")
    token2 = create_mock_invoice_token("tok_var2", "olyxee tech", "INV-302")

    res1 = map_invoice(token1, source_id="doc_var1")
    res2 = map_invoice(token2, source_id="doc_var2")

    commit(store, res1)
    commit(store, res2)

    # Locate the supplier entity specifically
    supplier1 = next(e for e in res1.entities if e.type == EntityType.SUPPLIER)
    supplier2 = next(e for e in res2.entities if e.type == EntityType.SUPPLIER)

    assert supplier1.id == supplier2.id, "Normalized names failed to produce matching supplier entity IDs!"