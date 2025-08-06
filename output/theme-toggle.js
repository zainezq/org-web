function setTheme(mode) {
  if (mode === 'dark') {
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

function toggleTheme() {
  const current = document.body.classList.contains('dark') ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme');

  // Auto-detect system preference if no saved preference
  if (!saved) {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  } else if (saved === 'dark') {
    setTheme('dark');
  }

  // Add the toggle button
  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.innerText = 'Toggle Theme';
  button.onclick = toggleTheme;
  document.body.appendChild(button);
});
