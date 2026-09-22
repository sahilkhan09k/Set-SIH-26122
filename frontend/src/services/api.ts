const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface HealthStatus {
  status: 'ONLINE' | 'OFFLINE';
  service?: string;
  database?: string;
  llmMode?: string;
  hasGroqKey?: boolean;
}

export const api = {
  async checkHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'OFFLINE', llmMode: 'LIVE_BACKEND_OFFLINE' };
    }
  },

  async getDashboard() {
    try {
      const res = await fetch(`${API_BASE}/dashboard`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Dashboard fetch failed');
      return await res.json();
    } catch {
      return {
        kpis: {
          totalActivities: 0,
          extractedEvents: 0,
          autoLinked: 0,
          needsReview: 0,
          unmatched: 0,
          averageConfidence: 0,
          delayedActivities: 0,
        },
        disciplineProgress: [],
        sCurvePoints: [],
        recentDocuments: [],
        recentMatches: [],
      };
    }
  },

  async getScheduleActivities() {
    try {
      const res = await fetch(`${API_BASE}/schedule/activities`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Activities fetch failed');
      return await res.json();
    } catch {
      return [];
    }
  },

  async uploadSchedule(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/schedule/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload schedule');
    }
    return await res.json();
  },

  async clearSchedule() {
    const res = await fetch(`${API_BASE}/schedule/activities`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear activities');
    return await res.json();
  },

  async getDocuments() {
    try {
      const res = await fetch(`${API_BASE}/reports/documents`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Documents fetch failed');
      return await res.json();
    } catch {
      return [];
    }
  },

  async clearReports() {
    const res = await fetch(`${API_BASE}/reports/clear`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear reports');
    return await res.json();
  },

  async uploadReport(file?: File, rawContent?: string) {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (rawContent) formData.append('rawContent', rawContent);

    const res = await fetch(`${API_BASE}/reports/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Report upload failed' }));
      throw new Error(err.error || 'Failed to upload report');
    }
    return await res.json();
  },

  async processReport(documentId?: string, rawText?: string) {
    const res = await fetch(`${API_BASE}/reports/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId, rawText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Processing failed' }));
      throw new Error(err.error || 'Failed to process report');
    }
    return await res.json();
  },

  async getMatches(status?: string, discipline?: string) {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') params.append('status', status);
      if (discipline && discipline !== 'ALL') params.append('discipline', discipline);

      const res = await fetch(`${API_BASE}/matches?${params.toString()}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Matches fetch failed');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async approveMatch(matchId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to approve match');
    return await res.json();
  },

  async rejectMatch(matchId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to reject match');
    return await res.json();
  },

  async correctMatch(matchId: string, newScheduleActivityId: string, reason?: string) {
    const res = await fetch(`${API_BASE}/matches/${matchId}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newScheduleActivityId, reason }),
    });
    if (!res.ok) throw new Error('Failed to correct match');
    return await res.json();
  },

  async getAuditLogs(source?: string) {
    try {
      const params = new URLSearchParams();
      if (source && source !== 'ALL') params.append('source', source);

      const res = await fetch(`${API_BASE}/audit-log?${params.toString()}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Audit log fetch failed');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async sendTimeAgentMessage(message: string, commit = false) {
    const res = await fetch(`${API_BASE}/time-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, commit }),
    });
    if (!res.ok) throw new Error('Time agent request failed');
    return await res.json();
  },

  async getMemory() {
    try {
      const res = await fetch(`${API_BASE}/memory`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('Memory fetch failed');
      return await res.json();
    } catch {
      return [];
    }
  },
};
