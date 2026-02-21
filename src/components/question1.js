function formatNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue === 0) {
    return '';
  }

  return numberValue.toLocaleString('ja-JP');
}

function formatCurrency(value) {
  return `¥ ${Number(value).toLocaleString('ja-JP')}`;
}

function renderAccountOptions(options, selectedValue) {
  const defaultOption = '<option value="">科目を選択</option>';
  const list = options
    .map((account) => {
      const selected = account === selectedValue ? 'selected' : '';
      return `<option value="${account}" ${selected}>${account}</option>`;
    })
    .join('');

  return `${defaultOption}${list}`;
}

function renderOptionHint(options) {
  const labels = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク'];

  return `
    <div class="option-hint">
      ${options
        .map(
          (account, index) =>
            `<span class="option-hint__item">${labels[index] ?? `(${index + 1})`} ${account}</span>`
        )
        .join('')}
    </div>
  `;
}

function renderInvoiceDocument(document) {
  if (!document || document.type !== 'invoice') {
    return '';
  }

  const subtotal = document.items.reduce((sum, item) => sum + item.amount, 0);

  return `
    <section class="invoice-sheet">
      <div class="invoice-sheet__title">${document.title}</div>
      <div class="invoice-sheet__header">
        <p>${document.to}</p>
        <p>${document.issueDate}</p>
      </div>
      <div class="invoice-sheet__summary">
        <p>ご請求金額 ${formatCurrency(document.total)}</p>
        <p>${document.issuer}（${document.registrationNumber}）</p>
      </div>
      <table class="invoice-sheet__table">
        <thead>
          <tr>
            <th>品名</th>
            <th>数量</th>
            <th>単価</th>
            <th>金額</th>
          </tr>
        </thead>
        <tbody>
          ${document.items
            .map(
              (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty.toLocaleString('ja-JP')}</td>
                  <td>${item.unitPrice.toLocaleString('ja-JP')}</td>
                  <td>${item.amount.toLocaleString('ja-JP')}</td>
                </tr>
              `
            )
            .join('')}
          <tr>
            <td colspan="3">小計</td>
            <td>${subtotal.toLocaleString('ja-JP')}</td>
          </tr>
          <tr>
            <td colspan="3">消費税</td>
            <td>${document.tax.toLocaleString('ja-JP')}</td>
          </tr>
          <tr>
            <td colspan="3">合計</td>
            <td>${document.total.toLocaleString('ja-JP')}</td>
          </tr>
        </tbody>
      </table>
      <p class="invoice-sheet__note">${document.dueDate}までに下記口座へお振り込みください。</p>
      <p class="invoice-sheet__bank">${document.bankInfo}</p>
    </section>
  `;
}

function renderCollectionSlipDocument(document) {
  if (!document || document.type !== 'collection-slip') {
    return '';
  }

  return `
    <section class="invoice-sheet invoice-sheet--narrow">
      <div class="invoice-sheet__title">${document.title}</div>
      <div class="invoice-sheet__header">
        <p>${document.to}</p>
        <p>${document.issueDate}</p>
      </div>
      <table class="invoice-sheet__table">
        <tbody>
          <tr>
            <th>請求金額</th>
            <td>${document.amount.toLocaleString('ja-JP')}</td>
          </tr>
          <tr>
            <th>振込入金日</th>
            <td>${document.settlementDate}</td>
          </tr>
          <tr>
            <th>入金口座</th>
            <td>${document.bankAccount}</td>
          </tr>
        </tbody>
      </table>
      <p class="invoice-sheet__note">${document.note}</p>
    </section>
  `;
}

function renderDailySalesSheet(document) {
  if (!document || document.type !== 'daily-sales-sheet') {
    return '';
  }

  return `
    <section class="invoice-sheet invoice-sheet--narrow">
      <div class="invoice-sheet__title">${document.title}</div>
      <div class="invoice-sheet__header">
        <p>${document.storeName}</p>
        <p>${document.businessDate}</p>
      </div>
      <table class="invoice-sheet__table">
        <thead>
          <tr>
            <th>区分</th>
            <th>金額</th>
            <th>備考</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>現金売上</td>
            <td>${document.cashSales.toLocaleString('ja-JP')}</td>
            <td>当日入金</td>
          </tr>
          <tr>
            <td>クレジット売上</td>
            <td>${document.creditSales.toLocaleString('ja-JP')}</td>
            <td>手数料率 ${document.feeRatePercent}%</td>
          </tr>
          <tr>
            <td>加盟店手数料</td>
            <td>${document.feeAmount.toLocaleString('ja-JP')}</td>
            <td>控除</td>
          </tr>
          <tr>
            <td>売上合計</td>
            <td>${document.totalSales.toLocaleString('ja-JP')}</td>
            <td>税込</td>
          </tr>
        </tbody>
      </table>
      <p class="invoice-sheet__note">${document.note}</p>
    </section>
  `;
}

function renderAssetPurchaseSlip(document) {
  if (!document || document.type !== 'asset-purchase-slip') {
    return '';
  }

  return `
    <section class="invoice-sheet invoice-sheet--narrow">
      <div class="invoice-sheet__title">${document.title}</div>
      <div class="invoice-sheet__header">
        <p>${document.vendor}</p>
        <p>${document.issueDate}</p>
      </div>
      <table class="invoice-sheet__table">
        <thead>
          <tr>
            <th>項目</th>
            <th>金額</th>
            <th>処理</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>本体代金</td>
            <td>${document.itemAmount.toLocaleString('ja-JP')}</td>
            <td>資産判定</td>
          </tr>
          <tr>
            <td>設置費</td>
            <td>${document.setupFee.toLocaleString('ja-JP')}</td>
            <td>付随費用</td>
          </tr>
          <tr>
            <td>配送料</td>
            <td>${document.deliveryFee.toLocaleString('ja-JP')}</td>
            <td>付随費用</td>
          </tr>
          <tr>
            <td>合計</td>
            <td>${document.total.toLocaleString('ja-JP')}</td>
            <td>${document.paymentMethod}</td>
          </tr>
        </tbody>
      </table>
      <p class="invoice-sheet__note">${document.policyNote}</p>
    </section>
  `;
}

function renderQuestionDocument(document) {
  return (
    renderInvoiceDocument(document) ||
    renderCollectionSlipDocument(document) ||
    renderDailySalesSheet(document) ||
    renderAssetPurchaseSlip(document)
  );
}

function resolveJournalRowCount(question, answer) {
  return Math.max(question?.lineCount ?? 4, answer?.debit?.length ?? 0, answer?.credit?.length ?? 0, 4);
}

function renderQuestion1({ questions, currentIndex, answersById, answeredFlags }) {
  const current = questions[currentIndex];
  const answer = answersById[current.id];
  const rowCount = resolveJournalRowCount(current, answer);

  return `
    <section>
      <div class="question-header">
        <h2 class="question-header__title">第1問 仕訳問題（15問）</h2>
        <span class="question-header__points">45点</span>
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
              <button type="button" class="${classes.join(' ')}" data-action="q1-jump" data-index="${index}">
                ${index + 1}
              </button>
            `;
          })
          .join('')}
      </div>

      <article class="journal-question">
        <p class="journal-question__number">問題 ${currentIndex + 1} / ${questions.length}</p>
        <p class="journal-question__text">${current.prompt}</p>
        <p class="journal-question__meta">借方・貸方ともに必要な行だけ入力してください（空欄行は採点対象外）。</p>
        ${renderQuestionDocument(current.document)}
        ${renderOptionHint(current.options)}

        <div class="journal-table-wrap">
          <table class="journal-table">
            <thead>
              <tr>
                <th class="journal-table__row-no">行</th>
                <th class="debit-header">借方科目</th>
                <th class="debit-header">借方金額</th>
                <th class="credit-header">貸方科目</th>
                <th class="credit-header">貸方金額</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: rowCount })
                .map((_, rowIndex) => {
                  const debitLine = answer.debit[rowIndex] ?? { account: '', amount: '' };
                  const creditLine = answer.credit[rowIndex] ?? { account: '', amount: '' };

                  return `
                    <tr>
                      <td class="journal-table__row-no">${rowIndex + 1}</td>
                      <td>
                        <select
                          data-role="q1-input"
                          data-q1-id="${current.id}"
                          data-side="debit"
                          data-row="${rowIndex}"
                          data-field="account"
                        >
                          ${renderAccountOptions(current.options, debitLine.account)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          inputmode="numeric"
                          placeholder="0"
                          class="js-amount-input"
                          value="${formatNumber(debitLine.amount)}"
                          data-role="q1-input"
                          data-q1-id="${current.id}"
                          data-side="debit"
                          data-row="${rowIndex}"
                          data-field="amount"
                        />
                      </td>
                      <td>
                        <select
                          data-role="q1-input"
                          data-q1-id="${current.id}"
                          data-side="credit"
                          data-row="${rowIndex}"
                          data-field="account"
                        >
                          ${renderAccountOptions(current.options, creditLine.account)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          inputmode="numeric"
                          placeholder="0"
                          class="js-amount-input"
                          value="${formatNumber(creditLine.amount)}"
                          data-role="q1-input"
                          data-q1-id="${current.id}"
                          data-side="credit"
                          data-row="${rowIndex}"
                          data-field="amount"
                        />
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="question-pager">
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-action="q1-prev"
            ${currentIndex === 0 ? 'disabled' : ''}
          >
            前の問題
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-action="q1-next"
            ${currentIndex === questions.length - 1 ? 'disabled' : ''}
          >
            次の問題
          </button>
        </div>
      </article>
    </section>
  `;
}

export { renderQuestion1 };
