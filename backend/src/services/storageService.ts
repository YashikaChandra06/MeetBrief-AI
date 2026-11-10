import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { BriefingReport, ResearchJob } from '../types/index.js';

const JOBS_FILE = path.join(config.dataDir, 'jobs.json');
const BRIEFINGS_FILE = path.join(config.dataDir, 'briefings.json');

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export class StorageService {
  private jobs: Map<string, ResearchJob> = new Map();
  private briefings: Map<string, BriefingReport> = new Map();

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    const loadedJobs = readJsonFile<ResearchJob[]>(JOBS_FILE, []);
    for (const job of loadedJobs) {
      this.jobs.set(job.id, job);
    }

    const loadedBriefings = readJsonFile<BriefingReport[]>(BRIEFINGS_FILE, []);
    for (const briefing of loadedBriefings) {
      this.briefings.set(briefing.id, briefing);
    }
  }

  private persistJobs(): void {
    const list = Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    writeJsonFile(JOBS_FILE, list);
  }

  private persistBriefings(): void {
    const list = Array.from(this.briefings.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    writeJsonFile(BRIEFINGS_FILE, list);
  }

  // Job operations
  public saveJob(job: ResearchJob): ResearchJob {
    job.updatedAt = new Date().toISOString();
    this.jobs.set(job.id, job);
    this.persistJobs();
    return job;
  }

  public getJob(id: string): ResearchJob | null {
    return this.jobs.get(id) || null;
  }

  public listJobs(): ResearchJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Briefing operations
  public saveBriefing(briefing: BriefingReport): BriefingReport {
    this.briefings.set(briefing.id, briefing);
    this.persistBriefings();
    return briefing;
  }

  public getBriefing(id: string): BriefingReport | null {
    return this.briefings.get(id) || null;
  }

  public getBriefingByJobId(jobId: string): BriefingReport | null {
    for (const briefing of this.briefings.values()) {
      if (briefing.researchJobId === jobId) {
        return briefing;
      }
    }
    return null;
  }

  public listBriefings(): BriefingReport[] {
    return Array.from(this.briefings.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public deleteBriefing(id: string): boolean {
    const exists = this.briefings.has(id);
    if (exists) {
      this.briefings.delete(id);
      this.persistBriefings();
    }
    return exists;
  }

  public getStats() {
    return {
      jobsCount: this.jobs.size,
      briefingsCount: this.briefings.size,
    };
  }
}

export const storage = new StorageService();

