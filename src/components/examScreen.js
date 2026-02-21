import { renderNavigation } from './navigation.js';
import { renderQuestion1 } from './question1.js';
import { renderQuestion2 } from './question2.js';
import { renderQuestion3 } from './question3.js';

function renderContent(state) {
  if (state.currentSection === 'q1') {
    return renderQuestion1({
      questions: state.exam.q1,
      currentIndex: state.currentQ1Index,
      answersById: state.answers.q1,
      answeredFlags: state.progress.q1.answeredFlags
    });
  }

  if (state.currentSection === 'q2') {
    return renderQuestion2({
      questions: state.exam.q2,
      currentIndex: state.currentQ2Index,
      answersById: state.answers.q2,
      answeredFlags: state.progress.q2.answeredFlags
    });
  }

  return renderQuestion3({
    question: state.exam.q3,
    rowAnswers: state.answers.q3.rows,
    netIncomeAnswer: state.answers.q3.netIncome,
    isAnswered: state.progress.q3.answeredCount === state.progress.q3.total
  });
}

function renderExamScreen(state) {
  const timerClass = state.isPaused
    ? 'paused'
    : state.remainingSeconds <= 300
    ? 'danger'
    : state.remainingSeconds <= 900
    ? 'warning'
    : '';

  return `
    <div class="exam-layout ${state.isPaused ? 'is-paused' : ''}">
      <header class="exam-header">
        <p class="exam-header__title">日商簿記3級 ネット試験模擬</p>
        <div class="exam-header__timer ${timerClass}" id="exam-timer">残り時間 ${state.formattedTime}</div>
        <div class="exam-header__actions">
          <button type="button" class="btn btn--secondary btn--sm" data-action="toggle-break">
            ${state.isPaused ? '試験に戻る' : '一時退席'}
          </button>
          <button type="button" class="btn btn--danger btn--sm" data-action="finish-exam">試験終了</button>
        </div>
      </header>

      <div class="exam-body">
        ${renderNavigation({ currentSection: state.currentSection, progress: state.progress })}
        <main class="exam-content">
          ${renderContent(state)}
        </main>
        ${
          state.isPaused
            ? `
              <div class="exam-break-overlay">
                <div class="exam-break-card">
                  <h2>一時退席中</h2>
                  <p>タイマーは停止しています。再開すると続きから受験できます。</p>
                  <button type="button" class="btn btn--primary" data-action="toggle-break">試験を再開</button>
                </div>
              </div>
            `
            : ''
        }
      </div>
    </div>
  `;
}

export { renderExamScreen };