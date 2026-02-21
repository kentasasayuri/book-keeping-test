function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lineBreak(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function fmtAmt(v) {
  return Number.isFinite(v) ? v.toLocaleString('ja-JP') : '―';
}

function cellClass(ok) {
  return ok ? 'review-cell--ok' : 'review-cell--ng';
}

function renderJournalComparisonTable(journalRows) {
  if (!journalRows || journalRows.length === 0) return '';
  return `
    <table class="review-table">
      <thead>
        <tr>
          <th rowspan="2">行</th>
          <th colspan="2">借方</th>
          <th colspan="2">貸方</th>
        </tr>
        <tr><th>科目</th><th>金額</th><th>科目</th><th>金額</th></tr>
      </thead>
      <tbody>
        ${journalRows.map((row, i) => `
          <tr>
            <td class="review-table__rowno">${i + 1}</td>
            <td class="${cellClass(row.debitAccount.ok)}">
              <div class="review-cell__user">${escapeHtml(row.debitAccount.user || '―')}</div>
              ${!row.debitAccount.ok ? `<div class="review-cell__correct">→ ${escapeHtml(row.debitAccount.correct || '―')}</div>` : ''}
            </td>
            <td class="${cellClass(row.debitAmount.ok)}">
              <div class="review-cell__user">${fmtAmt(row.debitAmount.user)}</div>
              ${!row.debitAmount.ok ? `<div class="review-cell__correct">→ ${fmtAmt(row.debitAmount.correct)}</div>` : ''}
            </td>
            <td class="${cellClass(row.creditAccount.ok)}">
              <div class="review-cell__user">${escapeHtml(row.creditAccount.user || '―')}</div>
              ${!row.creditAccount.ok ? `<div class="review-cell__correct">→ ${escapeHtml(row.creditAccount.correct || '―')}</div>` : ''}
            </td>
            <td class="${cellClass(row.creditAmount.ok)}">
              <div class="review-cell__user">${fmtAmt(row.creditAmount.user)}</div>
              ${!row.creditAmount.ok ? `<div class="review-cell__correct">→ ${fmtAmt(row.creditAmount.correct)}</div>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderFieldComparisonTable(fieldRows) {
  if (!fieldRows || fieldRows.length === 0) return '';
  return `
    <table class="review-table">
      <thead>
        <tr><th>項目</th><th>科目</th><th>金額</th></tr>
      </thead>
      <tbody>
        ${fieldRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td class="${cellClass(row.acctOk)}">
              <div class="review-cell__user">${escapeHtml(row.userAccount || '―')}</div>
              ${!row.acctOk ? `<div class="review-cell__correct">→ ${escapeHtml(row.correctAccount)}</div>` : ''}
            </td>
            <td class="${cellClass(row.amtOk)}">
              <div class="review-cell__user">${fmtAmt(row.userAmount)}</div>
              ${!row.amtOk ? `<div class="review-cell__correct">→ ${fmtAmt(row.correctAmount)}</div>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderDetailItem(item, index) {
  const statusClass = item.correct ? 'correct' : 'incorrect';
  const statusText = item.correct ? '正解' : '不正解';

  // Use structured comparison tables if available
  let comparisonHtml = '';
  if (item.journalRows) {
    comparisonHtml = renderJournalComparisonTable(item.journalRows);
  } else if (item.fieldRows) {
    comparisonHtml = renderFieldComparisonTable(item.fieldRows);
  } else {
    // Fallback for Q3 and other types
    comparisonHtml = `
      <div class="explanation-item__answer">
        <h4>あなたの解答</h4>
        <p>${lineBreak(item.userAnswerText)}</p>
      </div>
      <div class="explanation-item__answer">
        <h4>正答</h4>
        <p>${lineBreak(item.correctAnswerText)}</p>
      </div>
    `;
  }

  return `
    <article class="explanation-item ${statusClass}">
      <div class="explanation-item__header">
        <p class="explanation-item__number">${index + 1}. ${item.sectionLabel}</p>
        <span class="explanation-item__result ${statusClass}">${statusText}（${item.score}/${item.maxScore}点）</span>
      </div>
      <p class="explanation-item__question">${lineBreak(item.questionText)}</p>
      ${comparisonHtml}
      <div class="explanation-item__detail-box">
        <h4>解説</h4>
        <p class="explanation-item__detail">${lineBreak(item.explanation)}</p>
      </div>
    </article>
  `;
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${lineBreak(item)}</li>`).join('')}</ul>`;
}

function renderAnalysis(analysis) {
  if (!analysis) {
    return '';
  }

  const links = analysis.reviewLinks ?? [];

  return `
    <section class="analysis-card">
      <h3 class="analysis-card__title">復習分析</h3>
      <p class="analysis-card__summary">${lineBreak(analysis.summary)}</p>

      <div class="analysis-insights">
        ${(analysis.sectionInsights ?? [])
      .map(
        (insight) => `
              <div class="analysis-insight">
                <p class="analysis-insight__label">${escapeHtml(insight.label)}</p>
                <p class="analysis-insight__score">${insight.score}/${insight.maxScore}（${insight.accuracy}%）</p>
                <p class="analysis-insight__status">${escapeHtml(insight.status)}</p>
              </div>
            `
      )
      .join('')}
      </div>

      <div class="analysis-grid">
        <section>
          <h4>強み</h4>
          ${renderList(analysis.strengths ?? [])}
        </section>
        <section>
          <h4>弱点</h4>
          ${renderList(analysis.weaknesses ?? [])}
        </section>
        <section>
          <h4>次回までの優先アクション</h4>
          ${renderList(analysis.recommendations ?? [])}
        </section>
      </div>

      <section class="analysis-links">
        <h4>復習動画（${escapeHtml(analysis.channel?.name ?? '')}）</h4>
        <div class="analysis-links__url">${escapeHtml(analysis.channel?.url ?? '')}</div>
        <ul>
          ${links
      .map(
        (link) => `
                <li>
                  <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title)}</a>
                  <div class="analysis-links__url">${escapeHtml(link.url)}</div>
                </li>
              `
      )
      .join('')}
        </ul>
      </section>
    </section>
  `;
}

function renderResultScreen({ result, showDetails }) {
  const icon = result.passed ? '○' : '×';
  const resultClass = result.passed ? 'pass' : 'fail';
  const resultText = result.passed ? '合格' : '不合格';

  return `
    <section class="result-screen">
      <div class="result-card">
        <div class="result-badge">
          <div class="result-badge__icon ${resultClass}">${icon}</div>
          <p class="result-badge__text ${resultClass}">${resultText}</p>
        </div>

        <div class="result-score">
          <div class="score-tile">
            <p class="score-tile__label">第1問</p>
            <p class="score-tile__value">${result.sectionScores.q1}</p>
            <p class="score-tile__max">/45</p>
          </div>
          <div class="score-tile">
            <p class="score-tile__label">第2問</p>
            <p class="score-tile__value">${result.sectionScores.q2}</p>
            <p class="score-tile__max">/20</p>
          </div>
          <div class="score-tile">
            <p class="score-tile__label">第3問</p>
            <p class="score-tile__value">${result.sectionScores.q3}</p>
            <p class="score-tile__max">/35</p>
          </div>
          <div class="score-tile score-tile--total">
            <p class="score-tile__label">総合得点</p>
            <p class="score-tile__value">${result.totalScore}</p>
            <p class="score-tile__max">/100</p>
          </div>
        </div>

        ${renderAnalysis(result.analysis)}

        <div class="result-actions">
          <button type="button" class="btn btn--secondary" data-action="toggle-details">
            ${showDetails ? '詳細を閉じる' : '解答・解説を表示'}
          </button>
          <button type="button" class="btn btn--secondary" data-action="copy-links">復習URLをコピー</button>
          <button type="button" class="btn btn--success" data-action="download-pdf">PDFダウンロード</button>
          <button type="button" class="btn btn--primary" data-action="restart-exam">もう一度受験する</button>
        </div>

        ${showDetails
      ? `
              <section class="explanation-section">
                <h3 class="explanation-section__title">解答・解説</h3>
                ${result.detailItems.map((item, index) => renderDetailItem(item, index)).join('')}
              </section>
            `
      : ''
    }
      </div>
    </section>
  `;
}

function bindResultScreenEvents(root, handlers) {
  const toggleButton = root.querySelector('[data-action="toggle-details"]');
  const copyLinksButton = root.querySelector('[data-action="copy-links"]');
  const pdfButton = root.querySelector('[data-action="download-pdf"]');
  const restartButton = root.querySelector('[data-action="restart-exam"]');

  if (toggleButton) {
    toggleButton.addEventListener('click', handlers.onToggleDetails);
  }

  if (copyLinksButton && handlers.onCopyLinks) {
    copyLinksButton.addEventListener('click', handlers.onCopyLinks);
  }

  if (pdfButton) {
    pdfButton.addEventListener('click', handlers.onDownloadPdf);
  }

  if (restartButton) {
    restartButton.addEventListener('click', handlers.onRestart);
  }
}

export { renderResultScreen, bindResultScreenEvents };
