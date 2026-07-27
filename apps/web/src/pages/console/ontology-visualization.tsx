import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Database, Network } from "lucide-react";
import {
  listEntities,
  listFacts,
  listRelationships,
  type Provenance,
} from "@/lib/api";
import { humanizeType } from "./fact-card";
import { EmptyState, ErrorState, useData } from "./shared";

type OntologyNodeData = {
  label: string;
  kind: "entity" | "fact" | "policy" | "reference";
  detail: string;
  source?: Provenance;
};

type OntologyNode = Node<OntologyNodeData>;

const nodePalette: Record<OntologyNodeData["kind"], React.CSSProperties> = {
  entity: {
    background: "#111111",
    border: "1px solid #111111",
    color: "#ffffff",
  },
  fact: {
    background: "#ffffff",
    border: "1px solid #a3a3a3",
    color: "#171717",
  },
  policy: {
    background: "#e5e5e5",
    border: "1px solid #737373",
    color: "#171717",
  },
  reference: {
    background: "#fafafa",
    border: "1px dashed #a3a3a3",
    color: "#525252",
  },
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function readableValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      2,
    );
    return entries
      .map(([key, item]) => `${humanizeType(key)}: ${item}`)
      .join(" · ");
  }
  return String(value);
}

function relationEndpoint(
  value: unknown,
  aliases: Map<string, string>,
  nodes: OntologyNode[],
  referenceIndex: number,
): string {
  const raw = String(value ?? "").trim();
  const existing = aliases.get(normalize(raw));
  if (existing) return existing;

  const id = `reference-${referenceIndex}-${normalize(raw) || "unknown"}`;
  nodes.push({
    id,
    position: { x: 0, y: 0 },
    data: {
      label: raw || "Unknown reference",
      kind: "reference",
      detail: "Referenced by evidence but not resolved as an entity",
    },
    style: { ...nodePalette.reference, width: 180, borderRadius: 6 },
  });
  if (raw) aliases.set(normalize(raw), id);
  return id;
}

export default function OntologyVisualization() {
  const entitiesState = useData(listEntities);
  const relationshipsState = useData(listRelationships);
  const factsState = useData(listFacts);
  const [selected, setSelected] = useState<OntologyNode | null>(null);

  const graph = useMemo(() => {
    const entities = entitiesState.data?.entities ?? [];
    const relationships = relationshipsState.data?.relationships ?? [];
    const facts = factsState.data?.facts ?? [];
    const nodes: OntologyNode[] = [];
    const edges: Edge[] = [];
    const aliases = new Map<string, string>();

    entities.forEach((entry, index) => {
      const id = `entity-${index}`;
      const name = String(entry.entity.name ?? entry.key);
      const type = humanizeType(
        entry.entity.entity_type ?? entry.entity.type ?? "Entity",
      );
      nodes.push({
        id,
        position: { x: 100, y: index * 120 },
        data: {
          label: name,
          kind: "entity",
          detail: `${type} · ${entry.occurrences} evidence occurrence${entry.occurrences === 1 ? "" : "s"}`,
          source: entry.sources[0],
        },
        style: {
          ...nodePalette.entity,
          width: 190,
          minHeight: 58,
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          padding: 12,
        },
      });

      [entry.key, name, entry.entity.entity_id].forEach((alias) => {
        if (alias) aliases.set(normalize(alias), id);
      });
    });

    relationships.forEach((entry, index) => {
      const relationship = entry.relationship;
      const source = relationEndpoint(
        relationship.subject_ref ?? relationship.subject,
        aliases,
        nodes,
        index * 2,
      );
      const target = relationEndpoint(
        relationship.object_ref ?? relationship.object,
        aliases,
        nodes,
        index * 2 + 1,
      );
      edges.push({
        id: `relationship-${index}`,
        source,
        target,
        label: humanizeType(
          relationship.predicate ??
            relationship.relationship_type ??
            "Related to",
        ),
        markerEnd: { type: MarkerType.ArrowClosed, color: "#525252" },
        style: { stroke: "#525252", strokeWidth: 1.4 },
        labelStyle: { fill: "#404040", fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      });
    });

    facts.slice(0, 80).forEach((entry, index) => {
      const fact = entry.fact;
      const rawKind = String(
        fact.fact_kind ?? fact.token_kind ?? fact.fact_type ?? "",
      );
      const kind: OntologyNodeData["kind"] = rawKind
        .toUpperCase()
        .includes("POLICY")
        ? "policy"
        : "fact";
      const id = `fact-${index}`;
      const label = humanizeType(
        fact.fact_type ?? fact.predicate ?? rawKind ?? "Fact",
      );
      const detail =
        readableValue(fact.scalar_value ?? fact.value ?? fact.object) ||
        humanizeType(fact.epistemic_status ?? "Evidence-backed");

      nodes.push({
        id,
        position: { x: 520, y: index * 92 },
        data: { label, kind, detail, source: entry.source },
        style: {
          ...nodePalette[kind],
          width: 190,
          minHeight: 54,
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          padding: 10,
        },
      });

      const subject = aliases.get(normalize(fact.subject));
      if (subject) {
        edges.push({
          id: `fact-edge-${index}`,
          source: subject,
          target: id,
          style: { stroke: "#a3a3a3", strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#a3a3a3" },
        });
      }
    });

    const entityNodes = nodes.filter((node) => node.data.kind === "entity");
    const referenceNodes = nodes.filter(
      (node) => node.data.kind === "reference",
    );
    const contextNodes = nodes.filter(
      (node) => node.data.kind === "fact" || node.data.kind === "policy",
    );

    entityNodes.forEach((node, index) => {
      node.position = { x: 80, y: 60 + index * 120 };
    });
    referenceNodes.forEach((node, index) => {
      node.position = { x: 360, y: 40 + index * 100 };
    });
    contextNodes.forEach((node, index) => {
      node.position = { x: 650, y: 40 + index * 90 };
    });

    return { nodes, edges, totalFacts: facts.length };
  }, [entitiesState.data, factsState.data, relationshipsState.data]);

  if (
    entitiesState.loading ||
    relationshipsState.loading ||
    factsState.loading
  ) {
    return <div className="h-[620px] animate-pulse rounded-md bg-muted/50" />;
  }

  const error =
    entitiesState.error ?? relationshipsState.error ?? factsState.error;
  if (error) return <ErrorState error={error} />;

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No ontology to visualize yet"
        description="Upload evidence to resolve entities, facts, policies and relationships. The resulting organisational model will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-neutral-900" />
            Entities
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-neutral-400 bg-white" />
            Facts
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-neutral-500 bg-neutral-200" />
            Policies
          </span>
          <span>{graph.edges.length} mapped connections</span>
        </div>
        {graph.totalFacts > 80 && (
          <span className="text-xs text-muted-foreground">
            Showing the first 80 of {graph.totalFacts} facts
          </span>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="h-[460px] overflow-hidden rounded-md border border-border bg-white sm:h-[560px] xl:h-[620px]">
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.25}
            maxZoom={1.8}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => setSelected(node as OntologyNode)}
            onPaneClick={() => setSelected(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#d4d4d4"
              gap={18}
              size={1}
            />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) =>
                (node as OntologyNode).data.kind === "entity"
                  ? "#171717"
                  : "#d4d4d4"
              }
              maskColor="rgba(245,245,245,0.75)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="min-h-36 rounded-md border border-border bg-card p-4 xl:min-h-0">
          {selected ? (
            <>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {selected.data.kind}
              </p>
              <h3 className="mt-2 text-base font-semibold">
                {selected.data.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {selected.data.detail}
              </p>
              {selected.data.source && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Evidence source
                  </p>
                  <p className="mt-1 break-words text-sm">
                    {selected.data.source.filename}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-32 flex-col items-center justify-center text-center">
              <Database className="size-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Inspect the ontology</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Select a node to see its type, value and evidence source.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
