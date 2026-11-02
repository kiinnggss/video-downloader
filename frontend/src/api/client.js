export const apiClient = {
  async inspect(url) {
    const res = await fetch('/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Inspection failed');
    }
    return res.json();
  },

  async startDownload({ url, format_id, is_audio, in_vault }) {
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format_id, is_audio, in_vault }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Download failed to start');
    }
    return res.json();
  },

  async pauseDownload(taskId) {
    const res = await fetch(`/api/downloads/${taskId}/pause`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to pause download');
    }
    return res.json();
  },

  async resumeDownload(taskId) {
    const res = await fetch(`/api/downloads/${taskId}/resume`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to resume download');
    }
    return res.json();
  },

  async cancelDownload(taskId) {
    const res = await fetch(`/api/downloads/${taskId}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to cancel download');
    }
    return res.json();
  },

  async getFiles(category) {
    const q = category ? `?category=${category}` : '';
    const res = await fetch(`/api/files${q}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch files');
    }
    return res.json();
  },

  async unlockVault(pin) {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('Invalid PIN');
    return res.json();
  },

  async getVaultFiles(token) {
    const res = await fetch('/api/vault/files', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Vault locked');
    return res.json();
  }
};
