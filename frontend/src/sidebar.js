const STORAGE_KEY = 'diff-sidebar-preferences';

function parseStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function initSidebar(onChange) {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const diffPrecision = document.getElementById('diffPrecision');
  const textTransform = document.getElementById('textTransform');
  const caseSensitive = document.getElementById('caseSensitive');
  const trimWhitespace = document.getElementById('trimWhitespace');
  const lineWrap = document.getElementById('lineWrap');
  const syntaxLang = document.getElementById('syntaxLang');

  const stored = parseStored();

  const setSegmented = (container, value) => {
    const buttons = container.querySelectorAll('.seg-btn');
    buttons.forEach((button) => {
      const active = button.dataset.value === value;
      button.classList.toggle('active', active);
    });
  };

  const getSegmented = (container) => container.querySelector('.seg-btn.active')?.dataset.value || '';

  const getOptions = () => ({
    precision: getSegmented(diffPrecision) || 'line',
    transform: getSegmented(textTransform) || 'none',
    caseSensitive: caseSensitive.checked,
    trimWhitespace: trimWhitespace.checked,
    lineWrap: lineWrap.checked,
    syntaxLang: syntaxLang.value,
  });

  const save = () => {
    const options = getOptions();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...options,
        collapsed: sidebar.classList.contains('collapsed'),
      }),
    );
  };

  const notify = () => {
    save();
    onChange(getOptions());
  };

  if (stored.precision) {
    setSegmented(diffPrecision, stored.precision);
  }
  if (stored.transform) {
    setSegmented(textTransform, stored.transform);
  }
  if (typeof stored.caseSensitive === 'boolean') {
    caseSensitive.checked = stored.caseSensitive;
  }
  if (typeof stored.trimWhitespace === 'boolean') {
    trimWhitespace.checked = stored.trimWhitespace;
  }
  if (typeof stored.lineWrap === 'boolean') {
    lineWrap.checked = stored.lineWrap;
  }
  if (typeof stored.syntaxLang === 'string') {
    syntaxLang.value = stored.syntaxLang;
  }
  if (stored.collapsed) {
    sidebar.classList.add('collapsed');
  }

  const activateSegmented = (container, target) => {
    const button = target.closest('.seg-btn');
    if (!button || !container.contains(button)) {
      return;
    }
    setSegmented(container, button.dataset.value);
    notify();
  };

  diffPrecision.addEventListener('click', (event) => activateSegmented(diffPrecision, event.target));
  textTransform.addEventListener('click', (event) => activateSegmented(textTransform, event.target));

  [caseSensitive, trimWhitespace, lineWrap, syntaxLang].forEach((control) => {
    control.addEventListener('change', notify);
  });

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
    save();
  };

  toggleBtn.addEventListener('click', toggleSidebar);

  document.addEventListener('click', (event) => {
    if (!window.matchMedia('(max-width: 1024px)').matches) {
      return;
    }
    if (!sidebar.classList.contains('mobile-open')) {
      return;
    }
    if (sidebar.contains(event.target)) {
      return;
    }
    sidebar.classList.remove('mobile-open');
    save();
  });

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 1024px)').matches) {
      sidebar.classList.remove('mobile-open');
    }
  });

  notify();

  return {
    getOptions,
    toggleSidebar,
  };
}
