export function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('crystal_device_id');
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem('crystal_device_id', id);
  }
  return id;
}

export const apiClient = {
  async inspect(url) {
    const deviceId = getDeviceId();
    const res = await fetch('/api/inspect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ url, device_id: deviceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Inspection failed');
    }
    return res.json();
  },

  async getCookieStatus() {
    const res = await fetch('/api/settings/cookies', {
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) return { has_cookies: false };
    return res.json();
  },

  async saveCookies(cookies) {
    const res = await fetch('/api/settings/cookies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId(),
      },
      body: JSON.stringify({ cookies }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save cookies');
    }
    return res.json();
  },

  async clearCookies() {
    const res = await fetch('/api/settings/cookies', {
      method: 'DELETE',
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) throw new Error('Failed to clear cookies');
    return res.json();
  },

  async startDownload({ url, format_id, is_audio, in_vault }) {
    const deviceId = getDeviceId();
    const res = await fetch('/api/downloads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ url, format_id, is_audio, in_vault, device_id: deviceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Download failed to start');
    }
    return res.json();
  },

  async pauseDownload(taskId) {
    const res = await fetch(`/api/downloads/${taskId}/pause`, {
      method: 'POST',
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to pause download');
    }
    return res.json();
  },

  async resumeDownload(taskId) {
    const res = await fetch(`/api/downloads/${taskId}/resume`, {
      method: 'POST',
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to resume download');
    }
    return res.json();
  },

  async cancelDownload(taskId) {
    const res = await fetch(`/api/downloads/${taskId}/cancel`, {
      method: 'POST',
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to cancel download');
    }
    return res.json();
  },

  async getFiles(category) {
    const q = category ? `?category=${category}` : '';
    const res = await fetch(`/api/files${q}`, {
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch files');
    }
    return res.json();
  },

  async deleteFile(fileId, token = null) {
    const headers = {
      'X-Device-Id': getDeviceId(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete file');
    }
    return res.json();
  },

  async checkVaultPinStatus() {
    const res = await fetch('/api/vault/pin-status', {
      headers: {
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) return { has_pin: false };
    return res.json();
  },

  async setVaultPin(newPin, currentPin = null) {
    const res = await fetch('/api/vault/set-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId(),
      },
      body: JSON.stringify({
        new_pin: newPin,
        current_pin: currentPin,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to set PIN');
    }
    return res.json();
  },

  async unlockVault(pin) {
    const res = await fetch('/api/vault/unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': getDeviceId(),
      },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('Invalid PIN');
    return res.json();
  },

  async getVaultFiles(token) {
    const res = await fetch('/api/vault/files', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Device-Id': getDeviceId(),
      },
    });
    if (!res.ok) throw new Error('Vault locked');
    return res.json();
  },

  async uploadVaultFile(file, token) {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Device-Id': getDeviceId(),
      'X-Filename': encodeURIComponent(file.name),
      'Content-Type': file.type || 'application/octet-stream',
    };
    const res = await fetch('/api/vault/upload', {
      method: 'POST',
      headers,
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  getVaultPlaylistUrl(token, fileIds = []) {
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (fileIds && fileIds.length > 0) {
      params.set('file_ids', fileIds.join(','));
    }
    return `/api/vault/playlist.m3u?${params.toString()}`;
  },

  async pingKeepAlive() {
    try {
      const res = await fetch('/api/keepalive');
      return res.ok;
    } catch {
      return false;
    }
  }
};
