const ACCOUNT_CATEGORIES = {
  assets: [
    '現金',
    '小口現金',
    '当座預金',
    '普通預金',
    '定期預金',
    '売掛金',
    'クレジット売掛金',
    '受取手形',
    '電子記録債権',
    '未収入金',
    '仮払法人税等',
    '前払金',
    '前払費用',
    '仮払金',
    '立替金',
    '商品',
    '繰越商品',
    '消耗品',
    '貯蔵品',
    '備品',
    '建物',
    '車両運搬具',
    '土地',
    '貸付金',
    '手形貸付金',
    '有価証券',
    '受取配当金',
    '受取利息',
    '受取商品券',
    '未収収益',
    '仮払消費税',
    '差入保証金',
    '現金過不足'
  ],
  liabilities: [
    '買掛金',
    '支払手形',
    '電子記録債務',
    '未払金',
    '未払費用',
    '未払家賃',
    '未払利息',
    '未払法人税等',
    '未払配当金',
    '前受金',
    '前受収益',
    '発行商品券',
    '仮受金',
    '預り金',
    '所得税預り金',
    '住民税預り金',
    '社会保険料預り金',
    '借入金',
    '手形借入金',
    '貸倒引当金',
    '建物減価償却累計額',
    '備品減価償却累計額',
    '仮受消費税',
    '未払消費税',
    '未渡小切手',
    '当座借越'
  ],
  equity: [
    '資本金',
    '資本準備金',
    '利益準備金',
    '繰越利益剰余金'
  ],
  revenues: [
    '売上',
    '受取家賃',
    '受取地代',
    '受取手数料',
    '雑収入',
    '雑益',
    '固定資産売却益',
    '償却債権取立益'
  ],
  expenses: [
    '仕入',
    '給料',
    '法定福利費',
    '水道光熱費',
    '旅費交通費',
    '通信費',
    '広告宣伝費',
    '消耗品費',
    '発送費',
    '修繕費',
    '保険料',
    '支払手数料',
    '割引料',
    '支払家賃',
    '支払地代',
    '支払保険料',
    '減価償却費',
    '支払利息',
    '貸倒損失',
    '貸倒引当金繰入',
    '租税公課',
    '雑費',
    '雑損',
    '固定資産売却損',
    '法人税、住民税及び事業税'
  ],
  closing: ['損益']
};

const ALL_ACCOUNTS = Object.values(ACCOUNT_CATEGORIES).flat();

function createSeededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pickAccountOptions(correctAccounts, seed = 1, total = 10) {
  const uniqueCorrect = Array.from(new Set(correctAccounts.filter(Boolean)));
  const candidates = ALL_ACCOUNTS.filter((account) => !uniqueCorrect.includes(account));
  const random = createSeededRandom(seed);
  const options = [...uniqueCorrect];

  while (options.length < total && candidates.length > 0) {
    const index = Math.floor(random() * candidates.length);
    options.push(candidates[index]);
    candidates.splice(index, 1);
  }

  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = options[i];
    options[i] = options[j];
    options[j] = temp;
  }

  return options;
}

export { ACCOUNT_CATEGORIES, ALL_ACCOUNTS, pickAccountOptions };
