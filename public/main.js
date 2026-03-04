async function fetchApplications() {
  const listEl = document.getElementById('applications-list');
  listEl.innerHTML = '<div class="loading">Загружаю заявки...</div>';

  try {
    const res = await fetch('/api/applications');
    if (!res.ok) {
      throw new Error('Ошибка загрузки');
    }
    const data = await res.json();

    if (!data.length) {
      listEl.innerHTML =
        '<div class="empty">Пока нет ни одной заявки.</div>';
      return;
    }

    listEl.innerHTML = '';
    data
      .slice()
      .reverse()
      .forEach((app) => {
        const card = document.createElement('article');
        card.className = 'application-card';

        const created = new Date(app.createdAt);
        const createdStr = created.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        const systemsText =
          app.systems && app.systems.length
            ? app.systems.join(', ')
            : 'Не указано';

        card.innerHTML = `
          <header class="application-header">
            <div>
              <div class="application-name">${escapeHtml(app.playerName)}</div>
              <div class="application-contact">${escapeHtml(app.contact)}</div>
            </div>
            <time class="application-date">${createdStr}</time>
          </header>
          <div class="application-body">
            <div><strong>Опыт:</strong> ${humanExperience(app.experienceLevel)}</div>
            <div><strong>Время:</strong> ${escapeHtml(app.preferredTime)}</div>
            <div><strong>Системы:</strong> ${escapeHtml(systemsText)}</div>
            ${
              app.characterIdea
                ? `<div><strong>Персонаж:</strong> ${escapeHtml(
                    app.characterIdea
                  )}</div>`
                : ''
            }
            ${
              app.comments
                ? `<div><strong>Комментарий:</strong> ${escapeHtml(
                    app.comments
                  )}</div>`
                : ''
            }
          </div>
        `;

        listEl.appendChild(card);
      });
  } catch (e) {
    listEl.innerHTML =
      '<div class="error">Не удалось загрузить заявки. Попробуйте позже.</div>';
  }
}

function humanExperience(level) {
  switch (level) {
    case 'newbie':
      return 'Никогда не играл(а)';
    case 'some':
      return 'Играл(а) пару раз';
    case 'regular':
      return 'Регулярно играю';
    case 'veteran':
      return 'Много лет за столом';
    default:
      return 'Не указано';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('application-form');
  const statusEl = document.getElementById('form-status');
  const toggleBtn = document.getElementById('toggle-list');
  const listEl = document.getElementById('applications-list');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = '';

    const formData = new FormData(form);

    const systems = Array.from(
      document.querySelectorAll('#systems input[type="checkbox"]:checked')
    ).map((c) => c.value);

    const payload = {
      playerName: formData.get('playerName').trim(),
      contact: formData.get('contact').trim(),
      experienceLevel: formData.get('experienceLevel'),
      characterIdea: formData.get('characterIdea')?.trim(),
      preferredTime: formData.get('preferredTime').trim(),
      systems,
      comments: formData.get('comments')?.trim(),
    };

    if (!payload.playerName || !payload.contact || !payload.preferredTime) {
      statusEl.textContent = 'Пожалуйста, заполните обязательные поля.';
      statusEl.className = 'status error';
      return;
    }

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Ошибка отправки заявки');
      }

      form.reset();
      statusEl.textContent = 'Заявка отправлена! Мастер свяжется с тобой.';
      statusEl.className = 'status success';

      if (!listEl.classList.contains('hidden')) {
        fetchApplications();
      }
    } catch (err) {
      statusEl.textContent =
        'Не удалось отправить заявку. Попробуйте ещё раз.';
      statusEl.className = 'status error';
    }
  });

  toggleBtn.addEventListener('click', () => {
    const isHidden = listEl.classList.contains('hidden');
    if (isHidden) {
      listEl.classList.remove('hidden');
      toggleBtn.textContent = 'Скрыть';
      fetchApplications();
    } else {
      listEl.classList.add('hidden');
      toggleBtn.textContent = 'Показать';
    }
  });
});

