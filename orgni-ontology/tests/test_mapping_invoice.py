from ontology.mappings.invoice import map_invoice
from ontology.mappings.common import commit, OrganizationalToken
from ontology.types import EntityType, RelationshipType


def test_minimal_invoice_matches_design_doc_input_shape(store):
    """The design doc's own Invoice input example only has invoice_number,
    supplier, and amount. This must map cleanly with no invented fields."""
    token = OrganizationalToken(
        token_id="tok_inv_001",
        token_type="INVOICE",
        payload={"invoice_number": "INV-001", "supplier_name": "ABC Ltd", "amount": 50000}
    )
    result = map_invoice(token, source_id="invoice_INV-001.pdf", confidence=0.94)
    stats = commit(store, result)

    assert stats["entities"] == 3  # Invoice, Supplier, Document
    types = sorted(e.type.value for e in store.all_entities())
    assert types == ["Document", "Invoice", "Supplier"]

    # No Customer entity should have been invented — Rule 4.
    assert not any(e.type == EntityType.CUSTOMER for e in store.all_entities())

    invoice = next(e for e in store.all_entities() if e.type == EntityType.INVOICE)
    amount_assertions = store.assertions_for(invoice.id, "amount")
    assert len(amount_assertions) == 1
    assert amount_assertions[0].value == 50000


def test_full_invoice_produces_bills_relationship_when_customer_present(store):
    token = OrganizationalToken(
        token_id="tok_inv_002",
        token_type="INVOICE",
        payload={
            "invoice_number": "INV-001",
            "supplier_name": "ABC Ltd",
            "customer_name": "XYZ",
            "amount": 50000
        }
    )
    commit(store, map_invoice(token, source_id="invoice_INV-001.pdf", confidence=0.94))

    bills = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.BILLS]
    assert len(bills) == 1
    customer = store.get_entity(bills[0].target_id)
    
    # Asserting names are kept safely as distinct assertions, not key identity attributes
    name_assertions = store.assertions_for(customer.id, "display_name")
    assert len(name_assertions) == 1
    assert name_assertions[0].value == "XYZ"


def test_invoice_supported_by_document_matches_worked_example(store):
    token = OrganizationalToken(
        token_id="tok_inv_003",
        token_type="INVOICE",
        payload={"invoice_number": "INV-001", "supplier_name": "ABC Ltd"}
    )
    commit(store, map_invoice(token, source_id="D1.pdf", confidence=0.9))

    supported = [r for r in store.all_relationships() if r.relationship_type == RelationshipType.SUPPORTED_BY]
    assert len(supported) == 1
    doc = store.get_entity(supported[0].target_id)
    assert doc.attributes["source_document"] == "D1.pdf"