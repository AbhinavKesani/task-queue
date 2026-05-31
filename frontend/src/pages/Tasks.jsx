import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taskAPI } from '../services/api';
import { StatusBadge, PriorityBadge } from '../components/Badges';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = ['', 'PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD'];
const PRIORITIES = ['', 'high', 'medium', 'low'];
const TYPES = ['', 'EMAIL', 'IMAGE_PROCESSING', 'DATA_EXPORT', 'REPORT_GENERATION', 'NOTIFICATION', 'CUSTOM'];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', type: '', search: '', page: 1 });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await taskAPI.getAll(params);
      setTasks(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-refresh every 5s
  useEffect(() => {
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleRetry = async (id, name) => {
    try {
      await taskAPI.retry(id);
      toast.success(`Task "${name}" re-queued`);
      fetchTasks();
    } catch (e) {
      toast.error(e.message || 'Retry failed');
    }
  };

  const handleCancel = async (id, name) => {
    if (!window.confirm(`Cancel task "${name}"?`)) return;
    try {
      await taskAPI.cancel(id);
      toast.success(`Task "${name}" cancelled`);
      fetchTasks();
    } catch (e) {
      toast.error(e.message || 'Cancel failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete task "${name}"?`)) return;
    try {
      await taskAPI.delete(id);
      toast.success('Task deleted');
      fetchTasks();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tasks</div>
          <div className="page-subtitle">
            {pagination.total || 0} total tasks · Auto-refreshing every 5s
          </div>
        </div>
        <Link to="/submit" className="btn btn-primary">➕ Submit Task</Link>
      </div>

      <div className="filter-bar">
        <input
          placeholder="🔍 Search tasks..."
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
        />
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
          <option value="">All Types</option>
          {TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchTasks}>🔄 Refresh</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div className="spinner" />
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks found</h3>
              <p>Try adjusting your filters or submit a new task.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Worker</th>
                  <th>Duration</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <div className="task-name">{task.name}</div>
                      <div className="task-id">{task._id}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 4 }}>
                        {task.type}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={task.status} />
                      {task.status === 'PROCESSING' && <span className="pulse" style={{ marginLeft: 6, color: 'var(--accent-purple)', fontSize: 11 }}>●</span>}
                    </td>
                    <td><PriorityBadge priority={task.priority} /></td>
                    <td>
                      {task.workerId ? (
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {task.workerId}
                          {task.retryCount > 0 && <span style={{ color: 'var(--accent-orange)', marginLeft: 4 }}>↻{task.retryCount}</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {task.duration ? `${(task.duration / 1000).toFixed(2)}s` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['FAILED', 'DEAD'].includes(task.status) && (
                          <button className="btn btn-success btn-sm" onClick={() => handleRetry(task._id, task.name)}>↻</button>
                        )}
                        {['PENDING', 'QUEUED'].includes(task.status) && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(task._id, task.name)}>✕</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(task._id, task.name)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Page {pagination.page} of {pagination.pages} · {pagination.total} tasks
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1}
                onClick={() => setFilter('page', filters.page - 1)}>← Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.pages}
                onClick={() => setFilter('page', filters.page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
