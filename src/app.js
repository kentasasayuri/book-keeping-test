import { CountdownTimer, formatRemainingTime } from './timer.js';
import { scoreExam, parseAmount } from './scoring.js';
import { exportResultPdf } from './pdfExport.js';
import { generateExamSet } from './examGenerator.js';
import { renderStartScreen, bindStartScreenEvents } from './components/startScreen.js';
import { renderExamScreen } from './components/examScreen.js';
import { renderResultScreen, bindResultScreenEvents } from './components/resultScreen.js';
import {
  saveAttempt,
  getAttemptCount,
  buildWeaknessFocusedBlueprint,
  getHistorySummary,
  clearHistory
} from './examHistory.js';

const EXAM_DURATION_SECONDS = 60 * 60;

const state = {
  phase: 'start',
  exam: null,
  answers: null,
  result: null,
  timer: null,
  isPaused: false,
  remainingSeconds: EXAM_DURATION_SECONDS,
  formattedTime: formatRemainingTime(EXAM_DURATION_SECONDS),
  currentSection: 'q1',
  currentQ1Index: 0,
  currentQ2Index: 0,
  progress: {
    q1: { answeredCount: 0, total: 15, answeredFlags: [] },
    q2: { answeredCount: 0, total: 2, answeredFlags: [] },
    q3: { answeredCount: 0, total: 0, answeredFlags: [] }
  },
  showDetails: false,
  examMode: 'normal'
};

function emptyJournalLines(lineCount = 4) {
  const normalizedCount =
    Number.isFinite(Number(lineCount)) && Number(lineCount) > 0 ? Math.trunc(Number(lineCount)) : 4;
  return Array.from({ length: normalizedCount }, () => ({ account: '', amount: '' }));
}

function createInitialAnswers(exam) {
  const q1Answers = Object.fromEntries(
    exam.q1.map((question) => [
      question.id,
      {
        debit: emptyJournalLines(question.lineCount),
        credit: emptyJournalLines(question.lineCount)
      }
    ])
  );

  const q2Answers = Object.fromEntries(
    exam.q2.map((question) => {
      const entries = {};

      if (question.type === 'ledger') {
        question.rows.forEach((row) => {
          entries[`${row.id}_account`] = '';
          entries[`${row.id}_amount`] = '';
        });
      } else {
        question.fields.forEach((field) => {
          entries[field.id] = '';
        });
      }

      return [question.id, entries];
    })
  );

  const q3Answers = {
    rows: Object.fromEntries(exam.q3.rows.map((row) => [row.id, ''])),
    netIncome: ''
  };

  return {
    q1: q1Answers,
    q2: q2Answers,
    q3: q3Answers
  };
}

function normalizeAmountString(rawValue) {
  const normalized = String(rawValue ?? '')
    .replace(/,/g, '')
    .replace(/[\u2212\uFF0D\u30FC\u2015]/g, '-')
    .trim();

  if (!normalized) {
    return '';
  }

  if (normalized === '-') {
    return '-';
  }

  if (!/^-?\d+$/.test(normalized)) {
    return '';
  }

  const negative = normalized.startsWith('-');
  const digits = (negative ? normalized.slice(1) : normalized).replace(/^0+(?=\d)/, '');
  const rebuilt = `${negative ? '-' : ''}${digits}`;

  if (Number(rebuilt) === 0) {
    return '0';
  }

  return rebuilt;
}

function formatAmountDisplay(value) {
  const parsed = parseAmount(value);

  if (!Number.isFinite(parsed)) {
    return '';
  }

  return parsed.toLocaleString('ja-JP');
}

function hasJournalValue(line) {
  return Boolean(line.account) || Boolean(line.amount);
}

function isQ1QuestionAnswered(answer) {
  const hasDebit = answer.debit.some((line) => hasJournalValue(line));
  const hasCredit = answer.credit.some((line) => hasJournalValue(line));
  return hasDebit && hasCredit;
}

function isQ2QuestionAnswered(question, answerMap) {
  if (question.type === 'ledger') {
    return question.rows.every((row) => {
      const account = answerMap[`${row.id}_account`];
      const amount = parseAmount(answerMap[`${row.id}_amount`]);
      return Boolean(account) && Number.isFinite(amount);
    });
  }

  if (question.type === 'theory') {
    return question.fields.every((field) => Boolean(answerMap[field.id]));
  }

  return question.fields.every((field) => Number.isFinite(parseAmount(answerMap[field.id])));
}

function calculateProgress() {
  const q1Flags = state.exam.q1.map((question) => isQ1QuestionAnswered(state.answers.q1[question.id]));
  const q2Flags = state.exam.q2.map((question) =>
    isQ2QuestionAnswered(question, state.answers.q2[question.id])
  );

  const q3InputCount = state.exam.q3.rows.length + 1;
  const q3AnsweredRows = state.exam.q3.rows.filter((row) =>
    Number.isFinite(parseAmount(state.answers.q3.rows[row.id]))
  ).length;
  const q3NetFilled = Number.isFinite(parseAmount(state.answers.q3.netIncome)) ? 1 : 0;

  state.progress = {
    q1: {
      answeredCount: q1Flags.filter(Boolean).length,
      total: state.exam.q1.length,
      answeredFlags: q1Flags
    },
    q2: {
      answeredCount: q2Flags.filter(Boolean).length,
      total: state.exam.q2.length,
      answeredFlags: q2Flags
    },
    q3: {
      answeredCount: q3AnsweredRows + q3NetFilled,
      total: q3InputCount,
      answeredFlags: []
    }
  };
}

function updateTimerDom() {
  const timerElement = document.getElementById('exam-timer');

  if (!timerElement) {
    return;
  }

  timerElement.textContent = state.isPaused
    ? `残り時間 ${state.formattedTime}（一時停止中）`
    : `残り時間 ${state.formattedTime}`;
  timerElement.classList.remove('warning', 'danger', 'paused');

  if (state.isPaused) {
    timerElement.classList.add('paused');
    return;
  }

  if (state.remainingSeconds <= 300) {
    timerElement.classList.add('danger');
  } else if (state.remainingSeconds <= 900) {
    timerElement.classList.add('warning');
  }
}

function refreshProgressDom() {
  const sectionButtons = document.querySelectorAll('[data-action="switch-section"]');
  const sectionMap = {
    q1: state.progress.q1,
    q2: state.progress.q2,
    q3: state.progress.q3
  };

  sectionButtons.forEach((button) => {
    const sectionId = button.dataset.section;
    const status = sectionMap[sectionId];

    if (!status) {
      return;
    }

    const score = button.querySelector('.nav-btn__score');
    if (score) {
      score.textContent = `${status.answeredCount}/${status.total}`;
    }

    const statusDot = button.querySelector('.nav-btn__status');
    if (statusDot) {
      statusDot.classList.remove('answered', 'partial');
      if (status.answeredCount > 0 && status.answeredCount < status.total) {
        statusDot.classList.add('partial');
      }
      if (status.answeredCount >= status.total) {
        statusDot.classList.add('answered');
      }
    }
  });

  if (state.currentSection === 'q1') {
    const q1Buttons = document.querySelectorAll('[data-action="q1-jump"]');
    q1Buttons.forEach((button, index) => {
      button.classList.toggle('answered', Boolean(state.progress.q1.answeredFlags[index]));
    });
  }

  if (state.currentSection === 'q2') {
    const q2Buttons = document.querySelectorAll('[data-action="q2-jump"]');
    q2Buttons.forEach((button, index) => {
      button.classList.toggle('answered', Boolean(state.progress.q2.answeredFlags[index]));
    });
  }
}

function stopTimer() {
  if (state.timer) {
    state.timer.stop();
    state.timer = null;
  }
}

function pauseExam() {
  if (state.phase !== 'exam' || state.isPaused) {
    return;
  }

  state.timer?.stop();
  state.isPaused = true;
  render();
}

function resumeExam() {
  if (state.phase !== 'exam' || !state.isPaused) {
    return;
  }

  state.timer?.start();
  state.isPaused = false;
  render();
}

function toggleBreakState() {
  if (state.isPaused) {
    resumeExam();
  } else {
    pauseExam();
  }
}

function finishExam({ forced = false } = {}) {
  if (state.phase !== 'exam') {
    return;
  }

  if (!forced) {
    const confirmed = window.confirm('試験を終了して採点しますか？');
    if (!confirmed) {
      return;
    }
  }

  stopTimer();
  state.isPaused = false;
  state.result = scoreExam(state.exam, state.answers);
  saveAttempt(state.result);
  state.phase = 'result';
  state.showDetails = false;
  render();

  if (forced) {
    window.alert('制限時間に達したため、自動的に試験を終了しました。');
  }
}

function startExam(mode = 'normal') {
  stopTimer();

  state.examMode = mode;
  const blueprint = mode === 'weakness' ? buildWeaknessFocusedBlueprint() : undefined;
  state.exam = generateExamSet(blueprint);
  state.answers = createInitialAnswers(state.exam);
  state.result = null;
  state.phase = 'exam';
  state.currentSection = 'q1';
  state.currentQ1Index = 0;
  state.currentQ2Index = 0;
  state.isPaused = false;
  state.remainingSeconds = EXAM_DURATION_SECONDS;
  state.formattedTime = formatRemainingTime(EXAM_DURATION_SECONDS);

  calculateProgress();
  render();

  state.timer = new CountdownTimer(EXAM_DURATION_SECONDS, {
    onTick: (seconds) => {
      state.remainingSeconds = Math.max(0, seconds);
      state.formattedTime = formatRemainingTime(state.remainingSeconds);
      updateTimerDom();
    },
    onComplete: () => {
      finishExam({ forced: true });
    }
  });

  state.timer.start();
}

function restartToStart() {
  stopTimer();
  state.phase = 'start';
  state.isPaused = false;
  state.exam = null;
  state.answers = null;
  state.result = null;
  state.showDetails = false;
  state.examMode = 'normal';
  render();
}

function handleAmountFieldInput(input) {
  const sanitized = normalizeAmountString(input.value);
  input.value = sanitized;
}

function handleAmountFieldBlur(input) {
  const sanitized = normalizeAmountString(input.value);
  input.value = sanitized === '-' ? '' : formatAmountDisplay(sanitized);
}

function handleAmountFieldFocus(input) {
  const sanitized = normalizeAmountString(input.value);
  input.value = sanitized;
}

function updateAnswerFromElement(element) {
  if (element.dataset.role === 'q1-input') {
    const { q1Id, side, row, field } = element.dataset;
    const line = state.answers.q1[q1Id]?.[side]?.[Number(row)];

    if (!line) {
      return;
    }

    if (field === 'account') {
      line.account = element.value;
    } else {
      line.amount = normalizeAmountString(element.value);
    }
  }

  if (element.dataset.role === 'q2-input') {
    const { q2Id, field } = element.dataset;
    state.answers.q2[q2Id][field] =
      element.tagName === 'SELECT' ? element.value : normalizeAmountString(element.value);
  }

  if (element.dataset.role === 'q3-input') {
    const rowId = element.dataset.rowId;
    state.answers.q3.rows[rowId] = normalizeAmountString(element.value);
  }

  if (element.dataset.role === 'q3-net-income') {
    state.answers.q3.netIncome = normalizeAmountString(element.value);
  }

  calculateProgress();
  refreshProgressDom();
}

function bindExamEvents(root) {
  root.querySelectorAll('[data-action="toggle-break"]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleBreakState();
    });
  });

  root
    .querySelector('[data-action="finish-exam"]')
    ?.addEventListener('click', () => {
      finishExam({ forced: false });
    });

  if (state.isPaused) {
    return;
  }

  root
    .querySelectorAll('[data-action="switch-section"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        state.currentSection = button.dataset.section;
        render();
      });
    });

  root
    .querySelector('[data-action="q1-prev"]')
    ?.addEventListener('click', () => {
      state.currentQ1Index = Math.max(0, state.currentQ1Index - 1);
      render();
    });

  root
    .querySelector('[data-action="q1-next"]')
    ?.addEventListener('click', () => {
      state.currentQ1Index = Math.min(state.exam.q1.length - 1, state.currentQ1Index + 1);
      render();
    });

  root
    .querySelectorAll('[data-action="q1-jump"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        state.currentQ1Index = Number(button.dataset.index);
        render();
      });
    });

  root
    .querySelector('[data-action="q2-prev"]')
    ?.addEventListener('click', () => {
      state.currentQ2Index = Math.max(0, state.currentQ2Index - 1);
      render();
    });

  root
    .querySelector('[data-action="q2-next"]')
    ?.addEventListener('click', () => {
      state.currentQ2Index = Math.min(state.exam.q2.length - 1, state.currentQ2Index + 1);
      render();
    });

  root
    .querySelectorAll('[data-action="q2-jump"]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        state.currentQ2Index = Number(button.dataset.index);
        render();
      });
    });

  root
    .querySelectorAll(
      '[data-role="q1-input"], [data-role="q2-input"], [data-role="q3-input"], [data-role="q3-net-income"]'
    )
    .forEach((element) => {
      if (element.tagName === 'SELECT') {
        element.addEventListener('change', () => {
          updateAnswerFromElement(element);
        });
        return;
      }

      element.addEventListener('focus', () => {
        handleAmountFieldFocus(element);
      });

      element.addEventListener('input', () => {
        handleAmountFieldInput(element);
        updateAnswerFromElement(element);
      });

      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleAmountFieldBlur(element);
          updateAnswerFromElement(element);
        }
      });

      element.addEventListener('blur', () => {
        handleAmountFieldBlur(element);
        updateAnswerFromElement(element);
      });
    });
}

function bindResultEvents(root) {
  bindResultScreenEvents(root, {
    onToggleDetails: () => {
      state.showDetails = !state.showDetails;
      render();
    },
    onCopyLinks: async () => {
      const links = state.result?.analysis?.reviewLinks ?? [];

      if (!links.length) {
        window.alert('コピー対象のURLがありません。');
        return;
      }

      const text = links.map((link) => `${link.title}\n${link.url}`).join('\n\n');

      try {
        await navigator.clipboard.writeText(text);
        window.alert('復習URLをクリップボードにコピーしました。');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        window.alert('URLコピーに失敗しました。手動でコピーしてください。');
      }
    },
    onDownloadPdf: async () => {
      try {
        await exportResultPdf({ result: state.result });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        window.alert('PDFの出力に失敗しました。ブラウザコンソールを確認してください。');
      }
    },
    onRestart: () => {
      restartToStart();
    }
  });
}

function render() {
  const app = document.getElementById('app');

  if (!app) {
    return;
  }

  if (state.phase === 'start') {
    app.innerHTML = renderStartScreen();
    bindStartScreenEvents(app, { onStart: startExam });
    return;
  }

  if (state.phase === 'exam') {
    calculateProgress();
    app.innerHTML = renderExamScreen(state);
    bindExamEvents(app);
    updateTimerDom();
    return;
  }

  app.innerHTML = renderResultScreen({ result: state.result, showDetails: state.showDetails });
  bindResultEvents(app);
}

function initApp() {
  render();
}

export { initApp };
