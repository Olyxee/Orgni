from __future__ import annotations

import pytest
from apps.api.main import handle_incoming_extraction
from apps.worker.main import process_queued_token
from packages.contracts.tokens import OrganizationalToken
from ontology.store.fact_store import FactStore  # Assuming FactStore imports cleanly from internal layout

class MockFactStore:
    """Mock storage to catch decoupled pipeline outputs."""
    def resolve_or_create_entity(self, entity): return entity
    def add_relationship(self, rel): pass
    def add_attribute_assertion(self, assertion): pass

def test_full_monorepo_data_flow():
    # 1. API creates standard token data from raw extracted input
    raw_payload = {"invoice_number": "INV-2026-X", "supplier_name": "Olyxee Corp", "amount": 5500.00}
    api_response = handle_incoming_extraction("INVOICE", raw_payload)
    
    assert api_response["status"] == "tokenized_successfully"
    
    # 2. Worker handles the explicit standard token class mapping structure smoothly
    token_instance = OrganizationalToken(
        token_id=api_response["token_id"],
        token_type="INVOICE",
        payload=api_response["payload_snapshot"]
    )
    
    mock_store = MockFactStore()
    summary = process_queued_token(token_instance, store=mock_store, source_id="doc_test_123")
    
    # Verify core entities (Invoice, Supplier, Document) are captured dynamically
    assert summary["entities"] == 3
    assert summary["relationships"] == 2