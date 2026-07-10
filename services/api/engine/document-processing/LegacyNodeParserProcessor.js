const { parseBuffer } = require('../services/parser.service');

class LegacyNodeParserProcessor {
  async process(input) {
    const content = await parseBuffer(input.buffer, input.originalName);
    return {
      processor: 'legacy-node-parser',
      status: 'parsed',
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      events: [
        {
          type: 'DocumentParsed',
          confidence: 0.9,
          payload: {
            originalName: input.originalName,
            fileType: input.fileType,
            wordCount: content.split(/\s+/).filter(Boolean).length,
          },
        },
      ],
    };
  }
}

module.exports = { LegacyNodeParserProcessor };
