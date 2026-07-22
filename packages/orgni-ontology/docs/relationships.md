# Relationships

Source of truth: `ontology/constraints/relationship_constraints.py`
(machine-readable copy generated at `schema/constraints/relationship_constraints.json`).

Every `Relationship` is validated against the type/direction columns below
at construction time. Cardinality (the last two columns) is validated
separately, at the `FactStore` level — see
`docs/adr/0005-cardinality-model.md` for why.

| Relationship | Legal source types | Legal target types | Max per source | Max per target |
|---|---|---|---|---|
| `BELONGS_TO` | Account, Department, Person, Role | Department, Organization | 1 | unlimited |
| `HAS_ROLE` | Person | Role | unlimited | unlimited |
| `REPORTS_TO` | Person | Person | 1 | unlimited |
| `CREATED_BY` | Contract, Document, Invoice, ProofOfPayment | Organization, Person, Supplier | 1 | unlimited |
| `ISSUED_TO` | Contract, Document, Invoice | Counterparty, Customer, Organization, Person | 1 | unlimited |
| `SUPPORTED_BY` | Contract, Invoice, Payment, ProofOfPayment, Transaction | Document, ProofOfPayment | unlimited | unlimited |
| `DERIVED_FROM` | Contract, Document, Invoice | Contract, Document | unlimited | unlimited |
| `BILLS` | Invoice | Customer | 1 | unlimited |
| `PAYS` | Customer, Organization, Person | Counterparty, Supplier | unlimited | unlimited |
| `SETTLES` | Payment, ProofOfPayment | Invoice | 1 | unlimited |
| `GOVERNED_BY` | Contract, Invoice, Transaction | Rule | unlimited | unlimited |
| `REQUIRES` | Workflow | Approval | unlimited | unlimited |
| `PARTY_TO` | Customer, Organization, Supplier | Contract, Obligation | unlimited | unlimited |
| `APPROVES` | Person, Role | Contract, Decision, Invoice, Task | unlimited | unlimited |
| `ASSIGNED_TO` | Approval, Decision, Task | Department, Person, Role | 1 | unlimited |
| `TRIGGERS` | Contract, Decision, Rule, Task, Transaction | Exception, Task, Workflow | unlimited | unlimited |
| `VIOLATES` | Contract, Invoice, Payment, Transaction | Obligation, Rule | unlimited | unlimited |
| `CREATES_EXCEPTION` | Contract, Invoice, Payment, Transaction | Exception | unlimited | unlimited |

## v2 change log — reconciling two source specifications

The Phase 1 Technical Design Document (v1) and the later Engineering
Design Specification (v2) mostly agree, but disagreed outright on three
relationships. Full reasoning for each is in
[`docs/adr/0006-requires-and-triggers-conflict.md`](adr/0006-requires-and-triggers-conflict.md);
short version:

- **`REQUIRES` was redefined, not widened.** v1 used it for
  "Supplier REQUIRES Contract"; v2 uses it for "Workflow REQUIRES
  Approval" — two unrelated concepts sharing one name across the two
  documents. v2 is treated as authoritative going forward. The v1 concept
  is preserved under a new name, **`PARTY_TO`**
  (`Supplier/Customer/Organization → Contract/Obligation`), so no
  information was lost — it just has a clearer, non-colliding name now.
- **`TRIGGERS` was widened** to add `Contract` as a legal source, so
  v2's "Contract TRIGGERS Workflow" holds alongside v1's existing cases.
- **`SUPPORTED_BY` was widened** to add `ProofOfPayment` as a legal
  target, so v2's "Payment SUPPORTED_BY ProofOfPayment" holds alongside
  v1's "X SUPPORTED_BY Document".

Two entity types referenced in v2's own worked examples — `Fact` (in
"Fact DERIVED_FROM Document") and `Action` (in "Action VIOLATES Rule",
"Action CREATES_EXCEPTION Exception") — do not appear in v2's own Core
Domain Model. These are undefined placeholders in the source material,
not just ambiguous phrasing. Rather than inventing two new, undocumented
entity types, they're interpreted as referring to whichever
already-defined types can plausibly fill that role
(`Document/Contract/Invoice` for "Fact"; `Transaction/Invoice/Contract/Payment`
for "Action") — flagged explicitly here and in ADR 0006 rather than
silently assumed.
