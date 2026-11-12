import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { AppSettings } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Helper to clean quotes/whitespace from API keys
export const cleanKey = (key?: string): string => {
  if (!key) return '';
  return key.trim().replace(/^["']+|["']+$/g, '').trim();
};

// Load .env from multiple potential locations (backend folder, root folder, cwd)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let activeSettings: AppSettings = {
  tavilyApiKey: cleanKey(process.env.TAVILY_API_KEY),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || '',
};

// If a persistent settings file exists, load it
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    activeSettings = {
      ...activeSettings,
      ...parsed,
      // If env var was updated manually and file is empty, prioritize non-empty
      tavilyApiKey: cleanKey(parsed.tavilyApiKey || process.env.TAVILY_API_KEY),
      ollamaBaseUrl: parsed.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaModel: parsed.ollamaModel || process.env.OLLAMA_MODEL || '',
    };
  }
} catch (err) {
  console.warn('Could not read settings.json, using environment defaults', err);
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR,

  getSettings(): AppSettings {
    return { ...activeSettings };
  },

  updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    activeSettings = {
      ...activeSettings,
      ...newSettings,
    };
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(activeSettings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist settings.json', err);
    }
    return { ...activeSettings };
  },

  getTavilyApiKey(): string {
    return cleanKey(activeSettings.tavilyApiKey || process.env.TAVILY_API_KEY || '');
  },

  getOllamaBaseUrl(): string {
    return activeSettings.ollamaBaseUrl || 'http://localhost:11434';
  },

  getOllamaModel(): string {
    return activeSettings.ollamaModel || '';
  },
};
