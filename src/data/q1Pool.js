import { pickAccountOptions } from './accounts.js';

const DEFAULT_VISIBLE_JOURNAL_LINES = 4;

function yen(value) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function amount(base, step, index, cycle = 50) {
  // Seeded hash: deterministic but non-linear variation
  let h = ((index + 1) * 2654435761) >>> 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) >>> 0;
  const t = (h % 10000) / 10000; // 0..1

  const spread = step * cycle;
  const raw = base + Math.floor(spread * t);

  // Round to a "clean" unit based on scale
  if (raw >= 100000) return Math.round(raw / 10000) * 10000;
  if (raw >= 10000) return Math.round(raw / 5000) * 5000;
  if (raw >= 1000) return Math.round(raw / 1000) * 1000;
  return Math.max(100, Math.round(raw / 100) * 100);
}

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

function shuffleWithSeed(items, seed) {
  const random = createSeededRandom(seed);
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function buildOptions(template, correctAccounts, seed) {
  const correct = Array.from(new Set(correctAccounts.filter(Boolean)));
  const bank = template.optionBank ?? [];
  const distractors = shuffleWithSeed(
    bank.filter((account) => !correct.includes(account)),
    seed
  );
  const minimumOptionCount = Math.max(6, correct.length);

  let options = [...correct, ...distractors].slice(0, minimumOptionCount);

  if (options.length < minimumOptionCount) {
    options = pickAccountOptions(options, seed, minimumOptionCount);
  }

  return shuffleWithSeed(options, seed + 57);
}

function consolidateJournalLines(lines = []) {
  const merged = new Map();

  lines.forEach((line) => {
    const account = line?.account ?? '';
    const amountValue = Number(line?.amount);

    if (!account || !Number.isFinite(amountValue) || amountValue <= 0) {
      return;
    }

    const roundedAmount = Math.round(amountValue);
    merged.set(account, (merged.get(account) ?? 0) + roundedAmount);
  });

  return Array.from(merged.entries()).map(([account, amountValue]) => ({
    account,
    amount: amountValue
  }));
}

function resolveLineCount(generated, debitLines, creditLines) {
  const requestedLineCount = Number(generated?.lineCount);
  const baseCount =
    Number.isFinite(requestedLineCount) && requestedLineCount > 0
      ? Math.trunc(requestedLineCount)
      : DEFAULT_VISIBLE_JOURNAL_LINES;

  return Math.max(baseCount, debitLines.length, creditLines.length, 1);
}

function createQuestion(template, variationIndex, templateIndex) {
  const generated = template.generate(variationIndex);
  const debit = consolidateJournalLines(generated.debit);
  const credit = consolidateJournalLines(generated.credit);

  if (debit.length === 0 || credit.length === 0) {
    throw new Error(
      `Q1 template "${template.key}" generated invalid journal lines (debit=${debit.length}, credit=${credit.length})`
    );
  }

  const lineCount = resolveLineCount(generated, debit, credit);
  const seed = templateIndex * 10000 + variationIndex + 1;
  const correctAccounts = [...debit.map((line) => line.account), ...credit.map((line) => line.account)];

  return {
    id: `q1-${template.key}-${variationIndex + 1}`,
    section: 'q1',
    category: template.category,
    templateKey: template.key,
    difficulty: template.difficulty ?? 'standard',
    points: 3,
    prompt: generated.prompt,
    document: generated.document ?? null,
    debit,
    credit,
    lineCount,
    options: buildOptions(template, correctAccounts, seed),
    explanation: generated.explanation
  };
}

const VARIATIONS_PER_TEMPLATE = 58;

const q1Templates = [
  {
    key: 'cash-shortage-reverse-fee',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['現金過不足', '受取手数料', '雑益', '雑損', '現金', '支払手数料'],
    generate(index) {
      const amountValue = amount(3500, 170, index);
      return {
        prompt: `かねて借方計上されていた現金過不足${yen(amountValue)}の原因を調査したところ、同額の受取手数料の二重記帳であることが判明した。`,
        debit: [{ account: '受取手数料', amount: amountValue }],
        credit: [{ account: '現金過不足', amount: amountValue }],
        explanation:
          '現金過不足は一時勘定である。原因が受取手数料の二重記帳なら、受取手数料を減額し現金過不足を消去する。'
      };
    }
  },
  {
    key: 'stamp-and-tax-cash',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['通信費', '租税公課', '現金', '支払手数料', '旅費交通費', '消耗品費'],
    generate(index) {
      const stamps = amount(400, 40, index);
      const fixedTax = amount(28000, 1400, index);
      const total = stamps + fixedTax;
      return {
        prompt: `郵便切手${yen(stamps)}を購入するとともに、固定資産税${yen(fixedTax)}を現金で納付した。郵便切手は直ちに使用した。`,
        debit: [
          { account: '通信費', amount: stamps },
          { account: '租税公課', amount: fixedTax }
        ],
        credit: [{ account: '現金', amount: total }],
        explanation:
          '切手をすぐ使用した場合は通信費、固定資産税は租税公課。現金支払総額で現金を貸方計上する。'
      };
    }
  },
  {
    key: 'ad-fee-bank-transfer',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['広告宣伝費', '普通預金', '支払手数料', '当座預金', '旅費交通費', '受取手数料'],
    generate(index) {
      const ad = amount(52000, 1300, index);
      const fee = amount(440, 30, index, 30);
      const total = ad + fee;
      return {
        prompt: `広告宣伝費${yen(ad)}を普通預金口座から支払った。振込手数料${yen(fee)}が同口座から差し引かれた。`,
        debit: [
          { account: '広告宣伝費', amount: ad },
          { account: '支払手数料', amount: fee }
        ],
        credit: [{ account: '普通預金', amount: total }],
        explanation:
          '支払額本体と振込手数料は分けて費用認識する。口座から減った金額全体を普通預金で処理する。'
      };
    }
  },
  {
    key: 'deposit-refund-repair',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['差入保証金', '修繕費', '当座預金', '支払手数料', '未収入金', '普通預金'],
    generate(index) {
      const deposit = amount(300000, 6000, index);
      const repair = amount(90000, 2700, index);
      const received = deposit - repair;
      return {
        prompt: `賃借契約解約により、差入保証金${yen(deposit)}のうち修繕費${yen(repair)}が差し引かれ、残額が当座預金口座に振り込まれた。`,
        debit: [
          { account: '当座預金', amount: received },
          { account: '修繕費', amount: repair }
        ],
        credit: [{ account: '差入保証金', amount: deposit }],
        explanation:
          '差入保証金を全額取り崩し、返還された部分は当座預金、差引分は修繕費として費用処理する。'
      };
    }
  },
  {
    key: 'deposit-overdraft-transfer',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['当座預金', '普通預金', '当座借越', '現金', '借入金', '支払利息'],
    generate(index) {
      const transfer = amount(38000, 1600, index);
      const overdraft = amount(12000, 800, index, 35);
      const bankOut = transfer + overdraft;
      return {
        prompt: `普通預金口座から当座預金口座へ${yen(transfer)}を振り替えたところ、当座借越残高${yen(overdraft)}が同時に解消された。`,
        debit: [
          { account: '当座預金', amount: transfer },
          { account: '当座借越', amount: overdraft }
        ],
        credit: [{ account: '普通預金', amount: bankOut }],
        explanation:
          '当座借越は負債のため、解消時は借方計上。普通預金からの実際引落額で貸方処理する。'
      };
    }
  },
  {
    key: 'purchase-with-advance-and-freight',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['仕入', '買掛金', '前払金', '現金', '仮払金', '売掛金'],
    generate(index) {
      const purchase = amount(170000, 5200, index);
      const advance = amount(25000, 1100, index, 30);
      const freight = amount(1800, 120, index, 30);
      const payable = purchase - advance;
      return {
        prompt: `商品${yen(purchase)}を仕入れ、代金のうち${yen(advance)}は注文時の手付金と相殺し、残額は掛けとした。なお、引取運賃${yen(freight)}は現金で支払った。`,
        debit: [
          { account: '仕入', amount: purchase + freight }
        ],
        credit: [
          { account: '前払金', amount: advance },
          { account: '買掛金', amount: payable },
          { account: '現金', amount: freight }
        ],
        explanation:
          '仕入原価には付随費用（引取運賃）を加える。手付金は前払金を取り崩して相殺する。'
      };
    }
  },
  {
    key: 'sale-cash-and-note',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['現金', '受取手形', '売上', '売掛金', '当座預金', '支払手形'],
    generate(index) {
      const sales = amount(360000, 9200, index);
      const cashPart = Math.floor(sales * 0.2);
      const notePart = sales - cashPart;
      return {
        prompt: `商品${yen(sales)}を販売し、代金のうち${yen(cashPart)}は現金、残額は得意先振出しの約束手形で受け取った。`,
        debit: [
          { account: '現金', amount: cashPart },
          { account: '受取手形', amount: notePart }
        ],
        credit: [{ account: '売上', amount: sales }],
        explanation:
          '受領手段ごとに資産勘定を分け、売上は総額で貸方計上する。'
      };
    }
  },
  {
    key: 'purchase-tax-exclusive',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['仕入', '仮払消費税', '買掛金', '現金', '仮受消費税', '売上'],
    generate(index) {
      const purchase = amount(240000, 6500, index);
      const tax = Math.floor(purchase * 0.1);
      return {
        prompt: `商品${yen(purchase)}（税抜）を掛けで仕入れた。消費税率10%、税抜方式で処理する。`,
        debit: [
          { account: '仕入', amount: purchase },
          { account: '仮払消費税', amount: tax }
        ],
        credit: [{ account: '買掛金', amount: purchase + tax }],
        explanation: '税抜方式では仮払消費税を区分計上し、買掛金は税込総額で計上する。'
      };
    }
  },
  {
    key: 'capital-and-repair-unpaid',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['建物', '修繕費', '未払金', '支払家賃', '当座預金', '現金'],
    generate(index) {
      const total = amount(820000, 19000, index);
      const capitalPart = Math.floor(total * (0.25 + (index % 3) * 0.05));
      const repairPart = total - capitalPart;
      return {
        prompt: `店舗改修代金${yen(total)}は来月末払いとした。このうち${yen(capitalPart)}は資本的支出、残額は収益的支出である。`,
        debit: [
          { account: '建物', amount: capitalPart },
          { account: '修繕費', amount: repairPart }
        ],
        credit: [{ account: '未払金', amount: total }],
        explanation:
          '資本的支出は建物として資産計上、収益的支出は修繕費として当期費用処理する。未払計上で締める。'
      };
    }
  },
  {
    key: 'ap-to-electronic-payable',
    category: '手形・電子記録',
    difficulty: 'standard',
    optionBank: ['買掛金', '電子記録債務', '支払手形', '売掛金', '電子記録債権', '普通預金'],
    generate(index) {
      const amountValue = amount(220000, 5100, index);
      return {
        prompt: `買掛金${yen(amountValue)}について、電子記録債務の発生記録の請求を行った。`,
        debit: [{ account: '買掛金', amount: amountValue }],
        credit: [{ account: '電子記録債務', amount: amountValue }],
        explanation: '買掛金を電子記録債務へ振り替える形態変更取引であり、金額は同額。'
      };
    }
  },
  {
    key: 'er-collection-to-bank',
    category: '手形・電子記録',
    difficulty: 'standard',
    optionBank: ['普通預金', '電子記録債権', '受取手形', '売掛金', '支払手形', '現金'],
    generate(index) {
      const amountValue = amount(250000, 5400, index);
      return {
        prompt: `電子記録債権${yen(amountValue)}が期日に決済され、代金が普通預金口座へ入金された。`,
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '電子記録債権', amount: amountValue }],
        explanation: '決済により電子記録債権が消滅し、同額の普通預金が増加する。'
      };
    }
  },
  {
    key: 'note-receivable-discounted',
    category: '手形・電子記録',
    difficulty: 'hard',
    optionBank: ['普通預金', '受取手形', '支払手数料', '割引料', '現金', '売掛金'],
    generate(index) {
      const note = amount(320000, 6400, index);
      const discount = amount(2400, 120, index, 35);
      return {
        prompt: `受取手形${yen(note)}を銀行で割り引き、割引料${yen(discount)}を差し引いた残額が普通預金口座へ入金された。`,
        debit: [
          { account: '普通預金', amount: note - discount },
          { account: '支払手数料', amount: discount }
        ],
        credit: [{ account: '受取手形', amount: note }],
        explanation: '割引時は受取手形を取り崩し、差引入金額を普通預金、割引料相当を費用処理する。'
      };
    }
  },
  {
    key: 'note-payable-settlement',
    category: '手形・電子記録',
    difficulty: 'standard',
    optionBank: ['支払手形', '当座預金', '普通預金', '買掛金', '電子記録債務', '現金'],
    generate(index) {
      const amountValue = amount(180000, 4800, index);
      return {
        prompt: `支払手形${yen(amountValue)}が満期となり、当座預金口座から決済した。`,
        debit: [{ account: '支払手形', amount: amountValue }],
        credit: [{ account: '当座預金', amount: amountValue }],
        explanation: '満期決済時は支払手形を借方で消し、支払手段である当座預金を貸方計上する。'
      };
    }
  },
  {
    key: 'asset-sale-with-accum',
    category: '固定資産',
    difficulty: 'hard',
    optionBank: ['未収入金', '備品', '備品減価償却累計額', '固定資産売却益', '固定資産売却損', '普通預金'],
    generate(index) {
      const cost = amount(720000, 14000, index);
      const useful = 4 + (index % 3);
      const elapsed = 2 + (index % 2);
      const dep = Math.floor((cost / useful) * elapsed);
      const book = cost - dep;
      const sale = Math.max(5000, book + ((index % 5) - 2) * 12000);
      const debit = [
        { account: '未収入金', amount: sale },
        { account: '備品減価償却累計額', amount: dep }
      ];
      const credit = [{ account: '備品', amount: cost }];

      if (sale >= book) {
        credit.push({ account: '固定資産売却益', amount: sale - book });
      } else {
        debit.push({ account: '固定資産売却損', amount: book - sale });
      }

      return {
        prompt: `取得原価${yen(cost)}、期首までの減価償却累計額${yen(dep)}の備品を${yen(sale)}で売却し、代金は月末受取とした。`,
        debit,
        credit,
        explanation:
          '間接法では備品は取得原価で除却し、累計額を戻す。売却額との差額は売却益または売却損となる。'
      };
    }
  },
  {
    key: 'equipment-purchase-invoice',
    category: '固定資産',
    difficulty: 'standard',
    optionBank: ['備品', '普通預金', '発送費', '消耗品費', '未収入金', '当座預金'],
    generate(index) {
      const machine = amount(320000, 9000, index);
      const setup = amount(3000, 200, index, 30);
      const shipping = amount(4500, 250, index, 30);
      const total = machine + setup + shipping;
      return {
        prompt: `コピー機（単価100,000円以上につき備品処理）を購入し、設置費${yen(setup)}と配送料${yen(shipping)}を含む合計${yen(total)}を普通預金から支払った。`,
        debit: [{ account: '備品', amount: total }],
        credit: [{ account: '普通預金', amount: total }],
        explanation: '取得に直接要した付随費用は備品取得原価に含める。'
      };
    }
  },
  {
    key: 'depreciation-building-equipment',
    category: '固定資産',
    difficulty: 'hard',
    optionBank: ['減価償却費', '建物減価償却累計額', '備品減価償却累計額', '建物', '備品', '支払家賃'],
    generate(index) {
      const buildingDep = amount(22000, 900, index);
      const fixtureDep = amount(14000, 700, index);
      const total = buildingDep + fixtureDep;
      return {
        prompt: `決算にあたり、建物の減価償却費${yen(buildingDep)}、備品の減価償却費${yen(fixtureDep)}を計上した（間接法）。`,
        debit: [{ account: '減価償却費', amount: total }],
        credit: [
          { account: '建物減価償却累計額', amount: buildingDep },
          { account: '備品減価償却累計額', amount: fixtureDep }
        ],
        explanation: '複数資産の減価償却は費用を合算し、累計額勘定を資産ごとに分けて貸方計上する。'
      };
    }
  },
  {
    key: 'salary-withholdings-three',
    category: '給与・社会保険',
    difficulty: 'hard',
    optionBank: ['給料', '普通預金', '所得税預り金', '預り金', '社会保険料預り金', '法定福利費'],
    generate(index) {
      const gross = amount(540000, 11500, index);
      const incomeTax = Math.floor(gross * 0.055);
      const residentTax = Math.floor(gross * 0.07);
      const social = Math.floor(gross * 0.085);
      const otherWithheld = residentTax + social;
      const paid = gross - incomeTax - residentTax - social;
      return {
        prompt: `給料総額${yen(gross)}から、所得税${yen(incomeTax)}および住民税・社会保険料合計${yen(otherWithheld)}を控除し、残額を普通預金から支給した。`,
        debit: [{ account: '給料', amount: gross }],
        credit: [
          { account: '普通預金', amount: paid },
          { account: '所得税預り金', amount: incomeTax },
          { account: '預り金', amount: otherWithheld }
        ],
        explanation:
          '給料は総額計上。控除額のうち所得税は所得税預り金、その他控除分は預り金でまとめ、差引支給額を普通預金で処理する。'
      };
    }
  },
  {
    key: 'company-social-insurance',
    category: '給与・社会保険',
    difficulty: 'standard',
    optionBank: ['法定福利費', '社会保険料預り金', '普通預金', '未払費用', '給料', '支払手数料'],
    generate(index) {
      const companyBurden = amount(42000, 1500, index);
      return {
        prompt: `会社負担分の社会保険料${yen(companyBurden)}を普通預金口座から納付した。`,
        debit: [{ account: '法定福利費', amount: companyBurden }],
        credit: [{ account: '普通預金', amount: companyBurden }],
        explanation: '会社負担分の社会保険料は法定福利費として費用処理する。'
      };
    }
  },
  {
    key: 'allowance-adjustment',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['貸倒引当金繰入', '貸倒引当金', '貸倒損失', '売掛金', '未収入金', '雑費'],
    generate(index) {
      const receivable = amount(380000, 8600, index);
      const rate = [0.01, 0.015, 0.02][index % 3];
      const required = Math.floor(receivable * rate);
      const existing = Math.max(500, required - amount(1200, 80, index, 20));
      const add = required - existing;
      return {
        prompt: `決算整理として、売掛金残高${yen(receivable)}に対し${(rate * 100).toFixed(1)}%の貸倒引当金を差額補充法で設定する。決算整理前の貸倒引当金残高は${yen(existing)}である。`,
        debit: [{ account: '貸倒引当金繰入', amount: add }],
        credit: [{ account: '貸倒引当金', amount: add }],
        explanation: `必要引当額${yen(required)}から既存残高を控除した差額を追加計上する。`
      };
    }
  },
  {
    key: 'inventory-closing-entry',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['仕入', '繰越商品', '売上', '商品', '買掛金', '売掛金'],
    generate(index) {
      const beginning = amount(52000, 1800, index);
      const ending = amount(46000, 1700, index, 35);
      return {
        prompt: `決算にあたり、繰越商品（期首）${yen(beginning)}と期末商品棚卸高${yen(ending)}を用いて、仕入勘定による売上原価計算の整理仕訳を行う。`,
        debit: [
          { account: '仕入', amount: beginning },
          { account: '繰越商品', amount: ending }
        ],
        credit: [
          { account: '繰越商品', amount: beginning },
          { account: '仕入', amount: ending }
        ],
        explanation:
          '三分法では期首商品を仕入へ振替、期末商品を仕入から控除する。仕入と繰越商品の双方を使った複合仕訳となる。'
      };
    }
  },
  {
    key: 'prepaid-insurance-adjust',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['前払費用', '保険料', '未払費用', '支払家賃', '受取家賃', '現金'],
    generate(index) {
      const prepay = amount(7000, 260, index, 45);
      return {
        prompt: `保険料のうち翌期分${yen(prepay)}を月割計算により前払計上した。`,
        debit: [{ account: '前払費用', amount: prepay }],
        credit: [{ account: '保険料', amount: prepay }],
        explanation: '翌期対応分は当期費用から除外し、前払費用へ振り替える。'
      };
    }
  },
  {
    key: 'accrued-interest-adjust',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['支払利息', '未払利息', '借入金', '受取利息', '普通預金', '仮払金'],
    generate(index) {
      const principal = amount(500000, 10000, index);
      const annualRate = 0.018 + (index % 3) * 0.006;
      const months = 2 + (index % 6);
      const interest = Math.floor(principal * annualRate * (months / 12));
      return {
        prompt: `借入金${yen(principal)}（年利${(annualRate * 100).toFixed(1)}%、利払は満期一括）について、決算日に未払利息${yen(interest)}を計上した。`,
        debit: [{ account: '支払利息', amount: interest }],
        credit: [{ account: '未払利息', amount: interest }],
        explanation: '未払計上により発生主義で当期費用化する。'
      };
    }
  },
  {
    key: 'loan-repayment-principal-interest',
    category: '株式・配当等',
    difficulty: 'hard',
    optionBank: ['借入金', '支払利息', '普通預金', '貸付金', '受取利息', '支払手数料'],
    generate(index) {
      const principal = amount(800000, 14000, index);
      const rate = 0.018 + (index % 3) * 0.004;
      const months = 9;
      const interest = Math.floor(principal * rate * (months / 12));
      return {
        prompt: `借入金${yen(principal)}の返済期日を迎え、借入期間${months}か月分の利息（年利${(rate * 100).toFixed(1)}%）とともに普通預金口座から返済した。`,
        debit: [
          { account: '借入金', amount: principal },
          { account: '支払利息', amount: interest }
        ],
        credit: [{ account: '普通預金', amount: principal + interest }],
        explanation: '元本と利息を分離して処理し、実際支払総額を普通預金で減額する。'
      };
    }
  },
  {
    key: 'stock-issuance',
    category: '株式・配当等',
    difficulty: 'standard',
    optionBank: ['普通預金', '資本金', '資本準備金', '繰越利益剰余金', '借入金', '現金'],
    generate(index) {
      const shares = 3000 + (index % 8) * 500;
      const unitPrice = amount(320, 10, index, 25);
      const total = shares * unitPrice;
      return {
        prompt: `増資により株式${shares.toLocaleString('ja-JP')}株を1株${yen(unitPrice)}で発行し、払込金全額が普通預金口座に振り込まれた。全額を資本金に組み入れる。`,
        debit: [{ account: '普通預金', amount: total }],
        credit: [{ account: '資本金', amount: total }],
        explanation: '払込受入時は普通預金増加。指定に従い全額を資本金として貸方計上する。'
      };
    }
  },
  {
    key: 'dividend-and-reserve',
    category: '株式・配当等',
    difficulty: 'hard',
    optionBank: ['繰越利益剰余金', '未払配当金', '利益準備金', '資本金', '損益', '未払法人税等'],
    generate(index) {
      const dividend = amount(60000, 2300, index);
      const reserve = Math.floor(dividend * 0.1);
      return {
        prompt: `株主総会決議により、配当金${yen(dividend)}を支払い、同時に利益準備金${yen(reserve)}を積み立てることになった。`,
        debit: [{ account: '繰越利益剰余金', amount: dividend + reserve }],
        credit: [
          { account: '未払配当金', amount: dividend },
          { account: '利益準備金', amount: reserve }
        ],
        explanation: '剰余金処分では繰越利益剰余金を減額し、配当負債と法定準備金に振り替える。'
      };
    }
  },
  {
    key: 'travel-advance-settlement',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['旅費交通費', '仮払金', '現金', '普通預金', '支払手数料', '立替金'],
    generate(index) {
      const advance = amount(38000, 1300, index, 35);
      const expense = advance - amount(2200, 100, index, 25);
      const refund = advance - expense;
      return {
        prompt: `出張者へ仮払していた${yen(advance)}について精算を受けた。旅費交通費は${yen(expense)}であり、残額は現金で返金された。`,
        debit: [
          { account: '旅費交通費', amount: expense },
          { account: '現金', amount: refund }
        ],
        credit: [{ account: '仮払金', amount: advance }],
        explanation:
          '仮払金精算では費用計上額と返金額に分解して処理する。貸方は仮払金の取り崩しで締める。'
      };
    }
  },
  {
    key: 'cash-over-shortage-finalize',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['雑損', '雑益', '現金過不足', '現金', '仮受金', '仮払金'],
    generate(index) {
      const balance = amount(1400, 70, index, 40);
      const isDebit = index % 2 === 0;
      return {
        prompt: isDebit
          ? `決算時、原因不明の現金過不足（借方残高）${yen(balance)}を適切に処理した。`
          : `決算時、原因不明の現金過不足（貸方残高）${yen(balance)}を適切に処理した。`,
        debit: [{ account: isDebit ? '雑損' : '現金過不足', amount: balance }],
        credit: [{ account: isDebit ? '現金過不足' : '雑益', amount: balance }],
        explanation:
          '原因不明の現金過不足は決算で損益処理する。借方残高なら雑損、貸方残高なら雑益となる。'
      };
    }
  },
  {
    key: 'sale-by-gift-certificate',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['受取商品券', '売上', '現金', '売掛金', '仮受金', '受取手形'],
    generate(index) {
      const sales = amount(86000, 2100, index, 45);
      return {
        prompt: `商品${yen(sales)}を販売し、代金は他店発行の共通商品券で受け取った。`,
        debit: [{ account: '受取商品券', amount: sales }],
        credit: [{ account: '売上', amount: sales }],
        explanation:
          '共通商品券は将来換金可能な資産として受取商品券で処理し、販売時点で売上を計上する。'
      };
    }
  },
  {
    key: 'bad-debt-recovery-cash',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['現金', '償却債権取立益', '貸倒損失', '売掛金', '雑益', '受取手数料'],
    generate(index) {
      const recovered = amount(12000, 850, index, 40);
      return {
        prompt: `前期に貸倒処理した債権${yen(recovered)}を本日現金で回収した。`,
        debit: [{ account: '現金', amount: recovered }],
        credit: [{ account: '償却債権取立益', amount: recovered }],
        explanation:
          '既に貸倒処理済みの債権回収は通常の売掛金回収ではなく、償却債権取立益として処理する。'
      };
    }
  },
  {
    key: 'note-loan-interest-deducted',
    category: '手形・電子記録',
    difficulty: 'hard',
    optionBank: ['普通預金', '支払利息', '手形借入金', '借入金', '受取利息', '現金'],
    generate(index) {
      const principal = amount(360000, 11500, index, 45);
      const rate = 0.012 + (index % 4) * 0.002;
      const months = 4 + (index % 4);
      const interest = Math.floor(principal * rate * (months / 12));
      const proceeds = principal - interest;
      return {
        prompt: `運転資金として約束手形を振り出して${yen(principal)}を借り入れた。利息（年利${(rate * 100).toFixed(1)}%、${months}か月分）${yen(interest)}は天引きされ、差引額が普通預金に入金された。`,
        debit: [
          { account: '普通預金', amount: proceeds },
          { account: '支払利息', amount: interest }
        ],
        credit: [{ account: '手形借入金', amount: principal }],
        explanation:
          '手形借入では額面で手形借入金を計上し、天引利息は支払利息、手取額を普通預金で受け入れる。'
      };
    }
  },
  {
    key: 'accrued-rent-revenue-adjust',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['未収収益', '受取家賃', '前受収益', '受取手数料', '未収入金', '仮受金'],
    generate(index) {
      const accrued = amount(9200, 320, index, 40);
      return {
        prompt: `決算整理として、当期分で未受取の家賃${yen(accrued)}を計上した。`,
        debit: [{ account: '未収収益', amount: accrued }],
        credit: [{ account: '受取家賃', amount: accrued }],
        explanation:
          '未受取だが当期に対応する収益は、未収収益を借方、受取家賃を貸方として発生主義で計上する。'
      };
    }
  },
  {
    key: 'unearned-rent-adjust',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['受取家賃', '前受収益', '前払費用', '支払家賃', '仮受金', '未払費用'],
    generate(index) {
      const unearned = amount(8700, 290, index, 40);
      return {
        prompt: `受取家賃のうち翌期分${yen(unearned)}を決算整理で繰り延べる処理を行った。`,
        debit: [{ account: '受取家賃', amount: unearned }],
        credit: [{ account: '前受収益', amount: unearned }],
        explanation:
          '翌期対応分の収益は当期収益から除外し、前受収益へ振り替える。'
      };
    }
  },
  {
    key: 'dividend-payment-from-payable',
    category: '株式・配当等',
    difficulty: 'standard',
    optionBank: ['未払配当金', '普通預金', '繰越利益剰余金', '利益準備金', '当座預金', '現金'],
    generate(index) {
      const amountValue = amount(78000, 2300, index, 40);
      return {
        prompt: `前期に計上した未払配当金${yen(amountValue)}を、普通預金口座から支払った。`,
        debit: [{ account: '未払配当金', amount: amountValue }],
        credit: [{ account: '普通預金', amount: amountValue }],
        explanation:
          '支払時点では剰余金処分ではなく、既計上の未払配当金を取り崩して預金を減少させる。'
      };
    }
  },
  {
    key: 'stock-issuance-half-reserve',
    category: '株式・配当等',
    difficulty: 'hard',
    optionBank: ['普通預金', '資本金', '資本準備金', '繰越利益剰余金', '借入金', '当座預金'],
    generate(index) {
      const shares = 2000 + (index % 8) * 500;
      const unitPrice = amount(420, 12, index, 30);
      const total = shares * unitPrice;
      const capital = Math.floor(total / 2);
      const reserve = total - capital;
      return {
        prompt: `新株${shares.toLocaleString('ja-JP')}株を1株${yen(unitPrice)}で発行し、払込金は全額普通預金に入金された。会社法の範囲内で、払込額の1/2を資本金、残額を資本準備金とした。`,
        debit: [{ account: '普通預金', amount: total }],
        credit: [
          { account: '資本金', amount: capital },
          { account: '資本準備金', amount: reserve }
        ],
        explanation:
          '株式発行時の払込額は純資産へ計上する。指示に従い資本金と資本準備金へ按分して処理する。'
      };
    }
  },
  {
    key: 'petty-cash-replenishment',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['通信費', '旅費交通費', '消耗品費', '普通預金', '小口現金', '現金'],
    generate(index) {
      const communication = amount(1800, 110, index, 35);
      const travel = amount(4200, 180, index, 35);
      const supplies = amount(1600, 90, index, 35);
      const total = communication + travel + supplies;

      return {
        prompt: `定額資金前渡制を採用している。小口現金係から、通信費${yen(communication)}、旅費交通費${yen(travel)}、消耗品費${yen(supplies)}の支払報告があり、同額を普通預金口座から補給した。`,
        debit: [
          { account: '通信費', amount: communication },
          { account: '旅費交通費', amount: travel },
          { account: '消耗品費', amount: supplies }
        ],
        credit: [{ account: '普通預金', amount: total }],
        explanation:
          '定額資金前渡制の補給時は、小口現金勘定ではなく実際の費用科目を借方計上し、補給額を普通預金で貸方計上する。'
      };
    }
  },
  {
    key: 'travel-advance-settlement-extra',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['旅費交通費', '仮払金', '現金', '普通預金', '立替金', '支払手数料'],
    generate(index) {
      const advance = amount(26000, 900, index, 35);
      const extra = amount(3200, 140, index, 30);
      const actual = advance + extra;

      return {
        prompt: `出張のため仮払していた${yen(advance)}について精算を受けたところ、実際の旅費交通費は${yen(actual)}であった。不足額は本日現金で支払った。`,
        debit: [{ account: '旅費交通費', amount: actual }],
        credit: [
          { account: '仮払金', amount: advance },
          { account: '現金', amount: extra }
        ],
        explanation:
          '実費総額を旅費交通費で計上し、既払分は仮払金の取り崩し、不足分は追加支給した現金で処理する。'
      };
    }
  },
  {
    key: 'purchase-return-tax-exclusive',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['買掛金', '仕入', '仮払消費税', '売掛金', '売上', '仮受消費税'],
    generate(index) {
      const returnAmount = amount(28000, 1000, index, 40);
      const tax = Math.floor(returnAmount * 0.1);

      return {
        prompt: `掛けで仕入れていた商品の一部${yen(returnAmount)}（税抜）を返品した。消費税率10%、税抜方式で処理する。`,
        debit: [{ account: '買掛金', amount: returnAmount + tax }],
        credit: [
          { account: '仕入', amount: returnAmount },
          { account: '仮払消費税', amount: tax }
        ],
        explanation:
          '仕入返品では買掛金を減額し、仕入高と仮払消費税を貸方で戻し入れる。'
      };
    }
  },
  {
    key: 'sales-return-tax-exclusive',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['売上', '仮受消費税', '売掛金', '仕入', '仮払消費税', '買掛金'],
    generate(index) {
      const returnAmount = amount(36000, 1200, index, 40);
      const tax = Math.floor(returnAmount * 0.1);

      return {
        prompt: `得意先へ掛け販売した商品について、${yen(returnAmount)}（税抜）分の返品を受け入れた。消費税率10%、税抜方式で処理する。`,
        debit: [
          { account: '売上', amount: returnAmount },
          { account: '仮受消費税', amount: tax }
        ],
        credit: [{ account: '売掛金', amount: returnAmount + tax }],
        explanation:
          '売上返品では売上と仮受消費税を借方で取り消し、売掛金を貸方で減額する。'
      };
    }
  },
  {
    key: 'writeoff-ar-using-allowance',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['貸倒引当金', '売掛金', '貸倒損失', '未収入金', '受取手形', '雑損'],
    generate(index) {
      const amountValue = amount(24000, 1100, index, 40);

      return {
        prompt: `得意先が倒産し、売掛金${yen(amountValue)}が回収不能となった。貸倒引当金残高は十分にあるため、引当金から処理した。`,
        debit: [{ account: '貸倒引当金', amount: amountValue }],
        credit: [{ account: '売掛金', amount: amountValue }],
        explanation:
          '引当金残高がある場合の貸倒処理は、貸倒引当金を取り崩して売掛金を消去する。'
      };
    }
  },
  {
    key: 'note-receivable-from-ar',
    category: '手形・電子記録',
    difficulty: 'standard',
    optionBank: ['受取手形', '売掛金', '支払手形', '買掛金', '電子記録債権', '普通預金'],
    generate(index) {
      const amountValue = amount(210000, 5200, index, 45);

      return {
        prompt: `売掛金${yen(amountValue)}について、得意先振出しの約束手形を受け取った。`,
        debit: [{ account: '受取手形', amount: amountValue }],
        credit: [{ account: '売掛金', amount: amountValue }],
        explanation:
          '売掛金の回収手段が手形へ変わるため、受取手形を借方、売掛金を貸方で振り替える。'
      };
    }
  },
  {
    key: 'dishonored-note-receivable',
    category: '手形・電子記録',
    difficulty: 'hard',
    optionBank: ['売掛金', '受取手形', '貸倒損失', '現金', '未収入金', '雑損'],
    generate(index) {
      const amountValue = amount(180000, 4800, index, 45);

      return {
        prompt: `受取手形${yen(amountValue)}が満期日に不渡りとなり、ただちに振出人に対する請求権に振り替えた。`,
        debit: [{ account: '売掛金', amount: amountValue }],
        credit: [{ account: '受取手形', amount: amountValue }],
        explanation:
          '不渡手形は手形債権から通常の債権（売掛金）へ振り替えて管理する。'
      };
    }
  },
  {
    key: 'electronic-receivable-from-ar',
    category: '手形・電子記録',
    difficulty: 'standard',
    optionBank: ['電子記録債権', '売掛金', '受取手形', '電子記録債務', '普通預金', '現金'],
    generate(index) {
      const amountValue = amount(230000, 5400, index, 45);

      return {
        prompt: `売掛金${yen(amountValue)}について、得意先に電子記録債権の発生記録を請求し、承諾された。`,
        debit: [{ account: '電子記録債権', amount: amountValue }],
        credit: [{ account: '売掛金', amount: amountValue }],
        explanation:
          '売掛金を電子記録債権に切り替える取引であり、金額は同額で振り替える。'
      };
    }
  },
  {
    key: 'electronic-payable-settle-with-fee',
    category: '手形・電子記録',
    difficulty: 'hard',
    optionBank: ['電子記録債務', '支払手数料', '普通預金', '買掛金', '支払手形', '現金'],
    generate(index) {
      const debt = amount(260000, 6200, index, 45);
      const fee = amount(440, 20, index, 30);

      return {
        prompt: `電子記録債務${yen(debt)}の期日決済を行い、同時に決済手数料${yen(fee)}が普通預金口座から引き落とされた。`,
        debit: [
          { account: '電子記録債務', amount: debt },
          { account: '支払手数料', amount: fee }
        ],
        credit: [{ account: '普通預金', amount: debt + fee }],
        explanation:
          '電子記録債務の元本決済と手数料は区分して借方計上し、預金減少額の合計で貸方処理する。'
      };
    }
  },
  {
    key: 'land-acquisition-broker-fee',
    category: '固定資産',
    difficulty: 'hard',
    optionBank: ['土地', '普通預金', '支払手数料', '租税公課', '建物', '未払金'],
    generate(index) {
      const landPrice = amount(980000, 24000, index, 45);
      const brokerFee = amount(32000, 1000, index, 35);
      const registration = amount(12000, 500, index, 35);
      const total = landPrice + brokerFee + registration;

      return {
        prompt: `営業用土地を${yen(landPrice)}で購入し、仲介手数料${yen(brokerFee)}および登記費用${yen(registration)}を含めて普通預金口座から支払った。`,
        debit: [{ account: '土地', amount: total }],
        credit: [{ account: '普通預金', amount: total }],
        explanation:
          '固定資産取得に直接要した付随費用は取得原価に含めるため、土地勘定で一括計上する。'
      };
    }
  },
  {
    key: 'security-deposit-payment',
    category: '固定資産',
    difficulty: 'standard',
    optionBank: ['差入保証金', '普通預金', '前払金', '支払家賃', '未払金', '現金'],
    generate(index) {
      const amountValue = amount(200000, 6000, index, 45);

      return {
        prompt: `店舗賃借契約を締結し、保証金${yen(amountValue)}を普通預金口座から支払った。`,
        debit: [{ account: '差入保証金', amount: amountValue }],
        credit: [{ account: '普通預金', amount: amountValue }],
        explanation:
          '保証金は将来返還される性質を持つため費用ではなく資産（差入保証金）として処理する。'
      };
    }
  },
  {
    key: 'salary-accrual-month-end',
    category: '給与・社会保険',
    difficulty: 'standard',
    optionBank: ['給料', '未払費用', '未払金', '普通預金', '法定福利費', '預り金'],
    generate(index) {
      const amountValue = amount(420000, 11000, index, 40);

      return {
        prompt: `月末の決算整理として、当月分給料${yen(amountValue)}を未払計上した（支給は翌月）。`,
        debit: [{ account: '給料', amount: amountValue }],
        credit: [{ account: '未払費用', amount: amountValue }],
        explanation:
          '未払の給料は発生主義により当期費用として計上し、相手勘定は未払費用とする。'
      };
    }
  },
  {
    key: 'withholding-remittance-with-company-share',
    category: '給与・社会保険',
    difficulty: 'hard',
    optionBank: ['所得税預り金', '預り金', '法定福利費', '普通預金', '社会保険料預り金', '住民税預り金'],
    generate(index) {
      const incomeTax = amount(24000, 800, index, 35);
      const residentTax = amount(18000, 650, index, 35);
      const employeeSocial = amount(32000, 900, index, 35);
      const companySocial = amount(33000, 950, index, 35);
      const otherWithholdings = residentTax + employeeSocial;
      const total = incomeTax + residentTax + employeeSocial + companySocial;

      return {
        prompt: `源泉所得税${yen(incomeTax)}、住民税${yen(residentTax)}、従業員負担社会保険料${yen(employeeSocial)}および会社負担社会保険料${yen(companySocial)}を、普通預金口座から一括納付した。`,
        debit: [
          { account: '所得税預り金', amount: incomeTax },
          { account: '預り金', amount: otherWithholdings },
          { account: '法定福利費', amount: companySocial }
        ],
        credit: [{ account: '普通預金', amount: total }],
        explanation:
          '預り金は負債の消滅として借方処理し、会社負担分のみ法定福利費とする。住民税と従業員負担社会保険料は預り金でまとめ、支払総額を普通預金で貸方計上する。'
      };
    }
  },
  {
    key: 'vat-settlement-output-over-input',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['仮受消費税', '仮払消費税', '未払消費税', '租税公課', '未払法人税等', '売上'],
    generate(index) {
      const outputTax = amount(128000, 2600, index, 40);
      const inputTax = amount(91000, 2200, index, 40);
      const payable = outputTax - inputTax;

      return {
        prompt: `決算にあたり、税抜方式で仮受消費税${yen(outputTax)}と仮払消費税${yen(inputTax)}を精算し、差額を未払計上した。`,
        debit: [{ account: '仮受消費税', amount: outputTax }],
        credit: [
          { account: '仮払消費税', amount: inputTax },
          { account: '未払消費税', amount: payable }
        ],
        explanation:
          '税抜方式では仮受・仮払を相殺し、納付差額は未払消費税として貸方計上する。'
      };
    }
  },
  {
    key: 'accrued-utilities-expense',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['水道光熱費', '未払費用', '未払金', '支払家賃', '前払費用', '雑費'],
    generate(index) {
      const amountValue = amount(6800, 260, index, 40);

      return {
        prompt: `決算整理として、当期分で未払いの水道光熱費${yen(amountValue)}を見越計上した。`,
        debit: [{ account: '水道光熱費', amount: amountValue }],
        credit: [{ account: '未払費用', amount: amountValue }],
        explanation:
          '当期対応の未払費用は、費用を借方・未払費用を貸方に計上して発生主義を適用する。'
      };
    }
  },
  {
    key: 'prepaid-rent-adjust',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['前払費用', '支払家賃', '未払費用', '前受収益', '受取家賃', '仮払金'],
    generate(index) {
      const amountValue = amount(9600, 320, index, 40);

      return {
        prompt: `決算整理として、支払家賃のうち翌期分${yen(amountValue)}を前払計上した。`,
        debit: [{ account: '前払費用', amount: amountValue }],
        credit: [{ account: '支払家賃', amount: amountValue }],
        explanation:
          '翌期対応の家賃は当期費用から除外し、前払費用として資産計上する。'
      };
    }
  },
  {
    key: 'dividend-income-received',
    category: '株式・配当等',
    difficulty: 'standard',
    optionBank: ['普通預金', '受取配当金', '有価証券', '受取利息', '雑益', '現金'],
    generate(index) {
      const amountValue = amount(12000, 700, index, 40);

      return {
        prompt: `保有株式について配当金${yen(amountValue)}を受け取り、普通預金口座へ入金された。`,
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '受取配当金', amount: amountValue }],
        explanation:
          '配当受領時は現金性資産の増加を借方、配当収益を貸方に計上する。'
      };
    }
  },
  {
    key: 'loan-collection-with-interest',
    category: '株式・配当等',
    difficulty: 'hard',
    optionBank: ['普通預金', '貸付金', '受取利息', '借入金', '支払利息', '現金'],
    generate(index) {
      const principal = amount(300000, 9000, index, 45);
      const rate = 0.02 + (index % 3) * 0.004;
      const months = 6 + (index % 3);
      const interest = Math.floor(principal * rate * (months / 12));
      const total = principal + interest;

      return {
        prompt: `かねて貸し付けていた貸付金${yen(principal)}が満期となり、利息（年利${(rate * 100).toFixed(1)}%、${months}か月分）${yen(interest)}とともに普通預金口座へ入金された。`,
        debit: [{ account: '普通預金', amount: total }],
        credit: [
          { account: '貸付金', amount: principal },
          { account: '受取利息', amount: interest }
        ],
        explanation:
          '貸付金回収では元本と利息を区分処理する。受取総額を普通預金で受け入れ、元本は貸付金、利息は受取利息で貸方計上する。'
      };
    }
  },
  {
    key: 'ar-collection-net-transfer-fee',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['普通預金', '支払手数料', '売掛金', '受取手数料', '現金', '当座預金'],
    generate(index) {
      const receivable = amount(165000, 4800, index, 42);
      const fee = amount(330, 20, index, 30);

      return {
        prompt: `得意先に対する売掛金${yen(receivable)}が銀行振込で回収されたが、振込手数料${yen(fee)}が差し引かれて普通預金口座へ入金された。`,
        debit: [
          { account: '普通預金', amount: receivable - fee },
          { account: '支払手数料', amount: fee }
        ],
        credit: [{ account: '売掛金', amount: receivable }],
        explanation:
          '売掛金の消滅額は全額。差引入金の場合は、手数料を費用計上して普通預金入金額と合計が売掛金と一致するように処理する。'
      };
    }
  },
  {
    key: 'petty-cash-fund-establishment',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['小口現金', '普通預金', '現金', '仮払金', '旅費交通費', '支払手数料'],
    generate(index) {
      const amountValue = amount(30000, 1500, index, 36);

      return {
        prompt: `小口現金制度を開始するため、${yen(amountValue)}を普通預金口座から引き出して小口現金係へ渡した。`,
        debit: [{ account: '小口現金', amount: amountValue }],
        credit: [{ account: '普通預金', amount: amountValue }],
        explanation:
          '小口現金設定時は、小口現金勘定へ振り替える。費用処理は実際の支払報告時（補給時）に行う。'
      };
    }
  },
  {
    key: 'temporary-deposit-received',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['普通預金', '預り金', '仮受金', '前受金', '受取手数料', '現金'],
    generate(index) {
      const amountValue = amount(42000, 1700, index, 36);

      return {
        prompt: `取引先から一時的に保管を依頼された保証預り金${yen(amountValue)}を、普通預金口座で受け入れた。`,
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '預り金', amount: amountValue }],
        explanation:
          '自社収益ではない一時預りは負債（預り金）。受入時は普通預金増加と預り金増加で処理する。'
      };
    }
  },
  {
    key: 'temporary-deposit-refund',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['預り金', '普通預金', '仮受金', '前受金', '雑損', '現金'],
    generate(index) {
      const amountValue = amount(28000, 1400, index, 36);

      return {
        prompt: `前月に預かっていた預り金${yen(amountValue)}を、普通預金口座から返金した。`,
        debit: [{ account: '預り金', amount: amountValue }],
        credit: [{ account: '普通預金', amount: amountValue }],
        explanation:
          '預り金返還時は負債の減少を借方に計上し、返金手段である普通預金を貸方計上する。'
      };
    }
  },
  {
    key: 'credit-card-sale-record',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['クレジット売掛金', '売上', '現金', '受取商品券', '売掛金', '仮受消費税'],
    generate(index) {
      const sales = amount(128000, 3600, index, 42);

      return {
        prompt: `商品${yen(sales)}を販売し、代金は信販会社経由のクレジットカード決済とした（税抜方式の消費税処理は行わないものとする）。`,
        debit: [{ account: 'クレジット売掛金', amount: sales }],
        credit: [{ account: '売上', amount: sales }],
        explanation:
          'カード決済時は得意先債権ではなく信販会社に対する債権としてクレジット売掛金を計上する。'
      };
    }
  },
  {
    key: 'credit-card-receivable-collection',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['普通預金', '支払手数料', 'クレジット売掛金', '売掛金', '受取手数料', '現金'],
    generate(index) {
      const receivable = amount(116000, 3200, index, 42);
      const fee = amount(2320, 90, index, 32);

      return {
        prompt: `クレジット売掛金${yen(receivable)}について、信販会社から手数料${yen(fee)}を差し引いた額が普通預金口座へ入金された。`,
        debit: [
          { account: '普通預金', amount: receivable - fee },
          { account: '支払手数料', amount: fee }
        ],
        credit: [{ account: 'クレジット売掛金', amount: receivable }],
        explanation:
          'カード手数料は費用処理し、クレジット売掛金の消滅額を貸方に計上する。'
      };
    }
  },
  {
    key: 'issue-gift-certificate-cash',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['現金', '発行商品券', '受取商品券', '売上', '前受金', '預り金'],
    generate(index) {
      const amountValue = amount(58000, 2400, index, 42);

      return {
        prompt: `自社発行の商品券を${yen(amountValue)}分販売し、代金を現金で受け取った。`,
        debit: [{ account: '現金', amount: amountValue }],
        credit: [{ account: '発行商品券', amount: amountValue }],
        explanation:
          '自社商品券販売時点では売上ではなく将来の商品引渡義務を負うため、発行商品券（負債）を計上する。'
      };
    }
  },
  {
    key: 'redeem-issued-gift-certificate-mixed',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['発行商品券', '現金', '売上', '受取商品券', '前受金', '売掛金'],
    generate(index) {
      const sales = amount(92000, 2600, index, 42);
      const certificate = Math.floor(sales * 0.7);
      const cash = sales - certificate;

      return {
        prompt: `自社発行の商品券${yen(certificate)}分と現金${yen(cash)}を受け取り、商品${yen(sales)}を販売した。`,
        debit: [
          { account: '発行商品券', amount: certificate },
          { account: '現金', amount: cash }
        ],
        credit: [{ account: '売上', amount: sales }],
        explanation:
          '商品券引受時は発行商品券（負債）を取り崩す。不足分を現金で受け取った場合は合算して売上計上する。'
      };
    }
  },
  {
    key: 'purchase-advance-payment',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['前払金', '普通預金', '買掛金', '仮払金', '仕入', '現金'],
    generate(index) {
      const amountValue = amount(44000, 1800, index, 42);

      return {
        prompt: `商品注文時に手付金${yen(amountValue)}を普通預金口座から支払った。`,
        debit: [{ account: '前払金', amount: amountValue }],
        credit: [{ account: '普通預金', amount: amountValue }],
        explanation:
          '仕入確定前の手付金は前払金として資産計上する。仕入計上時に前払金と相殺する。'
      };
    }
  },
  {
    key: 'sales-advance-receipt',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['普通預金', '前受金', '仮受金', '売上', '売掛金', '現金'],
    generate(index) {
      const amountValue = amount(52000, 2100, index, 42);

      return {
        prompt: `受注した商品の代金として手付金${yen(amountValue)}が普通預金口座へ振り込まれた。`,
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '前受金', amount: amountValue }],
        explanation:
          '引渡前に受け取った対価は当期収益ではないため前受金で負債計上する。'
      };
    }
  },
  {
    key: 'temporary-receipt-reclass-sales-tax-exclusive',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['仮受金', '売上', '仮受消費税', '前受金', '普通預金', '仮払消費税'],
    generate(index) {
      const netSales = amount(84000, 2800, index, 42);
      const tax = Math.floor(netSales * 0.1);
      const total = netSales + tax;

      return {
        prompt: `先に仮受金として受け入れていた${yen(total)}は、税抜方式による商品販売代金（本体${yen(netSales)}、消費税${yen(tax)}）であることが確定したため、振り替えた。`,
        debit: [{ account: '仮受金', amount: total }],
        credit: [
          { account: '売上', amount: netSales },
          { account: '仮受消費税', amount: tax }
        ],
        explanation:
          '性質確定後は仮受金を消し、税抜方式で売上本体と仮受消費税に区分して計上する。'
      };
    }
  },
  {
    key: 'note-loan-disbursement',
    category: '手形・電子記録',
    difficulty: 'standard',
    optionBank: ['手形貸付金', '普通預金', '貸付金', '受取利息', '現金', '手形借入金'],
    generate(index) {
      const principal = amount(260000, 7400, index, 42);

      return {
        prompt: `取引先に対し、同社振出しの約束手形を受け入れて${yen(principal)}を貸し付け、資金は普通預金口座から支払った。`,
        debit: [{ account: '手形貸付金', amount: principal }],
        credit: [{ account: '普通預金', amount: principal }],
        explanation:
          '手形による貸付は手形貸付金で処理する。支払手段が普通預金なら貸方は普通預金となる。'
      };
    }
  },
  {
    key: 'note-loan-collection-with-interest',
    category: '手形・電子記録',
    difficulty: 'hard',
    optionBank: ['普通預金', '手形貸付金', '受取利息', '貸付金', '支払利息', '現金'],
    generate(index) {
      const principal = amount(260000, 7400, index, 42);
      const rate = 0.018 + (index % 4) * 0.002;
      const months = 6;
      const interest = Math.floor(principal * rate * (months / 12));
      const total = principal + interest;

      return {
        prompt: `手形貸付金${yen(principal)}の満期日となり、利息（年利${(rate * 100).toFixed(1)}%、${months}か月分）${yen(interest)}とともに普通預金口座へ入金された。`,
        debit: [{ account: '普通預金', amount: total }],
        credit: [
          { account: '手形貸付金', amount: principal },
          { account: '受取利息', amount: interest }
        ],
        explanation:
          '満期回収時は元本と利息を区分して貸方計上し、入金総額を普通預金で受け入れる。'
      };
    }
  },
  {
    key: 'temporary-payment-reclass-building',
    category: '固定資産',
    difficulty: 'standard',
    optionBank: ['建物', '仮払金', '未払金', '修繕費', '普通預金', '備品'],
    generate(index) {
      const amountValue = amount(320000, 12000, index, 40);

      return {
        prompt: `工事代金として先に仮払金計上していた${yen(amountValue)}が、店舗建物の取得価額に該当することが確定したため振り替えた。`,
        debit: [{ account: '建物', amount: amountValue }],
        credit: [{ account: '仮払金', amount: amountValue }],
        explanation:
          '用途確定後は仮払金を取り崩し、固定資産（建物）へ振り替える。'
      };
    }
  },
  {
    key: 'salary-payment-detailed-withholdings',
    category: '給与・社会保険',
    difficulty: 'hard',
    optionBank: ['給料', '普通預金', '所得税預り金', '住民税預り金', '社会保険料預り金', '預り金'],
    generate(index) {
      const gross = amount(640000, 13000, index, 36);
      const incomeTax = Math.floor(gross * 0.055);
      const residentTax = Math.floor(gross * 0.065);
      const employeeSocial = Math.floor(gross * 0.088);
      const paid = gross - incomeTax - residentTax - employeeSocial;

      return {
        prompt: `給料総額${yen(gross)}を支給した。源泉所得税${yen(incomeTax)}、住民税${yen(residentTax)}、従業員負担社会保険料${yen(employeeSocial)}を控除し、差引額を普通預金口座から振り込んだ。`,
        debit: [{ account: '給料', amount: gross }],
        credit: [
          { account: '普通預金', amount: paid },
          { account: '所得税預り金', amount: incomeTax },
          { account: '住民税預り金', amount: residentTax },
          { account: '社会保険料預り金', amount: employeeSocial }
        ],
        explanation:
          '総額主義で給料を借方計上し、控除項目はそれぞれの預り負債で区分処理する。'
      };
    }
  },
  {
    key: 'accrued-salary-and-welfare',
    category: '給与・社会保険',
    difficulty: 'hard',
    optionBank: ['給料', '法定福利費', '未払費用', '未払金', '預り金', '普通預金'],
    generate(index) {
      const salary = amount(390000, 9600, index, 36);
      const welfare = amount(38000, 1200, index, 36);
      const total = salary + welfare;

      return {
        prompt: `決算整理として、未払いの給料${yen(salary)}と会社負担社会保険料${yen(welfare)}を見越計上した。`,
        debit: [
          { account: '給料', amount: salary },
          { account: '法定福利費', amount: welfare }
        ],
        credit: [{ account: '未払費用', amount: total }],
        explanation:
          '発生済み未払の人件費は、給料・法定福利費を借方計上し、未払費用で貸方計上する。'
      };
    }
  },
  {
    key: 'corporate-tax-settlement-additional-payment',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['未払法人税等', '仮払法人税等', '普通預金', '未収入金', '租税公課', '仮受金'],
    generate(index) {
      const payable = amount(128000, 3600, index, 40);
      const prepaid = Math.floor(payable * (0.55 + (index % 3) * 0.08));
      const additional = payable - prepaid;

      return {
        prompt: `確定した法人税等${yen(payable)}について、仮払法人税等${yen(prepaid)}を控除し、差額を普通預金口座から納付した。`,
        debit: [{ account: '未払法人税等', amount: payable }],
        credit: [
          { account: '仮払法人税等', amount: prepaid },
          { account: '普通預金', amount: additional }
        ],
        explanation:
          '確定負債を未払法人税等で取り崩し、既払分は仮払法人税等で相殺、追加納付分を普通預金で処理する。'
      };
    }
  },
  {
    key: 'corporate-tax-settlement-refund-receivable',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['未払法人税等', '未収入金', '仮払法人税等', '普通預金', '租税公課', '仮受金'],
    generate(index) {
      const payable = amount(86000, 2600, index, 40);
      const overpaid = amount(9000, 400, index, 30);
      const prepaid = payable + overpaid;

      return {
        prompt: `確定した法人税等${yen(payable)}に対し、仮払法人税等が${yen(prepaid)}計上されていたため、超過額は還付請求（未収入金）とした。`,
        debit: [
          { account: '未払法人税等', amount: payable },
          { account: '未収入金', amount: overpaid }
        ],
        credit: [{ account: '仮払法人税等', amount: prepaid }],
        explanation:
          '仮払分が多い場合は、未払法人税等を消し、超過額を未収入金として資産計上する。'
      };
    }
  },
  {
    key: 'expense-transfer-to-income-summary',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['損益', '仕入', '給料', '通信費', '旅費交通費', '水道光熱費'],
    generate(index) {
      const purchase = amount(2400000, 52000, index, 34);
      const salary = amount(360000, 9000, index, 34);
      const communication = amount(42000, 1800, index, 34);
      const travel = amount(56000, 2200, index, 34);
      const utilities = amount(38000, 1600, index, 34);
      const total = purchase + salary + communication + travel + utilities;

      return {
        prompt: `決算にあたり、仕入${yen(purchase)}、給料${yen(salary)}、通信費${yen(communication)}、旅費交通費${yen(travel)}、水道光熱費${yen(utilities)}を損益勘定に振り替えた。`,
        debit: [{ account: '損益', amount: total }],
        credit: [
          { account: '仕入', amount: purchase },
          { account: '給料', amount: salary },
          { account: '通信費', amount: communication },
          { account: '旅費交通費', amount: travel },
          { account: '水道光熱費', amount: utilities }
        ],
        explanation:
          '費用勘定の締切では損益を借方、各費用勘定を貸方に振り替える。'
      };
    }
  },
  {
    key: 'revenue-transfer-to-income-summary',
    category: '決算整理',
    difficulty: 'hard',
    optionBank: ['売上', '受取手数料', '受取家賃', '受取地代', '雑益', '損益'],
    generate(index) {
      const sales = amount(3100000, 64000, index, 34);
      const commission = amount(82000, 2600, index, 34);
      const rent = amount(74000, 2400, index, 34);
      const landRent = amount(36000, 1400, index, 34);
      const miscProfit = amount(12000, 500, index, 34);
      const total = sales + commission + rent + landRent + miscProfit;

      return {
        prompt: `決算にあたり、売上${yen(sales)}、受取手数料${yen(commission)}、受取家賃${yen(rent)}、受取地代${yen(landRent)}、雑益${yen(miscProfit)}を損益勘定に振り替えた。`,
        debit: [
          { account: '売上', amount: sales },
          { account: '受取手数料', amount: commission },
          { account: '受取家賃', amount: rent },
          { account: '受取地代', amount: landRent },
          { account: '雑益', amount: miscProfit }
        ],
        credit: [{ account: '損益', amount: total }],
        explanation:
          '収益勘定の締切では各収益を借方へ振替え、合計額を損益勘定の貸方へ振り替える。'
      };
    }
  },
  {
    key: 'profit-transfer-to-retained-earnings',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['損益', '繰越利益剰余金', '利益準備金', '未払配当金', '資本金', '未払法人税等'],
    generate(index) {
      const profit = amount(220000, 7600, index, 40);

      return {
        prompt: `決算の結果、損益勘定の貸方残高${yen(profit)}を繰越利益剰余金勘定へ振り替えた。`,
        debit: [{ account: '損益', amount: profit }],
        credit: [{ account: '繰越利益剰余金', amount: profit }],
        explanation:
          '当期純利益は損益勘定から繰越利益剰余金勘定へ振り替えて純資産に繰り入れる。'
      };
    }
  },
  {
    key: 'land-rent-received-bank',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['普通預金', '受取地代', '受取家賃', '受取手数料', '前受収益', '現金'],
    generate(index) {
      const amountValue = amount(46000, 1800, index, 40);

      return {
        prompt: `所有地の貸付料${yen(amountValue)}が普通預金口座へ入金された。`,
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '受取地代', amount: amountValue }],
        explanation:
          '土地貸付による収益は受取地代で計上し、入金手段に応じて普通預金を借方計上する。'
      };
    }
  },
  {
    key: 'payment-on-behalf-record',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['立替金', '現金', '仮払金', '預り金', '普通預金', '支払手数料'],
    generate(index) {
      const amountValue = amount(12000, 600, index, 40);

      return {
        prompt: `得意先負担の運送費${yen(amountValue)}を当社が一時的に現金で立て替えて支払った。`,
        debit: [{ account: '立替金', amount: amountValue }],
        credit: [{ account: '現金', amount: amountValue }],
        explanation:
          '自社費用ではない支払は立替金として資産計上し、回収時に取り崩す。'
      };
    }
  },
  {
    key: 'reimbursement-of-payment-on-behalf',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['普通預金', '立替金', '受取手数料', '仮受金', '現金', '売掛金'],
    generate(index) {
      const amountValue = amount(12000, 600, index, 40);

      return {
        prompt: `先日立て替えていた運送費${yen(amountValue)}について、得意先から普通預金口座へ振り込まれた。`,
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '立替金', amount: amountValue }],
        explanation:
          '立替金の回収時は、入金を借方、立替金の減少を貸方に計上して精算する。'
      };
    }
  },
  {
    key: 'final15-ar-collection-slip',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['普通預金', '売掛金', '受取手数料', '支払手数料', '現金', '当座預金'],
    generate(index) {
      const amountValue = amount(99000, 3100, index, 50);
      return {
        prompt:
          '次の請求・入金資料にもとづき、当社がすでに適正に売上計上していた取引の入金時仕訳を示しなさい。',
        document: {
          type: 'collection-slip',
          title: '請求・入金連絡票',
          to: '東都商事 御中',
          issueDate: `X${8 + (index % 2)}年10月5日`,
          amount: amountValue,
          settlementDate: `X${8 + (index % 2)}年10月20日`,
          bankAccount: '日商銀行 本店営業部 普通預金',
          note: '売上計上はすでに完了しているため、本資料では回収仕訳のみを行う。'
        },
        debit: [{ account: '普通預金', amount: amountValue }],
        credit: [{ account: '売掛金', amount: amountValue }],
        explanation:
          '売上計上済みの掛代金回収では、普通預金の増加と売掛金の減少のみを処理する。'
      };
    }
  },
  {
    key: 'final15-daily-sales-summary',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['現金', 'クレジット売掛金', '売上', '支払手数料', '普通預金', '受取手形'],
    generate(index) {
      const cashSales = amount(68000, 2400, index, 45);
      const creditSales = amount(132000, 3600, index, 45);
      const feeRate = [3, 4, 5][index % 3];
      const feeAmount = Math.floor((creditSales * feeRate) / 100);
      const receivableNet = creditSales - feeAmount;
      const totalSales = cashSales + creditSales;

      return {
        prompt:
          '次の売上集計表にもとづき、当日売上の仕訳を示しなさい。クレジット手数料は債権計上時に控除して処理する。',
        document: {
          type: 'daily-sales-sheet',
          title: '売上集計表（レジ締め）',
          storeName: '日商ストア 東京本店',
          businessDate: `X${8 + (index % 2)}年11月${String(12 + (index % 15)).padStart(2, '0')}日`,
          cashSales,
          creditSales,
          feeRatePercent: feeRate,
          feeAmount,
          totalSales,
          note: 'クレジット売上は加盟店手数料控除後の受取予定額で債権計上する。'
        },
        debit: [
          { account: '現金', amount: cashSales },
          { account: 'クレジット売掛金', amount: receivableNet },
          { account: '支払手数料', amount: feeAmount }
        ],
        credit: [{ account: '売上', amount: totalSales }],
        explanation:
          '現金売上とカード売上を分解し、手数料控除方式では支払手数料を同時に計上する。'
      };
    }
  },
  {
    key: 'final15-asset-purchase-slip',
    category: '固定資産',
    difficulty: 'hard',
    optionBank: ['備品', '普通預金', '消耗品費', '支払手数料', '現金', '未払金'],
    generate(index) {
      const itemAmount = amount(118000, 4200, index, 45);
      const setupFee = amount(6800, 260, index, 40);
      const deliveryFee = amount(5400, 220, index, 40);
      const total = itemAmount + setupFee + deliveryFee;
      const threshold = 100000;

      return {
        prompt:
          '次の請求書にもとづき、固定資産購入時の仕訳を示しなさい。社内規程は「単価10万円以上は備品計上」とする。',
        document: {
          type: 'asset-purchase-slip',
          title: '請求書（設備購入）',
          vendor: '東西事務機株式会社',
          issueDate: `X${8 + (index % 2)}年12月${String(5 + (index % 20)).padStart(2, '0')}日`,
          itemAmount,
          setupFee,
          deliveryFee,
          total,
          paymentMethod: '普通預金口座より支払',
          policyNote: `資産計上基準: 単価${yen(threshold)}以上は備品。取得付随費用は取得原価に含める。`
        },
        debit: [{ account: '備品', amount: total }],
        credit: [{ account: '普通預金', amount: total }],
        explanation:
          '固定資産の取得では本体代金に設置費・配送料などの付随費用を含めて備品計上する。'
      };
    }
  },
  {
    key: 'invoice-tax-exclusive-sales',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['売掛金', '買掛金', '売上', '仕入', '仮受消費税', '仮払消費税'],
    generate(index) {
      const qtyY = 160 + (index % 7) * 10;
      const qtyZ = 120 + (index % 8) * 10;
      const unitY = 140 + (index % 6) * 10;
      const unitZ = 190 + (index % 5) * 10;
      const amountY = qtyY * unitY;
      const amountZ = qtyZ * unitZ;
      const subtotal = amountY + amountZ;
      const tax = Math.floor(subtotal * 0.1);
      const total = subtotal + tax;

      return {
        prompt:
          '次の納品書兼請求書にもとづいて、商品販売時の仕訳を示しなさい。なお、消費税は税抜方式で記帳する。',
        document: {
          type: 'invoice',
          title: '納品書兼請求書',
          to: '西日本株式会社 御中',
          issueDate: `X${9 + (index % 2)}年9月20日`,
          issuer: '日商株式会社',
          registrationNumber: 'T1234567890123',
          dueDate: `X${9 + (index % 2)}年10月20日`,
          bankInfo: '江戸銀行 ××支店 普通 1234567 ニッショウ',
          items: [
            { name: 'Y商品', qty: qtyY, unitPrice: unitY, amount: amountY },
            { name: 'Z商品', qty: qtyZ, unitPrice: unitZ, amount: amountZ }
          ],
          tax,
          total
        },
        debit: [{ account: '売掛金', amount: total }],
        credit: [
          { account: '売上', amount: subtotal },
          { account: '仮受消費税', amount: tax }
        ],
        explanation:
          '税抜方式では、売上本体と仮受消費税を分けて計上する。掛販売のため借方は売掛金で税込総額となる。'
      };
    }
  },
  {
    key: 'petty-cash-report-only',
    category: '現金預金取引',
    difficulty: 'standard',
    optionBank: ['通信費', '旅費交通費', '消耗品費', '小口現金', '普通預金', '現金'],
    generate(index) {
      const communication = amount(2000, 100, index, 35);
      const travel = amount(5000, 200, index, 35);
      const supplies = amount(3000, 100, index, 35);
      const total = communication + travel + supplies;

      return {
        prompt: `定額資金前渡制を採用している。本日、小口現金係から通信費${yen(communication)}、旅費交通費${yen(travel)}、消耗品費${yen(supplies)}の支払報告を受けた。なお、資金の補給は翌日行う。`,
        debit: [
          { account: '通信費', amount: communication },
          { account: '旅費交通費', amount: travel },
          { account: '消耗品費', amount: supplies }
        ],
        credit: [{ account: '小口現金', amount: total }],
        explanation:
          '定額資金前渡制で報告のみ（補給は翌日）の場合は、費用を借方、小口現金を貸方で処理する。翌日の補給時に小口現金を借方、普通預金を貸方とする。'
      };
    }
  },
  {
    key: 'purchase-freight-seller-burden',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['仕入', '買掛金', '立替金', '現金', '発送費', '前払金'],
    generate(index) {
      const purchase = amount(240000, 5000, index);
      const freight = amount(3000, 100, index, 30);
      return {
        prompt: `商品${yen(purchase)}を掛けで仕入れ、先方負担の引取運賃${yen(freight)}を現金で立て替えた。`,
        debit: [
          { account: '仕入', amount: purchase },
          { account: '立替金', amount: freight }
        ],
        credit: [
          { account: '買掛金', amount: purchase },
          { account: '現金', amount: freight }
        ],
        explanation:
          '先方負担の引取運賃は仕入原価に含めず、立替金として処理する。引取運賃を現金で立て替えた場合は現金を貸方計上する。'
      };
    }
  },
  {
    key: 'sales-freight-our-burden',
    category: '売掛買掛',
    difficulty: 'standard',
    optionBank: ['売掛金', '売上', '発送費', '現金', '立替金', '支払手数料'],
    generate(index) {
      const sales = amount(350000, 8000, index);
      const freight = amount(4000, 200, index, 30);
      return {
        prompt: `商品${yen(sales)}を掛けで販売し、当社負担の発送費${yen(freight)}を現金で支払った。`,
        debit: [
          { account: '売掛金', amount: sales },
          { account: '発送費', amount: freight }
        ],
        credit: [
          { account: '売上', amount: sales },
          { account: '現金', amount: freight }
        ],
        explanation:
          '当社負担の発送費は販売費として発送費勘定で処理する。売上は販売代金総額で計上する。'
      };
    }
  },
  {
    key: 'sales-freight-buyer-burden',
    category: '売掛買掛',
    difficulty: 'hard',
    optionBank: ['売掛金', '立替金', '売上', '現金', '発送費', '支払手数料'],
    generate(index) {
      const sales = amount(280000, 7000, index);
      const freight = amount(5000, 200, index, 30);
      return {
        prompt: `商品${yen(sales)}を掛けで販売し、先方負担の発送費${yen(freight)}を現金で立て替えた。`,
        debit: [
          { account: '売掛金', amount: sales },
          { account: '立替金', amount: freight }
        ],
        credit: [
          { account: '売上', amount: sales },
          { account: '現金', amount: freight }
        ],
        explanation:
          '先方負担の発送費は立替金で処理する。売上は商品代金のみで計上し、運賃は売上に含めない。'
      };
    }
  },
  {
    key: 'overdraft-occurrence',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['仕入', '買掛金', '当座預金', '当座借越', '普通預金', '借入金'],
    generate(index) {
      const balance = amount(80000, 3000, index, 40);
      const payment = amount(200000, 5000, index);
      const overdraft = payment - balance;
      return {
        prompt: `買掛金${yen(payment)}を当座預金口座から支払った。なお、当座預金残高は${yen(balance)}であり、取引銀行と借越限度額${yen(amount(500000, 10000, index))}の当座借越契約を締結している。`,
        debit: [{ account: '買掛金', amount: payment }],
        credit: [
          { account: '当座預金', amount: balance },
          { account: '当座借越', amount: overdraft }
        ],
        explanation:
          '当座預金残高を超えて小切手を振り出した場合、不足分は当座借越（負債）として処理する。二勘定制では当座預金と当座借越を分けて計上する。'
      };
    }
  },
  {
    key: 'overdraft-deposit-partial',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['当座預金', '当座借越', '普通預金', '売掛金', '借入金', '現金'],
    generate(index) {
      const overdraftBefore = amount(150000, 4000, index);
      const deposit = amount(200000, 5000, index);
      const overdraftAfter = Math.max(0, overdraftBefore - deposit);
      const toChecking = deposit - overdraftBefore + overdraftAfter;
      return {
        prompt: `売掛金${yen(deposit)}が当座預金口座に振り込まれた。なお、当座借越残高は${yen(overdraftBefore)}である。`,
        debit: [
          { account: '当座借越', amount: overdraftBefore },
          { account: '当座預金', amount: toChecking }
        ],
        credit: [{ account: '売掛金', amount: deposit }],
        explanation:
          '入金時にまず当座借越（負債）を解消し、残額を当座預金（資産）に計上する。'
      };
    }
  },
  {
    key: 'supplies-to-storage',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['貯蔵品', '通信費', '租税公課', '消耗品費', '現金', '前払費用'],
    generate(index) {
      const stamps = amount(3000, 100, index, 30);
      const revenue_stamps = amount(5000, 200, index, 30);
      const total = stamps + revenue_stamps;
      return {
        prompt: `決算にあたり、期末に未使用の郵便切手${yen(stamps)}と収入印紙${yen(revenue_stamps)}を貯蔵品に振り替えた。`,
        debit: [{ account: '貯蔵品', amount: total }],
        credit: [
          { account: '通信費', amount: stamps },
          { account: '租税公課', amount: revenue_stamps }
        ],
        explanation:
          '期末に未使用の切手は通信費から、収入印紙は租税公課から貯蔵品へ振り替える。翌期首に再振替仕訳を行う。'
      };
    }
  },
  {
    key: 'storage-to-expense',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['通信費', '租税公課', '貯蔵品', '消耗品費', '前払費用', '現金'],
    generate(index) {
      const stamps = amount(2000, 100, index, 30);
      const revenue_stamps = amount(4000, 200, index, 30);
      const total = stamps + revenue_stamps;
      return {
        prompt: `期首の再振替仕訳として、前期末に貯蔵品に振り替えていた郵便切手${yen(stamps)}と収入印紙${yen(revenue_stamps)}を費用に戻した。`,
        debit: [
          { account: '通信費', amount: stamps },
          { account: '租税公課', amount: revenue_stamps }
        ],
        credit: [{ account: '貯蔵品', amount: total }],
        explanation:
          '翌期首の再振替仕訳により、貯蔵品を取り崩して当期の費用勘定に戻す。'
      };
    }
  },
  {
    key: 'voucher-entry-partial-cash',
    category: '現金預金取引',
    difficulty: 'hard',
    optionBank: ['仕入', '買掛金', '現金', '普通預金', '仮払消費税', '前払金'],
    generate(index) {
      const total = amount(300000, 6000, index);
      const cashPart = amount(50000, 2000, index, 30);
      const creditPart = total - cashPart;
      return {
        prompt: `商品${yen(total)}を仕入れ、${yen(cashPart)}は現金で支払い、残額は掛けとした。3伝票制における振替伝票の仕訳を答えなさい。`,
        debit: [{ account: '仕入', amount: total }],
        credit: [
          { account: '買掛金', amount: total }
        ],
        lineCount: 2,
        explanation:
          '3伝票制の分解法（取引を擬制）では、全額を掛仕入として振替伝票に起票し、現金支払分は出金伝票で別途処理する。振替伝票には仕入/買掛金の全額を記入する。'
      };
    }
  },
  {
    key: 'income-summary-net-loss',
    category: '決算整理',
    difficulty: 'standard',
    optionBank: ['繰越利益剰余金', '損益', '利益準備金', '未払配当金', '資本金', '未払法人税等'],
    generate(index) {
      const loss = amount(180000, 5000, index, 40);

      return {
        prompt: `決算の結果、損益勘定の借方残高${yen(loss)}（当期純損失）を繰越利益剰余金勘定へ振り替えた。`,
        debit: [{ account: '繰越利益剰余金', amount: loss }],
        credit: [{ account: '損益', amount: loss }],
        explanation:
          '当期純損失の場合は、繰越利益剰余金を借方で減少させ、損益勘定を貸方で締め切る。'
      };
    }
  }
];

const q1Pool = q1Templates.flatMap((template, templateIndex) => {
  return Array.from({ length: VARIATIONS_PER_TEMPLATE }, (_, index) =>
    createQuestion(template, index, templateIndex + 1)
  );
});

export { q1Pool };
