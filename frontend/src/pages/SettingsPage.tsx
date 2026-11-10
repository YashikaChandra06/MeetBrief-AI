import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Key,
  Server,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { SystemStatus } from '../types';

interface SettingsPageProps {
  systemStatus: SystemStatus | null;
  onRefreshStatus: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  systemStatus,
  onRefreshStatus,
}) => {
  const [tavilyKey, setTavilyKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState(
    systemStatus?.ollama?.baseUrl || 'http://localhost:11434'
  );
  const [selectedModel, setSelectedModel] = useState(
    systemStatus?.ollama?.selectedModel || ''
  );
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (systemStatus?.ollama?.baseUrl) {
      setOllamaUrl(systemStatus.ollama.baseUrl);
    }
    if (systemStatus?.ollama?.selectedModel) {
      setSelectedModel(systemStatus.ollama.selectedModel);
    }
  }, [systemStatus]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await api.updateSettings({
        tavilyApiKey: tavilyKey.trim() || undefined,
        ollamaBaseUrl: ollamaUrl.trim() || undefined,
        ollamaModel: selectedModel.trim() || undefined,
      });

      if (res.tavilyStatus && !res.tavilyStatus.valid && tavilyKey.trim()) {
        setStatusMessage({
          type: 'error',
          text: `Settings saved, but Tavily key validation failed: ${res.tavilyStatus.message}`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Configuration successfully updated and verified!',
        });
      }

      onRefreshStatus();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    alert(`Copied command to clipboard: ${cmd}`);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-brand-text">Engine Configuration</h2>
        <p className="text-sm text-brand-muted mt-0.5">
          MeetBrief AI requires only <strong>one manual API key (Tavily)</strong>. Local AI inference runs via Ollama with zero paid LLM keys required.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: TAVILY WEB RESEARCH (The Only Required Key) */}
        <div className="bg-white p-7 rounded-3xl border border-sage-border shadow-soft space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest">
                <ShieldCheck className="w-5 h-5 text-forest-emerald" />
              </div>
              <div>
                <h3 className="font-bold text-base text-brand-text">Tavily Web Research API</h3>
                <p className="text-xs text-brand-muted">
                  Powers real-time targeted news indexing, deduplication, and source verification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  systemStatus?.tavily?.valid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : systemStatus?.tavily?.configured
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {systemStatus?.tavily?.valid
                  ? 'Key Validated & Active'
                  : systemStatus?.tavily?.configured
                  ? 'Configured (Testing)'
                  : 'Key Missing'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-forest-emerald" />
              <span>TAVILY_API_KEY</span>
            </label>
            <input
              type="password"
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              placeholder={
                systemStatus?.tavily?.configured
                  ? '•••••••••••••••••••••••••••••••••••••••• (Configured. Enter new key to update)'
                  : 'tvly-xxxxxxxxxxxxxxxxxxxxxxxx'
              }
              className="w-full px-4 py-3 bg-white border border-sage-border rounded-xl text-sm font-mono text-brand-text placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-forest-emerald focus:border-forest-emerald"
            />
            <p className="text-xs text-brand-muted mt-2 flex items-center justify-between">
              <span>Saved exclusively on your backend environment. Never exposed to browsers.</span>
              <a
                href="https://tavily.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest-emerald font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Get a free Tavily API key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {systemStatus?.tavily?.message && (
            <div className="p-3 bg-sage-subtle rounded-xl text-xs text-brand-muted border border-sage-border">
              <span className="font-semibold text-brand-text">Engine Diagnosis: </span>
              {systemStatus.tavily.message}
            </div>
          )}
        </div>

        {/* SECTION 2: LOCAL OLLAMA AI INFERENCE */}
        <div className="bg-white p-7 rounded-3xl border border-sage-border shadow-soft space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center text-forest">
                <Cpu className="w-5 h-5 text-forest-emerald" />
              </div>
              <div>
                <h3 className="font-bold text-base text-brand-text">Local Ollama AI Inference</h3>
                <p className="text-xs text-brand-muted">
                  Runs locally on your machine. Zero subscription fees, zero cloud LLM tokens needed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  systemStatus?.ollama?.running
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                }`}
              >
                {systemStatus?.ollama?.running ? 'Ollama Online' : 'Ollama Offline'}
              </span>
              <button
                type="button"
                onClick={onRefreshStatus}
                className="p-1.5 text-brand-muted hover:text-forest hover:bg-sage rounded-lg transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-forest-emerald" />
                <span>Ollama Endpoint</span>
              </label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm font-mono text-brand-text focus:outline-none focus:ring-2 focus:ring-forest-emerald"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-forest-emerald" />
                <span>Selected Model</span>
              </label>

              {systemStatus?.ollama?.availableModels &&
              systemStatus.ollama.availableModels.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-forest-emerald"
                >
                  {systemStatus.ollama.availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="e.g. qwen2.5:3b or llama3.2"
                  className="w-full px-4 py-2.5 bg-white border border-sage-border rounded-xl text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-forest-emerald"
                />
              )}
            </div>
          </div>

          {/* If Ollama is offline or no models found, show clear installation guide */}
          {!systemStatus?.ollama?.running && (
            <div className="p-5 rounded-2xl bg-sage-subtle border border-sage-border space-y-3">
              <div className="flex items-center gap-2 text-forest font-bold text-xs">
                <Terminal className="w-4 h-4 text-forest-emerald" />
                <span>How to Install & Run Ollama Locally (Quick Setup)</span>
              </div>

              <p className="text-xs text-brand-text">
                Ollama runs lightweight open-source models (like Qwen or Llama) directly on your CPU or GPU without sending meeting data to third-party AI APIs.
              </p>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-forest block mb-1">
                    1. Install Ollama:
                  </span>
                  <div className="flex items-center justify-between bg-forest-dark text-emerald-200 px-3 py-2 rounded-xl font-mono text-[11px]">
                    <span>winget install Ollama.Ollama</span>
                    <button
                      type="button"
                      onClick={() => copyCommand('winget install Ollama.Ollama')}
                      className="text-emerald-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] text-brand-muted mt-1 block">
                    (Or download directly from{' '}
                    <a
                      href="https://ollama.com/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-forest-emerald underline"
                    >
                      ollama.com/download
                    </a>
                    )
                  </span>
                </div>

                <div className="pt-1">
                  <span className="font-semibold text-forest block mb-1">
                    2. Pull a lightweight model (Recommended: Qwen 2.5 3B or Llama 3.2):
                  </span>
                  <div className="flex items-center justify-between bg-forest-dark text-emerald-200 px-3 py-2 rounded-xl font-mono text-[11px]">
                    <span>ollama run qwen2.5:3b</span>
                    <button
                      type="button"
                      onClick={() => copyCommand('ollama run qwen2.5:3b')}
                      className="text-emerald-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-brand-muted">
                Note: Even if Ollama is not yet installed, MeetBrief AI will still successfully gather real Tavily web intelligence and generate transparent factual briefings without hallucinating!
              </div>
            </div>
          )}
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-forest hover:bg-forest-light text-white font-bold text-xs rounded-xl shadow-card transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-300" />
            <span>{saving ? 'Validating & Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

