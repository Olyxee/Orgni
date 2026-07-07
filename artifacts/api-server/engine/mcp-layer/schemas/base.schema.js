/**
 * Orgni MCP Intel Engine - Base Data Contract Schema
 * Maps incoming inputs (emails, calendars, docs) before shipping to FastAPI NER.
 */
const baseMcpSchema = {
    validate: (data) => {
        const requiredFields = ['id', 'source', 'receivedAt', 'orgId', 'text', 'raw'];
        const validSources = ['email', 'calendar', 'document', 'tool'];

        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`[MCP Data Contract Error]: Missing required field [${field}]`);
            }
        }

        if (!validSources.includes(data.source)) {
            throw new Error(`[MCP Data Contract Error]: Unsupported tool source type [${data.source}]`);
        }

        return {
            id: data.id,
            source: data.source,
            receivedAt: data.receivedAt,
            orgId: data.orgId,
            text: data.text.trim(),
            raw: data.raw,
            processedAt: new Date().toISOString()
        };
    }
};

module.exports = baseMcpSchema;
