const statusDots = {
  PENDING: '🟡', QUEUED: '🔵', PROCESSING: '🟣', COMPLETED: '🟢', FAILED: '🔴', DEAD: '⚫',
};

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status?.toLowerCase()}`}>
      {statusDots[status]} {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge badge-${priority?.toLowerCase()}`}>
      {priority === 'high' ? '🔥' : priority === 'medium' ? '🔶' : '🟩'} {priority?.toUpperCase()}
    </span>
  );
}

export function WorkerStatusBadge({ status }) {
  const s = status?.toLowerCase();
  return (
    <span className={`badge badge-${s}`}>
      {s === 'busy' ? '⚙️' : s === 'idle' ? '✅' : '💤'} {status}
    </span>
  );
}
