import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taskAPI } from '../services/api';

const TASK_PRESETS = {
  EMAIL: { name: 'Send Welcome Email', description: 'Send onboarding email to new user', payload: { to: 'user@example.com', subject: 'Welcome!', template: 'onboarding' } },
  IMAGE_PROCESSING: { name: 'Resize Product Image', description: 'Resize and optimize product images', payload: { imageUrl: 'https://example.com/image.jpg', width: 800, height: 600, format: 'webp' } },
  DATA_EXPORT: { name: 'Export Sales Report', description: 'Export last month sales to CSV', payload: { from: '2024-01-01', to: '2024-01-31', format: 'CSV', table: 'sales' } },
  REPORT_GENERATION: { name: 'Generate Monthly Report', description: 'Generate PDF report for stakeholders', payload: { reportType: 'monthly', month: 'January 2024', includeCharts: true } },
  NOTIFICATION: { name: 'Push Notification Campaign', description: 'Send push notification to users', payload: { channel: 'push', message: 'Check out our new feature!', recipients: 1000 } },
  CUSTOM: { name: 'Custom Task', description: 'Custom task processing', payload: { key: 'value' } },
};

const defaultForm = {
  name: '', description: '', type: 'CUSTOM', priority: 'medium',
  maxRetries: 3, tags: '', payload: '{\n  "key": "value"\n}',
};

export default function SubmitTask() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [payloadError, setPayloadError] = useState('');

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const applyPreset = (type) => {
    const preset = TASK_PRESETS[type];
    if (preset) {
      setForm((f) => ({
        ...f,
        type,
        name: preset.name,
        description: preset.description,
        payload: JSON.stringify(preset.payload, null, 2),
      }));
    }
    setPayloadError('');
  };

  const validatePayload = (str) => {
    try { JSON.parse(str); setPayloadError(''); return true; }
    catch { setPayloadError('Invalid JSON payload'); return false; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePayload(form.payload)) return;

    setSubmitting(true);
    try {
      const data = {
        name: form.name,
        description: form.description,
        type: form.type,
        priority: form.priority,
        maxRetries: parseInt(form.maxRetries),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        payload: JSON.parse(form.payload),
      };

      const res = await taskAPI.create(data);
      toast.success(`✅ Task "${data.name}" submitted and queued!`);
      navigate('/tasks');
    } catch (e) {
      toast.error(e.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Submit Task</div>
          <div className="page-subtitle">Create a new task and enqueue it for processing</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Quick Presets</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.keys(TASK_PRESETS).map((type) => (
            <button key={type} type="button" className={`btn btn-secondary btn-sm ${form.type === type ? 'btn-primary' : ''}`}
              onClick={() => applyPreset(type)}>
              {type === 'EMAIL' ? '📧' : type === 'IMAGE_PROCESSING' ? '🖼' : type === 'DATA_EXPORT' ? '📤' :
                type === 'REPORT_GENERATION' ? '📄' : type === 'NOTIFICATION' ? '🔔' : '⚡'} {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Task Name *</label>
              <input required value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Send welcome email" />
            </div>
            <div className="form-group">
              <label>Task Type</label>
              <select value={form.type} onChange={(e) => { setField('type', e.target.value); applyPreset(e.target.value); }}>
                {Object.keys(TASK_PRESETS).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Optional task description" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setField('priority', e.target.value)}>
                <option value="high">🔥 High</option>
                <option value="medium">🔶 Medium</option>
                <option value="low">🟩 Low</option>
              </select>
            </div>
            <div className="form-group">
              <label>Max Retries</label>
              <input type="number" min="0" max="10" value={form.maxRetries} onChange={(e) => setField('maxRetries', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="e.g. email, onboarding, batch" />
          </div>

          <div className="form-group">
            <label>Payload (JSON)</label>
            <textarea
              rows={8}
              value={form.payload}
              onChange={(e) => { setField('payload', e.target.value); validatePayload(e.target.value); }}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, borderColor: payloadError ? 'var(--accent-red)' : undefined }}
              placeholder='{ "key": "value" }'
            />
            {payloadError && <div style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 4 }}>⚠ {payloadError}</div>}
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12 }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Preview</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
              <span>Type: <strong style={{ color: 'var(--accent-cyan)' }}>{form.type}</strong></span>
              <span>Priority: <strong style={{ color: form.priority === 'high' ? 'var(--accent-red)' : form.priority === 'medium' ? 'var(--accent-orange)' : 'var(--accent-green)' }}>{form.priority.toUpperCase()}</strong></span>
              <span>Max Retries: <strong style={{ color: 'var(--text-primary)' }}>{form.maxRetries}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '⏳ Submitting...' : '🚀 Submit Task'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/tasks')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
