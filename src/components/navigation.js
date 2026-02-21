function statusClass(answeredCount, total) {
  if (answeredCount === 0) {
    return '';
  }

  if (answeredCount >= total) {
    return 'answered';
  }

  return 'partial';
}

function renderNavigation({ currentSection, progress }) {
  const sections = [
    {
      id: 'q1',
      label: '第1問 仕訳',
      score: '45点',
      answered: progress.q1.answeredCount,
      total: progress.q1.total
    },
    {
      id: 'q2',
      label: '第2問 帳簿',
      score: '20点',
      answered: progress.q2.answeredCount,
      total: progress.q2.total
    },
    {
      id: 'q3',
      label: '第3問 精算表',
      score: '35点',
      answered: progress.q3.answeredCount,
      total: progress.q3.total
    }
  ];

  return `
    <nav class="exam-nav">
      <div class="exam-nav__section">
        <p class="exam-nav__label">大問ナビゲーション</p>
        ${sections
          .map((section) => {
            const activeClass = section.id === currentSection ? 'active' : '';
            const progressStatusClass = statusClass(section.answered, section.total);

            return `
              <button type="button" class="nav-btn ${activeClass}" data-action="switch-section" data-section="${section.id}">
                <span class="nav-btn__status ${progressStatusClass}"></span>
                <span>${section.label}</span>
                <span class="nav-btn__score">${section.answered}/${section.total}</span>
              </button>
            `;
          })
          .join('')}
      </div>
    </nav>
  `;
}

export { renderNavigation };
