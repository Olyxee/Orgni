function classifyInput(entities, rawText = '') {
  const labels = entities.map(e => e.label);
  const text = rawText.toLowerCase();

  const hasApprovalSignal =
    labels.includes('Approval Request') ||
    /approval|signature|sign[- ]?off|authoriz/i.test(text);

  const hasDeadlineSignal =
    labels.includes('Deadline') || labels.includes('Date');

  if (hasApprovalSignal) {
    return 'approval_request';
  }
  if (hasDeadlineSignal && labels.includes('Action Required')) {
    return 'task_assignment';
  }
  return 'general';
}

module.exports = { classifyInput };