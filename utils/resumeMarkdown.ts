
import React from 'react';

// --- Custom Markdown Renderers for Resume ---
// FIX: Replaced JSX with React.createElement to be compatible with .ts files.
export const ResumeMarkdownComponents = {
    h1: ({node, ...props}: any) => React.createElement('h1', { className: "text-center text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2", ...props }),
    h2: ({node, ...props}: any) => React.createElement('h2', { className: "text-center text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider mt-5 mb-2 pb-1 border-b-2 border-gray-900 dark:border-white", ...props }),
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
};