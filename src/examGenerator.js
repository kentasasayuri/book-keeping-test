import { q1Pool } from './data/q1Pool.js';
import { q2Pool } from './data/q2Pool.js';
import { q3Pool } from './data/q3Pool.js';
import { DEFAULT_EXAM_BLUEPRINT } from './data/examBlueprint.js';
import { ALL_ACCOUNTS } from './data/accounts.js';

const FIXED_FINAL_Q1_TEMPLATE_KEYS = [
  'invoice-tax-exclusive-sales',
  'final15-ar-collection-slip',
  'final15-daily-sales-summary',
  'final15-asset-purchase-slip'
];
const MIN_Q1_OPTIONS = 8;
const MIN_LEDGER_OPTIONS = 14;
const Q2_PATTERN_FALLBACK = [
  ['C', 'D'],
  ['C', 'A'],
  ['C', 'B'],
  ['D', 'A'],
  ['D', 'B'],
  ['E', 'A'],
  ['E', 'B'],
  ['E', 'D']
];

const BS_DEBIT_LABELS = new Set([
  '現金及び預金',
  '売掛金（純額）',
  '商品',
  '有形固定資産（純額）',
  '未収収益',
  '前払費用'
]);
const BS_CREDIT_LABELS = new Set(['買掛金', '未払費用等', '借入金', '純資産合計']);
const PL_DEBIT_LABELS = new Set([
  '売上原価',
  '販売費及び一般管理費',
  '営業外費用（支払利息）',
  '法人税等'
]);

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function ensureOptionSet(currentOptions, requiredOptions, minLength) {
  const required = unique(requiredOptions);
  const merged = unique([...(currentOptions ?? []), ...required]);

  if (merged.length < minLength) {
    const extras = ALL_ACCOUNTS.filter((account) => !merged.includes(account));
    merged.push(...shuffle(extras).slice(0, minLength - merged.length));
  }

  return shuffle(merged);
}

function resolveStatementSide(statement, label) {
  if (statement === 'bs') {
    if (BS_CREDIT_LABELS.has(label)) {
      return '貸方';
    }

    if (BS_DEBIT_LABELS.has(label)) {
      return '借方';
    }

    return '借方';
  }

  if (PL_DEBIT_LABELS.has(label)) {
    return '借方';
  }

  return '貸方';
}

function sanitizeQ1Question(question) {
  const required = [
    ...question.debit.map((line) => line.account),
    ...question.credit.map((line) => line.account)
  ];

  return {
    ...question,
    options: ensureOptionSet(question.options, required, MIN_Q1_OPTIONS)
  };
}

function sanitizeQ2Question(question) {
  if (question.type !== 'ledger') {
    return question;
  }

  const required = question.rows.map((row) => row.answerAccount);

  return {
    ...question,
    accountOptions: ensureOptionSet(question.accountOptions, required, MIN_LEDGER_OPTIONS)
  };
}

function sanitizeQ3Question(question) {
  const rows = (question.rows ?? []).map((row, index) => {
    if (question.type === 'bspl') {
      const label = row.label || row.account || `項目${index + 1}`;
      return {
        ...row,
        label,
        side: row.side || resolveStatementSide(row.statement, label)
      };
    }

    return {
      ...row,
      account: row.account || row.label || `勘定科目${index + 1}`,
      side: row.side === '貸方' ? '貸方' : '借方'
    };
  });

  const preTrialBalance = (question.preTrialBalance ?? []).map((row, index) => ({
    id: row.id ?? `pre-${index + 1}`,
    account: row.account || row.label || `科目${index + 1}`,
    side: row.side === '貸方' ? '貸方' : '借方',
    amount: Number(row.amount) || 0
  }));

  return {
    ...question,
    rows,
    preTrialBalance
  };
}

function sampleRandom(items, count) {
  return shuffle(items).slice(0, count);
}

function pickWeighted(entries) {
  const filtered = entries.filter((entry) => Number(entry.weight) > 0);

  if (filtered.length === 0) {
    return null;
  }

  const total = filtered.reduce((sum, entry) => sum + Number(entry.weight), 0);

  if (total <= 0) {
    return null;
  }

  let cursor = Math.random() * total;

  for (const entry of filtered) {
    cursor -= Number(entry.weight);

    if (cursor <= 0) {
      return entry;
    }
  }

  return filtered[filtered.length - 1];
}

function buildCategoryMap(questions) {
  const map = new Map();

  questions.forEach((question) => {
    if (!map.has(question.category)) {
      map.set(question.category, []);
    }

    map.get(question.category).push(question);
  });

  return map;
}

function sampleUniqueFromPool(pool, count, usedIds, usedTemplateKeys, enforceTemplateUniqueness = true) {
  const shuffled = shuffle(pool);
  const picked = [];

  for (const question of shuffled) {
    if (picked.length >= count) {
      break;
    }

    if (usedIds.has(question.id)) {
      continue;
    }

    if (
      enforceTemplateUniqueness &&
      question.templateKey &&
      usedTemplateKeys &&
      usedTemplateKeys.has(question.templateKey)
    ) {
      continue;
    }

    usedIds.add(question.id);
    if (question.templateKey && usedTemplateKeys) {
      usedTemplateKeys.add(question.templateKey);
    }
    picked.push(question);
  }

  return picked;
}

function classifyQ2Pattern(question) {
  if (question.type === 'inventory') {
    return 'D';
  }

  if (question.type === 'ledger') {
    return question.format === 'voucher' ? 'E' : 'C';
  }

  if (question.type === 'theory') {
    return question.format === 'subbook' ? 'B' : 'A';
  }

  return null;
}

function buildQ2PatternPools() {
  const pools = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: []
  };

  q2Pool.forEach((question) => {
    const pattern = classifyQ2Pattern(question);

    if (pattern && pools[pattern]) {
      pools[pattern].push(question);
    }
  });

  return pools;
}

function buildQ3TypePools() {
  const pools = {};

  q3Pool.forEach((question) => {
    const type = question.type || 'unknown';

    if (!pools[type]) {
      pools[type] = [];
    }

    pools[type].push(question);
  });

  return pools;
}

function sampleUniqueQuestion(pool, usedIds) {
  const shuffled = shuffle(pool);

  for (const question of shuffled) {
    if (usedIds.has(question.id)) {
      continue;
    }

    usedIds.add(question.id);
    return question;
  }

  return null;
}

function pickQ2ByPatterns(patterns, pools) {
  const usedIds = new Set();
  const selected = [];

  for (const pattern of patterns) {
    const pool = pools[pattern] ?? [];
    const picked = sampleUniqueQuestion(pool, usedIds);

    if (!picked) {
      return null;
    }

    selected.push(sanitizeQ2Question(picked));
  }

  return selected;
}

function getQ2PatternWeights(blueprint) {
  const configured = blueprint?.q2?.patternWeights;

  if (!Array.isArray(configured)) {
    return [];
  }

  return configured
    .map((entry) => {
      const patterns = Array.isArray(entry?.patterns)
        ? entry.patterns.filter((pattern) => ['A', 'B', 'C', 'D', 'E'].includes(pattern))
        : [];
      const weight = Number(entry?.weight);

      return {
        patterns,
        weight: Number.isFinite(weight) ? weight : 0
      };
    })
    .filter((entry) => entry.patterns.length === 2 && entry.weight > 0);
}

function selectQ1Questions(blueprint) {
  const categoryMap = buildCategoryMap(q1Pool);
  const usedIds = new Set();
  const usedTemplateKeys = new Set();
  const selected = [];

  Object.entries(blueprint.q1.categoryQuotas).forEach(([category, quota]) => {
    const pool = categoryMap.get(category) ?? [];
    const picked = sampleUniqueFromPool(pool, quota, usedIds, usedTemplateKeys, true);
    selected.push(...picked);
  });

  if (selected.length < blueprint.q1.total) {
    const additional = sampleUniqueFromPool(
      q1Pool,
      blueprint.q1.total - selected.length,
      usedIds,
      usedTemplateKeys,
      true
    );
    selected.push(...additional);
  }

  if (selected.length < blueprint.q1.total) {
    const additional = sampleUniqueFromPool(
      q1Pool,
      blueprint.q1.total - selected.length,
      usedIds,
      usedTemplateKeys,
      false
    );
    selected.push(...additional);
  }

  const arranged = shuffle(selected).slice(0, blueprint.q1.total);
  const isFinalTemplate = (question) => FIXED_FINAL_Q1_TEMPLATE_KEYS.includes(question.templateKey);
  const inSetFinalQuestions = arranged.filter((question) => isFinalTemplate(question));

  if (inSetFinalQuestions.length > 0) {
    const [chosenFinal] = sampleRandom(inSetFinalQuestions, 1);
    const fixedIndex = arranged.findIndex((question) => question.id === chosenFinal.id);
    const [fixedQuestion] = arranged.splice(fixedIndex, 1);
    arranged.push(fixedQuestion);
    return arranged.map((question) => sanitizeQ1Question(question));
  }

  const fixedPool = q1Pool.filter((question) => isFinalTemplate(question));

  if (fixedPool.length === 0) {
    return arranged.map((question) => sanitizeQ1Question(question));
  }

  const fixedQuestion = sampleRandom(fixedPool, 1)[0];
  arranged.pop();
  arranged.push(fixedQuestion);
  return arranged.map((question) => sanitizeQ1Question(question));
}

function selectQ2Questions(blueprint) {
  const patternPools = buildQ2PatternPools();
  const weightedPatternEntries = getQ2PatternWeights(blueprint).filter((entry) =>
    entry.patterns.every((pattern) => (patternPools[pattern] ?? []).length > 0)
  );

  const weightedPick = pickWeighted(weightedPatternEntries);

  if (weightedPick) {
    const selectedByWeight = pickQ2ByPatterns(weightedPick.patterns, patternPools);

    if (selectedByWeight) {
      return selectedByWeight;
    }
  }

  for (const patterns of Q2_PATTERN_FALLBACK) {
    if (!patterns.every((pattern) => (patternPools[pattern] ?? []).length > 0)) {
      continue;
    }

    const selectedByFallback = pickQ2ByPatterns(patterns, patternPools);

    if (selectedByFallback) {
      return selectedByFallback;
    }
  }

  return sampleRandom(q2Pool, 2).map((question) => sanitizeQ2Question(question));
}

function selectQ3Question(blueprint) {
  const q3TypePools = buildQ3TypePools();
  const configuredWeights = blueprint?.q3?.typeWeights ?? {};

  const weightedTypes = Object.entries(q3TypePools)
    .filter(([, pool]) => pool.length > 0)
    .map(([type, pool]) => {
      const configured = Number(configuredWeights[type]);
      const fallbackWeight = pool.length;

      return {
        type,
        weight: Number.isFinite(configured) && configured > 0 ? configured : fallbackWeight
      };
    });

  const chosenType = pickWeighted(weightedTypes)?.type;
  const chosenPool = chosenType ? q3TypePools[chosenType] : q3Pool;

  return sanitizeQ3Question(sampleRandom(chosenPool, 1)[0]);
}

function generateExamSet(blueprint = DEFAULT_EXAM_BLUEPRINT) {
  return {
    q1: selectQ1Questions(blueprint),
    q2: selectQ2Questions(blueprint),
    q3: selectQ3Question(blueprint)
  };
}

function getPoolStats() {
  const q1ByCategory = q1Pool.reduce((acc, question) => {
    acc[question.category] = (acc[question.category] ?? 0) + 1;
    return acc;
  }, {});
  const q2ByPattern = q2Pool.reduce((acc, question) => {
    const pattern = classifyQ2Pattern(question) ?? 'other';
    acc[pattern] = (acc[pattern] ?? 0) + 1;
    return acc;
  }, {});
  const q3ByType = q3Pool.reduce((acc, question) => {
    const type = question.type ?? 'unknown';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  return {
    q1Count: q1Pool.length,
    q2Count: q2Pool.length,
    q3Count: q3Pool.length,
    totalCount: q1Pool.length + q2Pool.length + q3Pool.length,
    q1ByCategory,
    q2ByPattern,
    q3ByType
  };
}

export { generateExamSet, getPoolStats };
