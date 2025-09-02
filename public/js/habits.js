document.addEventListener('DOMContentLoaded', () => {
  const habitType = document.getElementById('habitType');
  const goodGroup = document.getElementById('goodGroup');
  const badGroup = document.getElementById('badGroup');
  if (habitType) {
    habitType.addEventListener('change', () => {
      if (habitType.value === 'good') {
        goodGroup.style.display = 'block';
        badGroup.style.display = 'none';
      } else if (habitType.value === 'bad') {
        badGroup.style.display = 'block';
        goodGroup.style.display = 'none';
      } else {
        goodGroup.style.display = 'none';
        badGroup.style.display = 'none';
      }
    });
  }

  document.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`/habits/toggle/${id}`, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}});
        const json = await res.json();
        if (json && json.ok) {
          btn.textContent = json.completed ? 'Mark incomplete today' : 'Mark complete today';
        } else {
          alert(json.error || 'Server error');
        }
      } catch (err) {
        console.error(err);
        alert('Network error');
      }
    });
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      const li = document.querySelector(`.habit-item[data-id="${id}"]`);
      if (!li) return;
      const editForm = li.querySelector('.edit-form');
      editForm.style.display = 'block';
      btn.style.display = 'none';
    });
  });

  document.querySelectorAll('.edit-form .btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const form = e.target.closest('.edit-form');
      if (form) {
        form.style.display = 'none';
        const li = form.closest('.habit-item');
        const editBtn = li.querySelector('.btn-edit');
        if (editBtn) editBtn.style.display = 'inline-block';
      }
    });
  });

  document.querySelectorAll('.inline-delete').forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Delete this habit? This cannot be undone.')) {
        e.preventDefault();
      }
    });
  });

  (function () {
    const startEl = document.getElementById('startDate');
    const endEl = document.getElementById('endDate');

    if (startEl && endEl) {
      function syncMin() {
        if (startEl.value) endEl.min = startEl.value;
        else endEl.removeAttribute('min');
        if (endEl.value && startEl.value && endEl.value < startEl.value) endEl.value = startEl.value;
      }
      startEl.addEventListener('change', syncMin);
      syncMin();
    }
  })();

});
