import { storage } from './storage';
import { bucketStorage } from './bucket-storage';
import { jsPDF } from 'jspdf';
import type { Athlete, KpiMetric, Strength, Weakness } from '@shared/schema';

export interface AthleteReportData {
  athlete: Athlete & { worldRank?: number; olympicRank?: number; worldCategory?: string; olympicCategory?: string };
  kpis: KpiMetric[];
  strengths: Strength[];
  weaknesses: Weakness[];
  competitors: (Athlete & { worldRank?: number; olympicRank?: number; worldCategory?: string; olympicCategory?: string })[];
  generatedAt: string;
}

export class PDFGenerator {
  async generateAthleteReport(athleteId: number): Promise<Buffer> {
    const reportData = await this.gatherReportData(athleteId);

    try {
      const doc = new jsPDF();

      // Add colorful header with gradient effect
      doc.setFillColor(29, 78, 216); // Consistent blue background
      doc.rect(0, 0, 210, 65, 'F');

      // Add white text on colored background
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('PERFORMS INSIGHTS', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('Athlete Performance Report', 105, 45, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const reportDate = new Date(reportData.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Generated: ${reportDate}`, 105, 55, { align: 'center' });

      let yPos = 75; // Reduced starting position

      // Add athlete information section
      yPos = await this.addAthleteInfo(doc, reportData, yPos);

      // Add ranking comparison section with improved spacing
      if (reportData.competitors.length > 0 && yPos < 210) {
        yPos = this.addRankingComparison(doc, reportData, yPos + 15);
      }



      // Add competitions section
      if (yPos > 200) {
        doc.addPage();
        yPos = 15;
      }
      yPos = this.addCompetitions(doc, reportData, yPos + 20);

      // Add AI Analysis section if data is available
      if (reportData.strengths.length > 0 || reportData.weaknesses.length > 0) {
        doc.addPage();
        yPos = 15;
        yPos = this.addAIAnalysis(doc, reportData, yPos + 20);
      }

      // Add professional footer for all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Page ${i} of ${pageCount}`, 105, 293, { align: 'center' });

        // Add professional page border
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.8);
        doc.rect(10, 10, 190, 277);
      }

      return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  private async addAthleteInfo(doc: any, reportData: AthleteReportData, startY: number): Promise<number> {
    let yPos = startY;

    // Add athlete information section with blue styling
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(20, yPos - 8, 170, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('ATHLETE INFORMATION', 25, yPos + 2);
    yPos += 16;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Athlete data rows - reduced row height
    // Position photo to the left of the table
    yPos += 2;
    const photoX = 20;
    const photoY = yPos;
    const photoSize = 35;

    try {
      // Try to load and add actual athlete image
      const imageBuffer = await bucketStorage.getAthleteImageBuffer(reportData.athlete.id);

      if (imageBuffer) {
        // Add the actual athlete image
        const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        doc.addImage(imageDataUrl, 'JPEG', photoX, photoY, photoSize, photoSize);

        // Add a professional border around the image
        doc.setDrawColor(29, 78, 216);
        doc.setLineWidth(1.5);
        doc.rect(photoX, photoY, photoSize, photoSize);
      } else {
        // Professional placeholder
        doc.setFillColor(240, 240, 240);
        doc.rect(photoX, photoY, photoSize, photoSize, 'F');
        doc.setDrawColor(29, 78, 216);
        doc.setLineWidth(1.5);
        doc.rect(photoX, photoY, photoSize, photoSize);

        // Add athlete initials or icon
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(29, 78, 216);
        const initials = reportData.athlete.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);
        doc.text(initials, photoX + photoSize/2, photoY + photoSize/2 + 2, { align: 'center' });
      }
    } catch (error) {
      console.warn('Could not load athlete photo, using placeholder:', error);
      // Fallback placeholder
      doc.setFillColor(240, 240, 240);
      doc.rect(photoX, photoY, photoSize, photoSize, 'F');
      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(1.5);
      doc.rect(photoX, photoY, photoSize, photoSize);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(29, 78, 216);
      const initials = reportData.athlete.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);
      doc.text(initials, photoX + photoSize/2, photoY + photoSize/2 + 2, { align: 'center' });
    }
    const athleteInfo = [
      { field: 'Name', value: reportData.athlete.name },
      { field: 'Sport', value: reportData.athlete.sport },
      { field: 'Nationality', value: reportData.athlete.nationality },
      { field: 'World Rank', value: reportData.athlete.worldRank ? `#${reportData.athlete.worldRank}` : 'N/A' },
      { field: 'Olympic Rank', value: reportData.athlete.olympicRank ? `#${reportData.athlete.olympicRank}` : 'N/A' }
    ];

    // Add points calculation
    let pointsValue = 'N/A';
    if (reportData.athlete.olympicRank) {
      const olympicPoints = Math.max(1200 - (reportData.athlete.olympicRank * 3), 50);
      pointsValue = `${olympicPoints} (Olympic)`;
    } else if (reportData.athlete.worldRank) {
      const worldPoints = Math.max(1000 - (reportData.athlete.worldRank * 2), 25);
      pointsValue = `${worldPoints} (World)`;
    }
    athleteInfo.push({ field: 'Points', value: pointsValue });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    athleteInfo.forEach((info, index) => {
      const rowHeight = 9; // Reduced from 10
      const tableX = photoX + photoSize + 10; // Start table after photo with margin
      const tableWidth = 190 - tableX; // Adjust width to fit remaining space

      // Clean alternating row styling - adjusted for new position
      if (index % 2 === 0) {
        doc.setFillColor(239, 246, 255); // Very light blue
        doc.rect(tableX, yPos - 1, tableWidth, rowHeight, 'F');
      }

      // Add subtle row border - adjusted for new position
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(tableX, yPos + rowHeight - 1, tableX + tableWidth, yPos + rowHeight - 1);

      doc.setTextColor(0, 0, 0);
      // Make field column bold - adjusted position
      doc.setFont('helvetica', 'bold');
      doc.text(info.field, tableX + 5, yPos + 5);
      // Make value column normal - adjusted position
      doc.setFont('helvetica', 'normal');
      doc.text(info.value, tableX + 70, yPos + 5);

      yPos += rowHeight;
    });

    return Math.max(yPos + 2, photoY + photoSize + 5); // Ensure spacing accounts for photo height
  }

  private addCompetitions(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Add competitions section with blue styling
    doc.setFillColor(29, 78, 216); // Even darker blue background
    doc.rect(20, yPos - 8, 170, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('COMPETITIONS', 25, yPos + 3);
    yPos += 25;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Career events have been replaced with competition participants
    if (false) {
      // Clean competition table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // Black text

      // Draw header border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(15, yPos - 5, 180, 14);

      doc.text('Competition', 22, yPos + 5);
      doc.text('Date', 85, yPos + 5);
      doc.text('Location', 108, yPos + 5);
      doc.text('Level', 138, yPos + 5);
      doc.text('Place & Points', 167, yPos + 5);
      yPos += 14;

      // Add line under header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(15, yPos, 195, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      reportData.careerEvents.forEach((event, index) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 25; // Increased to ensure header doesn't interfere with page border
          // Repeat header on new page with blue styling
          doc.setFillColor(29, 78, 216); // Even darker blue background
          doc.rect(20, yPos - 8, 170, 20, 'F'); // Reverted to original rectangle dimensions
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18); // Reverted to original font size
          doc.setTextColor(255, 255, 255); // White text
          doc.text('COMPETITIONS (continued)', 25, yPos + 3); // Reverted to original x position
          yPos += 25;
          doc.setTextColor(0, 0, 0); // Reset to black

          // Recreate table header on new page
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);

          // Draw header border
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1);
          doc.rect(15, yPos - 5, 180, 14);

          doc.text('Competition', 22, yPos + 5);
          doc.text('Date', 85, yPos + 5);
          doc.text('Location', 108, yPos + 5);
          doc.text('Level', 138, yPos + 5);
          doc.text('Place & Points', 167, yPos + 5);
          yPos += 14;

          // Add line under header
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1);
          doc.line(15, yPos, 195, yPos);
          yPos += 8;

          // Reset to normal font for data
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
        }

        doc.setTextColor(0, 0, 0);

        // Helper function to wrap text into multiple lines based on width
        const wrapText = (text: string, maxWidth: number): string[] => {
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const textWidth = doc.getTextWidth(testLine);
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }
          return lines;
        };

        // Prepare data with proper text wrapping
        const competitionName = event.title || 'Competition';
        const location = event.location || 'N/A';

        // Combine weight class and competition level
        const weightClass = reportData.athlete.worldCategory || reportData.athlete.olympicCategory || 'N/A';
        const competitionLevel = event.competitionLevel || 'N/A';
        const level = `${weightClass} / ${competitionLevel}`;

        // Column widths in characters (adjusted for proper spacing)
        const competitionLines = wrapText(competitionName, 32);
        const locationLines = wrapText(location, 18);
        const levelLines = wrapText(level, 16);

        const maxLines = Math.max(competitionLines.length, locationLines.length, levelLines.length);
        const rowHeight = maxLines * 10 + 8;

        // Draw row border
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(15, yPos - 2, 180, rowHeight);

        // Display competition name (multiple lines if needed)
        competitionLines.forEach((line, lineIndex) => {
          doc.text(line, 22, yPos + 8 + (lineIndex * 10));
        });

        // Display date
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        doc.text(eventDate, 85, yPos + 8);

        // Display location (multiple lines if needed)
        locationLines.forEach((line, lineIndex) => {
          doc.text(line, 108, yPos + 8 + (lineIndex * 10));
        });

        // Display competition level (multiple lines if needed)
        levelLines.forEach((line, lineIndex) => {
          doc.text(line, 138, yPos + 8 + (lineIndex * 10));
        });

        // Extract real finishing place and points from metadata
        let placeText = 'N/A';
        let pointsText = '';

        if (event.metadata && typeof event.metadata === 'object') {
          const metadata = event.metadata as any;

          // Extract place from event_result
          if (metadata.event_result !== undefined) {
            placeText = metadata.event_result.toString();
          }
          // If no event_result, try other patterns
          else {
            const resultText = event.eventResult || event.description || '';
            const allText = resultText + ' ' + JSON.stringify(metadata);

            const placePatterns = [
              /Place:\s*(\d+)/i,
              /(\d+)(?:st|nd|rd|th)\s*place/i,
              /Rank:\s*(\d+)/i,
              /Position:\s*(\d+)/i,
              /Finished:\s*(\d+)/i,
              /(\d+)(?:st|nd|rd|th)/,
              /rank\s*(\d+)/i,
              /place\s*(\d+)/i,
              /(\d+)\s*out of/i
            ];

            for (const pattern of placePatterns) {
              const match = allText.match(pattern);
              if (match && match[1]) {
                placeText = match[1];
                break;
              }
            }
          }

          // Extract points
          if (metadata.points !== undefined) {
            pointsText = ` (${metadata.points} pts)`;
          }
        } else {
          // Fallback to original extraction logic if no metadata
          const resultText = event.eventResult || event.description || '';
          const placeMatch = resultText.match(/Place:\s*(\d+)/i) || resultText.match(/(\d+)(?:st|nd|rd|th)/);
          if (placeMatch) {
            placeText = placeMatch[1];
          }
        }

        // Replace 0 with "unranked" in place text
        if (placeText === '0') {
          placeText = 'unranked';
        }

        // Combine place and points
        const displayText = placeText + pointsText;

        // Display place and points
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(displayText, 167, yPos + 8);

        // Reset font for next iteration
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        yPos += rowHeight + 2;
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('No competition data available.', 22, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  private addAIAnalysis(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Add Key Strengths section
    if (reportData.strengths.length > 0) {
      // Key Strengths header
      doc.setFillColor(29, 78, 216); // Consistent blue background
      doc.rect(20, yPos - 5, 170, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255); // White text
      doc.text('KEY STRENGTHS', 25, yPos + 5);
      yPos += 15;
      doc.setTextColor(0, 0, 0); // Reset to black

      // Add strengths
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      reportData.strengths.forEach((strength, index) => {
        // Add bullet point and strength
        doc.setFont('helvetica', 'bold');
        doc.text('•', 25, yPos + 5);
        doc.setFont('helvetica', 'normal');

        // Word wrap for long strength descriptions
        const maxWidth = 170;
        const words = (strength.name || strength.description || '').split(' ');
        let currentLine = '';
        let lines: string[] = [];

        words.forEach((word: string) => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = doc.getTextWidth(testLine);
          if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });

        if (currentLine) {
          lines.push(currentLine);
        }

        lines.forEach((line, lineIndex) => {
          doc.text(line, 28, yPos + 5 + (lineIndex * 5));
        });

        yPos += Math.max(12, lines.length * 5 + 5);
      });

      yPos += 10;
    }

    // Add Areas for Improvement section
    if (reportData.weaknesses.length > 0) {
      // Areas for Improvement header
      doc.setFillColor(29, 78, 216); // Consistent blue background
      doc.rect(20, yPos - 5, 170, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255); // White text
      doc.text('AREAS FOR IMPROVEMENT', 25, yPos + 5);
      yPos += 15;
      doc.setTextColor(0, 0, 0); // Reset to black

      // Add weaknesses
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      reportData.weaknesses.forEach((weakness, index) => {
        // Add bullet point and weakness
        doc.setFont('helvetica', 'bold');
        doc.text('•', 25, yPos + 5);
        doc.setFont('helvetica', 'normal');

        // Word wrap for long weakness descriptions
        const maxWidth = 170;
        const words = (weakness.name || weakness.description || '').split(' ');
        let currentLine = '';
        let lines: string[] = [];

        words.forEach((word: string) => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = doc.getTextWidth(testLine);
          if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });

        if (currentLine) {
          lines.push(currentLine);
        }

        lines.forEach((line, lineIndex) => {
          doc.text(line, 28, yPos + 5 + (lineIndex * 5));
        });

        yPos += Math.max(12, lines.length * 5 + 5);
      });

      yPos += 10;
    }

    // Add note if no AI data is available
    if (reportData.strengths.length === 0 && reportData.weaknesses.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('AI analysis data is not available for this athlete.', 20, yPos);
      doc.text('Click "AI Analyze" buttons in the web interface to generate insights.', 20, yPos + 15);
      yPos += 40;
    }

    return yPos + 20;
  }

  private addRankingComparison(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Add ranking comparison section with blue styling - standardized height
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(20, yPos - 8, 170, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('RANKING COMPARISON', 25, yPos + 2);
    yPos += 18;
    doc.setTextColor(0, 0, 0); // Reset to black

    if (reportData.competitors.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('No ranking data available for comparison.', 25, yPos);
      return yPos + 20;
    }

    // Table headers with standardized spacing
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    // Header background with proper spacing
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 2, 180, 12, 'F');

    doc.text('Rank', 25, yPos + 6);
    doc.text('Athlete', 45, yPos + 6);
    doc.text('Nationality', 120, yPos + 6);
    doc.text('Points', 170, yPos + 6);
    yPos += 14;

    // Sort competitors by rank (world rank preferred) - limit to top 8 for space
    const sortedCompetitors = [...reportData.competitors].sort((a, b) => {
      const aRank = a.worldRank || a.olympicRank || 999;
      const bRank = b.worldRank || b.olympicRank || 999;
      return aRank - bRank;
    }).slice(0, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    sortedCompetitors.forEach((competitor, index) => {
      const isCurrentAthlete = competitor.id === reportData.athlete.id;
      const rowHeight = 9; // Reduced row height

      // Highlight current athlete row in blue
      if (isCurrentAthlete) {
        doc.setFillColor(59, 130, 246); // Blue background
        doc.rect(20, yPos - 1, 170, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255); // White text for better contrast
      } else {
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250); // Very light gray
          doc.rect(20, yPos - 1, 170, rowHeight, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0); // Black text
      }

      // Rank
      const rank = competitor.worldRank || competitor.olympicRank || 'N/A';
      doc.text(`#${rank}`, 25, yPos + 5);

      // Athlete name (show only first two names)
      let athleteName = competitor.name;
      const nameParts = athleteName.split(' ');
      if (nameParts.length > 2) {
        athleteName = nameParts.slice(0, 2).join(' ');
      }
      doc.text(athleteName, 45, yPos + 5);

      // Nationality (abbreviated if too long)
      let nationality = competitor.nationality || 'N/A';
      // The original code truncated the nationality to 12 characters.
      // This is removed to display the full name.
      doc.text(nationality, 120, yPos + 5);

      // Points calculation
      let points = 'N/A';
      if (competitor.olympicRank) {
        const olympicPoints = Math.max(1200 - (competitor.olympicRank * 3), 50);
        points = `${olympicPoints}`;
      } else if (competitor.worldRank) {
        const worldPoints = Math.max(1000 - (competitor.worldRank * 2), 25);
        points = `${worldPoints}`;
      }
      doc.text(points, 170, yPos + 5);

      // Add subtle row border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(15, yPos + rowHeight - 1, 195, yPos + rowHeight - 1);

      yPos += rowHeight;
    });

    return yPos + 10;
  }

  private addHeader(doc: any, reportData: AthleteReportData): void {
    // Add colored header background
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(0, 0, 210, 50, 'F');

    // Add white text on colored background
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('PERFORMS INSIGHTS', 105, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Athletic Performance Analysis Report', 105, 35, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Add generation date
    const reportDate = new Date(reportData.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${reportDate}`, 105, 45, { align: 'center' });
  }

  private addAthleteProfile(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Add profile section with border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos - 5, 180, 40);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(41, 98, 255);
    doc.text('ATHLETE PROFILE', 25, yPos + 5);

    // Profile info in columns
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    yPos += 15;
    doc.text(`Name: ${reportData.athlete.name}`, 25, yPos);
    doc.text(`World Rank: #${reportData.athlete.worldRank || 'N/A'}`, 110, yPos);

    yPos += 8;
    doc.text(`Sport: ${reportData.athlete.sport}`, 25, yPos);
    doc.text(`Olympic Rank: #${reportData.athlete.olympicRank || 'N/A'}`, 110, yPos);

    yPos += 8;
    doc.text(`Nationality: ${reportData.athlete.nationality}`, 25, yPos);
    doc.text(`Readiness: 88%`, 110, yPos);

    return yPos + 15;
  }

  private addPerformanceDashboard(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(41, 98, 255);
    doc.text('PERFORMANCE DASHBOARD', 25, yPos);

    yPos += 15;

    // Performance metrics with visual bars
    const metrics = [
      { label: 'Physical Readiness', value: 87, color: [255, 99, 132] },
      { label: 'Mental Readiness', value: 92, color: [54, 162, 235] },
      { label: 'Technical Skills', value: 85, color: [255, 205, 86] },
      { label: 'Overall Performance', value: 88, color: [75, 192, 192] }
    ];

    metrics.forEach((metric, index) => {
      this.drawProgressBar(doc, 20, yPos + (index * 12), metric.label, metric.value, metric.color);
    });

    return yPos + (metrics.length * 12) + 10;
  }

  private drawProgressBar(doc: any, x: number, y: number, label: string, value: number, color: number[]): void {
    const barWidth = 100;
    const barHeight = 8;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(label, x, y - 2);

    // Background bar
    doc.setFillColor(240, 240, 240);
    doc.rect(x + 85, y - 6, barWidth, barHeight, 'F');

    // Progress bar
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x + 85, y - 6, (barWidth * value) / 100, barHeight, 'F');

    // Percentage text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${value}%`, x + 190, y - 1);
  }

  private addKPIMetrics(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(41, 98, 255);
    doc.text('KEY PERFORMANCE INDICATORS', 25, yPos);

    yPos += 15;

    if (reportData.kpis.length > 0) {
      reportData.kpis.slice(0, 6).forEach((kpi, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 20 + (col * 90);
        const y = yPos + (row * 25);

        // KPI box
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(x, y - 5, 85, 20);

        // KPI title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(kpi.metricName, x + 5, y + 2);

        // KPI value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(41, 98, 255);
        doc.text(`${kpi.value}`, x + 5, y + 12);
      });

      yPos += Math.ceil(reportData.kpis.length / 2) * 25;
    }

    return yPos + 10;
  }

  private addStrengthsWeaknesses(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(41, 98, 255);
    doc.text('STRENGTHS & DEVELOPMENT AREAS', 25, yPos);

    yPos += 15;

    // Strengths column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(34, 139, 34);
    doc.text('STRENGTHS', 25, yPos);

    // Weaknesses column
    doc.setTextColor(220, 20, 60);
    doc.text('DEVELOPMENT AREAS', 110, yPos);

    yPos += 10;

    const maxItems = Math.max(reportData.strengths.length, reportData.weaknesses.length);

    for (let i = 0; i < maxItems && i < 5; i++) {
      if (i < reportData.strengths.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`• ${reportData.strengths[i].name}`, 25, yPos + (i * 8));

        // Add score if available
        if (reportData.strengths[i].score) {
          doc.setTextColor(34, 139, 34);
          doc.text(`(${reportData.strengths[i].score}/100)`, 85, yPos + (i * 8));
        }
      }

      if (i < reportData.weaknesses.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`• ${reportData.weaknesses[i].name}`, 115, yPos + (i * 8));

        // Add score if available
        if (reportData.weaknesses[i].score) {
          doc.setTextColor(220, 20, 60);
          doc.text(`(${reportData.weaknesses[i].score}/100)`, 175, yPos + (i * 8));
        }
      }
    }

    return yPos + (maxItems * 8) + 10;
  }

  private addCareerTimeline(doc: any, reportData: AthleteReportData, startY: number): number {
    let yPos = startY;

    // Add career highlights section with blue styling
    doc.setFillColor(29, 78, 216); // Even darker blue background
    doc.rect(20, yPos - 8, 170, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('CAREER HIGHLIGHTS', 25, yPos + 3);
    yPos += 25;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Career events have been replaced with competition participants
    if (false) {
      // Clean competition table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // Black text

      // Draw header border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(15, yPos - 5, 180, 14);

      doc.text('Competition', 22, yPos + 5);
      doc.text('Date', 85, yPos + 5);
      doc.text('Location', 108, yPos + 5);
      doc.text('Level', 138, yPos + 5);
      doc.text('Place & Points', 167, yPos + 5);
      yPos += 14;

      // Add line under header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(15, yPos, 195, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      reportData.careerEvents.forEach((event, index) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 15;
          // Repeat header on new page with blue styling
          doc.setFillColor(29, 78, 216); // Even darker blue background
          doc.rect(20, yPos - 8, 170, 20, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18);
          doc.setTextColor(255, 255, 255); // White text
          doc.text('CAREER HIGHLIGHTS (continued)', 25, yPos + 3);
          yPos += 18;
          doc.setTextColor(0, 0, 0); // Reset to black

          // Recreate table header on new page
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);

          // Draw header border
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1);
          doc.rect(15, yPos - 5, 180, 14);

          doc.text('Competition', 22, yPos + 5);
          doc.text('Date', 85, yPos + 5);
          doc.text('Location', 108, yPos + 5);
          doc.text('Level', 138, yPos + 5);
          doc.text('Place & Points', 167, yPos + 5);
          yPos += 14;

          // Add line under header
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1);
          doc.line(15, yPos, 195, yPos);
          yPos += 8;

          // Reset to normal font for data
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
        }

        doc.setTextColor(0, 0, 0);

        // Helper function to wrap text into multiple lines based on width
        const wrapText = (text: string, maxWidth: number): string[] => {
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = doc.getTextWidth(testLine);
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });

          if (currentLine) {
            lines.push(currentLine);
          }

          return lines;
        };

        // Row styling will be handled below after calculating height

        // Use the title field which contains the actual competition name
        const competitionName = event.title || 'Competition Event';

        // Use weight class from athlete data as the category
        let category = reportData.athlete.worldCategory || reportData.athlete.olympicCategory || 'N/A';

        // If no weight category is available, try to extract from description
        if (category === 'N/A' && event.description && event.description.includes('Category:')) {
          const categoryMatch = event.description.match(/Category:\s*([^|]+)/);
          if (categoryMatch) {
            category = categoryMatch[1].trim();
          }
        }

        const eventNameLines = wrapText(competitionName, 32);
        const location = event.location || 'N/A';
        const locationLines = wrapText(location, 12);
        const categoryLines = wrapText(category, 8);
        const maxLines = Math.max(eventNameLines.length, locationLines.length, categoryLines.length, 1);
        const rowHeight = Math.max(16, 8 + (maxLines * 5));

        // Clean alternating row styling with proper height
        if (index % 2 === 0) {
          doc.setFillColor(239, 246, 255); // Very light blue
          doc.rect(20, yPos - 2, 170, rowHeight, 'F');
        }

        // Add subtle row border at bottom
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(15, yPos + rowHeight - 2, 195, yPos + rowHeight - 2);

        // Competition name only (no place/points/category)
        eventNameLines.forEach((line, lineIndex) => {
          doc.text(line, 22, yPos + 6 + (lineIndex * 5));
        });

        // Date
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        doc.text(eventDate, 85, yPos + 6);

        // Location with proper spacing
        locationLines.forEach((line, lineIndex) => {
          doc.text(line, 120, yPos + 6 + (lineIndex * 5));
        });

        // Level/Category
        categoryLines.forEach((line, lineIndex) => {
          doc.text(line, 150, yPos + 6 + (lineIndex * 5));
        });

        // Place & Points
        let placeText = 'N/A';
        if (event.eventResult) {
          if (event.eventResult === '0') {
            placeText = 'unranked';
          } else {
            placeText = event.eventResult.toString();
          }
        }

        // Calculate points based on place
        let pointsText = '';
        if (placeText !== 'N/A' && placeText !== 'unranked') {
          const place = parseInt(placeText);
          if (!isNaN(place)) {
            const points = Math.max(10 - place, 1);
            pointsText = ` (${points}.00 pts)`;
          }
        }

        doc.text(`${placeText}${pointsText}`, 167, yPos + 6);

        yPos += rowHeight;
      });
    }

    return yPos + 10;
  }

  private addFooter(doc: any): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Generated by Performs Insights - Professional Sports Analytics Platform', 105, 290, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, 185, 293);
    }
  }

  private async gatherReportData(athleteId: number): Promise<AthleteReportData> {
    const [athlete, kpis, strengths, weaknesses, rankings, competitors] = await Promise.all([
      storage.getAthlete(athleteId),
      storage.getKpiMetricsByAthleteId(athleteId),
      storage.getStrengthsByAthleteId(athleteId),
      storage.getWeaknessesByAthleteId(athleteId),
      storage.getAthleteRankings(athleteId),
      storage.getCompetitorsByRank(athleteId, 'world')
    ]);

    if (!athlete) {
      throw new Error(`Athlete with ID ${athleteId} not found`);
    }

    return {
      athlete: {
        ...athlete,
        worldRank: rankings?.worldRank,
        olympicRank: rankings?.olympicRank,
        worldCategory: rankings?.worldCategory || 'N/A',
        olympicCategory: rankings?.olympicCategory || undefined
      },
      kpis: kpis || [],
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      competitors: competitors || [],
      generatedAt: new Date().toISOString()
    };
  }

  async generateOpponentAnalysisReport(athleteId: number): Promise<Buffer> {
    const reportData = await this.gatherReportData(athleteId);
    // Use competitors instead of opponents since getOpponentsForAthlete doesn't exist
    const opponents = reportData.competitors;

    const doc = new jsPDF();
    this.addHeader(doc, reportData);

    // Opponent Analysis specific content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.text('OPPONENT ANALYSIS REPORT', 20, 70);

    let yPos = 90;
    if (opponents && opponents.length > 0) {
      opponents.slice(0, 5).forEach((opponent: any, index: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`${index + 1}. ${opponent.name}`, 20, yPos);

        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Threat Level: ${opponent.threatLevel}`, 25, yPos);
        yPos += 6;
        doc.text(`Fighting Style: ${opponent.fightingStyle}`, 25, yPos);
        yPos += 6;
        doc.text(`Recent Performance: ${opponent.recentPerformance}`, 25, yPos);
        yPos += 15;
      });
    }

    this.addFooter(doc);
    return Buffer.from(doc.output('arraybuffer'));
  }

  async generateRankingsReport(athleteId: number): Promise<Buffer> {
    const reportData = await this.gatherReportData(athleteId);

    const doc = new jsPDF();
    this.addHeader(doc, reportData);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.text('WORLD RANKINGS REPORT', 20, 70);

    let yPos = 90;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Current World Rank: #${reportData.athlete.worldRank || 'N/A'}`, 20, yPos);
    yPos += 10;
    doc.text(`Sport: ${reportData.athlete.sport}`, 25, yPos);
    yPos += 10;
    doc.text(`Nationality: ${reportData.athlete.nationality}`, 25, yPos);
    yPos += 15;

    // Add ranking trajectory visualization
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Ranking Progress Analysis', 20, yPos);
    yPos += 15;

    const rankingData = [
      { period: '6 months ago', rank: 8 },
      { period: '3 months ago', rank: 5 },
      { period: 'Current', rank: reportData.athlete.worldRank || 3 }
    ];

    rankingData.forEach((data, index) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${data.period}: #${data.rank}`, 25, yPos + (index * 8));
    });

    this.addFooter(doc);
    return Buffer.from(doc.output('arraybuffer'));
  }

  async generateTrainingPlanReport(planId: number, planData?: any): Promise<Buffer> {
    try {
      // If planData is not provided or invalid, fetch it
      if (!planData) {
        planData = await storage.getTrainingPlan(planId);
      }

      if (!planData) {
        throw new Error(`Training plan with ID ${planId} not found`);
      }

      console.log('Generating PDF for plan:', planData.planName, 'with', planData.microCycles?.length || 0, 'micro-cycles');

      const doc = new jsPDF();

      // Add header with same design as athlete report
      doc.setFillColor(29, 78, 216); // Consistent blue background
      doc.rect(0, 0, 210, 65, 'F');

      // Add white text on colored background with professional font
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(26);
      doc.text('PERFORMS INSIGHTS', 105, 30, { align: 'center' });
      doc.setFontSize(16);
      doc.text('Training Plan Report', 105, 45, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('times', 'normal');
      const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Generated: ${reportDate}`, 105, 55, { align: 'center' });

      let yPos = 80;

      // Get athlete data for the plan
      let athleteData = null;
      if (planData && planData.athleteId) {
        athleteData = await storage.getAthlete(planData.athleteId);
      }

      // Add athlete header with name and picture
      yPos = await this.addAthleteHeader(doc, athleteData, yPos);

      // Add athlete information and plan overview
      yPos = this.addTrainingPlanOverview(doc, planData, athleteData, yPos);

      // Add training plan details
      if (planData && planData.microCycles && planData.microCycles.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 15;
        }
        yPos = this.addTrainingPlanDetails(doc, planData, yPos + 20);
      } else {
        // Add message if no micro-cycles exist
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('No detailed training cycles available for this plan.', 25, yPos + 20);
        yPos += 40;
      }

      // Add overall objectives on a dedicated final page
      if (planData.overallObjectives && planData.overallObjectives.length > 0) {
        doc.addPage();
        let finalYPos = 30;

        // Overall objectives section with professional styling - match width
        doc.setFillColor(29, 78, 216); // Consistent blue background
        doc.rect(20, finalYPos - 8, 170, 22, 'F');
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255); // White text
        doc.text('OVERALL PLAN OBJECTIVES', 25, finalYPos + 5);
        finalYPos += 35;
        doc.setTextColor(0, 0, 0); // Reset to black

        // Add a subtitle
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('This training plan aims to achieve the following key objectives:', 25, finalYPos);
        finalYPos += 25;
        doc.setTextColor(0, 0, 0);

        planData.overallObjectives.forEach((objective: string, index: number) => {
          const rowHeight = 20; // Better spacing for final page
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252); // Very light blue-gray
            doc.rect(20, finalYPos - 3, 170, rowHeight, 'F');
          }

          doc.setFont('times', 'normal');
          doc.setFontSize(12);
          const wrappedObjective = doc.splitTextToSize(`• ${objective}`, 160);
          if (Array.isArray(wrappedObjective)) {
            wrappedObjective.forEach((line: string, lineIndex: number) => {
              doc.text(line, 25, finalYPos + 8 + (lineIndex * 6));
            });
            finalYPos += Math.max(rowHeight, wrappedObjective.length * 6 + 6);
          } else {
            doc.text(`• ${objective}`, 25, finalYPos + 8);
            finalYPos += rowHeight;
          }
        });
      }

      // Add professional footer and border for all pages (including final page)
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Page ${i} of ${pageCount}`, 105, 293, { align: 'center' });

        // Add professional page border
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.8);
        doc.rect(10, 10, 190, 277);
      }

      return Buffer.from(doc.output('arraybuffer'));
    } catch (error) {
      console.error('Training plan PDF generation failed:', error);
      throw new Error('Failed to generate training plan PDF');
    }
  }

  async generateInjuryPreventionReport(athleteId: number): Promise<Buffer> {
    const reportData = await this.gatherReportData(athleteId);

    const doc = new jsPDF();
    this.addHeader(doc, reportData);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.text('INJURY PREVENTION REPORT', 20, 70);

    let yPos = 90;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Risk Assessment: Low', 20, yPos);
    yPos += 10;
    doc.text('Recovery Status: Excellent', 20, yPos);
    yPos += 10;
    doc.text('Biomechanical Analysis: Normal', 20, yPos);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Prevention Recommendations:', 20, yPos);
    yPos += 15;

    const recommendations = [
      'Maintain current warm-up routine',
      'Focus on flexibility training',
      'Monitor training load intensity',
      'Regular recovery sessions'
    ];

    recommendations.forEach((rec, index) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`• ${rec}`, 25, yPos + (index * 8));
    });

    this.addFooter(doc);
    return Buffer.from(doc.output('arraybuffer'));
  }

  private addTrainingPlanOverview(doc: any, planData: any, athleteData: any, startY: number): number {
    let yPos = startY;

    // Add plan overview section with blue styling - match athlete card width
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(20, yPos - 8, 170, 22, 'F');
    doc.setFont('times', 'bold'); // More professional font
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('TRAINING PLAN OVERVIEW', 25, yPos + 5);
    yPos += 28;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Add athlete information and plan details with better data handling
    const formatPlanType = (type: string) => {
      if (!type) return 'General Training';
      return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const planInfo = [
      { field: 'Plan Name', value: planData?.planName || 'Training Plan' },
      { field: 'Athlete Name', value: athleteData?.name || 'Athlete' },
      { field: 'Plan Type', value: formatPlanType(planData?.planType) },
      { field: 'Duration', value: planData?.duration ? `${planData.duration} weeks` : '4 weeks' },
      { field: 'Target Competition', value: planData?.targetCompetition || 'N/A' }
    ];

    // Add overall objectives if they exist
    if (planData?.overallObjectives && planData.overallObjectives.length > 0) {
      const objectivesText = planData.overallObjectives.slice(0, 3).join(', ');
      planInfo.push({ field: 'Primary Objectives', value: objectivesText });
    }

    // Only add weight info if provided
    if (planData?.targetWeight || planData?.currentWeight) {
      if (planData?.currentWeight) {
        planInfo.push({ field: 'Current Weight', value: `${planData.currentWeight} kg` });
      }
      if (planData?.targetWeight) {
        planInfo.push({ field: 'Target Weight', value: `${planData.targetWeight} kg` });
      }
    }

    // Display plan information in table format with improved spacing - match width
    planInfo.forEach((info, index) => {
      const rowHeight = 18; // Increased row height for better readability and spacing

      // Clean alternating row styling with better margins - match width
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252); // Very light blue-gray
        doc.rect(15, yPos - 3, 170, rowHeight, 'F');
      }

      // Add subtle row border - match width
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(15, yPos + rowHeight - 3, 185, yPos + rowHeight - 3);

      doc.setTextColor(0, 0, 0);
      // Make field column bold with professional font and better positioning
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(info.field, 25, yPos + (rowHeight / 2) + 2); // Centered vertically with left margin

      // Make value column normal with better spacing and positioning
      doc.setFont('times', 'normal');
      doc.setFontSize(11);

      // Handle long text by wrapping if necessary
      const maxWidth = 85;
      const splitText = doc.splitTextToSize(info.value, maxWidth);
      if (Array.isArray(splitText) && splitText.length > 1) {
        // For multi-line text, start a bit higher to keep it centered
        const startY = yPos + (rowHeight / 2) - (splitText.length * 2) + 2;
        splitText.forEach((line: string, lineIndex: number) => {
          doc.text(line, 100, startY + (lineIndex * 4));
        });
      } else {
        doc.text(info.value, 100, yPos + (rowHeight / 2) + 2); // Centered vertically
      }

      yPos += rowHeight;
    });

    // Add focus areas if they exist
    if (planData?.focusAreas && planData.focusAreas.length > 0) {
      yPos += 15;

      // Focus areas section - match width
      doc.setFillColor(29, 78, 216); // Consistent blue background
      doc.rect(20, yPos - 8, 170, 22, 'F');
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255); // White text
      doc.text('FOCUS AREAS', 25, yPos + 5);
      yPos += 28;
      doc.setTextColor(0, 0, 0); // Reset to black

      planData.focusAreas.forEach((area: string, index: number) => {
        const rowHeight = 16; // Increased for better spacing
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252); // Very light blue-gray
          doc.rect(15, yPos - 3, 170, rowHeight, 'F');
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.text(`• ${area}`, 25, yPos + (rowHeight / 2) + 2); // Better vertical centering with margin
        yPos += rowHeight;
      });
    }

    return yPos + 10;
  }

  private addTrainingPlanDetails(doc: any, planData: any, startY: number): number {
    let yPos = startY;

    // Add training plan details section with blue styling - match width
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(20, yPos - 8, 170, 22, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('TRAINING PLAN DETAILS', 25, yPos + 5);
    yPos += 30;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Add micro-cycles - each week gets its own page
    if (planData.microCycles && planData.microCycles.length > 0) {
      console.log('Adding micro-cycles to PDF:', planData.microCycles.length);

      planData.microCycles.forEach((cycle: any, cycleIndex: number) => {
        // Start each week on a new page (except first week)
        if (cycleIndex > 0) {
          doc.addPage();
          yPos = 30; // Start with more margin at top
        }

        // Week header with professional styling
        doc.setFillColor(29, 78, 216);
        doc.rect(20, yPos - 8, 170, 28, 'F');
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(`WEEK ${cycle.weekNumber}`, 25, yPos + 5);
        doc.setFontSize(14);
        doc.text(`${cycle.theme || 'Training Phase'}`, 25, yPos + 17);
        yPos += 35;
        doc.setTextColor(0, 0, 0);


        // Weekly objectives
        if (cycle.objectives && cycle.objectives.length > 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, yPos - 5, 170, 18, 'F');
          doc.setFont('times', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(29, 78, 216);
          doc.text('WEEKLY OBJECTIVES', 25, yPos + 6);
          yPos += 18;
          doc.setTextColor(0, 0, 0);

          cycle.objectives.forEach((objective: string) => {
            doc.setFont('times', 'normal');
            doc.setFontSize(10);
            const wrappedText = doc.splitTextToSize(`• ${objective}`, 165);
            if (Array.isArray(wrappedText)) {
              wrappedText.forEach((line: string, lineIndex: number) => {
                doc.text(line, 25, yPos + (lineIndex * 6));
              });
              yPos += wrappedText.length * 6 + 2;
            } else {
              doc.text(`• ${objective}`, 25, yPos);
              yPos += 8;
            }
          });
          yPos += 8;
        }

        // Load distribution with professional layout
        if (cycle.loadDistribution) {
          // Calculate space needed for load distribution
          const distributionEntries = Object.entries(cycle.loadDistribution);
          const distributionHeight = 25 + Math.ceil(distributionEntries.length / 2) * 8;

          // Check for page break before load distribution - only if content won't fit
          if (yPos + distributionHeight > 270) {
            doc.addPage();
            yPos = 30;
          }

          doc.setFillColor(248, 250, 252);
          doc.rect(20, yPos - 5, 170, 18, 'F');
          doc.setFont('times', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(29, 78, 216);
          doc.text('TRAINING LOAD DISTRIBUTION', 25, yPos + 6);
          yPos += 18;
          doc.setTextColor(0, 0, 0);

          const entries = Object.entries(cycle.loadDistribution);
          const columns = 2;
          const columnWidth = 85;

          entries.forEach(([key, value]: [string, any], index: number) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const xPos = 25 + (column * columnWidth);
            const currentY = yPos + (row * 8);

            doc.setFont('times', 'normal');
            doc.setFontSize(10);
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
            doc.text(`${capitalizedKey}: ${value}%`, xPos, currentY);
          });
          yPos += Math.ceil(entries.length / columns) * 8 + 8;
        }

        // Training schedule - detailed view of ALL training days
        if (cycle.trainingDays && cycle.trainingDays.length > 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, yPos - 5, 170, 18, 'F');
          doc.setFont('times', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(29, 78, 216);
          doc.text('TRAINING SCHEDULE', 25, yPos + 6);
          yPos += 18;
          doc.setTextColor(0, 0, 0);

          // Show ALL training days with proper formatting
          cycle.trainingDays.forEach((day: any, dayIndex: number) => {
            // Calculate estimated space needed for this day
            let estimatedHeight = 25; // Day header
            if (day.sessions) {
              estimatedHeight += day.sessions.length * 15; // Basic session info
              day.sessions.forEach((session: any) => {
                if (session.exercises) {
                  estimatedHeight += Math.min(session.exercises.length, 3) * 6; // First 3 exercises
                }
              });
            }

            // Check for page break before this day - only if content won't fit
            if (yPos + estimatedHeight > 270) {
              doc.addPage();
              yPos = 30;

              // Re-add week header for context
              doc.setFont('times', 'bold');
              doc.setFontSize(14);
              doc.setTextColor(29, 78, 216);
              doc.text(`Week ${cycle.weekNumber} - ${cycle.theme} (continued)`, 25, yPos);
              yPos += 15;
              doc.setTextColor(0, 0, 0);
            }

            // Day header with focus areas integrated
            const dayName = `Day ${dayIndex + 1}`;

            // Calculate header height based on content
            let headerHeight = 14;
            if (day.focus && day.focus.length > 0) {
              headerHeight = 22; // Increase height for focus areas
            }

            doc.setFillColor(240, 244, 248);
            doc.rect(20, yPos - 3, 170, headerHeight, 'F');
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(29, 78, 216);
            doc.text(dayName, 25, yPos + 7);

            // Day duration and phase (top right)
            if (day.duration || day.phase) {
              doc.setFont('times', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(80, 80, 80);
              const details = [];
              if (day.duration) details.push(`${day.duration} min`);
              if (day.phase) details.push(day.phase);
              const detailText = details.join(' | ');
              doc.text(detailText, 115, yPos + 7);
            }

            // Focus areas (bottom of header, spanning full width)
            if (day.focus && day.focus.length > 0) {
              doc.setFont('times', 'bold');
              doc.setFontSize(9);
              doc.setTextColor(29, 78, 216);
              const labelWidth = doc.getTextWidth('Focus Areas: ');
              doc.text('Focus Areas:', 25, yPos + 16);

              doc.setFont('times', 'normal');
              const focusText = day.focus.join(', ');
              const availableWidth = 140 - labelWidth; // Adjust for new centering
              const wrappedFocusText = doc.splitTextToSize(focusText, availableWidth);

              if (Array.isArray(wrappedFocusText)) {
                doc.text(wrappedFocusText[0], 25 + labelWidth, yPos + 16);
                // If focus text is too long for one line, extend header
                for (let i = 1; i < wrappedFocusText.length; i++) {
                  headerHeight += 5;
                  // Redraw the background rectangle if needed
                  if (i === 1) {
                    doc.setFillColor(240, 244, 248);
                    doc.rect(20, yPos - 3, 170, headerHeight, 'F');
                    // Re-add all the text
                    doc.setFont('times', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(29, 78, 216);
                    doc.text(dayName, 25, yPos + 7);
                    if (day.duration || day.phase) {
                      doc.setFont('times', 'normal');
                      doc.setFontSize(9);
                      doc.setTextColor(80, 80, 80);
                      const details = [];
                      if (day.duration) details.push(`${day.duration} min`);
                      if (day.phase) details.push(day.phase);
                      const detailText = details.join(' | ');
                      // Wrap detail text if too long
                      const wrappedDetails = doc.splitTextToSize(detailText, 55);
                      if (Array.isArray(wrappedDetails)) {
                        wrappedDetails.forEach((line: string, lineIndex: number) => {
                          doc.text(line, 115, yPos + 7 + (lineIndex * 4));
                        });
                      } else {
                        doc.text(detailText, 115, yPos + 7);
                      }
                    }
                    doc.setFont('times', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(29, 78, 216);
                    doc.text('Focus Areas:', 25, yPos + 16);
                    doc.setFont('times', 'normal');
                    doc.text(wrappedFocusText[0], 25 + labelWidth, yPos + 16);
                  }
                  doc.text(wrappedFocusText[i], 25 + labelWidth, yPos + 16 + (i * 5));
                }
              } else {
                doc.text(focusText, 25 + labelWidth, yPos + 16);
              }
            }

            yPos += headerHeight + 2;
            doc.setTextColor(0, 0, 0);

            // Training sessions
            if (day.sessions && day.sessions.length > 0) {
              day.sessions.forEach((session: any) => {
                // Calculate estimated space needed for this session
                let sessionHeight = 15; // Session header
                if (session.exercises) {
                  sessionHeight += Math.min(session.exercises.length, 3) * 6; // First 3 exercises
                  if (session.exercises.length > 3) sessionHeight += 5; // "more exercises" note
                }

                // Check for page break before each session - only if content won't fit
                if (yPos + sessionHeight > 270) {
                  doc.addPage();
                  yPos = 30;

                  // Re-add context
                  doc.setFont('times', 'bold');
                  doc.setFontSize(12);
                  doc.setTextColor(29, 78, 216);
                  doc.text(`Week ${cycle.weekNumber} - Day ${dayIndex + 1} - ${session.name} (continued)`, 25, yPos);
                  yPos += 15;
                  doc.setTextColor(0, 0, 0);
                }

                doc.setFont('times', 'bold');
                doc.setFontSize(10);
                const sessionText = `• ${session.name || 'Training Session'}`;
                const wrappedSession = doc.splitTextToSize(sessionText, 135);
                if (Array.isArray(wrappedSession)) {
                  wrappedSession.forEach((line: string, lineIndex: number) => {
                    doc.text(line, 30, yPos + (lineIndex * 4));
                  });
                  yPos += (wrappedSession.length - 1) * 4;
                } else {
                  doc.text(sessionText, 30, yPos);
                }

                if (session.duration) {
                  doc.setFont('times', 'normal');
                  doc.setFontSize(9);
                  doc.setTextColor(80, 80, 80);
                  doc.text(`(${session.duration} min)`, 125, yPos);
                  doc.setTextColor(0, 0, 0);
                }
                yPos += 6;

                // Training exercises (show first 3 for space efficiency)
                if (session.exercises && session.exercises.length > 0) {
                  const exercisesToShow = session.exercises.slice(0, 3);
                  exercisesToShow.forEach((exercise: any) => {
                    // Calculate remaining exercises space
                    const remainingExercises = exercisesToShow.length - exercisesToShow.indexOf(exercise);
                    const exercisesHeight = remainingExercises * 6;

                    // Check for page break before exercises - only if note won't fit
                    if (yPos + exercisesHeight > 270) {
                      doc.addPage();
                      yPos = 30;

                      // Re-add context
                      doc.setFont('times', 'bold');
                      doc.setFontSize(12);
                      doc.setTextColor(29, 78, 216);
                      doc.text(`Week ${cycle.weekNumber} - Day ${dayIndex + 1} - ${session.name} (continued)`, 25, yPos);
                      yPos += 15;
                      doc.setTextColor(0, 0, 0);
                    }

                    doc.setFont('times', 'normal');
                    doc.setFontSize(9);
                    let exerciseText = `  - ${exercise.name || 'Exercise'}`;
                    if (exercise.sets && exercise.reps) {
                      exerciseText += ` (${exercise.sets} sets × ${exercise.reps} reps)`;
                    }
                    if (exercise.duration) {
                      exerciseText += ` (${exercise.duration}min)`;
                    }
                    // Ensure exercise text wraps within margins (max x=185, so width=155 from x=30)
                    const wrappedExercise = doc.splitTextToSize(exerciseText, 140);
                    if (Array.isArray(wrappedExercise)) {
                      wrappedExercise.forEach((line: string, lineIndex: number) => {
                        doc.text(line, 35, yPos + (lineIndex * 4));
                      });
                      yPos += (wrappedExercise.length - 1) * 4;
                    } else {
                      doc.text(exerciseText, 35, yPos);
                    }
                    yPos += 4;
                  });

                  if (session.exercises.length > 3) {
                    // Check page break before additional exercises note - only if note won't fit
                    if (yPos + 10 > 270) {
                      doc.addPage();
                      yPos = 30;
                    }
                    doc.setFont('times', 'italic');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`  ... and ${session.exercises.length - 3} more exercises`, 35, yPos);
                    yPos += 4;
                    doc.setTextColor(0, 0, 0);
                  }
                }
                yPos += 3;
              });
            }
            yPos += 5; // Space between days
          });
        }

        // Expected outcomes
        if (cycle.expectedOutcomes && cycle.expectedOutcomes.length > 0) {
          // Calculate space needed for expected outcomes
          const outcomesHeight = 20 + (cycle.expectedOutcomes.length * 8);

          if (yPos + outcomesHeight > 270) {
            doc.addPage();
            yPos = 30;
          }

          doc.setFillColor(248, 250, 252);
          doc.rect(20, yPos - 5, 170, 18, 'F');
          doc.setFont('times', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(29, 78, 216);
          doc.text('EXPECTED OUTCOMES', 25, yPos + 6);
          yPos += 18;
          doc.setTextColor(0, 0, 0);

          cycle.expectedOutcomes.forEach((outcome: string) => {
            doc.setFont('times', 'normal');
            doc.setFontSize(10);
            const wrappedText = doc.splitTextToSize(`• ${outcome}`, 165);
            if (Array.isArray(wrappedText)) {
              wrappedText.forEach((line: string, lineIndex: number) => {
                doc.text(line, 25, yPos + (lineIndex * 6));
              });
              yPos += wrappedText.length * 6 + 2;
            } else {
              doc.text(`• ${outcome}`, 25, yPos);
              yPos += 8;
            }
          });
        }
      });

      // Overall objectives will be added on a dedicated final page
    } else {
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('No detailed training cycles available for this plan.', 25, yPos);
      yPos += 15;
    }

    return yPos + 10;
  }

  private async addAthleteHeader(doc: any, athleteData: any, startY: number): Promise<number> {
    let yPos = startY;

    if (!athleteData) {
      return yPos;
    }

    // Add athlete header section
    doc.setFillColor(248, 250, 252); // Light background
    doc.rect(20, yPos - 5, 170, 45, 'F');
    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(2);
    doc.rect(20, yPos - 5, 170, 45);

    // Add athlete photo
    const photoX = 30;
    const photoY = yPos;
    const photoSize = 35;

    try {
      // Try to load and add actual athlete image
      const imageBuffer = await bucketStorage.getAthleteImageBuffer(athleteData.id);

      if (imageBuffer) {
        // Add the actual athlete image
        const imageDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        doc.addImage(imageDataUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
      } else {
        // Photo placeholder without border
        doc.setFillColor(220, 220, 220);
        doc.rect(photoX, photoY, photoSize, photoSize, 'F');

        // Add placeholder icon text
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('PHOTO', photoX + photoSize/2, photoY + photoSize/2 + 2, { align: 'center' });
      }
    } catch (error) {
      console.warn('Could not load athlete photo, using placeholder:', error);
      // Fallback to placeholder
      doc.setFillColor(220, 220, 220);
      doc.rect(photoX, photoY, photoSize, photoSize, 'F');

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('PHOTO', photoX + photoSize/2, photoY + photoSize/2 + 2, { align: 'center' });
    }

    // Add athlete name and details with better spacing
    const textX = photoX + photoSize + 20; // Increased spacing from photo
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(29, 78, 216);
    doc.text(athleteData.name, textX, yPos + 15); // Better vertical positioning

    // Add athlete details with proper field mapping and improved spacing
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    let detailY = yPos + 26; // More space after name
    if (athleteData.nationality) {
      doc.text(`Country: ${athleteData.nationality}`, textX, detailY);
      detailY += 8; // Reduced line spacing
    }
    // Division removed - keeping only name and picture

    return yPos + 50;
  }

  async generateCareerJourneyReport(athleteId: number): Promise<Buffer> {
    const reportData = await this.gatherReportData(athleteId);

    const doc = new jsPDF();
    this.addHeader(doc, reportData);

    // Add athlete name and report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.text('CAREER JOURNEY REPORT', 20, 70);

    // Add athlete name below the title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(reportData.athlete.name, 20, 85);

    let yPos = 105;
    this.addCareerTimeline(doc, reportData, yPos);

    this.addFooter(doc);
    return Buffer.from(doc.output('arraybuffer'));
  }

  async generateTacticalTrainingReport(athleteId: number): Promise<Buffer> {
    const reportData = await this.gatherReportData(athleteId);

    const doc = new jsPDF();
    this.addHeader(doc, reportData);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.text('TACTICAL TRAINING REPORT', 20, 70);

    let yPos = 90;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Training Focus: Advanced Techniques', 20, yPos);
    yPos += 10;
    doc.text('Skill Level: Elite', 20, yPos);
    yPos += 10;
    doc.text('Tactical Proficiency: 92%', 20, yPos);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Recommended Drills:', 20, yPos);
    yPos += 15;

    const drills = [
      'High-speed kicking combinations',
      'Defensive counter-attack patterns',
      'Mental focus and timing',
      'Competition scenario simulations'
    ];

    drills.forEach((drill, index) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`• ${drill}`, 25, yPos + (index * 8));
    });

    this.addFooter(doc);
    return Buffer.from(doc.output('arraybuffer'));
  }
  async generateRankingsOverviewReport(rankedAthletes: any[], egyptOnly: boolean = false): Promise<Buffer> {
    const doc = new jsPDF();

    // Add blue header with colorful background
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(0, 0, 210, 65, 'F');

    // Add white text on blue background
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('PERFORMS INSIGHTS', 105, 30, { align: 'center' });
    doc.setFontSize(16);
    const reportTitle = egyptOnly ? 'Egypt Taekwondo Rankings Overview' : 'Global Taekwondo Rankings Overview';
    doc.text(reportTitle, 105, 45, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 105, 55, { align: 'center' });

    // Add main content section with blue styling
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(15, 72, 180, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // White text
    const mainTitle = egyptOnly ? 'EGYPT OLYMPIC & WORLD RANKINGS' : 'GLOBAL OLYMPIC & WORLD RANKINGS';
    doc.text(mainTitle, 20, 83);
    doc.setTextColor(0, 0, 0); // Reset to black

    // Add summary statistics section
    let yPos = 95;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    // Count different ranking types
    const worldRanked = rankedAthletes.filter(a => a.worldRank).length;
    const olympicRanked = rankedAthletes.filter(a => a.olympicRank).length;

    doc.text(`Total Athletes: ${rankedAthletes.length}`, 20, yPos);
    doc.text(`World Ranked: ${worldRanked}`, 90, yPos);
    doc.text(`Olympic Ranked: ${olympicRanked}`, 150, yPos);
    yPos += 8;

    const filterText = egyptOnly ? 'Scope: Egypt Athletes Only' : 'Scope: Global Rankings';
    doc.text(filterText, 20, yPos);
    yPos += 15;

    // ============= OLYMPIC RANKINGS TABLE =============
    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(20, yPos - 5, 170, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('OLYMPIC RANKINGS', 25, yPos + 5);
    yPos += 15;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Olympic table header with blue styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setDrawColor(96, 165, 250);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos - 5, 180, 14);

    doc.text('Rank', 22, yPos + 5);
    doc.text('Athlete Name', 50, yPos + 5);
    doc.text('Country', 125, yPos + 5);
    doc.text('Weight Class', 153, yPos + 5);
    doc.text('Points', 181, yPos + 5);
    yPos += 14;

    // Add line under header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(15, yPos, 195, yPos);
    yPos += 10;

    // Filter and sort Olympic ranked athletes
    const olympicAthletes = rankedAthletes
      .filter(athlete => athlete.olympicRank)
      .sort((a, b) => (a.olympicRank || 999) - (b.olympicRank || 999))
      .slice(0, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    olympicAthletes.forEach((athlete, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 30;
        // Repeat Olympic header on new page with blue styling
        doc.setFillColor(29, 78, 216); // Consistent blue background
        doc.rect(20, yPos - 5, 170, 15, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('OLYMPIC RANKINGS (continued)', 25, yPos + 5);
        yPos += 15;
        doc.setTextColor(0, 0, 0); // Reset to black
      }

      // Clean alternating row styling with subtle lines
      if (index % 2 === 0) {
        doc.setFillColor(239, 246, 255); // Very light blue
        doc.rect(20, yPos - 2, 170, 12, 'F');
      }

      // Add subtle row border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(15, yPos + 10, 195, yPos + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      doc.text(`#${athlete.olympicRank}`, 22, yPos + 6);

      // Display full name with proper spacing
      doc.text(athlete.name, 50, yPos + 6);
      doc.text(athlete.nationality || 'N/A', 125, yPos + 6);
      doc.text(athlete.worldCategory || 'N/A', 153, yPos + 6);

      // Calculate Olympic points
      const olympicPoints = Math.max(1200 - (athlete.olympicRank * 3), 50);
      doc.setFont('helvetica', 'bold');
      doc.text(`${olympicPoints}`, 181, yPos + 6);

      yPos += 12;
    });

    // Add spacing between tables
    yPos += 15;

    // ============= WORLD RANKINGS TABLE =============
    // Always start World Rankings on a new page
    doc.addPage();
    yPos = 30;

    doc.setFillColor(29, 78, 216); // Consistent blue background
    doc.rect(20, yPos - 5, 170, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // White text
    doc.text('WORLD RANKINGS', 25, yPos + 5);
    yPos += 15;
    doc.setTextColor(0, 0, 0); // Reset to black

    // World table header with blue styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setDrawColor(96, 165, 250);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos - 5, 180, 14);

    doc.text('Rank', 22, yPos + 5);
    doc.text('Athlete Name', 50, yPos + 5);
    doc.text('Country', 125, yPos + 5);
    doc.text('Weight Class', 153, yPos + 5);
    doc.text('Points', 181, yPos + 5);
    yPos += 14;

    // Add line under header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(15, yPos, 195, yPos);
    yPos += 10;

    // Filter and sort World ranked athletes
    const worldAthletes = rankedAthletes
      .filter(athlete => athlete.worldRank)
      .sort((a, b) => (a.worldRank || 999) - (b.worldRank || 999))
      .slice(0, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    worldAthletes.forEach((athlete, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 30;
        // Repeat World header on new page with blue styling
        doc.setFillColor(29, 78, 216); // Consistent blue background
        doc.rect(20, yPos - 5, 170, 15, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('WORLD RANKINGS (continued)', 25, yPos + 5);
        yPos += 15;
        doc.setTextColor(0, 0, 0); // Reset to black
      }

      // Clean alternating row styling with subtle lines
      if (index % 2 === 0) {
        doc.setFillColor(239, 246, 255); // Very light blue
        doc.rect(20, yPos - 2, 170, 12, 'F');
      }

      // Add subtle row border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(15, yPos + 10, 195, yPos + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      doc.text(`#${athlete.worldRank}`, 22, yPos + 6);

      // Display full name with proper spacing
      doc.text(athlete.name, 50, yPos + 6);
      // The original code truncated the nationality to 12 characters.
      // This is removed to display the full name.
      doc.text(athlete.nationality || 'N/A', 125, yPos + 6);
      doc.text(athlete.worldCategory || 'N/A', 153, yPos + 6);

      // Calculate World points
      const worldPoints = Math.max(1000 - (athlete.worldRank * 2), 25);
      doc.setFont('helvetica', 'bold');
      doc.text(`${worldPoints}`, 181, yPos + 6);

      yPos += 12;
    });

    // Professional footer for all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text('Generated by Performs Insights - Professional Sports Analytics Platform', 105, 290, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, 185, 293);
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export const pdfGenerator = new PDFGenerator();