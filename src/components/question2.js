function formatNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue === 0) {
    return '';
  }

  return numberValue.toLocaleString('ja-JP');
}

function renderSelectOptions(options, selectedValue, placeholder = '科目を選択') {
  const head = `<option value="">${placeholder}</option>`;
  const body = options
    .map((option) => {
      const selected = option === selectedValue ? 'selected' : '';
      return `<option value="${option}" ${selected}>${option}</option>`;
    })
    .join('');

  return `${head}${body}`;
}

function renderLedgerQuestion(question, answerMap) {
  return `
    <article class="ledger-problem">
      <h3 class="ledger-problem__title">${question.title}</h3>
      <p class="mb-md">${question.prompt}</p>
      <ul class="mb-lg">
        ${question.context.map((item) => `<li>${item}</li>`).join('')}
      </ul>

      <table class="t-account">
        <thead>
          <tr>
            <th>区分</th>
            <th>内容</th>
            <th>相手科目</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>
          ${question.rows
            .map((row) => {
              const accountValue = answerMap[`${row.id}_account`] ?? '';
              const amountValue = answerMap[`${row.id}_amount`] ?? '';

              return `
                <tr>
                  <td>${row.side}</td>
                  <td>${row.label}</td>
                  <td>
                    <select
                      data-role="q2-input"
                      data-q2-id="${question.id}"
                      data-field="${row.id}_account"
                    >
                      ${renderSelectOptions(question.accountOptions, accountValue)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      inputmode="numeric"
                      class="js-amount-input"
                      placeholder="0"
                      value="${formatNumber(amountValue)}"
                      data-role="q2-input"
                      data-q2-id="${question.id}"
                      data-field="${row.id}_amount"
                    />
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </article>
  `;
}

function groupVoucherRows(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const matched = row.id.match(/_(\d+)$/);
    const sequence = matched ? Number(matched[1]) : grouped.size + 1;
    const current = grouped.get(sequence) ?? { debit: null, credit: null };

    if (row.side === '借方') {
      current.debit = row;
    } else {
      current.credit = row;
    }

    grouped.set(sequence, current);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map((entry) => entry[1]);
}

function renderVoucherLedgerQuestion(question, answerMap) {
  const lines = groupVoucherRows(question.rows);

  return `
    <article class="ledger-problem">
      <h3 class="ledger-problem__title">${question.title}</h3>
      <p class="mb-md">${question.prompt}</p>
      <ul class="mb-lg">
        ${question.context.map((item) => `<li>${item}</li>`).join('')}
      </ul>

      <table class="t-account">
        <thead>
          <tr>
            <th colspan="2">借方</th>
            <th colspan="2">貸方</th>
            <th>摘要</th>
          </tr>
          <tr>
            <th>科目</th>
            <th>金額</th>
            <th>科目</th>
            <th>金額</th>
            <th>伝票行</th>
          </tr>
        </thead>
        <tbody>
          ${lines
            .map((line, rowIndex) => {
              const debit = line.debit;
              const credit = line.credit;
              const debitAccount = debit ? answerMap[`${debit.id}_account`] ?? '' : '';
              const debitAmount = debit ? answerMap[`${debit.id}_amount`] ?? '' : '';
              const creditAccount = credit ? answerMap[`${credit.id}_account`] ?? '' : '';
              const creditAmount = credit ? answerMap[`${credit.id}_amount`] ?? '' : '';

              return `
                <tr>
                  <td>
                    ${
                      debit
                        ? `<select data-role="q2-input" data-q2-id="${question.id}" data-field="${debit.id}_account">${renderSelectOptions(
                            question.accountOptions,
                            debitAccount
                          )}</select>`
                        : '<span class="q3-empty-cell">―</span>'
                    }
                  </td>
                  <td>
                    ${
                      debit
                        ? `<input type="text" inputmode="numeric" class="js-amount-input" placeholder="0" value="${formatNumber(
                            debitAmount
                          )}" data-role="q2-input" data-q2-id="${question.id}" data-field="${debit.id}_amount" />`
                        : '<span class="q3-empty-cell">―</span>'
                    }
                  </td>
                  <td>
                    ${
                      credit
                        ? `<select data-role="q2-input" data-q2-id="${question.id}" data-field="${credit.id}_account">${renderSelectOptions(
                            question.accountOptions,
                            creditAccount
                          )}</select>`
                        : '<span class="q3-empty-cell">―</span>'
                    }
                  </td>
                  <td>
                    ${
                      credit
                        ? `<input type="text" inputmode="numeric" class="js-amount-input" placeholder="0" value="${formatNumber(
                            creditAmount
                          )}" data-role="q2-input" data-q2-id="${question.id}" data-field="${credit.id}_amount" />`
                        : '<span class="q3-empty-cell">―</span>'
                    }
                  </td>
                  <td>伝票${rowIndex + 1}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </article>
  `;
}

function renderInventoryQuestion(question, answerMap) {
  return `
    <article class="ledger-problem">
      <h3 class="ledger-problem__title">${question.title}</h3>
      <p class="mb-md">${question.prompt}</p>

      <table class="t-account mb-lg">
        <thead>
          <tr>
            <th>区分</th>
            <th>数量</th>
            <th>単価</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>前月繰越</td>
            <td>${question.beginning.qty}</td>
            <td>${question.beginning.unitCost.toLocaleString('ja-JP')}</td>
            <td>${question.beginning.amount.toLocaleString('ja-JP')}</td>
          </tr>
          ${question.transactions
            .map((transaction) => {
              const unit = transaction.unitCost ?? transaction.unitPrice ?? '-';
              const amount = transaction.amount ? transaction.amount.toLocaleString('ja-JP') : '-';

              return `
                <tr>
                  <td>${transaction.date} ${transaction.type}</td>
                  <td>${transaction.qty}</td>
                  <td>${unit.toLocaleString ? unit.toLocaleString('ja-JP') : unit}</td>
                  <td>${amount}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <table class="t-account">
        <thead>
          <tr>
            <th>入力項目</th>
            <th>解答</th>
          </tr>
        </thead>
        <tbody>
          ${question.fields
            .map((field) => {
              const value = answerMap[field.id] ?? '';

              return `
                <tr>
                  <td>${field.label}</td>
                  <td>
                    <input
                      type="text"
                      inputmode="numeric"
                      class="js-amount-input"
                      placeholder="0"
                      value="${formatNumber(value)}"
                      data-role="q2-input"
                      data-q2-id="${question.id}"
                      data-field="${field.id}"
                    />
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </article>
  `;
}

function renderSubbookQuestion(question, answerMap) {
  return `
    <article class="ledger-problem">
      <h3 class="ledger-problem__title">${question.title}</h3>
      <p class="mb-md">${question.prompt}</p>

      <table class="t-account">
        <thead>
          <tr>
            <th>取引内容</th>
            <th>選択</th>
          </tr>
        </thead>
        <tbody>
          ${question.fields
            .map((field) => {
              const value = answerMap[field.id] ?? '';

              return `
                <tr>
                  <td>${field.label}</td>
                  <td>
                    <select
                      data-role="q2-input"
                      data-q2-id="${question.id}"
                      data-field="${field.id}"
                    >
                      ${renderSelectOptions(field.options, value, '帳簿を選択')}
                    </select>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </article>
  `;
}

function renderTheoryQuestion(question, answerMap) {
  return `
    <article class="ledger-problem">
      <h3 class="ledger-problem__title">${question.title}</h3>
      <p class="mb-md">${question.prompt}</p>

      <table class="t-account">
        <thead>
          <tr>
            <th>設問</th>
            <th>解答</th>
          </tr>
        </thead>
        <tbody>
          ${question.fields
            .map((field) => {
              const value = answerMap[field.id] ?? '';

              return `
                <tr>
                  <td>${field.label}</td>
                  <td>
                    <select
                      data-role="q2-input"
                      data-q2-id="${question.id}"
                      data-field="${field.id}"
                    >
                      ${renderSelectOptions(field.options, value, '語句を選択')}
                    </select>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </article>
  `;
}

function renderQuestion2({ questions, currentIndex, answersById, answeredFlags }) {
  const current = questions[currentIndex];
  const answerMap = answersById[current.id] ?? {};

  let questionBody = '';
  if (current.type === 'ledger') {
    questionBody =
      current.format === 'voucher'
        ? renderVoucherLedgerQuestion(current, answerMap)
        : renderLedgerQuestion(current, answerMap);
  } else if (current.type === 'inventory') {
    questionBody = renderInventoryQuestion(current, answerMap);
  } else if (current.format === 'subbook') {
    questionBody = renderSubbookQuestion(current, answerMap);
  } else {
    questionBody = renderTheoryQuestion(current, answerMap);
  }

  return `
    <section>
      <div class="question-header">
        <h2 class="question-header__title">第2問 帳簿記入・理論問題（2問）</h2>
        <span class="question-header__points">20点</span>
      </div>

      <div class="question-navigation">
        ${questions
          .map((question, index) => {
            const classes = ['q-num-btn'];

            if (index === currentIndex) {
              classes.push('active');
            }

            if (answeredFlags[index]) {
              classes.push('answered');
            }

            return `
              <button type="button" class="${classes.join(' ')}" data-action="q2-jump" data-index="${index}">
                ${index + 1}
              </button>
            `;
          })
          .join('')}
      </div>

      ${questionBody}

      <div class="question-pager">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-action="q2-prev"
          ${currentIndex === 0 ? 'disabled' : ''}
        >
          前の問題
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          data-action="q2-next"
          ${currentIndex === questions.length - 1 ? 'disabled' : ''}
        >
          次の問題
        </button>
      </div>
    </section>
  `;
}

export { renderQuestion2 };
