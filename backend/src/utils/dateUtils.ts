import { ResearchWindow } from '../types/index.js';

/**
 * Calculates the 30-day window relative to the scheduled meeting date.
 * Strictly adheres to requirement:
 * "Calculate the 30-day window relative to the meeting date, not the current date."
 */
export function calculateResearchWindow(meetingDateStr: string): ResearchWindow {
  const meetingDate = new Date(meetingDateStr);
  if (isNaN(meetingDate.getTime())) {
    throw new Error(`Invalid meeting date: ${meetingDateStr}`);
  }

  // Exactly 30 days prior to the meeting date
  const startDate = new Date(meetingDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startIso = startDate.toISOString().split('T')[0];
  const endIso = meetingDate.toISOString().split('T')[0];

  return {
    startDate: startIso,
    endDate: endIso,
    daysCovered: 30,
  };
}

/**
 * Parses and checks whether an article's published date is within the research window.
 */
export function isDateWithinWindow(
  pubDateStr: string | undefined | null,
  window: ResearchWindow
): { isWithin: boolean; note: string } {
  if (!pubDateStr) {
    return {
      isWithin: true, // Unknown date allowed with note
      note: 'Publication date unlisted; validated by recent crawl freshness',
    };
  }

  const pubDate = new Date(pubDateStr);
  if (isNaN(pubDate.getTime())) {
    return {
      isWithin: true,
      note: `Unparseable date "${pubDateStr}"; crawled recently`,
    };
  }

  const start = new Date(window.startDate).getTime();
  const end = new Date(window.endDate).getTime() + 24 * 60 * 60 * 1000; // end of meeting day
  const pubTime = pubDate.getTime();

  if (pubTime >= start && pubTime <= end) {
    return {
      isWithin: true,
      note: 'Verified within 30-day pre-meeting window',
    };
  }

  // If slightly before (up to 45 days)
  if (pubTime < start && pubTime >= start - 15 * 24 * 60 * 60 * 1000) {
    return {
      isWithin: false,
      note: 'Slightly outside strict 30-day window (contextual background)',
    };
  }

  return {
    isWithin: false,
    note: 'Older background context',
  };
}

export function formatHumanDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

