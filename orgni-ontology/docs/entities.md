# Entities

## Catalogue

| Category    | Type              | Identity attribute   |
|-------------|-------------------|----------------------|
| Structure   | Organization      | `name`               |
|             | Department        | `name`               |
|             | Person            | `name`               |
|             | Role              | `title`              |
| Parties     | Supplier          | `name`               |
|             | Customer          | `name`               |
|             | Counterparty      | `name`               |
| Documents   | Document          | `source_document`    |
|             | Invoice           | `invoice_number`     |
|             | ProofOfPayment    | `reference_number`   |
|             | Contract          | `contract_id`        |
| Financial   | Transaction       | `transaction_id`     |
|             | Payment           | `payment_reference`  |
|             | Amount            | `label`               |
|             | Account           | `account_number`     |
| Operations  | Workflow          | `name`               |
|             | Task              | `name`               |
|             | Approval          | `reference`          |
|             | Decision          | `reference`          |
| Governance  | Rule              | `name`               |
|             | Obligation        | `name`               |
|             | Exception         | `reference`          |
|             | Risk              | `name`               |

Source of truth: `ontology/types/entity_types.py` (the enum) and
`ontology/models/entity.py::IDENTITY_FIELDS` (the identity attribute map).

## Why every type needs an identity attribute

`FactStore.resolve_or_create_entity` uses `Entity.identity_key()` — the
type plus the identity attribute value(s) — to decide whether an incoming
entity is the *same* real-world thing as one already in the store, or a
new one. Without a required identity attribute, every mention of "Supplier
ABC Ltd" across ten different invoices would create ten different Supplier
nodes instead of resolving to one. This is what lets `map_payment()` link a
Proof of Payment to an Invoice created by an earlier, separate `map_invoice()`
call (see `tests/test_mapping_payment.py::test_payment_can_precede_invoice_mapping`).

## Base shape

Every entity, regardless of type, has:

```json
{
  "id": "uuid",
  "type": "EntityType",
  "attributes": { "...": "identity + any other captured fields" },
  "created_at": "datetime",
  "effective_from": "datetime | null",
  "effective_to": "datetime | null",
  "event_timestamp": "datetime | null",
  "provenance": { "...": "see Validation Rules > Provenance" }
}
```

`created_at` is when this record was written to the store.
`effective_from`/`effective_to` is the validity window (Temporal Model).
`event_timestamp` is when the real-world thing actually happened (e.g. an
invoice's issue date) — distinct from both of the above, and it may well
be earlier than `created_at`.

This matches section 6 of the design doc exactly, with two additions:
`attributes` (to actually hold the identity/business data) and `provenance`
(required per Rule 3).
