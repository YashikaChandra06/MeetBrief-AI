import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { NewResearchPage } from './pages/NewResearchPage';
import { ResearchProgressPage } from './pages/ResearchProgressPage';
import { BriefingViewPage } from './pages/BriefingViewPage';
import { BriefingsListPage } from './pages/BriefingsListPage';
import { ResearchHistoryPage } from './pages/ResearchHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { BriefingReport, ResearchJob, SystemStatus } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeBriefingId, setActiveBriefingId] = useState<string | null>(null);

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [briefings, setBriefings] = useState<BriefingReport[]>([]);
  const [jobs, setJobs] = useState<ResearchJob[]>([]);

  // Load system status and persistent briefings
  const refreshStatus = useCallback(async () => {
    try {
      const status = await api.getStatus();
      setSystemStatus(status);
    } catch (err) {
      console.warn('Failed to load system status:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [briefingsList, jobsList] = await Promise.all([
        api.listBriefings().catch(() => []),
        api.listResearchJobs().catch(() => []),
      ]);
      setBriefings(briefingsList);
      setJobs(jobsList);
    } catch (err) {
      console.warn('Failed to refresh data:', err);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshData();
  }, [refreshStatus, refreshData]);

  // Navigation handlers
  const handleSelectTab = (tab: string, param?: string) => {
    if (tab === 'progress' && param) {
      setActiveJobId(param);
      setCurrentTab('progress');
    } else if (tab === 'briefing' && param) {
      setActiveBriefingId(param);
      setCurrentTab('briefing');
    } else {
      setCurrentTab(tab);
    }
  };

  const handleStartJob = (jobId: string) => {
    setActiveJobId(jobId);
    setCurrentTab('progress');
    refreshData();
  };

  const handleViewBriefing = (briefingId: string) => {
    setActiveBriefingId(briefingId);
    setCurrentTab('briefing');
    refreshData();
  };

  return (
    <div className="flex h-screen bg-offwhite overflow-hidden text-brand-text font-sans">
      {/* Dark Forest Green Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        systemStatus={systemStatus}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          onNewResearch={() => setCurrentTab('new-research')}
          systemStatus={systemStatus}
        />

        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {currentTab === 'overview' && (
            <DashboardPage
              briefings={briefings}
              recentJobs={jobs}
              systemStatus={systemStatus}
              onNavigate={handleSelectTab}
              onViewBriefing={handleViewBriefing}
            />
          )}

          {currentTab === 'new-research' && (
            <NewResearchPage
              systemStatus={systemStatus}
              onJobStarted={handleStartJob}
              onNavigateSettings={() => setCurrentTab('settings')}
            />
          )}

          {currentTab === 'progress' && activeJobId && (
            <ResearchProgressPage
              jobId={activeJobId}
              onViewBriefing={handleViewBriefing}
              onReturnToDashboard={() => setCurrentTab('overview')}
            />
          )}

          {currentTab === 'briefing' && activeBriefingId && (
            <BriefingViewPage
              briefingId={activeBriefingId}
              onBack={() => setCurrentTab('overview')}
            />
          )}

          {currentTab === 'briefings' && (
            <BriefingsListPage
              briefings={briefings}
              onSelectBriefing={handleViewBriefing}
              onNewResearch={() => setCurrentTab('new-research')}
              onRefresh={refreshData}
            />
          )}

          {currentTab === 'history' && (
            <ResearchHistoryPage
              jobs={jobs}
              onViewBriefing={handleViewBriefing}
              onTrackJob={(jobId) => {
                setActiveJobId(jobId);
                setCurrentTab('progress');
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              systemStatus={systemStatus}
              onRefreshStatus={() => {
                refreshStatus();
                refreshData();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

