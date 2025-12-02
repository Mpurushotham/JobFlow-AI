

import React from 'react';
import { ResumeData, ExperienceItem, EducationItem, SkillItem, ProjectItem, CertificationItem, AwardItem, ContactInfo, ResumeSection } from '../types';
// FIX: Imported FileText and other icons from lucide-react, which were missing.
import { Briefcase, BookOpen, Lightbulb, Terminal, Award, Link as LinkIcon, Mail, Phone, MapPin, Github, Globe, FileText } from 'lucide-react';


// FIX: Replaced JSX syntax with React.createElement to be compatible with a .ts file.
// This resolves errors related to type checking and syntax parsing in TypeScript files that don't support TSX.
const SectionIcon: React.FC<{ type: ResumeSection['type'], size?: number | string, className?: string }> = ({ type, size, className }) => {
  switch (type) {
    case 'experience': return React.createElement(Briefcase, { size, className });
    case 'education': return React.createElement(BookOpen, { size, className });
    case 'skills': return React.createElement(Lightbulb, { size, className });
    case 'projects': return React.createElement(Terminal, { size, className });
    case 'certifications': return React.createElement(Award, { size, className });
    case 'awards': return React.createElement(Award, { size, className });
    default: return null;
  }
};


// Utility to convert ResumeData object to Markdown string
export const convertResumeDataToMarkdown = (resumeData: ResumeData): string => {
  if (!resumeData || !resumeData.contact) return "";

  const contactInfoArray = [];
  if (resumeData.contact.email) contactInfoArray.push(resumeData.contact.email);
  if (resumeData.contact.phone) contactInfoArray.push(resumeData.contact.phone);
  if (resumeData.contact.linkedin) contactInfoArray.push(`[LinkedIn](${resumeData.contact.linkedin})`);
  if (resumeData.contact.github) contactInfoArray.push(`[GitHub](${resumeData.contact.github})`);
  if (resumeData.contact.website) contactInfoArray.push(`[Portfolio](${resumeData.contact.website})`);
  if (resumeData.contact.location) contactInfoArray.push(resumeData.contact.location);

  let markdown = `# ${resumeData.contact.name || 'Candidate Name'}\n`;
  if (contactInfoArray.length > 0) {
      markdown += `${contactInfoArray.join(' | ')}\n\n`;
  }

  if (resumeData.summary) {
      markdown += `## SUMMARY\n${resumeData.summary}\n\n`;
  }

  resumeData.sections.sort((a, b) => a.order - b.order).forEach(section => {
      markdown += `## ${section.title}\n`;
      if (section.type === 'text' && typeof section.content === 'string') {
          markdown += `${section.content}\n\n`;
      } else if (section.type === 'experience' && Array.isArray(section.content)) {
          (section.content as ExperienceItem[]).forEach(item => {
              markdown += `**${item.company}** | ${item.location}\n`;
              markdown += `*${item.title}* | ${item.dates}\n`;
              item.bulletPoints.forEach(bp => {
                  markdown += `- ${bp}\n`;
              });
              markdown += '\n';
          });
      } else if (section.type === 'education' && Array.isArray(section.content)) {
          (section.content as EducationItem[]).forEach(item => {
              markdown += `**${item.institution}** | ${item.location}\n`;
              markdown += `*${item.degree}* | ${item.dates}\n`;
              if (item.details) markdown += `${item.details}\n`;
              markdown += '\n';
          });
      } else if (section.type === 'skills' && Array.isArray(section.content)) {
          (section.content as SkillItem[]).forEach(item => {
              markdown += `**${item.category}:** ${item.skills.join(', ')}\n`;
          });
          markdown += '\n';
      } else if (section.type === 'projects' && Array.isArray(section.content)) {
          (section.content as ProjectItem[]).forEach(item => {
              markdown += `**${item.name}** | ${item.dates}\n`;
              if (item.link) markdown += `[Link](${item.link})\n`;
              markdown += `${item.description}\n`;
              if (item.bulletPoints) {
                  item.bulletPoints.forEach(bp => {
                      markdown += `- ${bp}\n`;
                  });
              }
              markdown += '\n';
          });
      } else if (section.type === 'certifications' && Array.isArray(section.content)) {
          (section.content as CertificationItem[]).forEach(item => {
              markdown += `**${item.name}** | ${item.issuer}\n`;
              markdown += `*${item.date}*\n`;
              if (item.link) markdown += `[Link](${item.link})\n`;
              markdown += '\n';
          });
      } else if (section.type === 'awards' && Array.isArray(section.content)) {
          (section.content as AwardItem[]).forEach(item => {
              markdown += `**${item.name}** | ${item.issuer}\n`;
              markdown += `*${item.date}*\n`;
              if (item.description) markdown += `${item.description}\n`;
              markdown += '\n';
          });
      }
  });

  return markdown;
};


// --- Custom Markdown Renderers for Resume ---
export const ResumeMarkdownComponents = {
    h1: ({node, ...props}: any) => {
      const name = React.Children.toArray(props.children).join('');
      return React.createElement('h1', { className: "text-center text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2", ...props }, name);
    },
    h2: ({node, ...props}: any) => {
      const title = React.Children.toArray(props.children).join('');
      // Determine icon based on title
      let icon = null;
      let textColorClass = "text-indigo-500"; // Default
      switch (title.toLowerCase()) {
        // FIX: Passed size and className props to the Lucide icons
        case 'summary': icon = React.createElement(FileText, { size: 16, className: textColorClass }); break;
        case 'skills': icon = React.createElement(Lightbulb, { size: 16, className: textColorClass }); break;
        case 'work experience': icon = React.createElement(Briefcase, { size: 16, className: textColorClass }); break;
        case 'education': icon = React.createElement(BookOpen, { size: 16, className: textColorClass }); break;
        case 'projects': icon = React.createElement(Terminal, { size: 16, className: textColorClass }); break;
        case 'certifications': icon = React.createElement(Award, { size: 16, className: textColorClass }); break;
        case 'awards': icon = React.createElement(Award, { size: 16, className: textColorClass }); break;
        default: break;
      }

      return React.createElement('h2', { className: "text-center text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider mt-5 mb-2 pb-1 border-b-2 border-gray-900 dark:border-white flex items-center justify-center gap-2", ...props }, icon, title);
    },
    p: ({ node, ...props }: any) => {
        const childrenArray = React.Children.toArray(props.children);
        let hasPipe = false;
        let pipeIndex = -1;
        let childWithPipe: string | null = null;

        childrenArray.forEach((child, index) => {
            if (typeof child === 'string' && child.includes('|')) {
                hasPipe = true;
                pipeIndex = index;
                childWithPipe = child;
            }
        });

        if (hasPipe && pipeIndex !== -1 && childWithPipe) {
            const [beforePipe, afterPipe] = childWithPipe.split('|');
            const leftChildren = [...childrenArray.slice(0, pipeIndex), beforePipe.trim()];
            const rightChildren = [afterPipe.trim(), ...childrenArray.slice(pipeIndex + 1)];
            
            return React.createElement(
                'div', 
                { className: "flex justify-between items-start w-full my-1 text-sm" },
                React.createElement('p', { className: "text-left text-gray-800 dark:text-slate-200 leading-relaxed pr-4" }, ...leftChildren),
                React.createElement('p', { className: "text-right text-gray-700 dark:text-slate-300 font-medium whitespace-nowrap" }, ...rightChildren)
            );
        }

        return React.createElement('p', { className: "mb-1 text-sm text-gray-700 dark:text-slate-300 leading-relaxed", ...props });
    },
    ul: ({node, ...props}: any) => React.createElement('ul', { className: "list-disc list-outside ml-5 mt-2 space-y-1 text-sm text-gray-700 dark:text-slate-300", ...props }),
    li: ({node, ...props}: any) => React.createElement('li', { className: "pl-1 leading-snug", ...props }),
    strong: ({node, ...props}: any) => React.createElement('strong', { className: "font-bold text-gray-900 dark:text-white", ...props }),
    em: ({node, ...props}: any) => React.createElement('em', { className: "text-gray-800 dark:text-slate-300", ...props }),
    a: ({node, ...props}: any) => React.createElement('a', { className: "text-indigo-600 dark:text-indigo-400 hover:underline", ...props }),
};