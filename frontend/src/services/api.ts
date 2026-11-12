import { BriefingReport, DocumentIntelligence, DocumentMetadata, ResearchJob, SystemStatus } from '../types';

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
    documentIds?: string[];
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

  // Document Upload and Management
  async uploadDocuments(
    files: File[],
    onProgress?: (progressPercent: number) => void
  ): Promise<{
    success: boolean;
    documents: DocumentMetadata[];
    intelligence: DocumentIntelligence[];
  }> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('documents', file);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/documents/upload`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error || `Upload failed with status ${xhr.status}`));
          }
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload'));
      xhr.send(formData);
    });
  },

  async listDocuments(): Promise<DocumentMetadata[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) {
      throw new Error(`Failed to fetch documents (${res.status})`);
    }
    return res.json();
  },

  async getDocument(id: string): Promise<{ document: DocumentMetadata; intelligence: DocumentIntelligence }> {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) {
      throw new Error(`Document not found (${res.status})`);
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  async reprocessDocument(id: string): Promise<{ document: DocumentMetadata; intelligence: DocumentIntelligence }> {
    const res = await fetch(`${API_BASE}/documents/${id}/reprocess`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reprocess document');
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
