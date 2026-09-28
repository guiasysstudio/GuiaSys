(() => {
  const body = document.body;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.nav-links');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  const getSavedTheme = () => localStorage.getItem('guiasys-theme');

  const applyThemeAssets = () => {
    const dark = body.classList.contains('dark');

    document.querySelectorAll('[data-theme-logo]').forEach((img) => {
      const next = dark ? img.dataset.srcDark : img.dataset.srcLight;
      if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
    });

    const favicon = document.querySelector('#site-favicon, link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute(
        'href',
        dark ? '/assets/img/favicon-dark.svg' : '/assets/img/favicon-light.svg'
      );
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', dark ? '#0E151D' : '#019A98');
  };

  const syncThemeIcon = () => {
    if (!themeBtn) return;
    const dark = body.classList.contains('dark');
    themeBtn.textContent = dark ? '☀' : '◐';
    themeBtn.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema escuro');
    themeBtn.setAttribute('title', dark ? 'Usar tema claro' : 'Usar tema escuro');
  };

  const applyTheme = (theme) => {
    const dark = theme === 'dark' || (theme !== 'light' && systemTheme.matches);
    body.classList.toggle('dark', dark);
    syncThemeIcon();
    applyThemeAssets();
  };

  applyTheme(getSavedTheme());

  themeBtn?.addEventListener('click', () => {
    const next = body.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('guiasys-theme', next);
    applyTheme(next);
  });

  systemTheme.addEventListener?.('change', () => {
    if (!getSavedTheme()) applyTheme(null);
  });

  menuBtn?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', nav?.classList.contains('open') ? 'true' : 'false');
  });

  document.querySelectorAll('.nav-links a').forEach(link =>
    link.addEventListener('click', () => nav?.classList.remove('open'))
  );

  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-favorite]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('is-favorite');
      btn.textContent = btn.classList.contains('is-favorite') ? '♥' : '♡';
      btn.setAttribute(
        'aria-label',
        btn.classList.contains('is-favorite') ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
      );
    });
  });
})();
