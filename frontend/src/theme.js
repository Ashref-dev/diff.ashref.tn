const THEME_KEY = 'theme';
const THEME_STEPS = ['system', 'light', 'dark'];

export function initTheme() {
  const root = document.documentElement;
  const button = document.getElementById('themeToggle');
  const label = document.getElementById('themeToggleLabel');
  const icon = button?.querySelector('.theme-toggle-icon');
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  if (!button || !label || !icon) {
    return { getMode: () => 'system' };
  }

  let mode = localStorage.getItem(THEME_KEY) || 'system';

  const getActiveTheme = () => {
    if (mode === 'system') {
      return media.matches ? 'dark' : 'light';
    }
    return mode;
  };

  const updateUI = () => {
    const activeTheme = getActiveTheme();
    root.setAttribute('data-theme', activeTheme);
    if (mode === 'system') {
      icon.textContent = '◐';
      label.textContent = 'System';
    } else if (mode === 'light') {
      icon.textContent = '☀';
      label.textContent = 'Light';
    } else {
      icon.textContent = '●';
      label.textContent = 'Dark';
    }
  };

  const cycleTheme = () => {
    icon.classList.add('animating');
    setTimeout(() => {
      const index = THEME_STEPS.indexOf(mode);
      mode = THEME_STEPS[(index + 1) % THEME_STEPS.length];
      localStorage.setItem(THEME_KEY, mode);
      updateUI();
      icon.classList.remove('animating');
    }, 150);
  };

  button.addEventListener('click', cycleTheme);

  const mediaListener = () => {
    if (mode === 'system') {
      updateUI();
    }
  };
  media.addEventListener('change', mediaListener);

  updateUI();

  return {
    getMode: () => mode,
  };
}
