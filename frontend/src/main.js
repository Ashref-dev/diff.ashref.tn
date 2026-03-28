import { computeDiff } from './diff.js';
import { renderDiff } from './renderer.js';
import { initSidebar } from './sidebar.js';
import { initTheme } from './theme.js';

const originalInput = document.getElementById('originalInput');
const modifiedInput = document.getElementById('modifiedInput');
const originalDisplay = document.getElementById('originalDisplay');
const modifiedDisplay = document.getElementById('modifiedDisplay');
const statAdd = document.getElementById('statAdd');
const statRemove = document.getElementById('statRemove');
const statContext = document.getElementById('statContext');
const originalLineCount = document.getElementById('originalLineCount');
const modifiedLineCount = document.getElementById('modifiedLineCount');
const header = document.getElementById('siteHeader');

let options = {
  precision: 'line',
  caseSensitive: true,
  trimWhitespace: false,
  lineWrap: true,
  transform: 'none',
  syntaxLang: '',
};

let debounceTimer;

function countVisibleLines(lines) {
  return lines.reduce((count, line) => (line.type === 'blank' ? count : count + 1), 0);
}

function runDiff() {
  const result = computeDiff(originalInput.value, modifiedInput.value, options);
  renderDiff(result, originalDisplay, modifiedDisplay, options);

  statAdd.textContent = `${result.additions} additions`;
  statRemove.textContent = `${result.deletions} deletions`;
  statContext.textContent = `${result.unchanged} unchanged`;

  originalLineCount.textContent = `${countVisibleLines(result.originalLines)} lines`;
  modifiedLineCount.textContent = `${countVisibleLines(result.modifiedLines)} lines`;

  originalDisplay.scrollTop = originalInput.scrollTop;
  originalDisplay.scrollLeft = originalInput.scrollLeft;
  modifiedDisplay.scrollTop = modifiedInput.scrollTop;
  modifiedDisplay.scrollLeft = modifiedInput.scrollLeft;
}

function debouncedDiff() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runDiff, 150);
}

function syncPanelScroll(input, display) {
  input.addEventListener('scroll', () => {
    display.scrollTop = input.scrollTop;
    display.scrollLeft = input.scrollLeft;
  });
}

function attachSwapShortcut(input) {
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      const left = originalInput.value;
      originalInput.value = modifiedInput.value;
      modifiedInput.value = left;
      runDiff();
    }
  });
}

function bindHeaderScroll() {
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function init() {
  initTheme();

  initSidebar((nextOptions) => {
    options = { ...options, ...nextOptions };
    runDiff();
  });

  [originalInput, modifiedInput].forEach((input) => {
    input.addEventListener('input', debouncedDiff);
  });

  syncPanelScroll(originalInput, originalDisplay);
  syncPanelScroll(modifiedInput, modifiedDisplay);

  attachSwapShortcut(originalInput);
  attachSwapShortcut(modifiedInput);

  bindHeaderScroll();
  runDiff();
}

init();
