(function(){
  if (!window.CALENDAR) return;

  const byDate = {};
  for (const d of window.CALENDAR) byDate[d.date] = d;

  const dayPanel = document.getElementById('dayPanel');
  const dayTitle = document.getElementById('dayPanelTitle');
  const dayList  = document.getElementById('dayHabitList');

  function renderDay(date) {
    const d = byDate[date];
    if (!d) return;

    dayTitle.textContent = new Date(date).toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'short', day:'numeric'});

    if (!Array.isArray(d.habits) || d.habits.length === 0) {
      dayList.innerHTML = '<div class="muted">No habits scheduled this day.</div>';
    } else {
      dayList.innerHTML = d.habits.map(h => {
        const cls = h.completed ? 'habit-completed' : 'habit-missing';
        const label = h.completed ? 'Completed' : 'Not done';
        const btn = h.completed ? 'Mark Incomplete' : 'Mark Complete';
        return `
          <div class="habit-row" data-hid="${h.habitId}">
            <div class="habit-title"><strong>${escapeHtml(h.title)}</strong></div>
            <div class="${cls}" aria-label="${label}">${label}</div>
            <button class="tiny-toggle" data-action="toggle" data-date="${date}" data-id="${h.habitId}">${btn}</button>
          </div>
        `;
      }).join('');
    }

    dayPanel.style.display = 'block';
    dayPanel.setAttribute('aria-hidden', 'false');
  }

  function updateCalendarCell(date) {
    const d = byDate[date];
    if (!d) return;
    const cell = document.querySelector(`.cal-day[data-date="${date}"]`);
    if (!cell) return;

    cell.classList.remove('none','partial','all');
    let bucket = 'none';
    if (total === 0) bucket = 'empty';
    else if (completedCount === 0) bucket = 'none';
    else if (completedCount === total) bucket = 'all';
    else bucket = 'partial';

    cell.classList.add(bucket);
    const dot = cell.querySelector('.dot');
    if (dot) dot.textContent = `${d.completedCount}/${d.total}`;
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  document.addEventListener('click', async (e) => {
    const day = e.target.closest('.cal-day');
    if (day && day.dataset.date) {
      renderDay(day.dataset.date);
      return;
    }

    if (e.target.id === 'dayPanelClose') {
      dayPanel.style.display = 'none';
      dayPanel.setAttribute('aria-hidden','true');
      return;
    }

    if (e.target.matches('button.tiny-toggle[data-action="toggle"]')) {
      const habitId = e.target.getAttribute('data-id');
      const date = e.target.getAttribute('data-date');
      try {
        const res = await fetch(`/habits/${habitId}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date })
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Toggle failed');

        const d = byDate[date];
        const item = d.habits.find(h => h.habitId === habitId);
        if (item) item.completed = !!data.completed;

        d.completedCount = d.habits.filter(h => h.completed).length;
        renderDay(date);
        updateCalendarCell(date);
      } catch (err) {
        console.error(err);
        alert('Could Not Update Habit Status.');
      }
    }
  });
})();
