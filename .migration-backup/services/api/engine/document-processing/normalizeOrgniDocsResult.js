function normalizeOrgniDocsResult(result) {
  const extraction = result?.stage_outputs?.extraction || {};
  const validation = result?.stage_outputs?.validation || {};

  const events = [
    {
      type: 'DocumentIntegrityEvaluated',
      confidence: typeof result?.trust_score === 'number' ? result.trust_score : 0,
      payload: {
        verdict: result?.verdict || 'UNKNOWN',
        trustScore: result?.trust_score ?? null,
        riskLevel: result?.risk_level || null,
        integrityFlags: result?.integrity_flags || [],
      },
    },
  ];

  for (const [field, value] of Object.entries(extraction.extracted_fields || {})) {
    events.push({
      type: 'FieldExtracted',
      confidence: extraction.field_confidence?.[field] ?? extraction.completeness_score ?? 0,
      payload: { field, value, source: extraction.field_sources?.[field] || 'unknown' },
    });
  }

  for (const issue of [...(validation.issues || []), ...(validation.warnings || [])]) {
    events.push({
      type: 'ValidationIssueDetected',
      confidence: 1,
      payload: issue,
    });
  }

  return {
    processor: 'orgni-docs',
    status: result?.error ? 'failed' : 'integrity_evaluated',
    integrity: {
      verdict: result?.verdict || 'UNKNOWN',
      trustScore: result?.trust_score ?? null,
      riskLevel: result?.risk_level || null,
      approved: result?.approved === true,
      recommendation: result?.recommendation || null,
      flags: result?.integrity_flags || [],
    },
    extractedFields: extraction.extracted_fields || {},
    validation,
    events,
    raw: result,
  };
}

module.exports = { normalizeOrgniDocsResult };
