const { normalizeOrgniDocsResult } = require('./normalizeOrgniDocsResult');

class OrgniDocsProcessor {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.ORGNI_DOCS_URL || 'http://127.0.0.1:8000';
  }

  async process(input) {
    if (typeof fetch !== 'function' || typeof FormData !== 'function' || typeof Blob !== 'function') {
      throw new Error('OrgniDocsProcessor requires fetch, FormData, and Blob support');
    }

    const form = new FormData();
    form.append('file', new Blob([input.buffer], { type: input.mimeType || 'application/octet-stream' }), input.originalName);

    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/run`, {
      method: 'POST',
      body: form,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        processor: 'orgni-docs',
        status: 'failed',
        parseError: body.detail || body.error || `Orgni Docs failed with HTTP ${response.status}`,
        events: [
          {
            type: 'DocumentIntegrityEvaluated',
            confidence: 0,
            payload: { unavailable: true, status: response.status, detail: body.detail || body.error || null },
          },
        ],
      };
    }

    return normalizeOrgniDocsResult(body);
  }
}

module.exports = { OrgniDocsProcessor };
