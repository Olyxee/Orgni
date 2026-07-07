const { classifyInput } = require('../classifier');
const { recommendAction } = require('../recommender');
const baseMcpSchema = require('../schemas/base.schema.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

// --- Schema ---
console.log('\n[Schema Validation]');

test('accepts valid email payload', () => {
    const result = baseMcpSchema.validate({
        id: 'msg-001', source: 'email', orgId: 'org-001',
        receivedAt: new Date().toISOString(),
        text: 'Please approve the report.',
        raw: { sender: 'ops@olyxee.com' }
    });
    assert(result.id === 'msg-001');
});

test('rejects missing text field', () => {
    try {
        baseMcpSchema.validate({ id: 'x', source: 'email', orgId: 'o', receivedAt: new Date().toISOString(), raw: {} });
        throw new Error('Should have thrown');
    } catch (e) {
        assert(e.message.includes('Missing required field'));
    }
});

test('rejects invalid source type', () => {
    try {
        baseMcpSchema.validate({ id: 'x', source: 'fax', orgId: 'o', receivedAt: new Date().toISOString(), text: 'hi', raw: {} });
        throw new Error('Should have thrown');
    } catch (e) {
        assert(e.message.includes('Unsupported tool source type'));
    }
});

// --- Classifier ---
console.log('\n[Classifier]');

test('classifies approval text as approval_request', () => {
    const result = classifyInput([], 'Approval requires a signature from Lethabo.');
    assert(result === 'approval_request', `Got: ${result}`);
});

test('classifies unknown text as general', () => {
    const result = classifyInput([], 'Team sync on Monday.');
    assert(result === 'general', `Got: ${result}`);
});

test('classifies deadline + action entity as task_assignment', () => {
    const entities = [
        { label: 'Date', raw: 'next Monday', status: 'review' },
        { label: 'Action Required', raw: 'submit', status: 'review' },
    ];
    const result = classifyInput(entities, 'Please submit the report by next Monday.');
    assert(result === 'task_assignment', `Got: ${result}`);
});

// --- Recommender ---
console.log('\n[Recommender]');

test('returns route_for_approval for approval_request', () => {
    const entities = [
        { label: 'Person', raw: 'Lethabo', status: 'review' },
        { label: 'Date', raw: 'next Friday', status: 'review' },
    ];
    const rec = recommendAction('approval_request', entities);
    assert(rec.action === 'route_for_approval', `Got: ${rec.action}`);
    assert(rec.approver === 'Lethabo', `Got approver: ${rec.approver}`);
    assert(rec.priority === 'high', `Got priority: ${rec.priority}`);
});

test('sets priority high when deadline present', () => {
    const entities = [{ label: 'Date', raw: 'tomorrow', status: 'review' }];
    const rec = recommendAction('approval_request', entities);
    assert(rec.priority === 'high');
});

test('sets priority normal when no deadline', () => {
    const rec = recommendAction('approval_request', []);
    assert(rec.priority === 'normal');
});

test('returns no_action for general classification', () => {
    const rec = recommendAction('general', []);
    assert(rec.action === 'no_action', `Got: ${rec.action}`);
});

// --- Results ---
console.log(`\n${'─'.repeat(40)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);