function amount(base, step, index, cycle = 80) {
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

function yen(value) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function createScenarioA(index) {
  const cash = amount(100000, 10000, index, 90);
  const checking = amount(460000, 10000, index, 90);
  const termDeposit = amount(220000, 10000, index, 90);
  const accountsReceivable = amount(300000, 10000, index, 80);
  const allowancePre = amount(5000, 1000, index, 50);
  const advanceReceived = amount(35000, 5000, index, 70);

  const sales = amount(1660000, 10000, index, 90);
  const purchases = amount(830000, 10000, index, 90);
  const salary = amount(220000, 10000, index, 80);
  const rentExpense = amount(84000, 6000, index, 70);
  const interestExpense = amount(10000, 1000, index, 60);

  const vatInput = amount(95000, 5000, index, 80);
  const vatOutput = amount(160000, 10000, index, 80);
  const accumulatedDepPre = amount(210000, 10000, index, 80);

  const termTransferRaw = amount(60000, 10000, index, 50);
  const termTransfer = Math.min(termTransferRaw, termDeposit - 30000);

  const revenueRecognitionRaw = amount(20000, 5000, index, 45);
  const revenueRecognition = Math.min(revenueRecognitionRaw, Math.max(5000, advanceReceived - 5000));

  const cashShortage = amount(1000, 1000, index, 40);
  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(accountsReceivable * allowanceRate);
  const allowanceAdd = Math.max(1000, allowanceRequired - allowancePre);

  const endingInventory = amount(120000, 10000, index, 70);
  const depreciation = amount(18000, 1000, index, 60);
  const accruedInterest = amount(3000, 1000, index, 45);

  const prepaidRentRaw = amount(8000, 2000, index, 50);
  const prepaidRent = Math.min(prepaidRentRaw, Math.max(2000, rentExpense - 2000));

  const vatPayable = Math.max(1000, vatOutput - vatInput);
  const corporateTax = amount(50000, 10000, index, 70);

  const adjustedSales = sales + revenueRecognition;
  const adjustedPurchases = purchases - endingInventory;
  const adjustedRent = rentExpense - prepaidRent;
  const adjustedInterest = interestExpense + accruedInterest;

  const totalExpenses =
    adjustedPurchases +
    salary +
    adjustedRent +
    adjustedInterest +
    allowanceAdd +
    depreciation +
    cashShortage +
    corporateTax;

  const netIncome = adjustedSales - totalExpenses;

  const rows = [
    { id: 'cash', account: '現金', side: '借方', preBalance: cash, answer: cash - cashShortage, points: 1 },
    {
      id: 'checking',
      account: '当座預金',
      side: '借方',
      preBalance: checking,
      answer: checking + termTransfer,
      points: 2
    },
    {
      id: 'term',
      account: '定期預金',
      side: '借方',
      preBalance: termDeposit,
      answer: termDeposit - termTransfer,
      points: 2
    },
    {
      id: 'ar',
      account: '売掛金',
      side: '借方',
      preBalance: accountsReceivable,
      answer: accountsReceivable,
      points: 2
    },
    {
      id: 'allowance',
      account: '貸倒引当金',
      side: '貸方',
      preBalance: allowancePre,
      answer: allowancePre + allowanceAdd,
      points: 2
    },
    {
      id: 'allowance_expense',
      account: '貸倒引当金繰入',
      side: '借方',
      preBalance: 0,
      answer: allowanceAdd,
      points: 2
    },
    {
      id: 'advance_received',
      account: '仮受金',
      side: '貸方',
      preBalance: advanceReceived,
      answer: advanceReceived - revenueRecognition,
      points: 2
    },
    {
      id: 'sales',
      account: '売上',
      side: '貸方',
      preBalance: sales,
      answer: adjustedSales,
      points: 2
    },
    {
      id: 'purchases',
      account: '仕入',
      side: '借方',
      preBalance: purchases,
      answer: adjustedPurchases,
      points: 2
    },
    {
      id: 'inventory',
      account: '繰越商品',
      side: '借方',
      preBalance: 0,
      answer: endingInventory,
      points: 2
    },
    {
      id: 'depreciation_exp',
      account: '減価償却費',
      side: '借方',
      preBalance: 0,
      answer: depreciation,
      points: 1
    },
    {
      id: 'accum_dep',
      account: '備品減価償却累計額',
      side: '貸方',
      preBalance: accumulatedDepPre,
      answer: accumulatedDepPre + depreciation,
      points: 1
    },
    {
      id: 'interest_exp',
      account: '支払利息',
      side: '借方',
      preBalance: interestExpense,
      answer: adjustedInterest,
      points: 1
    },
    {
      id: 'interest_payable',
      account: '未払利息',
      side: '貸方',
      preBalance: 0,
      answer: accruedInterest,
      points: 1
    },
    {
      id: 'rent_exp',
      account: '支払家賃',
      side: '借方',
      preBalance: rentExpense,
      answer: adjustedRent,
      points: 1
    },
    {
      id: 'prepaid_expense',
      account: '前払費用',
      side: '借方',
      preBalance: 0,
      answer: prepaidRent,
      points: 1
    },
    {
      id: 'vat_input',
      account: '仮払消費税',
      side: '借方',
      preBalance: vatInput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_output',
      account: '仮受消費税',
      side: '貸方',
      preBalance: vatOutput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_payable',
      account: '未払消費税',
      side: '貸方',
      preBalance: 0,
      answer: vatPayable,
      points: 1
    },
    {
      id: 'tax_expense',
      account: '法人税、住民税及び事業税',
      side: '借方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    {
      id: 'tax_payable',
      account: '未払法人税等',
      side: '貸方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    {
      id: 'salary',
      account: '給料',
      side: '借方',
      preBalance: salary,
      answer: salary,
      points: 1
    },
    {
      id: 'misc',
      account: '雑費',
      side: '借方',
      preBalance: 0,
      answer: cashShortage,
      points: 1
    }
  ];

  return {
    title: '第3問 決算整理後残高試算表（本試験形式A）',
    prompt:
      '決算整理前残高試算表と決算整理事項にもとづき、(1)決算整理後残高試算表欄を完成し、(2)当期純利益を求めなさい。',
    adjustments: [
      `定期預金${yen(termTransfer)}が満期となり、当座預金へ振り替えた。`,
      `仮受金のうち${yen(revenueRecognition)}は当期の売上である。`,
      `現金実査の結果、現金が${yen(cashShortage)}不足していたため雑費処理する。`,
      `売掛金残高の${(allowanceRate * 100).toFixed(1)}%を貸倒引当金として設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `備品の減価償却費${yen(depreciation)}を計上する。`,
      `借入金にかかる未払利息${yen(accruedInterest)}を計上する。`,
      `支払家賃のうち翌期分${yen(prepaidRent)}を前払費用に振り替える。`,
      '税抜方式により、仮受消費税と仮払消費税を相殺して未払消費税を計上する。',
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`
    ],
    rows,
    netIncome,
    explanation:
      '整理事項10件をすべて反映して決算整理後残高を確定し、売上と費用の差額から当期純利益を算定する。'
  };
}

function createScenarioB(index) {
  const cash = amount(105000, 5000, index, 95);
  const ordinary = amount(520000, 10000, index, 95);
  const ar = amount(310000, 10000, index, 85);
  const temporaryPayment = amount(40000, 5000, index, 70);

  const purchases = amount(890000, 10000, index, 95);
  const salary = amount(225000, 5000, index, 90);
  const utilities = amount(45000, 5000, index, 80);
  const insurance = amount(50000, 5000, index, 80);
  const interestExpense = amount(10000, 1000, index, 70);

  const ap = amount(300000, 10000, index, 90);
  const loan = amount(540000, 10000, index, 90);
  const sales = amount(1780000, 10000, index, 95);
  const vatInput = amount(100000, 5000, index, 80);
  const vatOutput = amount(170000, 10000, index, 80);
  const allowancePre = amount(5000, 1000, index, 45);
  const buildAccumPre = amount(260000, 10000, index, 90);
  const equipAccumPre = amount(190000, 10000, index, 90);

  const equipPurchaseRaw = amount(35000, 5000, index, 50);
  const equipPurchase = Math.min(equipPurchaseRaw, Math.max(5000, temporaryPayment - 5000));
  const unrecordedSaleNet = amount(50000, 10000, index, 50);
  const unrecordedSaleTax = Math.floor(unrecordedSaleNet * 0.1);
  const unrecordedSaleGross = unrecordedSaleNet + unrecordedSaleTax;

  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(ar * allowanceRate);
  const allowanceAdd = Math.max(1000, allowanceRequired - allowancePre);

  const endingInventory = amount(135000, 5000, index, 70);
  const depBuilding = amount(20000, 1000, index, 60);
  const depEquip = amount(15000, 1000, index, 60);

  const prepaidInsuranceRaw = amount(8000, 2000, index, 55);
  const prepaidInsurance = Math.min(prepaidInsuranceRaw, Math.max(2000, insurance - 2000));

  const accruedUtilities = amount(6000, 1000, index, 50);
  const accruedInterest = amount(3000, 1000, index, 50);

  const vatPayable = Math.max(1000, vatOutput + unrecordedSaleTax - vatInput);
  const corporateTax = amount(60000, 10000, index, 70);

  const adjustedSales = sales + unrecordedSaleNet;
  const adjustedPurchases = purchases - endingInventory;
  const adjustedUtilities = utilities + accruedUtilities;
  const adjustedInsurance = insurance - prepaidInsurance;
  const adjustedInterest = interestExpense + accruedInterest;

  const totalExpenses =
    adjustedPurchases +
    salary +
    adjustedUtilities +
    adjustedInsurance +
    adjustedInterest +
    allowanceAdd +
    depBuilding +
    depEquip +
    corporateTax;

  const netIncome = adjustedSales - totalExpenses;

  const rows = [
    { id: 'cash', account: '現金', side: '借方', preBalance: cash, answer: cash + unrecordedSaleGross, points: 2 },
    {
      id: 'ordinary',
      account: '普通預金',
      side: '借方',
      preBalance: ordinary,
      answer: ordinary,
      points: 1
    },
    { id: 'ar', account: '売掛金', side: '借方', preBalance: ar, answer: ar, points: 1 },
    {
      id: 'temp_pay',
      account: '仮払金',
      side: '借方',
      preBalance: temporaryPayment,
      answer: temporaryPayment - equipPurchase,
      points: 1
    },
    { id: 'equip', account: '備品', side: '借方', preBalance: 0, answer: equipPurchase, points: 1 },
    {
      id: 'allowance',
      account: '貸倒引当金',
      side: '貸方',
      preBalance: allowancePre,
      answer: allowancePre + allowanceAdd,
      points: 2
    },
    {
      id: 'allowance_exp',
      account: '貸倒引当金繰入',
      side: '借方',
      preBalance: 0,
      answer: allowanceAdd,
      points: 1
    },
    {
      id: 'purchases',
      account: '仕入',
      side: '借方',
      preBalance: purchases,
      answer: adjustedPurchases,
      points: 2
    },
    {
      id: 'inventory',
      account: '繰越商品',
      side: '借方',
      preBalance: 0,
      answer: endingInventory,
      points: 2
    },
    { id: 'sales', account: '売上', side: '貸方', preBalance: sales, answer: adjustedSales, points: 2 },
    {
      id: 'vat_input',
      account: '仮払消費税',
      side: '借方',
      preBalance: vatInput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_output',
      account: '仮受消費税',
      side: '貸方',
      preBalance: vatOutput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_payable',
      account: '未払消費税',
      side: '貸方',
      preBalance: 0,
      answer: vatPayable,
      points: 1
    },
    {
      id: 'utilities',
      account: '水道光熱費',
      side: '借方',
      preBalance: utilities,
      answer: adjustedUtilities,
      points: 1
    },
    {
      id: 'insurance',
      account: '保険料',
      side: '借方',
      preBalance: insurance,
      answer: adjustedInsurance,
      points: 1
    },
    {
      id: 'prepaid',
      account: '前払費用',
      side: '借方',
      preBalance: 0,
      answer: prepaidInsurance,
      points: 1
    },
    {
      id: 'interest_exp',
      account: '支払利息',
      side: '借方',
      preBalance: interestExpense,
      answer: adjustedInterest,
      points: 1
    },
    {
      id: 'accrued_exp',
      account: '未払費用',
      side: '貸方',
      preBalance: 0,
      answer: accruedUtilities,
      points: 1
    },
    {
      id: 'accrued_interest',
      account: '未払利息',
      side: '貸方',
      preBalance: 0,
      answer: accruedInterest,
      points: 1
    },
    {
      id: 'dep_exp',
      account: '減価償却費',
      side: '借方',
      preBalance: 0,
      answer: depBuilding + depEquip,
      points: 1
    },
    {
      id: 'build_accum',
      account: '建物減価償却累計額',
      side: '貸方',
      preBalance: buildAccumPre,
      answer: buildAccumPre + depBuilding,
      points: 1
    },
    {
      id: 'equip_accum',
      account: '備品減価償却累計額',
      side: '貸方',
      preBalance: equipAccumPre,
      answer: equipAccumPre + depEquip,
      points: 1
    },
    {
      id: 'tax_exp',
      account: '法人税、住民税及び事業税',
      side: '借方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    {
      id: 'tax_payable',
      account: '未払法人税等',
      side: '貸方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    { id: 'salary', account: '給料', side: '借方', preBalance: salary, answer: salary, points: 1 },
    { id: 'ap', account: '買掛金', side: '貸方', preBalance: ap, answer: ap, points: 1 },
    { id: 'loan', account: '借入金', side: '貸方', preBalance: loan, answer: loan, points: 1 }
  ];

  return {
    title: '第3問 決算整理後残高試算表（本試験形式B）',
    prompt:
      '決算整理前残高試算表と決算整理事項にもとづき、(1)決算整理後残高試算表欄を完成し、(2)当期純利益を求めなさい。',
    adjustments: [
      `仮払金のうち${yen(equipPurchase)}は備品購入代金である。`,
      `売上${yen(unrecordedSaleNet)}（税抜）の現金販売を未記帳であった。`,
      `売掛金残高の${(allowanceRate * 100).toFixed(1)}%を貸倒引当金に設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `建物の減価償却費${yen(depBuilding)}、備品の減価償却費${yen(depEquip)}を計上する。`,
      `保険料のうち翌期分${yen(prepaidInsurance)}を前払費用とする。`,
      `未払水道光熱費${yen(accruedUtilities)}を計上する。`,
      `借入金にかかる未払利息${yen(accruedInterest)}を計上する。`,
      '税抜方式により、仮受消費税と仮払消費税を相殺して未払消費税を計上する。',
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`
    ],
    rows,
    netIncome,
    explanation:
      '未処理取引の反映と決算整理事項を同時に処理する。売上・売上原価・費用の修正後に純利益を算定する。'
  };
}

function createScenarioC(index) {
  const cash = amount(120000, 10000, index, 90);
  const ordinary = amount(540000, 10000, index, 90);
  const ar = amount(320000, 10000, index, 85);
  const allowancePre = amount(6000, 1000, index, 45);

  const unearnedRevenue = amount(45000, 5000, index, 70);
  const rentRevenue = amount(36000, 6000, index, 70);
  const interestRevenue = amount(7000, 1000, index, 60);

  const sales = amount(1680000, 10000, index, 90);
  const purchases = amount(820000, 10000, index, 90);
  const salary = amount(210000, 10000, index, 80);
  const utilities = amount(45000, 5000, index, 80);
  const insurance = amount(55000, 5000, index, 80);

  const vatInput = amount(100000, 5000, index, 80);
  const vatOutput = amount(165000, 5000, index, 80);
  const buildAccumPre = amount(250000, 10000, index, 90);
  const equipAccumPre = amount(180000, 10000, index, 90);

  const ap = amount(290000, 10000, index, 80);
  const loan = amount(520000, 10000, index, 80);

  const unrecordedSaleNet = amount(40000, 10000, index, 55);
  const unrecordedSaleTax = Math.floor(unrecordedSaleNet * 0.1);
  const unrecordedSaleGross = unrecordedSaleNet + unrecordedSaleTax;

  const recognizedRentRaw = amount(15000, 5000, index, 45);
  const recognizedRent = Math.min(recognizedRentRaw, Math.max(5000, unearnedRevenue - 5000));
  const accruedInterestRevenue = amount(3000, 1000, index, 45);

  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor((ar + unrecordedSaleGross) * allowanceRate);
  const allowanceAdd = Math.max(1000, allowanceRequired - allowancePre);

  const endingInventory = amount(125000, 5000, index, 70);
  const depBuilding = amount(18000, 1000, index, 60);
  const depEquip = amount(14000, 1000, index, 60);
  const depTotal = depBuilding + depEquip;

  const accruedUtilities = amount(6000, 1000, index, 50);
  const prepaidInsuranceRaw = amount(8000, 2000, index, 50);
  const prepaidInsurance = Math.min(prepaidInsuranceRaw, Math.max(2000, insurance - 2000));

  const vatPayable = Math.max(1000, vatOutput + unrecordedSaleTax - vatInput);
  const corporateTax = amount(50000, 10000, index, 70);

  const adjustedSales = sales + unrecordedSaleNet;
  const adjustedRentRevenue = rentRevenue + recognizedRent;
  const adjustedInterestRevenue = interestRevenue + accruedInterestRevenue;
  const adjustedPurchases = purchases - endingInventory;
  const adjustedUtilities = utilities + accruedUtilities;
  const adjustedInsurance = insurance - prepaidInsurance;

  const totalRevenue = adjustedSales + adjustedRentRevenue + adjustedInterestRevenue;
  const totalExpenses =
    adjustedPurchases +
    salary +
    adjustedUtilities +
    adjustedInsurance +
    allowanceAdd +
    depTotal +
    corporateTax;

  const netIncome = totalRevenue - totalExpenses;

  const rows = [
    { id: 'cash', account: '現金', side: '借方', preBalance: cash, answer: cash, points: 1 },
    { id: 'ordinary', account: '普通預金', side: '借方', preBalance: ordinary, answer: ordinary, points: 1 },
    { id: 'ar', account: '売掛金', side: '借方', preBalance: ar, answer: ar + unrecordedSaleGross, points: 2 },
    {
      id: 'allowance',
      account: '貸倒引当金',
      side: '貸方',
      preBalance: allowancePre,
      answer: allowancePre + allowanceAdd,
      points: 2
    },
    {
      id: 'allowance_expense',
      account: '貸倒引当金繰入',
      side: '借方',
      preBalance: 0,
      answer: allowanceAdd,
      points: 1
    },
    {
      id: 'unearned_revenue',
      account: '前受収益',
      side: '貸方',
      preBalance: unearnedRevenue,
      answer: unearnedRevenue - recognizedRent,
      points: 1
    },
    {
      id: 'rent_revenue',
      account: '受取家賃',
      side: '貸方',
      preBalance: rentRevenue,
      answer: adjustedRentRevenue,
      points: 1
    },
    {
      id: 'interest_revenue',
      account: '受取利息',
      side: '貸方',
      preBalance: interestRevenue,
      answer: adjustedInterestRevenue,
      points: 1
    },
    {
      id: 'accrued_revenue',
      account: '未収収益',
      side: '借方',
      preBalance: 0,
      answer: accruedInterestRevenue,
      points: 1
    },
    { id: 'sales', account: '売上', side: '貸方', preBalance: sales, answer: adjustedSales, points: 2 },
    {
      id: 'purchases',
      account: '仕入',
      side: '借方',
      preBalance: purchases,
      answer: adjustedPurchases,
      points: 2
    },
    {
      id: 'inventory',
      account: '繰越商品',
      side: '借方',
      preBalance: 0,
      answer: endingInventory,
      points: 2
    },
    {
      id: 'utilities',
      account: '水道光熱費',
      side: '借方',
      preBalance: utilities,
      answer: adjustedUtilities,
      points: 1
    },
    {
      id: 'accrued_exp',
      account: '未払費用',
      side: '貸方',
      preBalance: 0,
      answer: accruedUtilities,
      points: 1
    },
    {
      id: 'insurance',
      account: '保険料',
      side: '借方',
      preBalance: insurance,
      answer: adjustedInsurance,
      points: 1
    },
    {
      id: 'prepaid_expense',
      account: '前払費用',
      side: '借方',
      preBalance: 0,
      answer: prepaidInsurance,
      points: 1
    },
    {
      id: 'dep_exp',
      account: '減価償却費',
      side: '借方',
      preBalance: 0,
      answer: depTotal,
      points: 1
    },
    {
      id: 'build_accum',
      account: '建物減価償却累計額',
      side: '貸方',
      preBalance: buildAccumPre,
      answer: buildAccumPre + depBuilding,
      points: 1
    },
    {
      id: 'equip_accum',
      account: '備品減価償却累計額',
      side: '貸方',
      preBalance: equipAccumPre,
      answer: equipAccumPre + depEquip,
      points: 1
    },
    {
      id: 'vat_input',
      account: '仮払消費税',
      side: '借方',
      preBalance: vatInput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_output',
      account: '仮受消費税',
      side: '貸方',
      preBalance: vatOutput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_payable',
      account: '未払消費税',
      side: '貸方',
      preBalance: 0,
      answer: vatPayable,
      points: 1
    },
    {
      id: 'tax_expense',
      account: '法人税、住民税及び事業税',
      side: '借方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    {
      id: 'tax_payable',
      account: '未払法人税等',
      side: '貸方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    { id: 'salary', account: '給料', side: '借方', preBalance: salary, answer: salary, points: 1 },
    { id: 'ap', account: '買掛金', side: '貸方', preBalance: ap, answer: ap, points: 1 },
    { id: 'loan', account: '借入金', side: '貸方', preBalance: loan, answer: loan, points: 1 }
  ];

  return {
    title: '第3問 決算整理後残高試算表（本試験形式C）',
    prompt:
      '決算整理前残高試算表と決算整理事項にもとづき、(1)決算整理後残高試算表欄を完成し、(2)当期純利益を求めなさい。',
    adjustments: [
      `売上${yen(unrecordedSaleNet)}（税抜）の掛販売を未記帳であった。`,
      `前受収益のうち当期分${yen(recognizedRent)}を受取家賃に振り替える。`,
      `未収収益${yen(accruedInterestRevenue)}を計上する。`,
      `売掛金残高の${(allowanceRate * 100).toFixed(1)}%を貸倒引当金に設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `建物の減価償却費${yen(depBuilding)}、備品の減価償却費${yen(depEquip)}を計上する。`,
      `未払水道光熱費${yen(accruedUtilities)}を計上する。`,
      `保険料のうち翌期分${yen(prepaidInsurance)}を前払費用に振り替える。`,
      '税抜方式により、仮受消費税と仮払消費税を相殺して未払消費税を計上する。',
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`
    ],
    rows,
    netIncome,
    explanation:
      '売上の未記帳、前受収益・未収収益、貸倒引当金、消費税精算を同時に処理し、決算整理後残高から純利益を算定する。'
  };
}

function createScenarioD(index) {
  const cash = amount(100000, 10000, index, 90);
  const ordinary = amount(480000, 10000, index, 90);
  const termDeposit = amount(230000, 10000, index, 90);
  const ar = amount(300000, 10000, index, 80);
  const allowancePre = amount(5000, 1000, index, 45);
  const advanceReceived = amount(35000, 5000, index, 70);

  const sales = amount(1710000, 10000, index, 90);
  const purchases = amount(845000, 5000, index, 90);
  const salary = amount(220000, 10000, index, 80);
  const rentExpense = amount(80000, 5000, index, 80);
  const interestExpense = amount(10000, 1000, index, 70);

  const vatInput = amount(100000, 5000, index, 80);
  const vatOutput = amount(170000, 10000, index, 80);
  const equipAccumPre = amount(200000, 10000, index, 80);

  const ap = amount(280000, 10000, index, 80);
  const loan = amount(500000, 10000, index, 80);

  const termTransferRaw = amount(60000, 10000, index, 50);
  const termTransfer = Math.min(termTransferRaw, termDeposit - 30000);

  const revenueRecognitionRaw = amount(20000, 5000, index, 45);
  const revenueRecognition = Math.min(revenueRecognitionRaw, Math.max(5000, advanceReceived - 5000));
  const cashExcess = amount(1000, 1000, index, 40);

  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(ar * allowanceRate);
  const allowanceAdd = Math.max(1000, allowanceRequired - allowancePre);

  const endingInventory = amount(130000, 10000, index, 70);
  const depreciation = amount(17000, 1000, index, 60);
  const accruedInterest = amount(3000, 1000, index, 45);

  const prepaidRentRaw = amount(8000, 2000, index, 50);
  const prepaidRent = Math.min(prepaidRentRaw, Math.max(2000, rentExpense - 2000));

  const vatPayable = Math.max(1000, vatOutput - vatInput);
  const corporateTax = amount(50000, 10000, index, 70);

  const adjustedSales = sales + revenueRecognition;
  const adjustedPurchases = purchases - endingInventory;
  const adjustedRent = rentExpense - prepaidRent;
  const adjustedInterest = interestExpense + accruedInterest;

  const totalRevenue = adjustedSales + cashExcess;
  const totalExpenses =
    adjustedPurchases +
    salary +
    adjustedRent +
    adjustedInterest +
    allowanceAdd +
    depreciation +
    corporateTax;

  const netIncome = totalRevenue - totalExpenses;

  const rows = [
    { id: 'cash', account: '現金', side: '借方', preBalance: cash, answer: cash + cashExcess, points: 1 },
    {
      id: 'ordinary',
      account: '普通預金',
      side: '借方',
      preBalance: ordinary,
      answer: ordinary + termTransfer,
      points: 2
    },
    {
      id: 'term',
      account: '定期預金',
      side: '借方',
      preBalance: termDeposit,
      answer: termDeposit - termTransfer,
      points: 2
    },
    { id: 'ar', account: '売掛金', side: '借方', preBalance: ar, answer: ar, points: 2 },
    {
      id: 'allowance',
      account: '貸倒引当金',
      side: '貸方',
      preBalance: allowancePre,
      answer: allowancePre + allowanceAdd,
      points: 2
    },
    {
      id: 'allowance_expense',
      account: '貸倒引当金繰入',
      side: '借方',
      preBalance: 0,
      answer: allowanceAdd,
      points: 1
    },
    {
      id: 'advance_received',
      account: '仮受金',
      side: '貸方',
      preBalance: advanceReceived,
      answer: advanceReceived - revenueRecognition,
      points: 1
    },
    { id: 'sales', account: '売上', side: '貸方', preBalance: sales, answer: adjustedSales, points: 2 },
    {
      id: 'purchases',
      account: '仕入',
      side: '借方',
      preBalance: purchases,
      answer: adjustedPurchases,
      points: 2
    },
    {
      id: 'inventory',
      account: '繰越商品',
      side: '借方',
      preBalance: 0,
      answer: endingInventory,
      points: 2
    },
    {
      id: 'depreciation_exp',
      account: '減価償却費',
      side: '借方',
      preBalance: 0,
      answer: depreciation,
      points: 1
    },
    {
      id: 'equip_accum',
      account: '備品減価償却累計額',
      side: '貸方',
      preBalance: equipAccumPre,
      answer: equipAccumPre + depreciation,
      points: 1
    },
    {
      id: 'interest_exp',
      account: '支払利息',
      side: '借方',
      preBalance: interestExpense,
      answer: adjustedInterest,
      points: 1
    },
    {
      id: 'interest_payable',
      account: '未払利息',
      side: '貸方',
      preBalance: 0,
      answer: accruedInterest,
      points: 1
    },
    {
      id: 'rent_exp',
      account: '支払家賃',
      side: '借方',
      preBalance: rentExpense,
      answer: adjustedRent,
      points: 1
    },
    {
      id: 'prepaid_expense',
      account: '前払費用',
      side: '借方',
      preBalance: 0,
      answer: prepaidRent,
      points: 1
    },
    {
      id: 'vat_input',
      account: '仮払消費税',
      side: '借方',
      preBalance: vatInput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_output',
      account: '仮受消費税',
      side: '貸方',
      preBalance: vatOutput,
      answer: 0,
      points: 1
    },
    {
      id: 'vat_payable',
      account: '未払消費税',
      side: '貸方',
      preBalance: 0,
      answer: vatPayable,
      points: 1
    },
    {
      id: 'tax_expense',
      account: '法人税、住民税及び事業税',
      side: '借方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    {
      id: 'tax_payable',
      account: '未払法人税等',
      side: '貸方',
      preBalance: 0,
      answer: corporateTax,
      points: 1
    },
    { id: 'salary', account: '給料', side: '借方', preBalance: salary, answer: salary, points: 1 },
    { id: 'misc_gain', account: '雑益', side: '貸方', preBalance: 0, answer: cashExcess, points: 1 },
    { id: 'ap', account: '買掛金', side: '貸方', preBalance: ap, answer: ap, points: 1 },
    { id: 'loan', account: '借入金', side: '貸方', preBalance: loan, answer: loan, points: 1 }
  ];

  return {
    title: '第3問 決算整理後残高試算表（本試験形式D）',
    prompt:
      '決算整理前残高試算表と決算整理事項にもとづき、(1)決算整理後残高試算表欄を完成し、(2)当期純利益を求めなさい。',
    adjustments: [
      `定期預金${yen(termTransfer)}が満期となり、普通預金へ振り替えた。`,
      `仮受金のうち${yen(revenueRecognition)}は当期の売上である。`,
      `現金実査の結果、帳簿より${yen(cashExcess)}多く、雑益として処理する。`,
      `売掛金残高の${(allowanceRate * 100).toFixed(1)}%を貸倒引当金として設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `備品の減価償却費${yen(depreciation)}を計上する。`,
      `借入金にかかる未払利息${yen(accruedInterest)}を計上する。`,
      `支払家賃のうち翌期分${yen(prepaidRent)}を前払費用に振り替える。`,
      '税抜方式により、仮受消費税と仮払消費税を相殺して未払消費税を計上する。',
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`
    ],
    rows,
    netIncome,
    explanation:
      '預金振替、仮受金の売上振替、現金過不足（雑益）を含む決算整理を処理し、調整後の費用収益から純利益を求める。'
  };
}

function createBSPLScenarioA(index) {
  const cash = amount(180000, 1300, index, 80);
  const ordinary = amount(520000, 2100, index, 80);
  const ar = amount(330000, 1700, index, 80);
  const allowancePre = amount(6400, 140, index, 45);
  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(ar * allowanceRate);
  const allowanceAdd = Math.max(1000, allowanceRequired - allowancePre);

  const purchases = amount(980000, 4200, index, 80);
  const endingInventory = amount(170000, 1200, index, 80);
  const salesBase = amount(2010000, 7600, index, 80);
  const recognizedRevenue = amount(24000, 700, index, 45);

  const salary = amount(245000, 1100, index, 80);
  const rent = amount(82000, 600, index, 80);
  const accruedRent = amount(5200, 260, index, 45);
  const utilities = amount(51000, 420, index, 80);
  const insurance = amount(58000, 480, index, 80);
  const prepaidInsuranceRaw = amount(7600, 260, index, 45);
  const prepaidInsurance = Math.min(prepaidInsuranceRaw, Math.max(1800, insurance - 1800));
  const advertising = amount(70000, 580, index, 80);
  const depBuilding = amount(26000, 700, index, 80);
  const depEquip = amount(18000, 550, index, 80);

  const interest = amount(11800, 130, index, 70);
  const accruedInterest = amount(3200, 120, index, 45);

  const vatInput = amount(112000, 900, index, 80);
  const vatOutput = amount(189000, 1000, index, 80);
  const vatPayable = Math.max(1000, vatOutput - vatInput);

  const corporateTax = amount(76000, 1300, index, 70);

  const cogs = purchases - endingInventory;
  const sales = salesBase + recognizedRevenue;
  const sga =
    salary +
    (rent + accruedRent) +
    utilities +
    (insurance - prepaidInsurance) +
    advertising +
    depBuilding +
    depEquip +
    allowanceAdd;
  const operatingProfit = sales - cogs - sga;
  const nonOperating = interest + accruedInterest;
  const profitBeforeTax = operatingProfit - nonOperating;
  const netIncome = profitBeforeTax - corporateTax;

  const fixedAssetsNet =
    amount(700000, 2300, index, 80) + amount(380000, 1700, index, 80) - depBuilding - depEquip;
  const payables = amount(280000, 1800, index, 80);
  const accruedTotal = accruedRent + accruedInterest + vatPayable + corporateTax;
  const loan = amount(540000, 2100, index, 80);
  const equityTotal = amount(900000, 2200, index, 80) + netIncome;

  const rows = [
    { id: 'pl_sales', statement: 'pl', label: '売上高', answer: sales, points: 2 },
    { id: 'pl_cogs', statement: 'pl', label: '売上原価', answer: cogs, points: 2 },
    { id: 'pl_gross', statement: 'pl', label: '売上総利益', answer: sales - cogs, points: 2 },
    { id: 'pl_sga', statement: 'pl', label: '販売費及び一般管理費', answer: sga, points: 2 },
    { id: 'pl_operating', statement: 'pl', label: '営業利益', answer: operatingProfit, points: 2 },
    { id: 'pl_nonop', statement: 'pl', label: '営業外費用（支払利息）', answer: nonOperating, points: 2 },
    {
      id: 'pl_before_tax',
      statement: 'pl',
      label: '税引前当期純利益',
      answer: profitBeforeTax,
      points: 2
    },
    { id: 'pl_tax', statement: 'pl', label: '法人税等', answer: corporateTax, points: 2 },
    { id: 'bs_cash', statement: 'bs', label: '現金及び預金', answer: cash + ordinary, points: 2 },
    { id: 'bs_ar_net', statement: 'bs', label: '売掛金（純額）', answer: ar - allowanceRequired, points: 2 },
    { id: 'bs_inventory', statement: 'bs', label: '商品', answer: endingInventory, points: 2 },
    { id: 'bs_fixed', statement: 'bs', label: '有形固定資産（純額）', answer: fixedAssetsNet, points: 2 },
    { id: 'bs_ap', statement: 'bs', label: '買掛金', answer: payables, points: 2 },
    { id: 'bs_accrued', statement: 'bs', label: '未払費用等', answer: accruedTotal, points: 2 },
    { id: 'bs_loan', statement: 'bs', label: '借入金', answer: loan, points: 2 },
    { id: 'bs_equity', statement: 'bs', label: '純資産合計', answer: equityTotal, points: 2 }
  ];

  return {
    title: '第3問 B/S・P/L作成問題（本試験形式A）',
    prompt:
      '決算整理前残高試算表と決算整理事項をもとに、損益計算書および貸借対照表の空欄を完成し、当期純利益を求めなさい。',
    adjustments: [
      `仮受金のうち${yen(recognizedRevenue)}は当期売上に振り替える。`,
      `売掛金残高に対し${(allowanceRate * 100).toFixed(1)}%で貸倒引当金を設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `建物の減価償却費${yen(depBuilding)}、備品の減価償却費${yen(depEquip)}を計上する。`,
      `保険料のうち翌期分${yen(prepaidInsurance)}を前払費用に振り替える。`,
      `当期未払家賃${yen(accruedRent)}を計上する。`,
      `借入金にかかる未払利息${yen(accruedInterest)}を計上する。`,
      '消費税は税抜方式により、仮受消費税と仮払消費税を相殺して未払消費税を計上する。',
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`,
      '各金額は円単位で入力する。'
    ],
    rows,
    netIncome,
    explanation:
      '売上原価・販管費・営業外費用・法人税等を段階的に処理し、P/Lから純利益を算定する。B/Sは整理後残高から純額表示で作成する。'
  };
}

function createBSPLScenarioB(index) {
  const cash = amount(160000, 1100, index, 80);
  const ordinary = amount(470000, 1900, index, 80);
  const ar = amount(360000, 1800, index, 80);
  const allowancePre = amount(5200, 130, index, 45);
  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(ar * allowanceRate);
  const allowanceAdd = Math.max(900, allowanceRequired - allowancePre);

  const purchases = amount(940000, 3900, index, 80);
  const endingInventory = amount(150000, 1000, index, 80);
  const salesBase = amount(1940000, 7300, index, 80);
  const recognizedRevenue = amount(21000, 650, index, 45);

  const salary = amount(232000, 1000, index, 80);
  const rent = amount(76000, 540, index, 80);
  const accruedRent = amount(4800, 240, index, 45);
  const utilities = amount(46000, 390, index, 80);
  const insurance = amount(61000, 500, index, 80);
  const prepaidInsuranceRaw = amount(8000, 280, index, 45);
  const prepaidInsurance = Math.min(prepaidInsuranceRaw, Math.max(1800, insurance - 1800));
  const advertising = amount(68000, 520, index, 80);
  const depBuilding = amount(24000, 650, index, 80);
  const depEquip = amount(17000, 500, index, 80);

  const interest = amount(10900, 120, index, 70);
  const accruedInterest = amount(3000, 110, index, 45);

  const vatInput = amount(106000, 820, index, 80);
  const vatOutput = amount(181000, 940, index, 80);
  const vatPayable = Math.max(1000, vatOutput - vatInput);

  const corporateTax = amount(69000, 1200, index, 70);

  const cogs = purchases - endingInventory;
  const sales = salesBase + recognizedRevenue;
  const sga =
    salary +
    (rent + accruedRent) +
    utilities +
    (insurance - prepaidInsurance) +
    advertising +
    depBuilding +
    depEquip +
    allowanceAdd;
  const operatingProfit = sales - cogs - sga;
  const nonOperating = interest + accruedInterest;
  const profitBeforeTax = operatingProfit - nonOperating;
  const netIncome = profitBeforeTax - corporateTax;

  const fixedAssetsNet =
    amount(670000, 2200, index, 80) + amount(350000, 1600, index, 80) - depBuilding - depEquip;
  const payables = amount(300000, 1700, index, 80);
  const accruedTotal = accruedRent + accruedInterest + vatPayable + corporateTax;
  const loan = amount(510000, 2000, index, 80);
  const equityTotal = amount(870000, 2100, index, 80) + netIncome;

  const rows = [
    { id: 'pl_sales', statement: 'pl', label: '売上高', answer: sales, points: 2 },
    { id: 'pl_cogs', statement: 'pl', label: '売上原価', answer: cogs, points: 2 },
    { id: 'pl_gross', statement: 'pl', label: '売上総利益', answer: sales - cogs, points: 2 },
    { id: 'pl_sga', statement: 'pl', label: '販売費及び一般管理費', answer: sga, points: 2 },
    { id: 'pl_operating', statement: 'pl', label: '営業利益', answer: operatingProfit, points: 2 },
    { id: 'pl_nonop', statement: 'pl', label: '営業外費用（支払利息）', answer: nonOperating, points: 2 },
    {
      id: 'pl_before_tax',
      statement: 'pl',
      label: '税引前当期純利益',
      answer: profitBeforeTax,
      points: 2
    },
    { id: 'pl_tax', statement: 'pl', label: '法人税等', answer: corporateTax, points: 2 },
    { id: 'bs_cash', statement: 'bs', label: '現金及び預金', answer: cash + ordinary, points: 2 },
    { id: 'bs_ar_net', statement: 'bs', label: '売掛金（純額）', answer: ar - allowanceRequired, points: 2 },
    { id: 'bs_inventory', statement: 'bs', label: '商品', answer: endingInventory, points: 2 },
    { id: 'bs_fixed', statement: 'bs', label: '有形固定資産（純額）', answer: fixedAssetsNet, points: 2 },
    { id: 'bs_ap', statement: 'bs', label: '買掛金', answer: payables, points: 2 },
    { id: 'bs_accrued', statement: 'bs', label: '未払費用等', answer: accruedTotal, points: 2 },
    { id: 'bs_loan', statement: 'bs', label: '借入金', answer: loan, points: 2 },
    { id: 'bs_equity', statement: 'bs', label: '純資産合計', answer: equityTotal, points: 2 }
  ];

  return {
    title: '第3問 B/S・P/L作成問題（本試験形式B）',
    prompt:
      '決算整理前残高試算表と決算整理事項をもとに、損益計算書および貸借対照表の空欄を完成し、当期純利益を求めなさい。',
    adjustments: [
      `仮受金のうち${yen(recognizedRevenue)}は当期売上に振り替える。`,
      `売掛金残高に対し${(allowanceRate * 100).toFixed(1)}%で貸倒引当金を設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `建物の減価償却費${yen(depBuilding)}、備品の減価償却費${yen(depEquip)}を計上する。`,
      `保険料のうち翌期分${yen(prepaidInsurance)}を前払費用に振り替える。`,
      `当期未払家賃${yen(accruedRent)}を計上する。`,
      `借入金にかかる未払利息${yen(accruedInterest)}を計上する。`,
      '消費税は税抜方式により、仮受消費税と仮払消費税を相殺して未払消費税を計上する。',
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`,
      '各金額は円単位で入力する。'
    ],
    rows,
    netIncome,
    explanation:
      '各決算整理を反映した上でP/L項目を段階表示で計算し、B/Sの主要項目を純額基準で作成する。'
  };
}

function createBSPLScenarioC(index) {
  const cash = amount(186000, 1200, index, 80);
  const ordinary = amount(550000, 2200, index, 80);
  const ar = amount(340000, 1700, index, 80);
  const allowancePre = amount(6000, 140, index, 45);
  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(ar * allowanceRate);
  const allowanceAdd = Math.max(1000, allowanceRequired - allowancePre);

  const purchases = amount(970000, 4100, index, 80);
  const endingInventory = amount(168000, 1150, index, 80);
  const salesBase = amount(2050000, 7600, index, 80);
  const recognizedRevenue = amount(22000, 700, index, 45);

  const salary = amount(242000, 1000, index, 80);
  const rent = amount(80000, 560, index, 80);
  const utilities = amount(50000, 420, index, 80);
  const insurance = amount(57000, 500, index, 80);
  const prepaidInsuranceRaw = amount(7200, 260, index, 45);
  const prepaidInsurance = Math.min(prepaidInsuranceRaw, Math.max(1800, insurance - 1800));
  const advertising = amount(69000, 560, index, 80);
  const depBuilding = amount(25500, 680, index, 80);
  const depEquip = amount(17600, 540, index, 80);

  const interestIncome = amount(6200, 140, index, 70);
  const accruedInterestIncome = amount(2600, 110, index, 45);
  const nonOperatingIncome = interestIncome + accruedInterestIncome;

  const corporateTax = amount(74000, 1250, index, 70);

  const cogs = purchases - endingInventory;
  const sales = salesBase + recognizedRevenue;
  const sga =
    salary +
    rent +
    utilities +
    (insurance - prepaidInsurance) +
    advertising +
    depBuilding +
    depEquip +
    allowanceAdd;
  const operatingProfit = sales - cogs - sga;
  const profitBeforeTax = operatingProfit + nonOperatingIncome;
  const netIncome = profitBeforeTax - corporateTax;

  const fixedAssetsNet =
    amount(710000, 2200, index, 80) + amount(370000, 1600, index, 80) - depBuilding - depEquip;
  const payables = amount(285000, 1700, index, 80);
  const loan = amount(535000, 2050, index, 80);
  const equityTotal = amount(905000, 2100, index, 80) + netIncome;

  const rows = [
    { id: 'pl_sales', statement: 'pl', label: '売上高', answer: sales, points: 2 },
    { id: 'pl_cogs', statement: 'pl', label: '売上原価', answer: cogs, points: 2 },
    { id: 'pl_gross', statement: 'pl', label: '売上総利益', answer: sales - cogs, points: 2 },
    { id: 'pl_sga', statement: 'pl', label: '販売費及び一般管理費', answer: sga, points: 2 },
    { id: 'pl_operating', statement: 'pl', label: '営業利益', answer: operatingProfit, points: 2 },
    {
      id: 'pl_nonop_gain',
      statement: 'pl',
      label: '営業外収益（受取利息等）',
      answer: nonOperatingIncome,
      points: 2
    },
    {
      id: 'pl_before_tax',
      statement: 'pl',
      label: '税引前当期純利益',
      answer: profitBeforeTax,
      points: 2
    },
    { id: 'pl_tax', statement: 'pl', label: '法人税等', answer: corporateTax, points: 2 },
    { id: 'bs_cash', statement: 'bs', label: '現金及び預金', answer: cash + ordinary, points: 2 },
    { id: 'bs_ar_net', statement: 'bs', label: '売掛金（純額）', answer: ar - allowanceRequired, points: 2 },
    { id: 'bs_inventory', statement: 'bs', label: '商品', answer: endingInventory, points: 2 },
    { id: 'bs_fixed', statement: 'bs', label: '有形固定資産（純額）', answer: fixedAssetsNet, points: 2 },
    { id: 'bs_accrued_rev', statement: 'bs', label: '未収収益', answer: accruedInterestIncome, points: 2 },
    { id: 'bs_ap', statement: 'bs', label: '買掛金', answer: payables, points: 2 },
    { id: 'bs_loan', statement: 'bs', label: '借入金', answer: loan, points: 2 },
    { id: 'bs_equity', statement: 'bs', label: '純資産合計', answer: equityTotal, points: 2 }
  ];

  return {
    title: '第3問 B/S・P/L作成問題（本試験形式C）',
    prompt:
      '決算整理前残高試算表と決算整理事項をもとに、損益計算書および貸借対照表の空欄を完成し、当期純利益を求めなさい。',
    adjustments: [
      `前受収益のうち${yen(recognizedRevenue)}を当期売上に振り替える。`,
      `売掛金残高に対し${(allowanceRate * 100).toFixed(1)}%で貸倒引当金を設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `建物の減価償却費${yen(depBuilding)}、備品の減価償却費${yen(depEquip)}を計上する。`,
      `保険料のうち翌期分${yen(prepaidInsurance)}を前払費用に振り替える。`,
      `未収収益${yen(accruedInterestIncome)}を計上する。`,
      `販売費及び一般管理費に貸倒引当金繰入を含める。`,
      `営業外収益は受取利息等${yen(nonOperatingIncome)}とする。`,
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`,
      '各金額は円単位で入力する。'
    ],
    rows,
    netIncome,
    explanation:
      '営業外収益を加味した税引前利益を算定し、法人税等を控除して当期純利益を求める。B/Sでは売掛金を純額表示する。'
  };
}

function createBSPLScenarioD(index) {
  const cash = amount(172000, 1100, index, 80);
  const ordinary = amount(505000, 2000, index, 80);
  const ar = amount(355000, 1750, index, 80);
  const allowancePre = amount(5600, 140, index, 45);
  const allowanceRate = [0.02, 0.025, 0.03][index % 3];
  const allowanceRequired = Math.floor(ar * allowanceRate);
  const allowanceAdd = Math.max(900, allowanceRequired - allowancePre);

  const purchases = amount(950000, 3950, index, 80);
  const endingInventory = amount(155000, 1000, index, 80);
  const salesBase = amount(1980000, 7400, index, 80);
  const unrecordedSale = amount(28000, 850, index, 45);

  const salary = amount(235000, 980, index, 80);
  const rent = amount(77000, 540, index, 80);
  const utilities = amount(47000, 390, index, 80);
  const insurance = amount(60000, 520, index, 80);
  const prepaidInsuranceRaw = amount(8100, 280, index, 45);
  const prepaidInsurance = Math.min(prepaidInsuranceRaw, Math.max(1800, insurance - 1800));
  const advertising = amount(66000, 500, index, 80);
  const depBuilding = amount(24500, 650, index, 80);
  const depEquip = amount(16500, 500, index, 80);

  const interestExpense = amount(11200, 130, index, 70);
  const accruedInterest = amount(2900, 120, index, 45);
  const nonOperatingExpense = interestExpense + accruedInterest;

  const corporateTax = amount(70000, 1200, index, 70);

  const cogs = purchases - endingInventory;
  const sales = salesBase + unrecordedSale;
  const sga =
    salary +
    rent +
    utilities +
    (insurance - prepaidInsurance) +
    advertising +
    depBuilding +
    depEquip +
    allowanceAdd;
  const operatingProfit = sales - cogs - sga;
  const profitBeforeTax = operatingProfit - nonOperatingExpense;
  const netIncome = profitBeforeTax - corporateTax;

  const fixedAssetsNet =
    amount(690000, 2100, index, 80) + amount(345000, 1500, index, 80) - depBuilding - depEquip;
  const payables = amount(298000, 1700, index, 80);
  const loan = amount(512000, 1950, index, 80);
  const equityTotal = amount(880000, 2050, index, 80) + netIncome;

  const rows = [
    { id: 'pl_sales', statement: 'pl', label: '売上高', answer: sales, points: 2 },
    { id: 'pl_cogs', statement: 'pl', label: '売上原価', answer: cogs, points: 2 },
    { id: 'pl_gross', statement: 'pl', label: '売上総利益', answer: sales - cogs, points: 2 },
    { id: 'pl_sga', statement: 'pl', label: '販売費及び一般管理費', answer: sga, points: 2 },
    { id: 'pl_operating', statement: 'pl', label: '営業利益', answer: operatingProfit, points: 2 },
    {
      id: 'pl_nonop_exp',
      statement: 'pl',
      label: '営業外費用（支払利息）',
      answer: nonOperatingExpense,
      points: 2
    },
    {
      id: 'pl_before_tax',
      statement: 'pl',
      label: '税引前当期純利益',
      answer: profitBeforeTax,
      points: 2
    },
    { id: 'pl_tax', statement: 'pl', label: '法人税等', answer: corporateTax, points: 2 },
    { id: 'bs_cash', statement: 'bs', label: '現金及び預金', answer: cash + ordinary, points: 2 },
    { id: 'bs_ar_net', statement: 'bs', label: '売掛金（純額）', answer: ar - allowanceRequired, points: 2 },
    { id: 'bs_inventory', statement: 'bs', label: '商品', answer: endingInventory, points: 2 },
    { id: 'bs_fixed', statement: 'bs', label: '有形固定資産（純額）', answer: fixedAssetsNet, points: 2 },
    { id: 'bs_prepaid', statement: 'bs', label: '前払費用', answer: prepaidInsurance, points: 2 },
    { id: 'bs_ap', statement: 'bs', label: '買掛金', answer: payables, points: 2 },
    { id: 'bs_loan', statement: 'bs', label: '借入金', answer: loan, points: 2 },
    { id: 'bs_equity', statement: 'bs', label: '純資産合計', answer: equityTotal, points: 2 }
  ];

  return {
    title: '第3問 B/S・P/L作成問題（本試験形式D）',
    prompt:
      '決算整理前残高試算表と決算整理事項をもとに、損益計算書および貸借対照表の空欄を完成し、当期純利益を求めなさい。',
    adjustments: [
      `未記帳売上${yen(unrecordedSale)}を計上する。`,
      `売掛金残高に対し${(allowanceRate * 100).toFixed(1)}%で貸倒引当金を設定する（整理前残高: ${yen(allowancePre)}）。`,
      `期末商品棚卸高は${yen(endingInventory)}である。`,
      `建物の減価償却費${yen(depBuilding)}、備品の減価償却費${yen(depEquip)}を計上する。`,
      `保険料のうち翌期分${yen(prepaidInsurance)}を前払費用に振り替える。`,
      `借入金にかかる未払利息${yen(accruedInterest)}を計上する。`,
      '販売費及び一般管理費に貸倒引当金繰入を含める。',
      `営業外費用は支払利息${yen(nonOperatingExpense)}とする。`,
      `法人税、住民税及び事業税${yen(corporateTax)}を計上する。`,
      '各金額は円単位で入力する。'
    ],
    rows,
    netIncome,
    explanation:
      '営業外費用を控除して税引前利益を算定し、法人税等を差し引いて当期純利益を求める。B/Sでは前払費用を独立表示する。'
  };
}

const BS_CREDIT_LABELS = new Set(['買掛金', '未払費用等', '借入金', '純資産合計']);
const PL_DEBIT_LABELS = new Set([
  '売上原価',
  '販売費及び一般管理費',
  '営業外費用（支払利息）',
  '法人税等'
]);

function resolveBSPLOpeningSide(row) {
  if (row.side === '借方' || row.side === '貸方') {
    return row.side;
  }

  if (row.statement === 'bs') {
    return BS_CREDIT_LABELS.has(row.label) ? '貸方' : '借方';
  }

  return PL_DEBIT_LABELS.has(row.label) ? '借方' : '貸方';
}

function deriveBSPLPreTrialBalance(rows) {
  const grouped = new Map();

  rows.forEach((row, index) => {
    const amountValue = Number(row.preBalance ?? row.answer ?? 0);

    if (!Number.isFinite(amountValue) || amountValue === 0) {
      return;
    }

    const account = row.account || row.label || `科目${index + 1}`;
    const side = resolveBSPLOpeningSide(row);
    const key = `${side}:${account}`;
    const current = grouped.get(key) ?? { account, side, amount: 0 };
    current.amount += amountValue;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.side !== b.side) {
      return a.side === '借方' ? -1 : 1;
    }

    return a.account.localeCompare(b.account, 'ja');
  });
}

const WS8_PL_DEBIT_ACCOUNTS = new Set([
  '仕入',
  '給料',
  '水道光熱費',
  '保険料',
  '支払家賃',
  '通信費',
  '旅費交通費',
  '広告宣伝費',
  '支払利息',
  '貸倒引当金繰入',
  '減価償却費',
  '法人税、住民税及び事業税',
  '雑費',
  '雑損'
]);

const WS8_PL_CREDIT_ACCOUNTS = new Set([
  '売上',
  '受取家賃',
  '受取地代',
  '受取利息',
  '受取手数料',
  '雑益',
  '償却債権取立益',
  '固定資産売却益'
]);

const WS8_BS_CREDIT_ACCOUNTS = new Set([
  '買掛金',
  '未払費用',
  '未払利息',
  '未払消費税',
  '未払法人税等',
  '借入金',
  '仮受金',
  '前受収益',
  '前受金',
  '貸倒引当金',
  '建物減価償却累計額',
  '備品減価償却累計額',
  '資本金',
  '繰越利益剰余金'
]);

function oppositeSide(side) {
  return side === '貸方' ? '借方' : '貸方';
}

function resolveWorksheetStatementCell(account, side) {
  if (WS8_PL_DEBIT_ACCOUNTS.has(account)) {
    return 'plDebit';
  }

  if (WS8_PL_CREDIT_ACCOUNTS.has(account)) {
    return 'plCredit';
  }

  if (WS8_BS_CREDIT_ACCOUNTS.has(account)) {
    return 'bsCredit';
  }

  return side === '貸方' ? 'bsCredit' : 'bsDebit';
}

function createWorksheetCell(id, answer, enabled) {
  return { id, answer, enabled };
}

function buildEightColumnWorksheet(baseRows) {
  const worksheetRows = [];
  const scoringRows = [];

  baseRows.forEach((row, rowIndex) => {
    const side = row.side === '貸方' ? '貸方' : '借方';
    const preAmount = Number(row.preBalance ?? 0);
    const finalAmount = Number(row.answer ?? 0);
    const delta = finalAmount - preAmount;
    const adjustmentSide = delta > 0 ? side : delta < 0 ? oppositeSide(side) : null;
    const adjustmentAmount = Math.abs(delta);
    const statementCell = resolveWorksheetStatementCell(row.account, side);
    const baseId = `${row.id}-w8-${rowIndex + 1}`;

    const cells = {
      adjDebit: createWorksheetCell(`${baseId}-adj-d`, adjustmentSide === '借方' ? adjustmentAmount : 0, adjustmentSide === '借方'),
      adjCredit: createWorksheetCell(`${baseId}-adj-c`, adjustmentSide === '貸方' ? adjustmentAmount : 0, adjustmentSide === '貸方'),
      plDebit: createWorksheetCell(`${baseId}-pl-d`, statementCell === 'plDebit' ? finalAmount : 0, statementCell === 'plDebit' && finalAmount > 0),
      plCredit: createWorksheetCell(`${baseId}-pl-c`, statementCell === 'plCredit' ? finalAmount : 0, statementCell === 'plCredit' && finalAmount > 0),
      bsDebit: createWorksheetCell(`${baseId}-bs-d`, statementCell === 'bsDebit' ? finalAmount : 0, statementCell === 'bsDebit' && finalAmount > 0),
      bsCredit: createWorksheetCell(`${baseId}-bs-c`, statementCell === 'bsCredit' ? finalAmount : 0, statementCell === 'bsCredit' && finalAmount > 0)
    };

    worksheetRows.push({
      id: `${baseId}-row`,
      account: row.account,
      preDebit: side === '借方' ? preAmount : 0,
      preCredit: side === '貸方' ? preAmount : 0,
      cells
    });

    let remainingPoints = Number(row.points) || 1;

    if (adjustmentAmount > 0 && remainingPoints >= 2) {
      const adjustmentId = adjustmentSide === '借方' ? cells.adjDebit.id : cells.adjCredit.id;
      scoringRows.push({
        id: adjustmentId,
        account: `${row.account}（修正記入）`,
        side: adjustmentSide,
        answer: adjustmentAmount,
        points: 1
      });
      remainingPoints -= 1;
    }

    const statementTarget = cells[statementCell];

    if (statementTarget.enabled && remainingPoints > 0) {
      scoringRows.push({
        id: statementTarget.id,
        account: `${row.account}（${statementCell.startsWith('pl') ? '損益計算書' : '貸借対照表'}）`,
        side: statementCell.endsWith('Credit') ? '貸方' : '借方',
        answer: statementTarget.answer,
        points: remainingPoints
      });
      remainingPoints = 0;
    }

    if (remainingPoints > 0 && adjustmentAmount > 0) {
      const adjustmentId = adjustmentSide === '借方' ? cells.adjDebit.id : cells.adjCredit.id;
      const existing = scoringRows.find((item) => item.id === adjustmentId);

      if (existing) {
        existing.points += remainingPoints;
      } else {
        scoringRows.push({
          id: adjustmentId,
          account: `${row.account}（修正記入）`,
          side: adjustmentSide,
          answer: adjustmentAmount,
          points: remainingPoints
        });
      }
    }
  });

  return { worksheetRows, scoringRows };
}

function createWorksheetQuestion(index) {
  const scenario =
    index % 4 === 0
      ? createScenarioA(index)
      : index % 4 === 1
        ? createScenarioB(index)
        : index % 4 === 2
          ? createScenarioC(index)
          : createScenarioD(index);

  return {
    id: `q3-worksheet-${index + 1}`,
    section: 'q3',
    type: 'worksheet',
    category: '精算表・財務諸表',
    title: scenario.title,
    points: 35,
    prompt: scenario.prompt,
    adjustments: scenario.adjustments,
    rows: scenario.rows,
    netIncome: scenario.netIncome,
    netIncomePoints: 3,
    explanation: scenario.explanation
  };
}

function createWorksheet8Question(index) {
  const scenario =
    index % 4 === 0
      ? createScenarioA(index)
      : index % 4 === 1
        ? createScenarioB(index)
        : index % 4 === 2
          ? createScenarioC(index)
          : createScenarioD(index);

  const built = buildEightColumnWorksheet(scenario.rows);

  return {
    id: `q3-worksheet8-${index + 1}`,
    section: 'q3',
    type: 'worksheet8',
    category: '精算表・財務諸表',
    title: `第3問 精算表（8欄）作成問題 ${scenario.title.replace('第3問 ', '')}`,
    points: 35,
    prompt:
      '決算整理前残高試算表と決算整理事項にもとづき、精算表（残高試算表・修正記入・損益計算書・貸借対照表）を完成し、当期純利益を求めなさい。',
    adjustments: scenario.adjustments,
    preTrialBalance: deriveBSPLPreTrialBalance(scenario.rows),
    worksheetRows: built.worksheetRows,
    rows: built.scoringRows,
    netIncome: scenario.netIncome,
    netIncomePoints: 3,
    explanation:
      '精算表8欄は、修正記入の貸借一致と損益計算書・貸借対照表への正しい振り分けが得点の中心となる。'
  };
}

function createBSPLQuestion(index) {
  const scenario =
    index % 4 === 0
      ? createBSPLScenarioA(index)
      : index % 4 === 1
        ? createBSPLScenarioB(index)
        : index % 4 === 2
          ? createBSPLScenarioC(index)
          : createBSPLScenarioD(index);

  return {
    id: `q3-bspl-${index + 1}`,
    section: 'q3',
    type: 'bspl',
    category: '精算表・財務諸表',
    title: scenario.title,
    points: 35,
    prompt: scenario.prompt,
    adjustments: scenario.adjustments,
    rows: scenario.rows,
    preTrialBalance: scenario.preTrialBalance ?? deriveBSPLPreTrialBalance(scenario.rows),
    netIncome: scenario.netIncome,
    netIncomePoints: 3,
    explanation: scenario.explanation
  };
}

const worksheetPool = Array.from({ length: 600 }, (_, index) => createWorksheetQuestion(index));
const worksheet8Pool = Array.from({ length: 600 }, (_, index) => createWorksheet8Question(index));
const bsplPool = Array.from({ length: 600 }, (_, index) => createBSPLQuestion(index));
const q3Pool = [...worksheetPool, ...worksheet8Pool, ...bsplPool];

export { q3Pool };
