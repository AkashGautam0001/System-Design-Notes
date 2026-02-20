// MingleSphereQL Dashboard - Client JS

document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.style.color = 'var(--accent-cyan)';
      link.style.borderLeftColor = 'var(--accent-cyan)';
      link.style.background = 'var(--bg-tertiary)';
    }
  });

  // Add keyboard shortcut for query playground
  const sqlInput = document.getElementById('sql-input');
  if (sqlInput) {
    sqlInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sqlInput.closest('form').submit();
      }
    });
  }

  // Make JSON cells expandable
  document.querySelectorAll('.json-cell').forEach(cell => {
    cell.style.cursor = 'pointer';
    cell.title = 'Click to expand';
    cell.addEventListener('click', () => {
      cell.style.maxWidth = cell.style.maxWidth === 'none' ? '300px' : 'none';
      cell.style.whiteSpace = cell.style.whiteSpace === 'pre' ? 'pre-wrap' : 'pre';
    });
  });
});
