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
    const processMarkdownPart = (part: string) => {
      return part.trim()
                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                 .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    let htmlContent = finalContentMarkdown
      // Experience / Education special format
      .replace(/^\*\*(.*)\*\* \| (.*)$/gm, (match, left, right) => `<div class="line-item"><strong>${processMarkdownPart(left)}</strong><span>${processMarkdownPart(right)}</span></div>`)
      .replace(/^\*(.*)\* \| \*(.*)\*$/gm, (match, left, right) => `<div class="line-item"><em>${processMarkdownPart(left)}</em><em>${processMarkdownPart(right)}</em></div>`)
      // General Markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n/g, '<br />')
      .replace(/<br \/>\s*<br \/>/g, '<br class="section-break" />');
      
    // Handle Contact Info line with icons
    htmlContent = htmlContent.replace(/ICON_(\w+)\s*([^|]+)(?:\s*\|\s*)?/g, (match, iconName, text) => {
        const icons: { [key: string]: string } = {
          MAIL: `<svg class="icon" ... path for mail ...></svg>`, // Placeholder for SVG paths
          PHONE: `<svg class="icon" ... path for phone ...></svg>`,
          LINKEDIN: `<svg class="icon" ... path for linkedin ...></svg>`,
          GITHUB: `<svg class="icon" ... path for github ...></svg>`,
          GLOBE: `<svg class="icon" ... path for globe ...></svg>`,
          MAP_PIN: `<svg class="icon" ... path for map pin ...></svg>`,
        };
        // This simple replacement is for preview. The print CSS will handle icons.
        return `<span class="contact-item">${text.trim()}</span>`;
    });


    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Slab:wght@400;700&display=swap');
            
            @page { 
              margin: 0.75in; 
              size: letter;
            }
            
            body { 
              font-family: 'Roboto', 'Times New Roman', serif; 
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

            br { display: block; content: ""; margin: 0; }
            br.section-break { margin-bottom: 8px; }

            h1 {
              font-family: 'Roboto Slab', serif;
              font-size: 24pt;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #111827;
              margin-bottom: 8px;
              margin-top: 0;
              text-align: center;
            }

            h2 {
              font-family: 'Roboto Slab', serif;
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
            
            .contact-info {
              display: flex;
              justify-content: center;
              align-items: center;
              flex-wrap: wrap;
              gap: 0 1.5em;
              text-align: center;
              font-size: 9.5pt;
              color: #374151;
              margin-bottom: 16px;
            }
            .contact-item { display: flex; align-items: center; gap: 0.3em; }
            .contact-item .icon { width: 12px; height: 12px; fill: currentColor; }

            .line-item {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              width: 100%;
              margin-bottom: 2px;
            }
            .line-item strong, .line-item em { font-size: 10.5pt; }
            
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
  const htmlContent = `...`; // Similar HTML structure as PDF
  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
