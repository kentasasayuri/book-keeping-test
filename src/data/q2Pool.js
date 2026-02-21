import { pickAccountOptions } from './accounts.js';

function yen(value) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function amount(base, step, index, cycle = 60) {
  let h = ((index + 1) * 2654435761) >>> 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) >>> 0;
  const t = (h % 10000) / 10000;

  const spread = step * cycle;
  const raw = base + Math.floor(spread * t);

  if (raw >= 100000) return Math.round(raw / 10000) * 10000;
  if (raw >= 10000) return Math.round(raw / 5000) * 5000;
  if (raw >= 1000) return Math.round(raw / 1000) * 1000;
  return Math.max(100, Math.round(raw / 100) * 100);
}

function createLedgerScenarioDividend(index) {
  const dividend = amount(70000, 2300, index);
  const reserve = Math.floor(dividend * 0.1);
  const tax = amount(36000, 1300, index, 50);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '配当・準備金の振替',
      answerAccount: '繰越利益剰余金',
      answerAmount: dividend + reserve,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '法人税等の計上',
      answerAccount: '法人税、住民税及び事業税',
      answerAmount: tax,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '配当金',
      answerAccount: '未払配当金',
      answerAmount: dividend,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '利益準備金',
      answerAccount: '利益準備金',
      answerAmount: reserve,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '未払法人税等',
      answerAccount: '未払法人税等',
      answerAmount: tax,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（剰余金処分・税金）',
    prompt:
      '次の資料にもとづき、T勘定形式の空欄（科目・金額）を埋めなさい。日付欄は採点対象外とする。',
    context: [
      `株主総会決議により、配当金${yen(dividend)}を支払う。`,
      `会社法に基づき利益準備金${yen(reserve)}を積み立てる。`,
      `当期の法人税等として${yen(tax)}を計上する。`
    ],
    rows,
    optionHint: ['繰越利益剰余金', '未払配当金', '利益準備金', '未払法人税等', '法人税、住民税及び事業税', '損益'],
    explanation:
      '配当・準備金積立は繰越利益剰余金の処分、法人税等は費用と未払法人税等で計上する。'
  };
}

function createLedgerScenarioClosing(index) {
  const sales = amount(1250000, 5100, index, 70);
  const purchases = amount(720000, 3300, index, 70);
  const expense = amount(180000, 1700, index, 70);
  const profit = sales - purchases - expense;

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '収益勘定の締切',
      answerAccount: '売上',
      answerAmount: sales,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '費用勘定の締切（仕入）',
      answerAccount: '仕入',
      answerAmount: purchases,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '費用勘定の締切（給料）',
      answerAccount: '給料',
      answerAmount: expense,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '当期純利益の振替',
      answerAccount: '損益',
      answerAmount: profit,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '純利益の資本振替',
      answerAccount: '繰越利益剰余金',
      answerAmount: profit,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（損益振替）',
    prompt:
      '次の資料にもとづき、損益勘定および繰越利益剰余金勘定の空欄（科目・金額）を記入しなさい。',
    context: [
      `当期の売上高は${yen(sales)}、仕入高は${yen(purchases)}、給料は${yen(expense)}である。`,
      '期末に収益・費用を損益勘定へ振り替え、純利益を繰越利益剰余金へ振り替える。'
    ],
    rows,
    optionHint: ['売上', '仕入', '給料', '損益', '繰越利益剰余金', '未払法人税等'],
    explanation:
      '収益は損益勘定へ貸方、費用は損益勘定へ借方で締め切り、差額純利益を繰越利益剰余金へ振り替える。'
  };
}

function createLedgerScenarioInstruments(index) {
  const arToNote = amount(260000, 5400, index, 60);
  const noteSettle = amount(180000, 3800, index, 60);
  const epay = amount(210000, 4700, index, 60);
  const loan = amount(500000, 8500, index, 60);
  const interest = Math.floor(loan * (0.018 + (index % 3) * 0.004) * (6 / 12));

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '売掛金の手形化',
      answerAccount: '受取手形',
      answerAmount: arToNote,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '支払手形の決済',
      answerAccount: '当座預金',
      answerAmount: noteSettle,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '電子記録債務の決済',
      answerAccount: '普通預金',
      answerAmount: epay,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '借入元本返済',
      answerAccount: '借入金',
      answerAmount: loan,
      points: 2
    },
    {
      id: 'debit_3',
      side: '借方',
      label: '借入利息支払',
      answerAccount: '支払利息',
      answerAmount: interest,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（手形・電子記録・借入）',
    prompt:
      '次の取引資料にもとづき、空欄の相手科目と金額を記入しなさい。',
    context: [
      `売掛金${yen(arToNote)}を受取手形に切り替えた。`,
      `支払手形${yen(noteSettle)}を当座預金で決済。`,
      `電子記録債務${yen(epay)}を普通預金で決済。`,
      `借入金${yen(loan)}と6か月分利息${yen(interest)}を支払った。`
    ],
    rows,
    optionHint: ['受取手形', '当座預金', '普通預金', '借入金', '支払利息', '売掛金'],
    explanation:
      '形態変更・決済・元利支払を区別して処理する。借入金元本と利息は必ず分離する。'
  };
}

function createLedgerScenarioAdjustments(index) {
  const prepaid = amount(7200, 240, index, 45);
  const accrued = amount(9600, 330, index, 45);
  const unearned = amount(8400, 290, index, 45);
  const uncollected = amount(11500, 370, index, 45);
  const dep = amount(18000, 520, index, 45);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '前払費用の振替',
      answerAccount: '前払費用',
      answerAmount: prepaid,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '未払費用の計上',
      answerAccount: '未払費用',
      answerAmount: accrued,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '前受収益の戻入',
      answerAccount: '前受収益',
      answerAmount: unearned,
      points: 2
    },
    {
      id: 'debit_3',
      side: '借方',
      label: '減価償却費の計上',
      answerAccount: '減価償却費',
      answerAmount: dep,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '未収収益の計上',
      answerAccount: '未収収益',
      answerAmount: uncollected,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（決算整理）',
    prompt:
      '次の決算整理事項にもとづき、各空欄の相手科目と金額を記入しなさい。',
    context: [
      `翌期分の費用${yen(prepaid)}を前払計上。`,
      `当期未払費用${yen(accrued)}を計上。`,
      `当期対応分の前受収益${yen(unearned)}を戻入。`,
      `未収収益${yen(uncollected)}を計上。`,
      `減価償却費${yen(dep)}を計上。`
    ],
    rows,
    optionHint: ['前払費用', '未払費用', '前受収益', '未収収益', '減価償却費', '備品減価償却累計額'],
    explanation:
      '経過勘定の振替方向と、費用・収益の発生主義処理を正確に使い分ける。'
  };
}

function createLedgerScenarioTaxAndReceivable(index) {
  const outputTax = amount(98000, 2600, index, 55);
  const inputTax = amount(64000, 2100, index, 55);
  const taxPayable = outputTax - inputTax;

  const writeOff = amount(18000, 900, index, 45);
  const recovered = amount(6200, 280, index, 35);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '消費税精算（仮受の振替）',
      answerAccount: '仮受消費税',
      answerAmount: outputTax,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '消費税精算（仮払の振替）',
      answerAccount: '仮払消費税',
      answerAmount: inputTax,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '消費税精算（差額）',
      answerAccount: '未払消費税',
      answerAmount: taxPayable,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '売掛金の貸倒処理',
      answerAccount: '貸倒引当金',
      answerAmount: writeOff,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '前期貸倒債権の回収益',
      answerAccount: '償却債権取立益',
      answerAmount: recovered,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（消費税・債権管理）',
    prompt: '次の取引資料にもとづき、空欄の相手科目と金額を記入しなさい。',
    context: [
      `税抜方式で、仮受消費税${yen(outputTax)}・仮払消費税${yen(inputTax)}を精算した。`,
      `売掛金${yen(writeOff)}を貸倒処理した（引当金残高あり）。`,
      `前期に貸倒処理した債権${yen(recovered)}を回収した。`
    ],
    rows,
    optionHint: ['仮受消費税', '仮払消費税', '未払消費税', '貸倒引当金', '償却債権取立益', '売掛金'],
    explanation:
      '消費税精算は仮受・仮払を相殺して差額を未払消費税へ。貸倒と償却債権取立益は取引性質を分けて処理する。'
  };
}

function createLedgerScenarioPayroll(index) {
  const grossSalary = amount(520000, 13000, index, 50);
  const incomeTax = Math.floor(grossSalary * 0.055);
  const socialEmployee = Math.floor(grossSalary * 0.08);
  const paid = grossSalary - incomeTax - socialEmployee;
  const socialCompany = amount(38000, 1400, index, 40);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '給料総額の計上',
      answerAccount: '給料',
      answerAmount: grossSalary,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '差引支給額',
      answerAccount: '普通預金',
      answerAmount: paid,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '所得税の預り',
      answerAccount: '所得税預り金',
      answerAmount: incomeTax,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '社会保険料の預り',
      answerAccount: '社会保険料預り金',
      answerAmount: socialEmployee,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '会社負担社会保険料',
      answerAccount: '法定福利費',
      answerAmount: socialCompany,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（給与・社会保険）',
    prompt: '次の資料にもとづき、空欄の相手科目と金額を記入しなさい。',
    context: [
      `給料総額${yen(grossSalary)}から、所得税${yen(incomeTax)}と従業員負担社会保険料${yen(socialEmployee)}を控除して支給した。`,
      `会社負担社会保険料${yen(socialCompany)}を費用計上した。`
    ],
    rows,
    optionHint: ['給料', '普通預金', '所得税預り金', '社会保険料預り金', '法定福利費', '預り金'],
    explanation:
      '給与は総額計上し、控除分を預り金科目へ振り分ける。会社負担分は法定福利費として処理する。'
  };
}

function createLedgerScenarioFixedAssetRegister(index) {
  const cost = amount(680000, 14000, index, 55);
  const usefulLife = 8;
  const annualDep = Math.floor(cost / usefulLife);
  const elapsedYears = 2 + (index % 3);
  const accumulated = annualDep * elapsedYears;
  const saleGap = (index % 5) - 2;
  const gapAmount = saleGap === 0 ? 7000 : saleGap * 12000;
  const saleValue = Math.max(5000, cost - accumulated + gapAmount);
  const carrying = cost - accumulated;
  const gainOrLoss = Math.abs(saleValue - carrying);
  const gainOrLossAccount = saleValue > carrying ? '固定資産売却益' : '固定資産売却損';

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '減価償却累計額の振替',
      answerAccount: '備品減価償却累計額',
      answerAmount: accumulated,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '売却代金（後日入金）',
      answerAccount: '未収入金',
      answerAmount: saleValue,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '備品の除却（取得原価）',
      answerAccount: '備品',
      answerAmount: cost,
      points: 2
    },
    {
      id: 'debit_3',
      side: '借方',
      label: '当期減価償却費（参考記入）',
      answerAccount: '減価償却費',
      answerAmount: annualDep,
      points: 2
    },
    {
      id: 'credit_2',
      side: saleValue > carrying ? '貸方' : '借方',
      label: '売却損益',
      answerAccount: gainOrLossAccount,
      answerAmount: gainOrLoss,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（固定資産台帳・減価償却）',
    prompt: '次の資料にもとづき、固定資産台帳に関連する勘定記入の空欄を埋めなさい。',
    context: [
      `取得原価${yen(cost)}の備品（定額法、耐用年数${usefulLife}年、残存価額0）の${elapsedYears}年経過後に売却した。`,
      `売却代金は${yen(saleValue)}で、月末に受け取る。`
    ],
    rows,
    optionHint: ['備品', '備品減価償却累計額', '未収入金', '固定資産売却益', '固定資産売却損', '減価償却費'],
    explanation:
      '固定資産の売却では取得原価と累計額を同時に取り崩し、差額を売却損益で処理する。'
  };
}

function createLedgerScenarioPayablesLedger(index) {
  const openingPayable = amount(260000, 6200, index, 55);
  const purchaseOnCredit = amount(180000, 5200, index, 55);
  const payment = amount(140000, 4300, index, 55);
  const noteConversion = amount(90000, 2600, index, 45);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '買掛金の支払',
      answerAccount: '普通預金',
      answerAmount: payment,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '買掛金の手形振替',
      answerAccount: '支払手形',
      answerAmount: noteConversion,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '当月掛仕入',
      answerAccount: '仕入',
      answerAmount: purchaseOnCredit,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '買掛金元帳の月末残高',
      answerAccount: '買掛金',
      answerAmount: openingPayable + purchaseOnCredit - payment - noteConversion,
      points: 2
    },
    {
      id: 'debit_3',
      side: '借方',
      label: '買掛金勘定の期首残高（参考）',
      answerAccount: '買掛金',
      answerAmount: openingPayable,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（買掛金元帳）',
    prompt: '次の取引資料にもとづき、買掛金元帳および関連勘定の空欄を記入しなさい。',
    context: [
      `買掛金の期首残高は${yen(openingPayable)}。`,
      `当月掛仕入は${yen(purchaseOnCredit)}、普通預金による支払は${yen(payment)}、支払手形への振替は${yen(noteConversion)}である。`
    ],
    rows,
    optionHint: ['買掛金', '仕入', '普通預金', '支払手形', '当座預金', '電子記録債務'],
    explanation:
      '買掛金元帳では、掛仕入で増加、支払・手形振替で減少する。月末残高を正しく集計する。'
  };
}

function createLedgerScenarioVoucher(index) {
  const sales = amount(220000, 6000, index, 55);
  const tax = Math.floor(sales * 0.1);
  const freight = amount(3000, 1000, index, 40);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '売掛金（振替伝票）',
      answerAccount: '売掛金',
      answerAmount: sales + tax,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '売上（振替伝票）',
      answerAccount: '売上',
      answerAmount: sales,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '仮受消費税（振替伝票）',
      answerAccount: '仮受消費税',
      answerAmount: tax,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '発送費（出金伝票）',
      answerAccount: '発送費',
      answerAmount: freight,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '現金（出金伝票）',
      answerAccount: '現金',
      answerAmount: freight,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 伝票記入（振替・出金伝票）',
    prompt: '次の取引を伝票で起票する前提で、空欄の科目・金額を記入しなさい。',
    context: [
      `商品${yen(sales)}（税抜）を掛けで販売した（税率10%、税抜方式）。`,
      `同日、発送費${yen(freight)}を現金で支払った。`
    ],
    rows,
    optionHint: ['売掛金', '売上', '仮受消費税', '発送費', '現金', '買掛金'],
    format: 'voucher',
    explanation:
      '伝票記入では、1取引を借方・貸方で分解し、税抜方式なら売上本体と仮受消費税を区分して起票する。'
  };
}

function createLedgerScenarioVoucherFull(index) {
  const deposit = amount(50000, 2000, index, 45);
  const withdrawal = amount(30000, 1000, index, 45);
  const transferSales = amount(180000, 5000, index, 55);
  const transferTax = Math.floor(transferSales * 0.1);
  const transferTotal = transferSales + transferTax;

  const rows = [
    {
      id: 'debit_deposit',
      side: '借方',
      label: '現金（入金伝票）',
      answerAccount: '現金',
      answerAmount: deposit,
      points: 2
    },
    {
      id: 'credit_deposit',
      side: '貸方',
      label: '売掛金（入金伝票）',
      answerAccount: '売掛金',
      answerAmount: deposit,
      points: 2
    },
    {
      id: 'debit_withdrawal',
      side: '借方',
      label: '旅費交通費（出金伝票）',
      answerAccount: '旅費交通費',
      answerAmount: withdrawal,
      points: 2
    },
    {
      id: 'debit_transfer',
      side: '借方',
      label: '売掛金（振替伝票）',
      answerAccount: '売掛金',
      answerAmount: transferTotal,
      points: 2
    },
    {
      id: 'credit_transfer',
      side: '貸方',
      label: '売上（振替伝票）',
      answerAccount: '売上',
      answerAmount: transferSales,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 伝票記入（入金・出金・振替伝票）',
    prompt: '次の3つの取引について、3伝票制で伝票を起票する場合の各伝票の記入を示しなさい。',
    context: [
      `① 売掛金${yen(deposit)}を現金で回収した。→ 入金伝票`,
      `② 旅費交通費${yen(withdrawal)}を現金で支払った。→ 出金伝票`,
      `③ 商品${yen(transferSales)}を掛けで販売した（消費税10%、税抜方式）。→ 振替伝票`
    ],
    rows,
    optionHint: ['現金', '売掛金', '旅費交通費', '売上', '仮受消費税', '買掛金'],
    format: 'voucher',
    explanation:
      '入金伝票は現金の入金、出金伝票は現金の出金、振替伝票は現金以外の取引を起票する。3伝票制では全取引がいずれかに分類される。'
  };
}

function createLedgerScenarioOverdraft(index) {
  const openingBalance = amount(150000, 5000, index, 50);
  const salesDeposit = amount(200000, 10000, index, 50);
  const purchasePayment = amount(380000, 10000, index, 50);
  const overdraftAmount = Math.max(5000, purchasePayment - openingBalance - salesDeposit);
  const loanRepay = amount(50000, 5000, index, 40);

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '4/1 前期繰越',
      answerAccount: '前期繰越',
      answerAmount: openingBalance,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '4/10 売掛金入金',
      answerAccount: '売掛金',
      answerAmount: salesDeposit,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '4/15 買掛金支払',
      answerAccount: '買掛金',
      answerAmount: purchasePayment,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '4/15 当座借越（超過分）',
      answerAccount: '当座借越',
      answerAmount: overdraftAmount,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '4/30 次期繰越',
      answerAccount: '次期繰越',
      answerAmount: 0,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（当座預金・当座借越）',
    prompt: '次の資料にもとづき、当座預金勘定のT勘定形式の空欄（科目・金額）を埋めなさい。当座借越契約あり。',
    context: [
      `4/1 前期繰越残高は${yen(openingBalance)}（借方残高）。`,
      `4/10 売掛金${yen(salesDeposit)}が当座預金口座に入金された。`,
      `4/15 買掛金${yen(purchasePayment)}を当座預金から支払った（不足分は当座借越）。`,
      '4/30 T勘定を締め切る。'
    ],
    rows,
    optionHint: ['前期繰越', '売掛金', '買掛金', '当座借越', '次期繰越', '損益'],
    explanation:
      '当座預金残高を超える引出は当座借越（負債）として貸方に記入する。二勘定制のT勘定では借方・貸方を合計し締め切る。'
  };
}

function createLedgerScenarioPettyCash(index) {
  const fundAmount = amount(50000, 5000, index, 40);
  const communication = amount(3000, 1000, index, 30);
  const travel = amount(5000, 1000, index, 30);
  const supplies = amount(4000, 1000, index, 30);
  const totalUsed = communication + travel + supplies;
  const replenish = totalUsed;

  const rows = [
    {
      id: 'debit_1',
      side: '借方',
      label: '4/1 設立（普通預金より）',
      answerAccount: '普通預金',
      answerAmount: fundAmount,
      points: 2
    },
    {
      id: 'credit_1',
      side: '貸方',
      label: '4/25 通信費',
      answerAccount: '通信費',
      answerAmount: communication,
      points: 2
    },
    {
      id: 'credit_2',
      side: '貸方',
      label: '4/25 旅費交通費',
      answerAccount: '旅費交通費',
      answerAmount: travel,
      points: 2
    },
    {
      id: 'credit_3',
      side: '貸方',
      label: '4/25 消耗品費',
      answerAccount: '消耗品費',
      answerAmount: supplies,
      points: 2
    },
    {
      id: 'debit_2',
      side: '借方',
      label: '4/25 補給（普通預金より）',
      answerAccount: '普通預金',
      answerAmount: replenish,
      points: 2
    }
  ];

  return {
    title: '第2問(1) 勘定記入（小口現金）',
    prompt: '次の資料にもとづき、小口現金勘定のT勘定形式の空欄を埋めなさい（定額資金前渡制）。',
    context: [
      `4/1 小口現金として${yen(fundAmount)}を普通預金から設立した。`,
      `4/25 通信費${yen(communication)}、旅費交通費${yen(travel)}、消耗品費${yen(supplies)}の支払報告があり、同時に${yen(replenish)}を補給した。`
    ],
    rows,
    optionHint: ['普通預金', '通信費', '旅費交通費', '消耗品費', '次期繰越', '前期繰越'],
    explanation:
      '定額資金前渡制（インプレスト・システム）では、報告と同時に使った分だけ補給する。小口現金勘定の残高は常に一定額に保たれる。'
  };
}

function createLedgerQuestion(index) {
  const variant = index % 12;
  const base =
    variant === 0
      ? createLedgerScenarioDividend(index)
      : variant === 1
        ? createLedgerScenarioClosing(index)
        : variant === 2
          ? createLedgerScenarioInstruments(index)
          : variant === 3
            ? createLedgerScenarioAdjustments(index)
            : variant === 4
              ? createLedgerScenarioTaxAndReceivable(index)
              : variant === 5
                ? createLedgerScenarioPayroll(index)
                : variant === 6
                  ? createLedgerScenarioFixedAssetRegister(index)
                  : variant === 7
                    ? createLedgerScenarioPayablesLedger(index)
                    : variant === 8
                      ? createLedgerScenarioVoucher(index)
                      : variant === 9
                        ? createLedgerScenarioVoucherFull(index)
                        : variant === 10
                          ? createLedgerScenarioOverdraft(index)
                          : createLedgerScenarioPettyCash(index);

  const correctAccounts = base.rows.map((row) => row.answerAccount);

  return {
    id: `q2-ledger-${index + 1}`,
    section: 'q2',
    type: 'ledger',
    category: '帳簿記入',
    title: base.title,
    points: 10,
    prompt: base.prompt,
    context: base.context,
    rows: base.rows,
    format: base.format ?? 'standard',
    accountOptions: pickAccountOptions([...correctAccounts, ...base.optionHint], 7000 + index, 14),
    explanation: base.explanation
  };
}

function createInventoryScenarioA(index) {
  const beginningQty = 80 + (index % 8) * 10;
  const beginningUnit = 920 + (index % 7) * 15;
  const purchase1Qty = 50 + (index % 6) * 10;
  const purchase1Unit = beginningUnit + 40 + (index % 4) * 8;
  const sale1Qty = 60 + (index % 4) * 10;

  const purchase2Qty = 40 + (index % 5) * 10;
  const purchase2Unit = beginningUnit + 65 + (index % 5) * 10;
  const sale2Qty = 50 + (index % 5) * 10;

  const beginningValue = beginningQty * beginningUnit;
  const purchase1Value = purchase1Qty * purchase1Unit;
  const avg1 = (beginningValue + purchase1Value) / (beginningQty + purchase1Qty);
  const sale1Cost = Math.round(avg1 * sale1Qty);

  const stock1Qty = beginningQty + purchase1Qty - sale1Qty;
  const stock1Value = beginningValue + purchase1Value - sale1Cost;

  const purchase2Value = purchase2Qty * purchase2Unit;
  const avg2 = (stock1Value + purchase2Value) / (stock1Qty + purchase2Qty);
  const sale2Cost = Math.round(avg2 * sale2Qty);

  const endingQty = stock1Qty + purchase2Qty - sale2Qty;
  const endingAmount = stock1Value + purchase2Value - sale2Cost;

  const unitPrice = Math.round(avg2 + 280 + (index % 4) * 20);
  const salesAmount = (sale1Qty + sale2Qty) * unitPrice;
  const grossProfit = salesAmount - (sale1Cost + sale2Cost);

  return {
    prompt:
      '次の資料にもとづき、移動平均法で商品有高帳の空欄を計算し、売上高と売上総利益を求めなさい。',
    beginning: { qty: beginningQty, unitCost: beginningUnit, amount: beginningValue },
    transactions: [
      { date: '4/05', type: '仕入', qty: purchase1Qty, unitCost: purchase1Unit, amount: purchase1Value },
      { date: '4/12', type: '売上', qty: sale1Qty, unitPrice },
      { date: '4/19', type: '仕入', qty: purchase2Qty, unitCost: purchase2Unit, amount: purchase2Value },
      { date: '4/27', type: '売上', qty: sale2Qty, unitPrice }
    ],
    fields: [
      { id: 'sale1_cost', label: '1回目売上の払出原価', type: 'number', answer: sale1Cost, points: 2 },
      { id: 'sale2_cost', label: '2回目売上の払出原価', type: 'number', answer: sale2Cost, points: 2 },
      { id: 'ending_qty', label: '月末在庫数量', type: 'number', answer: endingQty, points: 1 },
      { id: 'ending_amount', label: '月末在庫金額', type: 'number', answer: endingAmount, points: 2 },
      { id: 'sales_amount', label: '売上高', type: 'number', answer: salesAmount, points: 1 },
      { id: 'gross_profit', label: '売上総利益', type: 'number', answer: grossProfit, points: 2 }
    ],
    explanation:
      '移動平均法では仕入のたびに平均単価を更新する。売上総利益は売上高−売上原価で求める。'
  };
}

function createInventoryScenarioB(index) {
  const beginningQty = 120 + (index % 7) * 10;
  const beginningUnit = 840 + (index % 6) * 18;
  const purchaseQty = 90 + (index % 6) * 10;
  const purchaseUnit = beginningUnit + 45 + (index % 4) * 10;
  const returnQty = 10 + (index % 3) * 5;

  const sale1Qty = 80 + (index % 5) * 10;
  const sale2Qty = 50 + (index % 4) * 10;

  const beginningValue = beginningQty * beginningUnit;
  const purchaseValue = purchaseQty * purchaseUnit;
  const returnValue = returnQty * purchaseUnit;

  const stockAfterReturnQty = beginningQty + purchaseQty - returnQty;
  const stockAfterReturnValue = beginningValue + purchaseValue - returnValue;

  const avg = stockAfterReturnValue / stockAfterReturnQty;
  const sale1Cost = Math.round(avg * sale1Qty);
  const sale2Cost = Math.round(avg * sale2Qty);

  const endingQty = stockAfterReturnQty - sale1Qty - sale2Qty;
  const endingAmount = Math.round(stockAfterReturnValue - sale1Cost - sale2Cost);

  const unitPrice = Math.round(avg + 300 + (index % 3) * 25);
  const salesAmount = (sale1Qty + sale2Qty) * unitPrice;
  const grossProfit = salesAmount - (sale1Cost + sale2Cost);

  return {
    prompt:
      '次の資料にもとづき、移動平均法で商品有高帳の空欄を求めなさい（仕入返品を含む）。',
    beginning: { qty: beginningQty, unitCost: beginningUnit, amount: beginningValue },
    transactions: [
      { date: '5/04', type: '仕入', qty: purchaseQty, unitCost: purchaseUnit, amount: purchaseValue },
      { date: '5/08', type: '仕入返品', qty: returnQty, unitCost: purchaseUnit, amount: returnValue },
      { date: '5/15', type: '売上', qty: sale1Qty, unitPrice },
      { date: '5/25', type: '売上', qty: sale2Qty, unitPrice }
    ],
    fields: [
      { id: 'sale1_cost', label: '1回目売上の払出原価', type: 'number', answer: sale1Cost, points: 2 },
      { id: 'sale2_cost', label: '2回目売上の払出原価', type: 'number', answer: sale2Cost, points: 2 },
      { id: 'ending_qty', label: '月末在庫数量', type: 'number', answer: endingQty, points: 1 },
      { id: 'ending_amount', label: '月末在庫金額', type: 'number', answer: endingAmount, points: 2 },
      { id: 'sales_amount', label: '売上高', type: 'number', answer: salesAmount, points: 1 },
      { id: 'gross_profit', label: '売上総利益', type: 'number', answer: grossProfit, points: 2 }
    ],
    explanation:
      '仕入返品は在庫数量・在庫金額を減少させる。移動平均法では返品後の在庫を基に払出原価を計算する。'
  };
}

function createInventoryScenarioC(index) {
  const beginningQty = 140 + (index % 6) * 10;
  const beginningUnit = 810 + (index % 6) * 16;
  const purchase1Qty = 70 + (index % 5) * 10;
  const purchase1Unit = beginningUnit + 38 + (index % 4) * 9;
  const sale1Qty = 65 + (index % 4) * 10;
  const purchase2Qty = 60 + (index % 4) * 10;
  const purchase2Unit = beginningUnit + 66 + (index % 4) * 12;
  const sale2Qty = 70 + (index % 5) * 10;

  const beginningValue = beginningQty * beginningUnit;
  const purchase1Value = purchase1Qty * purchase1Unit;
  const avg1 = (beginningValue + purchase1Value) / (beginningQty + purchase1Qty);
  const sale1Cost = Math.round(avg1 * sale1Qty);

  const stock1Qty = beginningQty + purchase1Qty - sale1Qty;
  const stock1Value = beginningValue + purchase1Value - sale1Cost;

  const purchase2Value = purchase2Qty * purchase2Unit;
  const avg2 = (stock1Value + purchase2Value) / (stock1Qty + purchase2Qty);
  const sale2Cost = Math.round(avg2 * sale2Qty);

  const endingQty = stock1Qty + purchase2Qty - sale2Qty;
  const endingAmount = Math.round(stock1Value + purchase2Value - sale2Cost);

  const unitPrice = Math.round(avg2 + 260 + (index % 4) * 22);
  const salesAmount = (sale1Qty + sale2Qty) * unitPrice;
  const grossProfit = salesAmount - (sale1Cost + sale2Cost);

  return {
    prompt:
      '次の資料にもとづき、移動平均法で商品有高帳を作成し、各払出原価・月末在庫・売上総利益を求めなさい。',
    beginning: { qty: beginningQty, unitCost: beginningUnit, amount: beginningValue },
    transactions: [
      { date: '6/03', type: '仕入', qty: purchase1Qty, unitCost: purchase1Unit, amount: purchase1Value },
      { date: '6/10', type: '売上', qty: sale1Qty, unitPrice },
      { date: '6/17', type: '仕入', qty: purchase2Qty, unitCost: purchase2Unit, amount: purchase2Value },
      { date: '6/26', type: '売上', qty: sale2Qty, unitPrice }
    ],
    fields: [
      { id: 'sale1_cost', label: '1回目売上の払出原価', type: 'number', answer: sale1Cost, points: 2 },
      { id: 'sale2_cost', label: '2回目売上の払出原価', type: 'number', answer: sale2Cost, points: 2 },
      { id: 'ending_qty', label: '月末在庫数量', type: 'number', answer: endingQty, points: 1 },
      { id: 'ending_amount', label: '月末在庫金額', type: 'number', answer: endingAmount, points: 2 },
      { id: 'sales_amount', label: '売上高', type: 'number', answer: salesAmount, points: 1 },
      { id: 'gross_profit', label: '売上総利益', type: 'number', answer: grossProfit, points: 2 }
    ],
    explanation:
      '仕入ごとに平均単価を更新し、売上原価を計算する。売上総利益は売上高から売上原価合計を控除して求める。'
  };
}

function createInventoryScenarioD(index) {
  const beginningQty = 110 + (index % 7) * 10;
  const beginningUnit = 870 + (index % 5) * 17;
  const purchaseQty = 100 + (index % 6) * 10;
  const purchaseUnit = beginningUnit + 52 + (index % 4) * 11;
  const sale1Qty = 90 + (index % 4) * 10;
  const saleReturnQty = 10 + (index % 3) * 5;
  const sale2Qty = 55 + (index % 4) * 10;

  const beginningValue = beginningQty * beginningUnit;
  const purchaseValue = purchaseQty * purchaseUnit;
  const avg = (beginningValue + purchaseValue) / (beginningQty + purchaseQty);
  const sale1Cost = Math.round(avg * sale1Qty);
  const returnCost = Math.round(avg * saleReturnQty);
  const sale2Cost = Math.round(avg * sale2Qty);

  const endingQty = beginningQty + purchaseQty - sale1Qty + saleReturnQty - sale2Qty;
  const endingAmount = Math.round(beginningValue + purchaseValue - sale1Cost + returnCost - sale2Cost);

  const unitPrice = Math.round(avg + 310 + (index % 3) * 20);
  const netSalesQty = sale1Qty - saleReturnQty + sale2Qty;
  const salesAmount = netSalesQty * unitPrice;
  const grossProfit = salesAmount - (sale1Cost - returnCost + sale2Cost);

  return {
    prompt:
      '次の資料にもとづき、移動平均法で商品有高帳を作成し、売上返品を考慮した売上高・売上総利益を求めなさい。',
    beginning: { qty: beginningQty, unitCost: beginningUnit, amount: beginningValue },
    transactions: [
      { date: '7/04', type: '仕入', qty: purchaseQty, unitCost: purchaseUnit, amount: purchaseValue },
      { date: '7/11', type: '売上', qty: sale1Qty, unitPrice },
      { date: '7/16', type: '売上返品', qty: saleReturnQty, unitPrice, amount: saleReturnQty * unitPrice },
      { date: '7/24', type: '売上', qty: sale2Qty, unitPrice }
    ],
    fields: [
      { id: 'sale1_cost', label: '1回目売上の払出原価', type: 'number', answer: sale1Cost, points: 2 },
      { id: 'sale2_cost', label: '2回目売上の払出原価', type: 'number', answer: sale2Cost, points: 2 },
      { id: 'ending_qty', label: '月末在庫数量', type: 'number', answer: endingQty, points: 1 },
      { id: 'ending_amount', label: '月末在庫金額', type: 'number', answer: endingAmount, points: 2 },
      { id: 'sales_amount', label: '売上高（返品控除後）', type: 'number', answer: salesAmount, points: 1 },
      { id: 'gross_profit', label: '売上総利益', type: 'number', answer: grossProfit, points: 2 }
    ],
    explanation:
      '売上返品は売上数量と売上高を減少させ、原価は返品分を戻し入れる。移動平均法では同一単価で計算する。'
  };
}

function createInventoryScenarioE_FIFO(index) {
  const beginningQty = 100 + (index % 5) * 20;
  const beginningUnit = 800 + (index % 5) * 20;
  const purchase1Qty = 80 + (index % 4) * 20;
  const purchase1Unit = beginningUnit + 40 + (index % 4) * 20;
  const sale1Qty = 60 + (index % 4) * 20;
  const purchase2Qty = 60 + (index % 3) * 20;
  const purchase2Unit = beginningUnit + 80 + (index % 3) * 20;
  const sale2Qty = 50 + (index % 3) * 20;

  const beginningValue = beginningQty * beginningUnit;
  const purchase1Value = purchase1Qty * purchase1Unit;
  const purchase2Value = purchase2Qty * purchase2Unit;

  // FIFO: sale1 takes from beginning first
  let s1FromBeginning = Math.min(sale1Qty, beginningQty);
  let s1FromP1 = sale1Qty - s1FromBeginning;
  const sale1Cost = s1FromBeginning * beginningUnit + s1FromP1 * purchase1Unit;

  const afterSale1BeginningQty = beginningQty - s1FromBeginning;
  const afterSale1P1Qty = purchase1Qty - s1FromP1;

  // FIFO: sale2 takes from oldest remaining first
  let s2Remaining = sale2Qty;
  let sale2Cost = 0;
  if (afterSale1BeginningQty > 0 && s2Remaining > 0) {
    const take = Math.min(s2Remaining, afterSale1BeginningQty);
    sale2Cost += take * beginningUnit;
    s2Remaining -= take;
  }
  if (afterSale1P1Qty > 0 && s2Remaining > 0) {
    const take = Math.min(s2Remaining, afterSale1P1Qty);
    sale2Cost += take * purchase1Unit;
    s2Remaining -= take;
  }
  if (s2Remaining > 0) {
    sale2Cost += s2Remaining * purchase2Unit;
  }

  const endingQty = beginningQty + purchase1Qty + purchase2Qty - sale1Qty - sale2Qty;
  const endingAmount = beginningValue + purchase1Value + purchase2Value - sale1Cost - sale2Cost;

  const unitPrice = purchase2Unit + 200 + (index % 4) * 20;
  const salesAmount = (sale1Qty + sale2Qty) * unitPrice;
  const grossProfit = salesAmount - (sale1Cost + sale2Cost);

  return {
    prompt:
      '次の資料にもとづき、先入先出法で商品有高帳の空欄を計算し、売上高と売上総利益を求めなさい。',
    beginning: { qty: beginningQty, unitCost: beginningUnit, amount: beginningValue },
    transactions: [
      { date: '4/05', type: '仕入', qty: purchase1Qty, unitCost: purchase1Unit, amount: purchase1Value },
      { date: '4/12', type: '売上', qty: sale1Qty, unitPrice },
      { date: '4/19', type: '仕入', qty: purchase2Qty, unitCost: purchase2Unit, amount: purchase2Value },
      { date: '4/27', type: '売上', qty: sale2Qty, unitPrice }
    ],
    fields: [
      { id: 'sale1_cost', label: '1回目売上の払出原価', type: 'number', answer: sale1Cost, points: 2 },
      { id: 'sale2_cost', label: '2回目売上の払出原価', type: 'number', answer: sale2Cost, points: 2 },
      { id: 'ending_qty', label: '月末在庫数量', type: 'number', answer: endingQty, points: 1 },
      { id: 'ending_amount', label: '月末在庫金額', type: 'number', answer: endingAmount, points: 2 },
      { id: 'sales_amount', label: '売上高', type: 'number', answer: salesAmount, points: 1 },
      { id: 'gross_profit', label: '売上総利益', type: 'number', answer: grossProfit, points: 2 }
    ],
    explanation:
      '先入先出法では先に仕入れた商品から先に払い出す。在庫は常に最新の仕入単価のものが残る。'
  };
}

function createInventoryScenarioF_FIFO(index) {
  const beginningQty = 80 + (index % 4) * 20;
  const beginningUnit = 900 + (index % 4) * 20;
  const purchaseQty = 100 + (index % 5) * 20;
  const purchaseUnit = beginningUnit + 60 + (index % 3) * 20;
  const returnQty = 10 + (index % 3) * 10;
  const sale1Qty = 70 + (index % 4) * 20;
  const sale2Qty = 40 + (index % 3) * 20;

  const beginningValue = beginningQty * beginningUnit;
  const purchaseValue = purchaseQty * purchaseUnit;
  const returnValue = returnQty * purchaseUnit;
  const netPurchaseQty = purchaseQty - returnQty;

  // FIFO: sale1 from beginning first
  let s1FromBeginning = Math.min(sale1Qty, beginningQty);
  let s1FromPurchase = sale1Qty - s1FromBeginning;
  const sale1Cost = s1FromBeginning * beginningUnit + s1FromPurchase * purchaseUnit;

  const afterS1BeginningQty = beginningQty - s1FromBeginning;
  const afterS1PurchaseQty = netPurchaseQty - s1FromPurchase;

  // FIFO: sale2
  let s2Remaining = sale2Qty;
  let sale2Cost = 0;
  if (afterS1BeginningQty > 0 && s2Remaining > 0) {
    const take = Math.min(s2Remaining, afterS1BeginningQty);
    sale2Cost += take * beginningUnit;
    s2Remaining -= take;
  }
  if (s2Remaining > 0) {
    sale2Cost += s2Remaining * purchaseUnit;
  }

  const endingQty = beginningQty + netPurchaseQty - sale1Qty - sale2Qty;
  const endingAmount = beginningValue + purchaseValue - returnValue - sale1Cost - sale2Cost;

  const unitPrice = purchaseUnit + 250 + (index % 3) * 20;
  const netSalesQty = sale1Qty + sale2Qty;
  const salesAmount = netSalesQty * unitPrice;
  const grossProfit = salesAmount - (sale1Cost + sale2Cost);

  return {
    prompt:
      '次の資料にもとづき、先入先出法で商品有高帳を作成し、仕入返品を考慮して月末在庫と売上総利益を求めなさい。',
    beginning: { qty: beginningQty, unitCost: beginningUnit, amount: beginningValue },
    transactions: [
      { date: '6/03', type: '仕入', qty: purchaseQty, unitCost: purchaseUnit, amount: purchaseValue },
      { date: '6/06', type: '仕入返品', qty: returnQty, unitCost: purchaseUnit, amount: returnValue },
      { date: '6/14', type: '売上', qty: sale1Qty, unitPrice },
      { date: '6/23', type: '売上', qty: sale2Qty, unitPrice }
    ],
    fields: [
      { id: 'sale1_cost', label: '1回目売上の払出原価', type: 'number', answer: sale1Cost, points: 2 },
      { id: 'sale2_cost', label: '2回目売上の払出原価', type: 'number', answer: sale2Cost, points: 2 },
      { id: 'ending_qty', label: '月末在庫数量', type: 'number', answer: endingQty, points: 1 },
      { id: 'ending_amount', label: '月末在庫金額', type: 'number', answer: endingAmount, points: 2 },
      { id: 'sales_amount', label: '売上高', type: 'number', answer: salesAmount, points: 1 },
      { id: 'gross_profit', label: '売上総利益', type: 'number', answer: grossProfit, points: 2 }
    ],
    explanation:
      '先入先出法で仕入返品がある場合、返品は当該仕入ロットから差し引く。払出は古いロットから順に行う。'
  };
}

function createInventoryQuestion(index) {
  const variant = index % 6;
  const data =
    variant === 0
      ? createInventoryScenarioA(index)
      : variant === 1
        ? createInventoryScenarioB(index)
        : variant === 2
          ? createInventoryScenarioC(index)
          : variant === 3
            ? createInventoryScenarioD(index)
            : variant === 4
              ? createInventoryScenarioE_FIFO(index)
              : createInventoryScenarioF_FIFO(index);

  const isFIFO = variant >= 4;

  return {
    id: `q2-inventory-${index + 1}`,
    section: 'q2',
    type: 'inventory',
    category: '商品有高帳',
    title: isFIFO ? '第2問(2) 商品有高帳（先入先出法）' : '第2問(2) 商品有高帳・計算問題',
    points: 10,
    prompt: data.prompt,
    beginning: data.beginning,
    transactions: data.transactions,
    fields: data.fields,
    explanation: data.explanation
  };
}

function createTheoryQuestion(index) {
  const receivableRate = [0.02, 0.03, 0.04][index % 3];
  const prepaidMonths = [2, 3, 4][index % 3];
  const methods = ['移動平均法', '先入先出法', '個別法', '定額法'];
  const loanMonths = [4, 6, 9][index % 3];
  const variant = index % 5;

  const patterns = [
    {
      format: 'knowledge',
      category: '語句選択',
      title: '第2問(2) 語句選択・理論問題',
      prompt: '次の各文の空欄に入る最も適切な語句を、選択肢から選びなさい。',
      explanation:
        '第2問(2)では帳簿記入に加えて語句選択も出題される。勘定科目の意味と決算整理の定義を正確に判別する。',
      fields: [
        {
          id: 'theory_1',
          label: '商品を掛けで販売したとき、借方に計上する勘定科目',
          options: ['売掛金', '買掛金', '受取手形', '未収入金'],
          answer: '売掛金',
          points: 2
        },
        {
          id: 'theory_2',
          label: `売掛金残高に対し${(receivableRate * 100).toFixed(1)}%で設定する引当金の名称`,
          options: ['貸倒引当金', '減価償却累計額', '修繕引当金', '退職給付引当金'],
          answer: '貸倒引当金',
          points: 2
        },
        {
          id: 'theory_3',
          label: `当期に支払った家賃のうち翌期${prepaidMonths}か月分を振り替える勘定科目`,
          options: ['前払費用', '未払費用', '前受収益', '仮払金'],
          answer: '前払費用',
          points: 2
        },
        {
          id: 'theory_4',
          label: '税抜方式で商品販売時に貸方へ計上する消費税勘定',
          options: ['仮受消費税', '仮払消費税', '未払消費税', '租税公課'],
          answer: '仮受消費税',
          points: 2
        },
        {
          id: 'theory_5',
          label: '商品有高帳で仕入のたびに平均単価を更新する方法',
          options: methods,
          answer: '移動平均法',
          points: 2
        }
      ]
    },
    {
      format: 'knowledge',
      category: '語句選択',
      title: '第2問(2) 語句選択・理論問題',
      prompt: '次の各文の空欄に入る最も適切な語句を、選択肢から選びなさい。',
      explanation:
        '語句問題では、取引類型ごとの勘定科目と決算整理の方向性を正確に判断する。',
      fields: [
        {
          id: 'theory_1',
          label: '約束手形を振り出して借り入れた元本を表す勘定科目',
          options: ['手形借入金', '支払手形', '借入金', '電子記録債務'],
          answer: '手形借入金',
          points: 2
        },
        {
          id: 'theory_2',
          label: `${loanMonths}か月分の借入利息を期末に見越計上するとき貸方に用いる勘定科目`,
          options: ['未払利息', '前払費用', '未払費用', '仮受金'],
          answer: '未払利息',
          points: 2
        },
        {
          id: 'theory_3',
          label: '前期に貸倒処理した債権を回収したときに計上する収益科目',
          options: ['償却債権取立益', '貸倒引当金戻入', '雑益', '受取手数料'],
          answer: '償却債権取立益',
          points: 2
        },
        {
          id: 'theory_4',
          label: '決算で原因不明の現金過不足（借方残高）を処理するときの借方科目',
          options: ['雑損', '雑益', '現金', '仮払金'],
          answer: '雑損',
          points: 2
        },
        {
          id: 'theory_5',
          label: '受取配当金や受取利息を最終的に振り替える先の損益計算用勘定',
          options: ['損益', '繰越利益剰余金', '資本金', '未払配当金'],
          answer: '損益',
          points: 2
        }
      ]
    },
    {
      format: 'knowledge',
      category: '語句選択',
      title: '第2問(2) 語句選択・理論問題',
      prompt: '次の各文の空欄に入る最も適切な語句を、選択肢から選びなさい。',
      explanation:
        '資本取引・固定資産・消費税など横断論点の語句判定。定義を暗記ではなく取引の流れで判断する。',
      fields: [
        {
          id: 'theory_1',
          label: '商品売買で、期首商品を仕入勘定へ振り替えるとき貸方に用いる勘定科目',
          options: ['繰越商品', '商品', '仕入', '売上'],
          answer: '繰越商品',
          points: 2
        },
        {
          id: 'theory_2',
          label: '増資で受け入れた払込金を会社法上の任意で資本金以外に計上する科目',
          options: ['資本準備金', '利益準備金', '繰越利益剰余金', '受贈益'],
          answer: '資本準備金',
          points: 2
        },
        {
          id: 'theory_3',
          label: '固定資産の売却時に取得原価との差額を利益として計上する勘定科目',
          options: ['固定資産売却益', '雑益', '受取手数料', '償却債権取立益'],
          answer: '固定資産売却益',
          points: 2
        },
        {
          id: 'theory_4',
          label: '決算整理で翌期分の収益を繰り延べるときに用いる負債科目',
          options: ['前受収益', '前払費用', '未払費用', '未収収益'],
          answer: '前受収益',
          points: 2
        },
        {
          id: 'theory_5',
          label: '税抜方式で仮受消費税と仮払消費税を精算した差額の計上先（納付の場合）',
          options: ['未払消費税', '仮受消費税', '租税公課', '未払法人税等'],
          answer: '未払消費税',
          points: 2
        }
      ]
    },
    {
      format: 'subbook',
      category: '補助簿選択',
      title: '第2問(2) 補助簿選択問題',
      prompt: '各取引について、主として記入・転記すべき帳簿を選びなさい。',
      explanation:
        '補助簿問題は取引の相手科目ではなく「どの帳簿で管理するか」を問う。帳簿の役割を整理して判断する。',
      fields: [
        {
          id: 'theory_1',
          label: '掛けで商品を仕入れた',
          options: ['仕入帳', '売上帳', '現金出納帳', '当座預金出納帳'],
          answer: '仕入帳',
          points: 2
        },
        {
          id: 'theory_2',
          label: '掛けで商品を販売した',
          options: ['売上帳', '仕入帳', '現金出納帳', '支払手形記入帳'],
          answer: '売上帳',
          points: 2
        },
        {
          id: 'theory_3',
          label: '現金で旅費交通費を支払った',
          options: ['現金出納帳', '当座預金出納帳', '売掛金元帳', '買掛金元帳'],
          answer: '現金出納帳',
          points: 2
        },
        {
          id: 'theory_4',
          label: '得意先から売掛金を回収し当座預金へ入金された',
          options: ['当座預金出納帳', '現金出納帳', '売上帳', '仕入帳'],
          answer: '当座預金出納帳',
          points: 2
        },
        {
          id: 'theory_5',
          label: '取引先振出の約束手形を受け取った',
          options: ['受取手形記入帳', '支払手形記入帳', '売上帳', '仕入帳'],
          answer: '受取手形記入帳',
          points: 2
        }
      ]
    },
    {
      format: 'subbook',
      category: '補助簿選択',
      title: '第2問(2) 補助簿選択問題',
      prompt: '各取引について、もっとも適切な補助簿・元帳を選びなさい。',
      explanation:
        '売掛金元帳・買掛金元帳・手形記入帳など、債権債務管理の帳簿を正確に区分する。',
      fields: [
        {
          id: 'theory_1',
          label: '得意先別の売掛金残高を確認したい',
          options: ['売掛金元帳', '買掛金元帳', '現金出納帳', '仕入帳'],
          answer: '売掛金元帳',
          points: 2
        },
        {
          id: 'theory_2',
          label: '仕入先別の買掛金残高を確認したい',
          options: ['買掛金元帳', '売掛金元帳', '売上帳', '受取手形記入帳'],
          answer: '買掛金元帳',
          points: 2
        },
        {
          id: 'theory_3',
          label: '支払手形の振出日・満期日を管理する',
          options: ['支払手形記入帳', '受取手形記入帳', '当座預金出納帳', '現金出納帳'],
          answer: '支払手形記入帳',
          points: 2
        },
        {
          id: 'theory_4',
          label: '受取手形の取立依頼・決済状況を管理する',
          options: ['受取手形記入帳', '支払手形記入帳', '売上帳', '仕入帳'],
          answer: '受取手形記入帳',
          points: 2
        },
        {
          id: 'theory_5',
          label: '現金の入出金を日々記録する',
          options: ['現金出納帳', '当座預金出納帳', '売掛金元帳', '買掛金元帳'],
          answer: '現金出納帳',
          points: 2
        }
      ]
    }
  ];

  const pattern = patterns[variant];

  return {
    id: `q2-theory-${index + 1}`,
    section: 'q2',
    type: 'theory',
    format: pattern.format,
    category: pattern.category,
    title: pattern.title,
    points: 10,
    prompt: pattern.prompt,
    fields: pattern.fields,
    explanation: pattern.explanation
  };
}

const ledgerPool = Array.from({ length: 600 }, (_, index) => createLedgerQuestion(index));
const inventoryPool = Array.from({ length: 600 }, (_, index) => createInventoryQuestion(index));
const theoryPool = Array.from({ length: 600 }, (_, index) => createTheoryQuestion(index));

const q2Pool = [...ledgerPool, ...inventoryPool, ...theoryPool];

export { q2Pool };
