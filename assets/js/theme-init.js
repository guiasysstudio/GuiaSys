(() => {
  let saved = null;
  try { saved = localStorage.getItem("guiasys-theme"); } catch {}
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = saved === "dark" || (saved !== "light" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();
