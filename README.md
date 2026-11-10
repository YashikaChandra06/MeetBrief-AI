# 🌲 MeetBrief AI — Autonomous Pre-Meeting Research Agent

> **Autonomous AI-powered meeting preparation assistant** that conducts deep 30-day pre-meeting web research, source verification, and intelligence briefing generation before your critical meetings.

![MeetBrief AI](https://img.shields.io/badge/MeetBrief_AI-Forest_Green_%26_White-123C2F?style=for-the-badge)
![Tavily API](https://img.shields.io/badge/Research_Engine-Tavily_Search_%26_Extract-167D55?style=for-the-badge)
![Ollama AI](https://img.shields.io/badge/Local_AI-Ollama_(Qwen_/_Llama)-0B2B22?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge)

---

## 🌟 Key Capabilities

1. **Strict 30-Day Pre-Meeting Research Window**
   - Automatically computes the precise 30-day research window relative to the **scheduled meeting date** (not today's date).
2. **Minimum API Configuration**
   - Requires **only ONE manual API key**: `TAVILY_API_KEY`.
   - Local AI reasoning runs via **Ollama** with lightweight open-source instruct models (e.g., `qwen2.5:3b`, `llama3.2:3b`, `llama3:8b`).
   - No OpenAI, Anthropic, Gemini, Groq, or paid LLM tokens required.
3. **Transparent Non-Hallucinating Fallback**
   - If Ollama is offline or unavailable, MeetBrief AI transparently processes the verified research with structured factual intelligence directly from Tavily primary sources rather than fabricating data or failing.
4. **Autonomous 7-Step Research Pipeline**
   - **Step 1:** Understanding meeting context & date window.
   - **Step 2:** Formulating targeted search queries (announcements, financials, leadership, strategic, interviews).
   - **Step 3:** Executing multi-angle Tavily Search across categories with 30-day freshness filters.
   - **Step 4:** Extracting deep content from primary URLs via Tavily Extract.
   - **Step 5:** Deduplicating and verifying findings against the 30-day window and publisher reputation.
   - **Step 6:** AI synthesis and strategic opportunity analysis.
   - **Step 7:** Generating structured one-page intelligence dossiers.
5. **A4 Printable Executive Briefing & Native PDF Export**
   - High-fidelity PDF generation with clean branding, typography, source citations, strategic implications, and 5 targeted meeting questions.
6. **Dark Forest Green & White UI Design System**
   - Custom enterprise SaaS theme utilizing deep forest green (`#123C2F`), dark green (`#0B2B22`), emerald (`#167D55`), soft sage (`#E5F0E9`), and crisp white.

---

## 📁 Project Folder Structure

```
MeetBrief-AI/
├── package.json                   # Root workspace (npm workspaces + concurrently)
├── README.md                      # Project documentation & setup guide
├── backend/
│   ├── package.json               # Backend dependencies (Express, PDFKit, Zod, UUID, etc.)
│   ├── tsconfig.json              # Backend TypeScript config (ES2022 / NodeNext ESM)
│   ├── .env.example               # Environment template
│   ├── .env                       # Backend runtime environment
│   ├── data/
│   │   ├── briefings.json         # Persistent JSON store for generated briefings
│   │   ├── jobs.json              # Persistent JSON store for research execution logs
│   │   └── settings.json          # Persisted user settings and engine configuration
│   └── src/
│       ├── index.ts               # Express application server and route bindings
│       ├── config.ts              # Configuration loader & runtime settings manager
│       ├── testRunner.ts          # Automated test suite (21 unit & integration tests)
│       ├── types/
│       │   └── index.ts           # Shared TypeScript models and interfaces
│       ├── utils/
│       │   ├── dateUtils.ts       # 30-day window math relative to meeting date
│       │   └── sanitize.ts        # Input sanitization and prompt-injection defense
│       ├── services/
│       │   ├── tavilyService.ts   # Tavily Search, Extract, deduplication & verification
│       │   ├── ollamaService.ts   # Ollama detection, model polling & LLM prompt generation
│       │   ├── researchPipeline.ts# 7-step autonomous research orchestrator
│       │   ├── pdfService.ts      # A4 PDF generation via PDFKit
│       │   └── storageService.ts  # Modular atomic persistence layer
│       └── routes/
│           ├── researchRoutes.ts  # POST /api/research, GET /api/research/:id
│           ├── briefingRoutes.ts  # GET/DELETE /api/briefings, regeneration, PDF export
│           └── settingsRoutes.ts  # GET /api/settings/status, POST /api/settings
└── frontend/
    ├── package.json               # React, Vite, Tailwind CSS, Lucide, Recharts
    ├── tsconfig.json              # Frontend TypeScript config
    ├── vite.config.ts             # Vite bundler with API proxy to port 5000
    ├── tailwind.config.js         # Dark Forest Green & Soft Sage palette config
    ├── index.html                 # App shell with Inter typography
    └── src/
        ├── main.tsx               # React DOM entrypoint
        ├── App.tsx                # Main view router & persistent state sync
        ├── index.css              # Tailwind directives and @media print A4 styles
        ├── types/                 # Frontend interfaces
        ├── services/
        │   └── api.ts             # REST client for backend APIs
        ├── components/
        │   ├── Sidebar.tsx        # Forest green navigation & live engine status pill
        │   └── Navbar.tsx         # Top bar with meeting counter & quick CTA
        └── pages/
            ├── DashboardPage.tsx       # Intelligence overview, metrics, charts, upcoming meetings
            ├── NewResearchPage.tsx     # Meeting intake form with dynamic 30-day window preview
            ├── ResearchProgressPage.tsx# Live 7-step task progress & terminal execution trace
            ├── BriefingViewPage.tsx    # Executive 1-page dossier with PDF, copy, and print actions
            ├── BriefingsListPage.tsx   # Searchable & filterable archive of past dossiers
            ├── ResearchHistoryPage.tsx # Detailed audit log of queries and backend execution
            └── SettingsPage.tsx        # Tavily API key manager & local Ollama diagnostic
```

---

## ⚡ Quick Start & Setup

### 1. Install Dependencies
From the repository root, run:
```bash
npm install
```
*(This automatically installs all root, backend, and frontend dependencies via npm workspaces).*

### 2. Configure Your Tavily API Key
You can configure your Tavily API key in **either of two ways**:

#### Option A: In the UI (Recommended)
1. Start the app (see Step 3).
2. Go to the **Settings** page in the left sidebar.
3. Paste your Tavily API key into the `TAVILY_API_KEY` field and click **Save Configuration**.
4. The system validates the key instantly.

#### Option B: In `backend/.env`
Open `backend/.env` (or copy from `backend/.env.example`) and paste your key:
```env
TAVILY_API_KEY=tvly-yourActualKeyHere
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
PORT=5000
```
> Get a free Tavily API key at [tavily.com](https://tavily.com).

---

### 3. Start the Application
Run:
```bash
npm run dev
```
This concurrently starts:
- 🌲 **Backend Server:** `http://localhost:5000`
- 💻 **Frontend Web App:** `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## 🦙 Ollama (Local AI) Setup (Optional)

MeetBrief AI detects local Ollama instances automatically:

1. **Install Ollama** (if not already installed):
   - **Windows:** `winget install Ollama.Ollama` or download from [ollama.com/download](https://ollama.com/download)
   - **Mac/Linux:** `curl -fsSL https://ollama.com/install.sh | sh`
2. **Pull a lightweight model**:
   ```bash
   ollama run qwen2.5:3b
   # or
   ollama run llama3.2:3b
   ```
3. MeetBrief AI will immediately recognize the model under **Settings** and use it for executive synthesis.
4. *If Ollama is not running, MeetBrief AI will seamlessly switch to transparent factual synthesis using genuine Tavily findings without hallucinating.*

---

## 🧪 Automated Self-Tests

MeetBrief AI includes an automated test runner validating the 30-day pre-meeting window math, plan generation, deduplication, verification logic, PDF generation, and storage:

```bash
npx tsx backend/src/testRunner.ts
```
Expected output:
```
========================================
🏁 Self-Tests Completed: 21 Passed, 0 Failed
========================================
```

---

## 🎨 UI Color System

- **Deep Forest Green (`#123C2F`):** Sidebar, report headings, primary action buttons.
- **Dark Green (`#0B2B22`):** Dark accents, terminal backgrounds.
- **Emerald Green (`#167D55`):** Subheadings, citations, progress bars, badges.
- **Soft Sage (`#E5F0E9`):** Card highlights, pill badges, subtle borders.
- **Crisp White (`#FFFFFF`) & Off-White (`#F7FAF8`):** Main dashboard backgrounds, report paper.
