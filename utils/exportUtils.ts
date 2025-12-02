
import { Job, ResumeData } from '../types';
import { convertResumeDataToMarkdown } from './resumeMarkdown'; // Import helper

export const downloadCSV = (data: Job[]) => {
  const headers = [
    "ID", "Job Title", "Company", "Status", "Date Added", 
    "Source", "Deadline", "City", "Country", "Relocation", 
    "Availability", "Match Score", "Comments", "Application URL"
  ];
  
  const csvRows = [
    headers.join(","),
    ...data.map(job => [
      job.id,
      `"${job.title.replace(/"/g, '""')}"`,
      `"${job.company.replace(/"/g, '""')}"`,
      job.status,
      new Date(job.dateAdded).toLocaleDateString(),
      `"${(job.source || '').replace(/"/g, '""')}"`,
      job.applicationDeadline || '',
      `"${(job.city || '').replace(/"/g, '""')}"`,
      `"${(job.country || '').replace(/"/g, '""')}"`,
      job.relocation ? 'Yes' : 'No',
      `"${(job.availability || '').replace(/"/g, '""')}"`,
      job.matchScore ? `${job.matchScore}%` : '',
      `"${(job.comments || '').replace(/"/g, '""')}"`,
      job.url || ''
    ].join(","))
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `JobFlow_Tracker_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

export const handlePrintPDF = (content: string | ResumeData, title: string) => {
  let finalContentMarkdown: string;
  if (typeof content === 'string') {
    finalContentMarkdown = content;
  } else {
    finalContentMarkdown = convertResumeDataToMarkdown(content);
  }

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    // Process markdown within a part (for the two-column layout)
    const processMarkdownPart = (part: string) => {
      return part.trim()
                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                 .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    // 1. Handle the custom two-column layout first
    let htmlContent = finalContentMarkdown.replace(/^(?!#|\*|-|\s)(.*)\s*\|\s*(.*)$/gm, (match, left, right) => {
      const processedLeft = processMarkdownPart(left);
      const processedRight = processMarkdownPart(right);
      return `<div class="line-item"><span class="left">${processedLeft}</span><span class="right">${processedRight}</span></div>`;
    });

    // 2. Process standard markdown for the rest
    htmlContent = htmlContent
      .replace(/^# (.*$)/gim, '<h1 class="main-title">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="section-header">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n/gim, '<br />');

    // 3. Cleanup pass for generated HTML
    htmlContent = htmlContent
      .replace(/<\/div><br \/>/g, '</div>') // Remove breaks after our custom divs
      .replace(/<\/h2><br \/>/g, '</h2>') // Remove breaks after headers
      .replace(/<\/ul><br \/>/g, '</ul>'); // Remove breaks after lists

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
            
            @page { 
              margin: 0.7in; 
              size: letter;
            }
            
            body { 
              font-family: 'Roboto', sans-serif; 
              color: #1f2937; 
              line-height: 1.4; 
              font-size: 10.5pt;
              max-width: 8.5in;
              margin: 0 auto;
              background: white;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; }
            }

            br { display: none; }

            .main-title {
              font-size: 24pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #111827;
              margin-bottom: 8px;
              margin-top: 0;
              text-align: center;
            }

            .section-header {
              font-size: 11pt;
              font-weight: 700;
              text-transform: uppercase;
              color: #111827;
              text-align: center;
              margin-top: 16px;
              margin-bottom: 8px;
              border-bottom: 1.5px solid #111827;
              padding-bottom: 4px;
            }

            h3 {
              font-size: 10.5pt;
              font-weight: 700;
              color: #000;
              margin: 0;
            }
            
            p, .line-item {
               margin: 0;
               padding: 0;
            }

            .line-item {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              width: 100%;
              margin-bottom: 2px;
            }
            .line-item .left { text-align: left; padding-right: 1.5em; }
            .line-item .right { text-align: right; white-space: nowrap; }
            
            ul { 
              padding-left: 18px; 
              margin-top: 4px;
              margin-bottom: 8px;
            }
            
            li { 
              margin-bottom: 4px;
              padding-left: 2px;
            }
            
            strong { font-weight: 700; color: #000; }
            
            a { color: #2563eb; text-decoration: none; }
            
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print(); 
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};

export const downloadDocx = (content: string, title: string) => {
  // This is a simplified DOCX export. Browsers can't generate true .docx files.
  // This method creates an HTML file with a .doc extension.
  // It will open in Word but might not retain complex formatting.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 1in; }
          h1 { font-size: 24pt; text-align: center; margin-bottom: 12pt; }
          h2 { font-size: 14pt; text-align: center; border-bottom: 1px solid black; padding-bottom: 4pt; margin-top: 20pt; margin-bottom: 10pt; }
          p { margin-bottom: 6pt; }
          ul { margin-left: 20pt; margin-bottom: 6pt; }
          li { margin-bottom: 3pt; }
          strong { font-weight: bold; }
          em { font-style: italic; }
          .line-item { display: flex; justify-content: space-between; margin-bottom: 2pt; }
          .line-item .left { text-align: left; }
          .line-item .right { text-align: right; white-space: nowrap; }
          a { color: #0000FF; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div style="max-width: 6.5in; margin: 0 auto;">
          ${content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/^(?!#|\*|-|\s)(.*)\s*\|\s*(.*)$/gm, '<div class="line-item"><span class="left">$1</span><span class="right">$2</span></div>')
            .replace(/\n/gim, '<br />')
          }
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title}.doc`; // Use .doc extension
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // FIX: Revoked the object URL created for link.href
  URL.revokeObjectURL(link.href);
};
