"""
End-to-end demo: ingest the three example documents in examples/, print the
resulting organizational facts, and demonstrate Rule 5 (conflicting facts
coexist) using the two contract examples.

Run with:  python run_demo.py
"""

import json
from pathlib import Path

from ontology.store.fact_store import FactStore
from ontology.mappings import (
    map_invoice,
    map_contract,
    map_payment,
    OrganizationalToken,
)
from ontology.mappings.common import commit

EXAMPLES = Path(__file__).resolve().parent / "examples"


def load(name: str) -> dict:
    return json.loads((EXAMPLES / name).read_text())


def main() -> None:
    store = FactStore()

    # 1. Ingest Invoice via OrganizationalToken
    invoice_payload = load("invoice_example.json")
    invoice_token = OrganizationalToken(
        token_id="tok_inv_001",
        token_type="INVOICE",
        payload=invoice_payload
    )
    commit(store, map_invoice(invoice_token, source_id="invoice_INV-001.pdf", confidence=0.94))

    # 2. Ingest Initial Contract via OrganizationalToken
    contract_payload = load("contract_example.json")
    contract_token = OrganizationalToken(
        token_id="tok_con_001_v1",
        token_type="CONTRACT",
        payload=contract_payload
    )
    commit(store, map_contract(contract_token, source_id="contract_CON-001_v1.pdf", confidence=0.95))

    # 3. Ingest Conflicting Contract — demonstrates Rule 5: both assertions are preserved
    contract_conflict_payload = load("contract_example_conflicting.json")
    contract_conflict_token = OrganizationalToken(
        token_id="tok_con_001_v2",
        token_type="CONTRACT",
        payload=contract_conflict_payload
    )
    commit(store, map_contract(contract_conflict_token, source_id="contract_CON-001_v2.pdf", confidence=0.88))

    # 4. Ingest Payment via OrganizationalToken
    payment_payload = load("payment_example.json")
    payment_token = OrganizationalToken(
        token_id="tok_pay_001",
        token_type="PAYMENT",
        payload=payment_payload
    )
    commit(store, map_payment(payment_token, source_id="pop_PAY-001.pdf", confidence=0.92))

    # --- Output Display Traces ---

    print("=== Entities ===")
    for e in store.all_entities():
        print(f"  [{e.type.value}] {e.id}  attributes={e.attributes}")

    print("\n=== Relationships ===")
    for r in store.all_relationships():
        src = store.get_entity(r.source_id)
        tgt = store.get_entity(r.target_id)
        print(f"  {src.type.value}({src.attributes}) --{r.relationship_type.value}--> {tgt.type.value}({tgt.attributes})")

    print("\n=== Rule 5 demo: conflicting contract_value assertions ===")
    contract = next(e for e in store.all_entities() if e.type.value == "Contract")
    for a in store.conflicting_assertions(contract.id, "contract_value"):
        print(f"  value={a.value}  source={a.provenance.source_id}  confidence={a.provenance.confidence}")

    print("\n=== Store stats ===")
    print(f"  {store.stats()}")


if __name__ == "__main__":
    main()