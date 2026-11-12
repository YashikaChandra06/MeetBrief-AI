import PDFDocument from 'pdfkit';
import { BriefingReport } from '../types/index.js';

export function generateBriefingPdf(briefing: BriefingReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Standard A4 dimensions: 595.28 x 841.89 points
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 36, right: 36 },
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
      doc.rect(36, 30, 523, 54).fill(C_FOREST);

      // Logo / Brand
      doc.fillColor('#FFFFFF')
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('MEETBRIEF AI', 46, 42, { characterSpacing: 1 });

      doc.fillColor('#A3D1BF')
        .fontSize(7.5)
        .font('Helvetica')
        .text('AUTONOMOUS PRE-MEETING EXECUTIVE INTELLIGENCE', 46, 60, { characterSpacing: 0.5 });

      // Right Header Info
      doc.fillColor('#FFFFFF')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(
          `MEETING: ${briefing.meetingDate} ${briefing.meetingTime}`,
          320,
          42,
          { width: 225, align: 'right' }
        );

      doc.fillColor('#C8E4D7')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          `30-Day Window: ${briefing.researchWindow.startDate} to ${briefing.researchWindow.endDate}`,
          320,
          58,
          { width: 225, align: 'right' }
        );

      let y = 94;

      // 2. SUBJECT & PURPOSE TITLE BANNER
      doc.fillColor(C_FOREST)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(briefing.subjectName, 36, y);

      const typeBadge = briefing.subjectType.toUpperCase();
      const nameWidth = doc.widthOfString(briefing.subjectName);
      
      doc.roundedRect(42 + nameWidth, y + 2, 60, 13, 3)
        .fill(C_SAGE);
      doc.fillColor(C_FOREST)
        .fontSize(6.5)
        .font('Helvetica-Bold')
        .text(typeBadge, 42 + nameWidth, y + 4.5, { width: 60, align: 'center' });

      // Document context badge if documents were uploaded
      if (briefing.documentContext && briefing.documentContext.documentsCount > 0) {
        const docBadgeText = `${briefing.documentContext.documentsCount} DOC${
          briefing.documentContext.documentsCount > 1 ? 'S' : ''
        } ATTACHED`;
        doc.roundedRect(108 + nameWidth, y + 2, 78, 13, 3)
          .fill('#D9F2E6');
        doc.fillColor(C_EMERALD)
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(docBadgeText, 108 + nameWidth, y + 4.5, { width: 78, align: 'center' });
      }

      y += 20;

      if (briefing.meetingPurpose) {
        doc.fillColor(C_MUTED)
          .fontSize(8)
          .font('Helvetica-Oblique')
          .text(`Meeting Focus: "${briefing.meetingPurpose}"`, 36, y, { width: 523 });
        y += 14;
      }

      // Divider line
      doc.strokeColor(C_BORDER).lineWidth(0.75).moveTo(36, y).lineTo(559, y).stroke();
      y += 8;

      const renderSectionHeading = (title: string, letter: string) => {
        doc.fillColor(C_EMERALD)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(`${letter}. ${title.toUpperCase()}`, 36, y, { characterSpacing: 0.5 });
        y += 11;
      };

      // A. EXECUTIVE SUMMARY
      renderSectionHeading('Executive Summary', 'A');
      doc.rect(36, y, 523, 40).fill(C_SAGE);
      doc.fillColor(C_DARK)
        .fontSize(7.5)
        .font('Helvetica')
        .text(briefing.executiveSummary, 42, y + 5, {
          width: 511,
          lineGap: 1.2,
          height: 30,
          ellipsis: true,
        });
      y += 45;

      // DOCUMENT-TO-WEB INSIGHTS (If documents were uploaded)
      if (
        briefing.documentContext &&
        briefing.documentContext.insights &&
        briefing.documentContext.insights.length > 0
      ) {
        renderSectionHeading('Document-To-Web Insights (Verified Claims & Discrepancies)', '★');
        const insight = briefing.documentContext.insights[0];
        doc.rect(36, y, 523, 36).fill('#F0F7F3');
        doc.fillColor(C_EMERALD)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(`[Doc Evidence] ${insight.documentEvidence.fileName} (p.${insight.documentEvidence.pageOrSlide}):`, 42, y + 4);
        doc.fillColor(C_DARK)
          .fontSize(7)
          .font('Helvetica-Oblique')
          .text(`"${insight.documentEvidence.quote.slice(0, 110)}..."`, 42, y + 14, { width: 511 });
        doc.fillColor(C_FOREST)
          .fontSize(7)
          .font('Helvetica')
          .text(`Cross-Reference: ${insight.explanation}`, 42, y + 24, { width: 511 });
        y += 41;
      }

      // B. RECENT DEVELOPMENTS
      renderSectionHeading('Recent Developments (Pre-Meeting 30-Day Window)', 'B');
      
      const devItems = briefing.recentDevelopments.slice(0, 3);
      for (const dev of devItems) {
        doc.circle(41, y + 3.5, 2).fill(C_EMERALD);
        
        doc.fillColor(C_FOREST)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(dev.headline, 48, y, { width: 380, lineGap: 1 });
        
        doc.fillColor(C_MUTED)
          .fontSize(6.5)
          .font('Helvetica')
          .text(`${dev.publishedDate || 'Recent'} | ${dev.sourceTitle || 'Web'}`, 430, y, {
            width: 129,
            align: 'right',
          });
        
        y += 10;

        doc.fillColor(C_DARK)
          .fontSize(7)
          .font('Helvetica')
          .text(dev.description, 48, y, { width: 511, lineGap: 1 });
        y += doc.heightOfString(dev.description, { width: 511 }) + 1.5;

        if (dev.whyItMatters) {
          doc.fillColor(C_EMERALD)
            .fontSize(6.5)
            .font('Helvetica-Oblique')
            .text(`Impact: ${dev.whyItMatters}`, 48, y, { width: 511 });
          y += 8;
        }
        y += 2.5;
      }

      y += 2;

      // TWO-COLUMN SECTION FOR C & D
      const colWidth = 252;
      const col1X = 36;
      const col2X = 307;
      const colY = y;

      // C. WHAT THIS MEANS (Col 1)
      doc.fillColor(C_EMERALD)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('C. STRATEGIC IMPLICATIONS', col1X, colY);
      
      let col1Y = colY + 10;
      for (const item of briefing.whatThisMeans.slice(0, 2)) {
        doc.circle(col1X + 4, col1Y + 3.5, 1.5).fill(C_FOREST);
        doc.fillColor(C_DARK)
          .fontSize(7)
          .font('Helvetica')
          .text(item, col1X + 11, col1Y, { width: colWidth - 11, lineGap: 1 });
        col1Y += doc.heightOfString(item, { width: colWidth - 11 }) + 3;
      }

      // D. DISCUSSION OPPORTUNITIES (Col 2)
      doc.fillColor(C_EMERALD)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('D. DISCUSSION OPPORTUNITIES', col2X, colY);

      let col2Y = colY + 10;
      for (const opp of briefing.discussionOpportunities.slice(0, 2)) {
        doc.circle(col2X + 4, col2Y + 3.5, 1.5).fill(C_FOREST);
        doc.fillColor(C_DARK)
          .fontSize(7)
          .font('Helvetica')
          .text(opp, col2X + 11, col2Y, { width: colWidth - 11, lineGap: 1 });
        col2Y += doc.heightOfString(opp, { width: colWidth - 11 }) + 3;
      }

      y = Math.max(col1Y, col2Y) + 4;

      // E. QUESTIONS TO ASK
      renderSectionHeading('Targeted Questions To Ask', 'E');
      for (let i = 0; i < Math.min(3, briefing.questionsToAsk.length); i++) {
        const q = briefing.questionsToAsk[i];
        doc.fillColor(C_FOREST)
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(`${i + 1}.`, 36, y);

        doc.fillColor(C_DARK)
          .fontSize(7)
          .font('Helvetica')
          .text(q, 48, y, { width: 511, lineGap: 1 });
        y += doc.heightOfString(q, { width: 511 }) + 2.5;
      }

      y += 3;

      // F. FOOTER SUMMARY & SOURCES
      doc.strokeColor(C_BORDER).lineWidth(0.5).moveTo(36, y).lineTo(559, y).stroke();
      y += 5;

      const sourcesSummary = briefing.sources
        .slice(0, 4)
        .map((s) => s.domain)
        .join(' • ');

      doc.fillColor(C_MUTED)
        .fontSize(6)
        .font('Helvetica')
        .text(`Web Sources: ${sourcesSummary || 'Tavily News Index'}`, 36, y, {
          width: 360,
        });

      doc.fillColor(C_MUTED)
        .fontSize(6)
        .font('Helvetica')
        .text(
          `Engine: ${
            briefing.generatedBy === 'ollama'
              ? `Ollama (${briefing.ollamaModel})`
              : 'Algorithmic Synthesis'
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
