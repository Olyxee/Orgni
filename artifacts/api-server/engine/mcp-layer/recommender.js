function recommendAction(classification, entities) {
  if (classification === 'approval_request') {
    const approver = entities.find(e => e.label === 'Assignee' || e.label === 'Person' || e.label === 'Company');
    const deadline = entities.find(e => e.label === 'Deadline' || e.label === 'Date');

    return {
      action: 'route_for_approval',
      approver: approver?.raw || 'unassigned',
      deadline: deadline?.normalized || deadline?.raw || 'none',
      priority: deadline ? 'high' : 'normal',
      reason: `Detected approval request requiring sign-off${approver ? ' from ' + approver.raw : ''}.`
    };
  }
  return { action: 'no_action', reason: 'No actionable classification matched.' };
}

module.exports = { recommendAction };