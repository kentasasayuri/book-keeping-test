const BS_CREDIT_LABELS = new Set(['買掛金', '未払費用等', '借入金', '純資産合計']);
const PL_DEBIT_LABELS = new Set([
  '売上原価',
  '販売費及び一般管理費',
  '営業外費用（支払利息）',
  '法人税等'
]);

function formatNumber(value) {
  const normalized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[\u2212\uFF0D\u30FC\u2015]/g, '-')
    .trim();

  if (!normalized) {
    return '';
  }

  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue) || numberValue === 0) {
    return '';
  }

  return numberValue.toLocaleString('ja-JP');
}

function formatTableAmount(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue === 0) {
    return '';
  }

  return numberValue.toLocaleString('ja-JP');
}

function renderReadonlyCell() {
  return '<span class="q3-empty-cell">―</span>';
}

function renderAmountInput(rowId, value) {
  return `
    <input
      type="text"
      inputmode="decimal"
      class="js-amount-input q3-amount-input"
      value="${formatNumber(value)}"
      placeholder="0"
      data-role="q3-input"
      data-row-id="${rowId}"
    />
  `;
}

function renderPaperHeading(mainTitle, subTitle = '') {
  return `
    <header class="q3-paper__heading">
      <p class="q3-paper__chapter">第3問</p>
      <h3 class="q3-paper__title">${mainTitle}</h3>
      ${subTitle ? `<p class="q3-paper__subtitle">${subTitle}</p>` : ''}
      <p class="q3-paper__unit">（単位: 円）</p>
    </header>
  `;
}

function normalizeStatementSide(row) {
  if (row.side === '借方' || row.side === '貸方') {
    return row.side;
  }

  if (row.statement === 'bs') {
    return BS_CREDIT_LABELS.has(row.label) ? '貸方' : '借方';
  }

  return PL_DEBIT_LABELS.has(row.label) ? '借方' : '貸方';
}

function getReferenceTrialRows(question) {
  if (Array.isArray(question.preTrialBalance) && question.preTrialBalance.length > 0) {
    return question.preTrialBalance
      .map((row, index) => ({
        id: row.id ?? `pre-${index + 1}`,
        account: row.account || row.label || `科目${index + 1}`,
        side: row.side === '貸方' ? '貸方' : '借方',
        amount: Number(row.amount) || 0
      }))
      .filter((row) => row.amount !== 0);
  }

  if (question.type === 'worksheet') {
    return question.rows
      .map((row, index) => ({
        id: row.id ?? `pre-${index + 1}`,
        account: row.account || `科目${index + 1}`,
        side: row.side === '貸方' ? '貸方' : '借方',
        amount: Number(row.preBalance) || 0
      }))
      .filter((row) => row.amount !== 0);
  }

  const aggregated = new Map();

  question.rows.forEach((row, index) => {
    const amountCandidate = Number(row.preBalance ?? row.answer ?? 0);

    if (!Number.isFinite(amountCandidate) || amountCandidate === 0) {
      return;
    }

    const account = row.account || row.label || `科目${index + 1}`;
    const side = normalizeStatementSide(row);
    const key = `${side}:${account}`;
    const current = aggregated.get(key) ?? { id: key, account, side, amount: 0 };

    current.amount += amountCandidate;
    aggregated.set(key, current);
  });

  return Array.from(aggregated.values()).sort((a, b) => {
    if (a.side !== b.side) {
      return a.side === '借方' ? -1 : 1;
    }

    return a.account.localeCompare(b.account, 'ja');
  });
}

function renderAdjustments(question) {
  return `
    <section class="q3-panel q3-panel--instructions">
      <h3 class="q3-panel__title">決算整理事項</h3>
      <ol class="q3-adjustment-list">
        ${question.adjustments.map((item) => `<li>${item}</li>`).join('')}
      </ol>
    </section>
  `;
}

function renderTrialBalanceReference(question) {
  const rows = getReferenceTrialRows(question);
  const debitTotal = rows
    .filter((row) => row.side === '借方')
    .reduce((sum, row) => sum + row.amount, 0);
  const creditTotal = rows
    .filter((row) => row.side === '貸方')
    .reduce((sum, row) => sum + row.amount, 0);

  return `
    <section class="q3-panel q3-panel--paper q3-panel--compact">
      ${renderPaperHeading('決算整理前残高試算表', 'X8年3月31日')}
      <table class="q3-form-table q3-form-table--trial">
        <thead>
          <tr>
            <th>借方</th>
            <th>勘定科目</th>
            <th>貸方</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const debit = row.side === '借方' ? formatTableAmount(row.amount) : '';
              const credit = row.side === '貸方' ? formatTableAmount(row.amount) : '';

              return `
                <tr>
                  <td class="q3-amount-cell">${debit}</td>
                  <td class="q3-account-cell">${row.account}</td>
                  <td class="q3-amount-cell">${credit}</td>
                </tr>
              `;
            })
            .join('')}
          <tr class="q3-total-row">
            <td class="q3-amount-cell">${formatTableAmount(debitTotal)}</td>
            <td class="q3-account-cell">合計</td>
            <td class="q3-amount-cell">${formatTableAmount(creditTotal)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderWorksheetAnswerSheet(question, rowAnswers) {
  return `
    <section class="q3-panel q3-panel--paper">
      ${renderPaperHeading('決算整理後残高試算表', 'X8年3月31日')}
      <table class="q3-form-table q3-form-table--answer">
        <thead>
          <tr>
            <th>借方（入力）</th>
            <th>勘定科目</th>
            <th>貸方（入力）</th>
          </tr>
        </thead>
        <tbody>
          ${question.rows
            .map((row) => {
              const value = rowAnswers[row.id] ?? '';
              const debitInput = row.side === '借方' ? renderAmountInput(row.id, value) : renderReadonlyCell();
              const creditInput = row.side === '貸方' ? renderAmountInput(row.id, value) : renderReadonlyCell();

              return `
                <tr>
                  <td class="q3-input-cell">${debitInput}</td>
                  <td class="q3-account-cell">${row.account}</td>
                  <td class="q3-input-cell">${creditInput}</td>
                </tr>
              `;
            })
            .join('')}
          <tr class="q3-total-row">
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-account-cell">合計</td>
            <td class="q3-amount-cell">（　　　）</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderWorksheet8AnswerSheet(question, rowAnswers) {
  const rows = question.worksheetRows ?? [];

  return `
    <section class="q3-panel q3-panel--paper">
      ${renderPaperHeading('精算表', 'X8年3月31日')}
      <div class="q3-table-scroll">
      <table class="q3-form-table q3-form-table--worksheet8">
        <thead>
          <tr>
            <th rowspan="2">勘定科目</th>
            <th colspan="2">残高試算表</th>
            <th colspan="2">修正記入</th>
            <th colspan="2">損益計算書</th>
            <th colspan="2">貸借対照表</th>
          </tr>
          <tr>
            <th>借方</th>
            <th>貸方</th>
            <th>借方</th>
            <th>貸方</th>
            <th>借方</th>
            <th>貸方</th>
            <th>借方</th>
            <th>貸方</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const adjDebit = row.cells?.adjDebit;
              const adjCredit = row.cells?.adjCredit;
              const plDebit = row.cells?.plDebit;
              const plCredit = row.cells?.plCredit;
              const bsDebit = row.cells?.bsDebit;
              const bsCredit = row.cells?.bsCredit;

              const renderWorksheet8Cell = (cell) => {
                if (!cell?.enabled) {
                  return renderReadonlyCell();
                }

                return renderAmountInput(cell.id, rowAnswers[cell.id] ?? '');
              };

              return `
                <tr>
                  <td class="q3-account-cell">${row.account}</td>
                  <td class="q3-amount-cell">${formatTableAmount(row.preDebit)}</td>
                  <td class="q3-amount-cell">${formatTableAmount(row.preCredit)}</td>
                  <td class="q3-input-cell">${renderWorksheet8Cell(adjDebit)}</td>
                  <td class="q3-input-cell">${renderWorksheet8Cell(adjCredit)}</td>
                  <td class="q3-input-cell">${renderWorksheet8Cell(plDebit)}</td>
                  <td class="q3-input-cell">${renderWorksheet8Cell(plCredit)}</td>
                  <td class="q3-input-cell">${renderWorksheet8Cell(bsDebit)}</td>
                  <td class="q3-input-cell">${renderWorksheet8Cell(bsCredit)}</td>
                </tr>
              `;
            })
            .join('')}
          <tr class="q3-total-row">
            <td class="q3-account-cell">合計</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-amount-cell">（　　　）</td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>
  `;
}

function pairRows(rows) {
  const debitRows = rows.filter((row) => normalizeStatementSide(row) === '借方');
  const creditRows = rows.filter((row) => normalizeStatementSide(row) === '貸方');
  const pairCount = Math.max(debitRows.length, creditRows.length);

  return Array.from({ length: pairCount }, (_, index) => ({
    debit: debitRows[index] ?? null,
    credit: creditRows[index] ?? null
  }));
}

function renderStatementRowEntry(row, rowAnswers) {
  if (!row) {
    return {
      label: '',
      input: renderReadonlyCell()
    };
  }

  return {
    label: row.label,
    input: renderAmountInput(row.id, rowAnswers[row.id] ?? '')
  };
}

function renderSideBadge(side) {
  const className = side === '借方' ? 'debit' : 'credit';
  return `<span class="q3-side-badge ${className}">${side}</span>`;
}

function renderStatementLabeledEntry(row, rowAnswers, side) {
  if (!row) {
    return {
      label: '',
      input: renderReadonlyCell()
    };
  }

  return {
    label: `${renderSideBadge(side)}${row.label}`,
    input: renderAmountInput(row.id, rowAnswers[row.id] ?? '')
  };
}

function renderStatementSheet({ title, subTitle, debitLabel, creditLabel, rows, rowAnswers }) {
  const pairs = pairRows(rows);

  return `
    <section class="q3-panel q3-panel--paper">
      ${renderPaperHeading(title, subTitle)}
      <table class="q3-form-table q3-form-table--statement">
        <thead>
          <tr class="q3-statement-head-group">
            <th colspan="2" class="q3-statement-head q3-statement-head--debit">借方（${debitLabel}）</th>
            <th class="q3-statement-split"></th>
            <th colspan="2" class="q3-statement-head q3-statement-head--credit">貸方（${creditLabel}）</th>
          </tr>
          <tr>
            <th>科目</th>
            <th>金額（入力）</th>
            <th class="q3-statement-split"></th>
            <th>科目</th>
            <th>金額（入力）</th>
          </tr>
        </thead>
        <tbody>
          ${pairs
            .map((pair) => {
              const debit = renderStatementLabeledEntry(pair.debit, rowAnswers, '借方');
              const credit = renderStatementLabeledEntry(pair.credit, rowAnswers, '貸方');

              return `
                <tr>
                  <td class="q3-account-cell">${debit.label}</td>
                  <td class="q3-input-cell">${debit.input}</td>
                  <td class="q3-statement-split"></td>
                  <td class="q3-account-cell">${credit.label}</td>
                  <td class="q3-input-cell">${credit.input}</td>
                </tr>
              `;
            })
            .join('')}
          <tr class="q3-total-row">
            <td class="q3-account-cell">合計（借方）</td>
            <td class="q3-amount-cell">（　　　）</td>
            <td class="q3-statement-split"></td>
            <td class="q3-account-cell">合計（貸方）</td>
            <td class="q3-amount-cell">（　　　）</td>
          </tr>
        </tbody>
      </table>
    </section>
  `;
}

function renderNetIncomeBox(netIncomeAnswer, isAnswered) {
  return `
    <section class="q3-panel q3-panel--paper q3-net-income-box">
      <h3 class="q3-panel__title">問2 当期純利益（または純損失）</h3>
      <div class="q3-net-income-box__row">
        <span>¥</span>
        <input
          type="text"
          inputmode="decimal"
          class="js-amount-input q3-amount-input"
          value="${formatNumber(netIncomeAnswer)}"
          placeholder="例: -12000"
          data-role="q3-net-income"
        />
      </div>
      <p class="mb-sm mt-sm">純損失はマイナスで入力（例: -12000）。</p>
      <p class="mb-sm mt-sm">入力状況: ${isAnswered ? '完了' : '未完了'}</p>
    </section>
  `;
}

function renderWorksheetMode(question, rowAnswers, netIncomeAnswer, isAnswered) {
  return `
    <div class="q3-workspace">
      <section class="q3-page">
        <div class="q3-page__title">資料ページ</div>
        <p class="q3-page__prompt">${question.prompt}</p>
        <div class="q3-grid-two">
          ${renderTrialBalanceReference(question)}
          ${renderAdjustments(question)}
        </div>
      </section>

      <section class="q3-page">
        <div class="q3-page__title">答案ページ</div>
        ${renderWorksheetAnswerSheet(question, rowAnswers)}
        ${renderNetIncomeBox(netIncomeAnswer, isAnswered)}
      </section>
    </div>
  `;
}

function renderBSPLMode(question, rowAnswers, netIncomeAnswer, isAnswered) {
  const plRows = question.rows.filter((row) => row.statement === 'pl');
  const bsRows = question.rows.filter((row) => row.statement === 'bs');

  return `
    <div class="q3-workspace">
      <section class="q3-page">
        <div class="q3-page__title">資料ページ</div>
        <p class="q3-page__prompt">${question.prompt}</p>
        <div class="q3-grid-two">
          ${renderTrialBalanceReference(question)}
          ${renderAdjustments(question)}
        </div>
      </section>

      <section class="q3-page">
        <div class="q3-page__title">答案ページ（貸借対照表）</div>
        ${renderStatementSheet({
          title: '貸借対照表',
          subTitle: 'X8年3月31日',
          debitLabel: '資産の部',
          creditLabel: '負債・純資産の部',
          rows: bsRows,
          rowAnswers
        })}
      </section>

      <section class="q3-page">
        <div class="q3-page__title">答案ページ（損益計算書）</div>
        ${renderStatementSheet({
          title: '損益計算書',
          subTitle: 'X7年4月1日からX8年3月31日まで',
          debitLabel: '費用の部',
          creditLabel: '収益の部',
          rows: plRows,
          rowAnswers
        })}
        ${renderNetIncomeBox(netIncomeAnswer, isAnswered)}
      </section>
    </div>
  `;
}

function renderWorksheet8Mode(question, rowAnswers, netIncomeAnswer, isAnswered) {
  return `
    <div class="q3-workspace">
      <section class="q3-page">
        <div class="q3-page__title">資料ページ</div>
        <p class="q3-page__prompt">${question.prompt}</p>
        <div class="q3-grid-two">
          ${renderTrialBalanceReference(question)}
          ${renderAdjustments(question)}
        </div>
      </section>

      <section class="q3-page">
        <div class="q3-page__title">答案ページ（精算表8欄）</div>
        ${renderWorksheet8AnswerSheet(question, rowAnswers)}
        ${renderNetIncomeBox(netIncomeAnswer, isAnswered)}
      </section>
    </div>
  `;
}

function renderQuestion3({ question, rowAnswers, netIncomeAnswer, isAnswered }) {
  const modeLabel =
    question.type === 'bspl'
      ? '出題形式: B/S・P/L作成型'
      : question.type === 'worksheet8'
      ? '出題形式: 精算表8欄作成型'
      : '出題形式: 決算整理後残高試算表型';
  const bodyHtml =
    question.type === 'bspl'
      ? renderBSPLMode(question, rowAnswers, netIncomeAnswer, isAnswered)
      : question.type === 'worksheet8'
      ? renderWorksheet8Mode(question, rowAnswers, netIncomeAnswer, isAnswered)
      : renderWorksheetMode(question, rowAnswers, netIncomeAnswer, isAnswered);

  return `
    <section>
      <div class="question-header">
        <h2 class="question-header__title">${question.title}</h2>
        <span class="question-header__points">35点</span>
      </div>

      <p class="mb-sm">${modeLabel}</p>
      ${bodyHtml}
    </section>
  `;
}

export { renderQuestion3 };
