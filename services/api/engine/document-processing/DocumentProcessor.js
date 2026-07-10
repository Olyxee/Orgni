/**
 * DocumentProcessor contract.
 *
 * Implementations accept an uploaded file buffer and return a normalized result
 * that can later be converted into canonical events.
 */

class DocumentProcessor {
  async process(_input) {
    throw new Error('DocumentProcessor.process must be implemented');
  }
}

module.exports = { DocumentProcessor };
