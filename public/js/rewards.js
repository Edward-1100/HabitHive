document.addEventListener('DOMContentLoaded', function () {
  const ptsEl = document.getElementById('pointsValue');
  if (!ptsEl) return;

  function getPoints() {
    return Number((ptsEl.textContent || '0').trim()) || 0;
  }

  function updateButtons() {
    const pts = getPoints();
    document.querySelectorAll('button[data-price]').forEach(btn => {
      const price = Number(btn.getAttribute('data-price') || 0);
      btn.disabled = price > pts;
    });
  }

  updateButtons();

  const mo = new MutationObserver(() => updateButtons());
  mo.observe(ptsEl, {childList: true, characterData: true, subtree: true});

});
