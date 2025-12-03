
// A simple, dependency-free syntax highlighter using regex.

const applySyntaxHighlighting = (code: string, language: string): string => {
  let highlightedCode = code;

  // Generic patterns
  highlightedCode = highlightedCode.replace(/"(.*?)"/g, '<span class="text-green-400">"$1"</span>');
  highlightedCode = highlightedCode.replace(/'(.*?)'/g, '<span class="text-green-400">\'$1\'</span>');
  highlightedCode = highlightedCode.replace(/\/\/(.*)/g, '<span class="text-gray-500">//$1</span>');
  highlightedCode = highlightedCode.replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');

  // Language-specific keywords
  let keywords: string[] = [];
  if (language === 'javascript') {
    keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'new', 'this', 'async', 'await'];
  } else if (language === 'python') {
    keywords = ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'class', 'import', 'from', 'in', 'is', 'not', 'and', 'or', 'True', 'False', 'None'];
  } else if (language === 'java') {
    keywords = ['public', 'private', 'protected', 'static', 'final', 'void', 'int', 'String', 'class', 'return', 'if', 'else', 'for', 'while', 'new'];
  }

  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
  highlightedCode = highlightedCode.replace(keywordRegex, '<span class="text-purple-400 font-bold">$1</span>');

  return highlightedCode;
};

export default applySyntaxHighlighting;
