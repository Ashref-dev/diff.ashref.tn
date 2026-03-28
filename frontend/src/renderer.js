import { highlightCode } from './highlight-wrapper.js';

let displaySyncBound = false;

function lineClass(type) {
  if (type === 'add') {
    return 'line-add';
  }
  if (type === 'remove') {
    return 'line-remove';
  }
  if (type === 'blank') {
    return 'line-blank';
  }
  return 'line-context';
}

function renderPanel(lines, syntaxLang) {
  return lines
    .map((line) => {
      const content = line.type === 'blank' && line.text.length === 0 ? '&nbsp;' : highlightCode(line.text, syntaxLang);
      const no = line.lineNum == null ? '' : String(line.lineNum);
      return `<div class="diff-line ${lineClass(line.type)}"><span class="line-no">${no}</span><span class="line-content">${content}</span></div>`;
    })
    .join('');
}

function bindDisplaySync(originalDisplay, modifiedDisplay) {
  if (displaySyncBound) {
    return;
  }

  let locked = false;
  const sync = (source, target) => {
    if (locked) {
      return;
    }
    locked = true;
    target.scrollTop = source.scrollTop;
    locked = false;
  };

  originalDisplay.addEventListener('scroll', () => sync(originalDisplay, modifiedDisplay));
  modifiedDisplay.addEventListener('scroll', () => sync(modifiedDisplay, originalDisplay));
  displaySyncBound = true;
}

export function renderDiff(result, originalDisplay, modifiedDisplay, options) {
  originalDisplay.classList.toggle('wrap', options.lineWrap);
  modifiedDisplay.classList.toggle('wrap', options.lineWrap);

  originalDisplay.innerHTML = renderPanel(result.originalLines, options.syntaxLang);
  modifiedDisplay.innerHTML = renderPanel(result.modifiedLines, options.syntaxLang);

  bindDisplaySync(originalDisplay, modifiedDisplay);
}
