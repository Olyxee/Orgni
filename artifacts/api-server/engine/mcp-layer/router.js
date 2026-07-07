const express = require('express');
const router = express.Router();
const axios = require('axios');
const baseMcpSchema = require('./schemas/base.schema.js');
const { classifyInput } = require('./classifier');
const { recommendAction } = require('./recommender');

const NER_SERVICE_URL = process.env.NER_SERVICE_URL || 'http://localhost:8000';
const USE_NER_MOCK = process.env.USE_NER_MOCK === 'true';

function getMockNerData(text, chunk_id, source_document) {
    return {
        unified_entities: [
            { entity_id: 'mock-001', raw: 'Alisha', label: 'Person', status: 'review', confidence: 0.74 },
            { entity_id: 'mock-002', raw: 'next Friday', label: 'Date', status: 'review', confidence: 0.82 },
            { entity_id: 'mock-003', raw: 'Lethabo', label: 'Person', status: 'review', confidence: 0.86 },
        ],
        audit: { pipeline_version: 'mock-1.3.0' }
    };
}

router.post('/process-input', async (req, res) => {
    try {
        const validated = baseMcpSchema.validate(req.body);
        console.log(`[MCP Router] Source: ${validated.source} | OrgId: ${validated.orgId} | Mock: ${USE_NER_MOCK}`);

        let nerData;
        if (USE_NER_MOCK) {
            nerData = getMockNerData(validated.text, validated.id, validated.source);
        } else {
            const nerResponse = await axios.post(`${NER_SERVICE_URL}/verify`, {
                text: validated.text,
                chunk_id: validated.id,
                source_document: validated.source,
            });
            nerData = nerResponse.data;
        }

        const entities = nerData.unified_entities || [];
        const actionable = entities.filter(e => e.status === 'supported' || e.status === 'review');
        const classification = classifyInput(actionable, validated.text);
        const recommendation = recommendAction(classification, actionable);

        res.status(200).json({
            success: true,
            source: validated.source,
            orgId: validated.orgId,
            inputId: validated.id,
            classification,
            entities: actionable,
            recommendation,
            audit: {
                total_extracted: entities.length,
                actionable_count: actionable.length,
                processed_at: validated.processedAt,
                ner_pipeline: nerData.audit?.pipeline_version || 'unknown',
                mock_mode: USE_NER_MOCK,
            }
        });

    } catch (error) {
        console.error(`[MCP Router Error]: ${error.message}`);
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;