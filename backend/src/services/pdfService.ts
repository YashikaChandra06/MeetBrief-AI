import PDFDocument from 'pdfkit';
import { BriefingReport } from '../types/index.js';

export function generateBriefingPdf(briefing: BriefingReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Standard A4 dimensions: 595.28 x 841.89 points
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 32, bottom: 32, left: 36, right: 36 },
        info: {
          Title: `MeetBrief AI - ${briefing.subjectName}`,
          Author: 'MeetBrief AI Autonomous Agent',
          Subject: `Pre-Meeting Intelligence Briefing for ${briefing.meetingDate}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Brand Colors
      const C_FOREST = '#123C2F';
      const C_EMERALD = '#167D55';
      const C_DARK = '#18352B';
      const C_MUTED = '#5A6B63';
      const C_SAGE = '#E5F0E9';
      const C_BORDER = '#D1DDD6';

      // 1. TOP HEADER BAR
      doc.rect(36, 32, 523, 56).fill(C_FOREST);

      // Logo / Brand
      doc.fillColor('#FFFFFF')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('MEETBRIEF AI', 48, 44, { characterSpacing: 1 });

      doc.fillColor('#A3D1BF')
        .fontSize(8)
        .font('Helvetica')
        .text('AUTONOMOUS PRE-MEETING EXECUTIVE INTELLIGENCE', 48, 64, { characterSpacing: 0.5 });

      // Right Header Info
      doc.fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(
          `MEETING: ${briefing.meetingDate} ${briefing.meetingTime}`,
          320,
          44,
          { width: 225, align: 'right' }
        );

      doc.fillColor('#C8E4D7')
        .fontSize(8)
        .font('Helvetica')
        .text(
          `30-Day Window: ${briefing.researchWindow.startDate} to ${briefing.researchWindow.endDate}`,
          320,
          62,
          { width: 225, align: 'right' }
        );

      let y = 100;

      // 2. SUBJECT & PURPOSE TITLE BANNER
      doc.fillColor(C_FOREST)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(briefing.subjectName, 36, y);

      const typeBadge = briefing.subjectType.toUpperCase();
      const nameWidth = doc.widthOfString(briefing.subjectName);
      
      // Tag badge
      doc.roundedRect(42 + nameWidth, y + 2, 72, 14, 3)
        .fill(C_SAGE);
      doc.fillColor(C_FOREST)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(typeBadge, 42 + nameWidth, y + 5, { width: 72, align: 'center' });

      y += 24;

      if (briefing.meetingPurpose) {
        doc.fillColor(C_MUTED)
          .fontSize(8.5)
          .font('Helvetica-Oblique')
          .text(`Meeting Focus: "${briefing.meetingPurpose}"`, 36, y, { width: 523 });
        y += 16;
      }

      // Divider line
      doc.strokeColor(C_BORDER).lineWidth(0.75).moveTo(36, y).lineTo(559, y).stroke();
      y += 10;

      // Helper for section headings
      const renderSectionHeading = (title: string, letter: string) => {
        doc.fillColor(C_EMERALD)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`${letter}. ${title.toUpperCase()}`, 36, y, { characterSpacing: 0.5 });
        y += 12;
      };

      // A. EXECUTIVE SUMMARY
      renderSectionHeading('Executive Summary', 'A');
      doc.rect(36, y, 523, 44).fill(C_SAGE);
      doc.fillColor(C_DARK)
        .fontSize(8)
        .font('Helvetica')
        .text(briefing.executiveSummary, 44, y + 6, {
          width: 507,
          lineGap: 1.5,
          height: 34,
          ellipsis: true,
        });
      y += 50;

      // B. RECENT DEVELOPMENTS (Prioritize 4-5 best to fit clean single-page)
      renderSectionHeading('Recent Developments (Pre-Meeting 30-Day Window)', 'B');
      
      const devItems = briefing.recentDevelopments.slice(0, 4);
      for (const dev of devItems) {
        // Bullet dot
        doc.circle(41, y + 4, 2).fill(C_EMERALD);
        
        doc.fillColor(C_FOREST)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(dev.headline, 48, y, { width: 380, lineGap: 1 });
        
        // Date & Source right aligned
        doc.fillColor(C_MUTED)
          .fontSize(7)
          .font('Helvetica')
          .text(`${dev.publishedDate || 'Recent'} | ${dev.sourceTitle || 'Web'}`, 430, y, {
            width: 129,
            align: 'right',
          });
        
        y += 11;

        doc.fillColor(C_DARK)
          .fontSize(7.5)
          .font('Helvetica')
          .text(dev.description, 48, y, { width: 511, lineGap: 1 });
        y += doc.heightOfString(dev.description, { width: 511 }) + 2;

        if (dev.whyItMatters) {
          doc.fillColor(C_EMERALD)
            .fontSize(7)
            .font('Helvetica-Oblique')
            .text(`Impact: ${dev.whyItMatters}`, 48, y, { width: 511 });
          y += 9;
        }
        y += 3;
      }

      y += 4;

      // TWO-COLUMN SECTION FOR C & D
      const colWidth = 252;
      const col1X = 36;
      const col2X = 307;
      const colY = y;

      // C. WHAT THIS MEANS (Col 1)
      doc.fillColor(C_EMERALD)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('C. STRATEGIC IMPLICATIONS', col1X, colY);
      
      let col1Y = colY + 12;
      for (const item of briefing.whatThisMeans.slice(0, 3)) {
        doc.circle(col1X + 4, col1Y + 3.5, 1.5).fill(C_FOREST);
        doc.fillColor(C_DARK)
          .fontSize(7.5)
          .font('Helvetica')
          .text(item, col1X + 11, col1Y, { width: colWidth - 11, lineGap: 1 });
        col1Y += doc.heightOfString(item, { width: colWidth - 11 }) + 4;
      }

      // D. DISCUSSION OPPORTUNITIES (Col 2)
      doc.fillColor(C_EMERALD)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('D. DISCUSSION OPPORTUNITIES', col2X, colY);

      let col2Y = colY + 12;
      for (const opp of briefing.discussionOpportunities.slice(0, 3)) {
        doc.circle(col2X + 4, col2Y + 3.5, 1.5).fill(C_FOREST);
        doc.fillColor(C_DARK)
          .fontSize(7.5)
          .font('Helvetica')
          .text(opp, col2X + 11, col2Y, { width: colWidth - 11, lineGap: 1 });
        col2Y += doc.heightOfString(opp, { width: colWidth - 11 }) + 4;
      }

      y = Math.max(col1Y, col2Y) + 6;

      // E. QUESTIONS TO ASK
      renderSectionHeading('Targeted Questions To Ask', 'E');
      for (let i = 0; i < Math.min(3, briefing.questionsToAsk.length); i++) {
        const q = briefing.questionsToAsk[i];
        doc.fillColor(C_FOREST)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(`${i + 1}.`, 36, y);

        doc.fillColor(C_DARK)
          .fontSize(7.5)
          .font('Helvetica')
          .text(q, 48, y, { width: 511, lineGap: 1 });
        y += doc.heightOfString(q, { width: 511 }) + 3;
      }

      y += 4;

      // F. OPEN QUESTIONS & G. SOURCES SUMMARY (Bottom Row)
      doc.strokeColor(C_BORDER).lineWidth(0.5).moveTo(36, y).lineTo(559, y).stroke();
      y += 6;

      const sourcesSummary = briefing.sources
        .slice(0, 5)
        .map((s) => s.domain)
        .join(' • ');

      doc.fillColor(C_MUTED)
        .fontSize(6.5)
        .font('Helvetica')
        .text(`Verified Sources: ${sourcesSummary || 'Tavily Research News Index'}`, 36, y, {
          width: 380,
        });

      doc.fillColor(C_MUTED)
        .fontSize(6.5)
        .font('Helvetica')
        .text(
          `Generated via ${
            briefing.generatedBy === 'ollama'
              ? `Ollama (${briefing.ollamaModel})`
              : 'Algorithmic Research Synthesis'
          }`,
          400,
          y,
          { width: 159, align: 'right' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

