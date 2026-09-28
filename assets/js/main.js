(() => {
  const body = document.body;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.nav-links');

  const saved = localStorage.getItem('guiasys-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) body.classList.add('dark');

  const syncThemeIcon = () => {
    if (!themeBtn) return;
    themeBtn.textContent = body.classList.contains('dark') ? '☀' : '◐';
    themeBtn.setAttribute('aria-label', body.classList.contains('dark') ? 'Usar tema claro' : 'Usar tema escuro');
  };
  syncThemeIcon();

  themeBtn?.addEventListener('click', () => {
    body.classList.toggle('dark');
    localStorage.setItem('guiasys-theme', body.classList.contains('dark') ? 'dark' : 'light');
    syncThemeIcon();
  });

  menuBtn?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', nav?.classList.contains('open') ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => nav?.classList.remove('open')));

  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-favorite]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('is-favorite');
      btn.textContent = btn.classList.contains('is-favorite') ? '♥' : '♡';
      btn.setAttribute('aria-label', btn.classList.contains('is-favorite') ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    });
  });
})();