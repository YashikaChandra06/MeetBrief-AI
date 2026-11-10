import { BriefingReport, ResearchJob, SystemStatus } from '../types';

const API_BASE = '/api';

export const api = {
  // Research
  async startResearch(params: {
    subjectName: string;
    subjectType: 'company' | 'person';
    meetingDate: string;
    meetingTime?: string;
    meetingPurpose?: string;
    additionalContext?: string;
  }): Promise<{ success: boolean; job: ResearchJob }> {
    const res = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to start research (${res.status})`);
    }
    return res.json();
  },

  async getResearchJob(id: string): Promise<ResearchJob> {
    const res = await fetch(`${API_BASE}/research/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to load research job (${res.status})`);
    }
    return res.json();
  },

  async listResearchJobs(): Promise<ResearchJob[]> {
    const res = await fetch(`${API_BASE}/research`);
    if (!res.ok) {
      throw new Error(`Failed to load research jobs (${res.status})`);
    }
    return res.json();
  },

  // Briefings
  async listBriefings(): Promise<BriefingReport[]> {
    const res = await fetch(`${API_BASE}/briefings`);
    if (!res.ok) {
      throw new Error(`Failed to load briefings (${res.status})`);
    }
    return res.json();
  },

  async getBriefing(id: string): Promise<BriefingReport> {
    const res = await fetch(`${API_BASE}/briefings/${id}`);
    if (!res.ok) {
      throw new Error(`Briefing not found (${res.status})`);
    }
    return res.json();
  },

  async deleteBriefing(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/briefings/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  async regenerateBriefing(id: string): Promise<BriefingReport> {
    const res = await fetch(`${API_BASE}/briefings/${id}/regenerate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to regenerate briefing`);
    }
    const data = await res.json();
    return data.briefing;
  },

  getPdfUrl(id: string): string {
    return `${API_BASE}/briefings/${id}/pdf`;
  },

  // Settings & Status
  async getStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/settings/status`);
    if (!res.ok) {
      throw new Error(`Failed to fetch system status (${res.status})`);
    }
    return res.json();
  },

  async updateSettings(data: {
    tavilyApiKey?: string;
    ollamaBaseUrl?: string;
    ollamaModel?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }
    return res.json();
  },
};

