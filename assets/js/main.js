(() => {
  const body = document.body;
  const root = document.documentElement;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.nav-links');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const licensingUrl = 'https://licencas.guiasys.com.br/';

  document.querySelectorAll('[data-licensing-link]').forEach((link) => {
    link.href = licensingUrl;
  });

  const installLicensingIdentity = () => {
    document.querySelectorAll('.navbar').forEach((navbar) => {
      const studioBrand = navbar.querySelector(':scope > .brand');
      if (!studioBrand || navbar.querySelector('[data-licensing-brand]')) return;

      const divider = document.createElement('span');
      divider.className = 'brand-divider';
      divider.setAttribute('aria-hidden', 'true');

      const licensing = document.createElement('a');
      licensing.className = 'licensing-brand';
      licensing.href = licensingUrl;
      licensing.target = '_blank';
      licensing.rel = 'noopener';
      licensing.dataset.licensingBrand = '';
      licensing.setAttribute('aria-label', 'Abrir GuiaSys Licensing');
      licensing.innerHTML = '<img src="/assets/img/guiasys-licensing-lockup.svg?v=official-20261014" alt="GuiaSys Licensing" width="254" height="86">';

      studioBrand.insertAdjacentElement('afterend', divider);
      divider.insertAdjacentElement('afterend', licensing);
    });
  };

  installLicensingIdentity();

  const getSavedTheme = () => {
    try { return localStorage.getItem('guiasys-theme'); } catch { return null; }
  };

  const applyThemeAssets = () => {
    const dark = root.classList.contains('dark');

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
    const dark = root.classList.contains('dark');
    themeBtn.textContent = dark ? '☀' : '◐';
    themeBtn.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema escuro');
    themeBtn.setAttribute('title', dark ? 'Usar tema claro' : 'Usar tema escuro');
  };

  const applyTheme = (theme) => {
    const dark = theme === 'dark' || (theme !== 'light' && systemTheme.matches);
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    syncThemeIcon();
    applyThemeAssets();
  };

  applyTheme(getSavedTheme());

  themeBtn?.addEventListener('click', () => {
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    try { localStorage.setItem('guiasys-theme', next); } catch {}
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

  // Recursos ainda não implementados não ficam expostos como botões fictícios.
  document.querySelectorAll('[aria-label="Favoritos"], [data-favorite]').forEach(el => el.remove());

  // Busca é funcional e pode ser acessada de qualquer página pública.
  const navActions = document.querySelector('.nav-actions');
  if (navActions && !navActions.querySelector('[data-search-link]')) {
    const searchLink = document.createElement('a');
    searchLink.className = 'icon-btn search-link';
    searchLink.href = '/buscar/';
    searchLink.setAttribute('data-search-link', '');
    searchLink.setAttribute('aria-label', 'Buscar no site');
    searchLink.setAttribute('title', 'Buscar');
    searchLink.innerHTML = '<span aria-hidden="true">⌕</span>';
    const theme = navActions.querySelector('[data-theme-toggle]');
    navActions.insertBefore(searchLink, theme || navActions.firstChild);
  }

})();
