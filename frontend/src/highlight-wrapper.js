import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import go from 'highlight.js/lib/languages/go';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import java from 'highlight.js/lib/languages/java';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';

const LANGUAGE_MAP = {
  javascript,
  typescript,
  python,
  go,
  c,
  cpp,
  csharp,
  java,
  rust,
  ruby,
  php,
  html: xml,
  css,
  sql,
  bash,
  json,
  yaml,
  markdown,
};

Object.entries(LANGUAGE_MAP).forEach(([name, language]) => {
  hljs.registerLanguage(name, language);
});

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

export function highlightCode(code, language) {
  const source = String(code ?? '');
  if (!language) {
    return escapeHtml(source);
  }

  const normalized = language === 'html' ? 'html' : language;
  if (!hljs.getLanguage(normalized)) {
    return escapeHtml(source);
  }

  try {
    return hljs.highlight(source, { language: normalized }).value;
  } catch {
    return escapeHtml(source);
  }
}
