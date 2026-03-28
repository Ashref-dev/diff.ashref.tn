import { diffChars, diffLines, diffWords } from 'diff';

function normalizeInput(text, options) {
  const raw = String(text ?? '');
  const trimmed = options.trimWhitespace
    ? raw
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
    : raw;

  if (options.transform === 'lower') {
    return trimmed.toLowerCase();
  }
  if (options.transform === 'upper') {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function mapPartsToDisplay(parts, originalDisplay, modifiedDisplay) {
  let oCursor = 0;
  let mCursor = 0;
  const mapped = [];

  for (const part of parts) {
    const len = part.value.length;
    if (part.added) {
      const modifiedText = modifiedDisplay.slice(mCursor, mCursor + len);
      mCursor += len;
      mapped.push({ type: 'add', originalText: '', modifiedText });
      continue;
    }
    if (part.removed) {
      const originalText = originalDisplay.slice(oCursor, oCursor + len);
      oCursor += len;
      mapped.push({ type: 'remove', originalText, modifiedText: '' });
      continue;
    }

    const originalText = originalDisplay.slice(oCursor, oCursor + len);
    const modifiedText = modifiedDisplay.slice(mCursor, mCursor + len);
    oCursor += len;
    mCursor += len;
    mapped.push({ type: 'context', originalText, modifiedText });
  }

  return mapped;
}

function toAlignedLines(parts) {
  const originalLines = [];
  const modifiedLines = [];
  let originalLineNum = 1;
  let modifiedLineNum = 1;

  let currentOriginal = '';
  let currentModified = '';
  let originalChanged = false;
  let modifiedChanged = false;

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  const pushLine = () => {
    const leftText = currentOriginal;
    const rightText = currentModified;

    const hasLeft = leftText.length > 0;
    const hasRight = rightText.length > 0;

    let leftType = 'context';
    let rightType = 'context';

    if (!hasLeft && hasRight && modifiedChanged) {
      leftType = 'blank';
      rightType = 'add';
    } else if (hasLeft && !hasRight && originalChanged) {
      leftType = 'remove';
      rightType = 'blank';
    } else {
      if (originalChanged) {
        leftType = 'remove';
      }
      if (modifiedChanged) {
        rightType = 'add';
      }
    }

    if (rightType === 'add') {
      additions += 1;
    }
    if (leftType === 'remove') {
      deletions += 1;
    }
    if (leftType === 'context' && rightType === 'context') {
      unchanged += 1;
    }

    originalLines.push({
      text: leftText,
      type: leftType,
      lineNum: leftType === 'blank' ? null : originalLineNum++,
    });
    modifiedLines.push({
      text: rightText,
      type: rightType,
      lineNum: rightType === 'blank' ? null : modifiedLineNum++,
    });

    currentOriginal = '';
    currentModified = '';
    originalChanged = false;
    modifiedChanged = false;
  };

  const writeText = (text, side, changed) => {
    if (!text) {
      return;
    }
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (side === 'original') {
        currentOriginal += char;
      } else if (side === 'modified') {
        currentModified += char;
      } else {
        currentOriginal += char;
        currentModified += char;
      }

      if (changed === 'original') {
        originalChanged = true;
      } else if (changed === 'modified') {
        modifiedChanged = true;
      }

      if (char === '\n') {
        currentOriginal = currentOriginal.slice(0, -1);
        currentModified = currentModified.slice(0, -1);
        pushLine();
      }
    }
  };

  for (const part of parts) {
    if (part.type === 'add') {
      writeText(part.modifiedText, 'modified', 'modified');
    } else if (part.type === 'remove') {
      writeText(part.originalText, 'original', 'original');
    } else {
      writeText(part.originalText, 'both', null);
    }
  }

  if (currentOriginal.length || currentModified.length || originalLines.length === 0) {
    pushLine();
  }

  return {
    additions,
    deletions,
    unchanged,
    originalLines,
    modifiedLines,
  };
}

export function computeDiff(original, modified, options) {
  const displayOriginal = normalizeInput(original, options);
  const displayModified = normalizeInput(modified, options);

  if (displayOriginal.length === 0 && displayModified.length === 0) {
    return {
      additions: 0,
      deletions: 0,
      unchanged: 0,
      originalLines: [{ text: '', type: 'blank', lineNum: null }],
      modifiedLines: [{ text: '', type: 'blank', lineNum: null }],
    };
  }

  const compareOriginal = options.caseSensitive ? displayOriginal : displayOriginal.toLowerCase();
  const compareModified = options.caseSensitive ? displayModified : displayModified.toLowerCase();

  let parts;
  if (options.precision === 'word') {
    parts = diffWords(compareOriginal, compareModified);
  } else if (options.precision === 'char') {
    parts = diffChars(compareOriginal, compareModified);
  } else {
    parts = diffLines(compareOriginal, compareModified, { newlineIsToken: true });
  }

  const mappedParts = mapPartsToDisplay(parts, displayOriginal, displayModified);
  return toAlignedLines(mappedParts);
}
