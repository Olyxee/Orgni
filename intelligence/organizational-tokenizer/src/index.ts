import type { CanonicalEvent, OrganizationalToken, PrincipalRule } from "@workspace/schemas";
import { clampConfidence } from "@workspace/schemas";

export const TOKENIZER_VERSION = "orgni.organizational-tokenizer.v1";

export interface TokenizeOptions {
  visibility?: PrincipalRule[];
  actionScope?: string[];
  retentionClass?: string;
}

export function tokenizeCanonicalEvent(
  event: CanonicalEvent,
  options: TokenizeOptions = {},
): OrganizationalToken {
  return {
    tokenId: `tok_${event.eventId}`,
    tenantId: event.tenantId,
    tokenKind: "EVENT",
    eventType: event.eventType,
    subjectId: event.subjectId,
    objectId: event.objectId,
    transactionTime: event.transactionTime,
    validTime: event.occurredAt ? { from: event.occurredAt } : undefined,
    sourceRefs: event.sourceRefs,
    confidence: clampConfidence(event.confidence),
    epistemicStatus: event.epistemicStatus,
    visibility: options.visibility ?? [],
    actionScope: options.actionScope ?? [],
    retentionClass: options.retentionClass ?? "standard",
    payloadRef: event.eventId,
  };
}

export function tokenizeCanonicalEvents(
  events: CanonicalEvent[],
  options: TokenizeOptions = {},
): OrganizationalToken[] {
  return events.map((event) => tokenizeCanonicalEvent(event, options));
}
