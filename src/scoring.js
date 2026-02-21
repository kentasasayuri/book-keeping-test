const FUKUSHIMA_CHANNEL = {
  name: '【簿記系YouTuber?】ふくしままさゆき',
  url: 'https://www.youtube.com/channel/UCGDec349YIziUytZzc3d7Yg'
};

const REVIEW_VIDEO_LIBRARY = {
  intro: {
    title: '簿記3級①入門',
    url: 'https://www.youtube.com/watch?v=JGXIB-dJCMM'
  },
  cash: {
    title: '簿記3級②現金・小口現金・現金過不足',
    url: 'https://www.youtube.com/watch?v=X6dbaYaahIk'
  },
  merchandise: {
    title: '簿記3級④商品売買',
    url: 'https://www.youtube.com/watch?v=ENBR76dudF0'
  },
  notes: {
    title: '簿記3級⑤手形・電子記録債権債務',
    url: 'https://www.youtube.com/watch?v=vZJCCpPfi4c'
  },
  fixedAssets: {
    title: '簿記3級⑥固定資産・経費等',
    url: 'https://www.youtube.com/watch?v=pCzm5Opi4pU'
  },
  closing: {
    title: '簿記3級⑨決算整理仕訳1/3',
    url: 'https://www.youtube.com/watch?v=er8MMhWy6vQ'
  },
  overall: {
    title: '簿記3級⑱総復習問題70問',
    url: 'https://www.youtube.com/watch?v=glQvr5d42g0'
  }
};

const TOPIC_VIDEO_MAP = {
  現金預金取引: ['cash'],
  売掛買掛: ['merchandise'],
  '手形・電子記録': ['notes'],
  固定資産: ['fixedAssets'],
  決算整理: ['closing'],
  '株式・配当等': ['intro'],
  帳簿記入: ['intro'],
  商品有高帳: ['merchandise'],
  語句選択: ['intro'],
  精算表作成: ['closing', 'overall'],
  'B/S・P/L作成': ['closing', 'overall']
};

const SECTION_MAX = {
  q1: 45,
  q2: 20,
  q3: 35
};

function parseAmount(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/[\u2212\uFF0D\u30FC\u2015]/g, '-')
    .trim();

  if (!normalized) {
    return null;
  }

  if (normalized === '-') {
    return null;
  }

  if (!/^-?\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

function normalizeJournalLines(lines) {
  return lines
    .map((line) => ({
      account: line.account ?? '',
      amount: parseAmount(line.amount)
    }))
    .filter((line) => line.account && Number.isFinite(line.amount) && line.amount > 0)
    .sort((a, b) => {
      if (a.account === b.account) {
        return a.amount - b.amount;
      }

      return a.account.localeCompare(b.account, 'ja');
    });
}

function isSameJournalLines(expected, actual) {
  if (expected.length !== actual.length) {
    return false;
  }

  for (let index = 0; index < expected.length; index += 1) {
    const expectedLine = expected[index];
    const actualLine = actual[index];

    if (expectedLine.account !== actualLine.account || expectedLine.amount !== actualLine.amount) {
      return false;
    }
  }

  return true;
}

function formatLine(line) {
  return `${line.account} ${line.amount.toLocaleString('ja-JP')}円`;
}

function formatJournalAnswer(lines) {
  if (lines.length === 0) {
    return '（未入力）';
  }

  return lines.map((line) => formatLine(line)).join(' / ');
}

function scoreQ1(examQuestions, answerMap) {
  let score = 0;
  const detailItems = [];

  examQuestions.forEach((question, index) => {
    const answer = answerMap[question.id];

    const userDebit = normalizeJournalLines(answer?.debit ?? []);
    const userCredit = normalizeJournalLines(answer?.credit ?? []);
    const expectedDebit = normalizeJournalLines(question.debit);
    const expectedCredit = normalizeJournalLines(question.credit);

    const debitCorrect = isSameJournalLines(expectedDebit, userDebit);
    const creditCorrect = isSameJournalLines(expectedCredit, userCredit);

    const itemScore = debitCorrect && creditCorrect ? question.points : 0;
    score += itemScore;

    // Build per-row comparison data
    const maxLen = Math.max(expectedDebit.length, expectedCredit.length, userDebit.length, userCredit.length);
    const journalRows = [];
    for (let i = 0; i < maxLen; i++) {
      const ed = expectedDebit[i];
      const ec = expectedCredit[i];
      const ud = userDebit[i];
      const uc = userCredit[i];
      journalRows.push({
        debitAccount: { user: ud?.account ?? '', correct: ed?.account ?? '', ok: ud?.account === (ed?.account ?? '') },
        debitAmount: { user: ud?.amount ?? null, correct: ed?.amount ?? null, ok: ud?.amount === (ed?.amount ?? null) },
        creditAccount: { user: uc?.account ?? '', correct: ec?.account ?? '', ok: uc?.account === (ec?.account ?? '') },
        creditAmount: { user: uc?.amount ?? null, correct: ec?.amount ?? null, ok: uc?.amount === (ec?.amount ?? null) }
      });
    }

    detailItems.push({
      id: question.id,
      sectionId: 'q1',
      topic: question.category,
      sectionLabel: `第1問-${index + 1}`,
      questionText: question.prompt,
      userAnswerText: `借方: ${formatJournalAnswer(userDebit)}\n貸方: ${formatJournalAnswer(userCredit)}`,
      correctAnswerText: `借方: ${formatJournalAnswer(expectedDebit)}\n貸方: ${formatJournalAnswer(expectedCredit)}`,
      explanation: question.explanation,
      score: itemScore,
      maxScore: question.points,
      correct: itemScore === question.points,
      journalRows
    });
  });

  return {
    score,
    detailItems
  };
}

function scoreQ2Question(question, answerMap) {
  if (question.type === 'ledger') {
    let questionScore = 0;
    const maxScore = question.rows.reduce((sum, row) => sum + row.points, 0);

    const fieldRows = [];
    question.rows.forEach((row) => {
      const accountField = `${row.id}_account`;
      const amountField = `${row.id}_amount`;

      const userAccount = answerMap[accountField] ?? '';
      const userAmount = parseAmount(answerMap[amountField]);

      const acctOk = userAccount === row.answerAccount;
      const amtOk = userAmount === row.answerAmount;

      if (acctOk) {
        questionScore += row.points / 2;
      }

      if (amtOk) {
        questionScore += row.points / 2;
      }

      fieldRows.push({
        label: `${row.side} ${row.label}`,
        userAccount, correctAccount: row.answerAccount, acctOk,
        userAmount, correctAmount: row.answerAmount, amtOk
      });
    });

    const userLines = question.rows
      .map((row) => {
        const account = answerMap[`${row.id}_account`] ?? '（空欄）';
        const amount = parseAmount(answerMap[`${row.id}_amount`]);
        return `${row.side} ${row.label}: ${account} ${Number.isFinite(amount) ? `${amount.toLocaleString('ja-JP')}円` : '（空欄）'}`;
      })
      .join('\n');

    const correctLines = question.rows
      .map(
        (row) =>
          `${row.side} ${row.label}: ${row.answerAccount} ${row.answerAmount.toLocaleString('ja-JP')}円`
      )
      .join('\n');

    return {
      score: questionScore,
      maxScore,
      detailItem: {
        id: question.id,
        sectionId: 'q2',
        topic: question.category,
        sectionLabel: question.title,
        questionText: [question.prompt, ...question.context].join('\n'),
        userAnswerText: userLines,
        correctAnswerText: correctLines,
        explanation: question.explanation,
        score: questionScore,
        maxScore,
        correct: questionScore === maxScore,
        fieldRows
      }
    };
  }

  if (question.type === 'theory') {
    let questionScore = 0;
    const maxScore = question.fields.reduce((sum, field) => sum + field.points, 0);

    question.fields.forEach((field) => {
      const userAnswer = answerMap[field.id] ?? '';
      if (userAnswer === field.answer) {
        questionScore += field.points;
      }
    });

    const userLines = question.fields
      .map((field) => `${field.label}: ${answerMap[field.id] || '（未選択）'}`)
      .join('\n');
    const correctLines = question.fields.map((field) => `${field.label}: ${field.answer}`).join('\n');

    return {
      score: questionScore,
      maxScore,
      detailItem: {
        id: question.id,
        sectionId: 'q2',
        topic: question.category,
        sectionLabel: question.title,
        questionText: question.prompt,
        userAnswerText: userLines,
        correctAnswerText: correctLines,
        explanation: question.explanation,
        score: questionScore,
        maxScore,
        correct: questionScore === maxScore
      }
    };
  }

  let questionScore = 0;
  const maxScore = question.fields.reduce((sum, field) => sum + field.points, 0);

  question.fields.forEach((field) => {
    const userAmount = parseAmount(answerMap[field.id]);

    if (userAmount === field.answer) {
      questionScore += field.points;
    }
  });

  const userLines = question.fields
    .map((field) => {
      const userAmount = parseAmount(answerMap[field.id]);
      return `${field.label}: ${Number.isFinite(userAmount) ? `${userAmount.toLocaleString('ja-JP')}円` : '（空欄）'}`;
    })
    .join('\n');

  const correctLines = question.fields
    .map((field) => `${field.label}: ${field.answer.toLocaleString('ja-JP')}円`)
    .join('\n');

  return {
    score: questionScore,
    maxScore,
    detailItem: {
      id: question.id,
      sectionId: 'q2',
      topic: question.category,
      sectionLabel: question.title,
      questionText: question.prompt,
      userAnswerText: userLines,
      correctAnswerText: correctLines,
      explanation: question.explanation,
      score: questionScore,
      maxScore,
      correct: questionScore === maxScore
    }
  };
}

function scoreQ2(examQuestions, answerMap) {
  let score = 0;
  const detailItems = [];

  examQuestions.forEach((question) => {
    const result = scoreQ2Question(question, answerMap[question.id] ?? {});
    score += result.score;
    detailItems.push(result.detailItem);
  });

  return {
    score,
    detailItems
  };
}

function scoreQ3(question, answer) {
  const rowAnswerMap = answer.rows ?? {};
  let score = 0;

  const userLines = [];
  const correctLines = [];

  question.rows.forEach((row) => {
    const userAmount = parseAmount(rowAnswerMap[row.id]);
    const rowLabel = row.account
      ? `${row.account}${row.side ? `（${row.side}）` : ''}`
      : `${row.statement === 'pl' ? 'P/L' : 'B/S'} ${row.label}`;

    if (userAmount === row.answer) {
      score += row.points;
    }

    userLines.push(`${rowLabel}: ${Number.isFinite(userAmount) ? `${userAmount.toLocaleString('ja-JP')}円` : '（空欄）'}`);
    correctLines.push(`${rowLabel}: ${row.answer.toLocaleString('ja-JP')}円`);
  });

  const userNetIncome = parseAmount(answer.netIncome);

  if (userNetIncome === question.netIncome) {
    score += question.netIncomePoints;
  }

  userLines.push(
    `当期純利益: ${Number.isFinite(userNetIncome) ? `${userNetIncome.toLocaleString('ja-JP')}円` : '（空欄）'}`
  );
  correctLines.push(`当期純利益: ${question.netIncome.toLocaleString('ja-JP')}円`);

  const maxScore = question.points;

  return {
    score,
    detailItems: [
      {
        id: question.id,
        sectionId: 'q3',
        topic: question.type === 'bspl' ? 'B/S・P/L作成' : '精算表作成',
        sectionLabel:
          question.type === 'bspl'
            ? '第3問（B/S・P/L）'
            : question.type === 'worksheet8'
              ? '第3問（精算表8欄）'
              : '第3問（決算整理後残高試算表）',
        questionText: [question.prompt, ...question.adjustments].join('\n'),
        userAnswerText: userLines.join('\n'),
        correctAnswerText: correctLines.join('\n'),
        explanation: question.explanation,
        score,
        maxScore,
        correct: score === maxScore
      }
    ]
  };
}

function formatSectionInsight(label, score, maxScore) {
  const rate = maxScore === 0 ? 0 : score / maxScore;
  const accuracy = Math.round(rate * 100);

  let status = '要復習';
  if (accuracy >= 85) {
    status = '強み';
  } else if (accuracy >= 70) {
    status = '合格圏';
  }

  return {
    label,
    score,
    maxScore,
    accuracy,
    status
  };
}

function buildTopicStats(detailItems) {
  const topicMap = new Map();

  detailItems.forEach((item) => {
    const topic = item.topic || 'その他';

    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        topic,
        score: 0,
        maxScore: 0,
        questions: 0
      });
    }

    const row = topicMap.get(topic);
    row.score += item.score;
    row.maxScore += item.maxScore;
    row.questions += 1;
  });

  return Array.from(topicMap.values())
    .map((row) => ({
      ...row,
      accuracy: row.maxScore === 0 ? 0 : row.score / row.maxScore
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

function collectRecommendedVideos(weakTopics, sectionScores) {
  const selectedKeys = [];

  weakTopics.forEach((topic) => {
    const keys = TOPIC_VIDEO_MAP[topic.topic] ?? [];
    selectedKeys.push(...keys);
  });

  if (sectionScores.q3 < 24) {
    selectedKeys.push('closing');
  }

  if (sectionScores.q1 < 30) {
    selectedKeys.push('intro');
  }

  selectedKeys.push('overall');

  const uniqueKeys = Array.from(new Set(selectedKeys)).slice(0, 4);

  return uniqueKeys.map((key) => {
    const video = REVIEW_VIDEO_LIBRARY[key];
    return {
      title: video.title,
      url: video.url,
      source: FUKUSHIMA_CHANNEL.name
    };
  });
}

function buildResultAnalysis(sectionScores, totalScore, passed, detailItems) {
  const sectionInsights = [
    formatSectionInsight('第1問（仕訳）', sectionScores.q1, SECTION_MAX.q1),
    formatSectionInsight('第2問（帳簿記入等）', sectionScores.q2, SECTION_MAX.q2),
    formatSectionInsight('第3問（精算表・財務諸表）', sectionScores.q3, SECTION_MAX.q3)
  ];

  const weakSection = [...sectionInsights].sort((a, b) => a.accuracy - b.accuracy)[0];
  const topicStats = buildTopicStats(detailItems);
  const weakTopics = topicStats.filter((topic) => topic.accuracy < 0.7).slice(0, 3);
  const strongTopics = topicStats.filter((topic) => topic.accuracy >= 0.85).slice(0, 3);

  const strengths = strongTopics.length
    ? strongTopics.map((topic) => `「${topic.topic}」 正答率 ${Math.round(topic.accuracy * 100)}%`)
    : ['全体の基礎力はこれから伸ばせる状態です。まずは頻出論点を固定化しましょう。'];

  const weaknesses = weakTopics.length
    ? weakTopics.map((topic) => `「${topic.topic}」 正答率 ${Math.round(topic.accuracy * 100)}%`)
    : [`弱点論点は絞り込み済みです。次は時間内完答を優先してください。`];

  const recommendations = [];

  if (sectionScores.q1 < 30) {
    recommendations.push('第1問は「科目判定→金額確定」を20秒以内で回す練習を優先する。');
  }

  if (sectionScores.q2 < 14) {
    recommendations.push('第2問は勘定記入の型を固定し、商品有高帳は移動平均の更新順を毎回同じ手順で解く。');
  }

  if (sectionScores.q3 < 24) {
    recommendations.push('第3問は整理事項を「資産/負債/収益/費用」の4区分で先に仕分けしてから転記する。');
  }

  if (recommendations.length === 0) {
    recommendations.push('合格圏です。次は見直し時間5分を残す配分（Q1:20分/Q2:12分/Q3:28分）を固定化する。');
  }

  const reviewLinks = collectRecommendedVideos(weakTopics, sectionScores);
  const summary = passed
    ? `合格（${totalScore}点）です。最優先の見直し領域は${weakSection.label}です。`
    : `不合格（${totalScore}点）です。最優先の改善領域は${weakSection.label}です。`;

  return {
    summary,
    sectionInsights,
    strengths,
    weaknesses,
    recommendations,
    reviewLinks,
    channel: FUKUSHIMA_CHANNEL
  };
}

function scoreExam(exam, answers) {
  const q1Result = scoreQ1(exam.q1, answers.q1);
  const q2Result = scoreQ2(exam.q2, answers.q2);
  const q3Result = scoreQ3(exam.q3, answers.q3);

  const sectionScores = {
    q1: q1Result.score,
    q2: q2Result.score,
    q3: q3Result.score
  };

  const totalScore = sectionScores.q1 + sectionScores.q2 + sectionScores.q3;
  const detailItems = [...q1Result.detailItems, ...q2Result.detailItems, ...q3Result.detailItems];

  return {
    sectionScores,
    totalScore,
    passed: totalScore >= 70,
    detailItems,
    analysis: buildResultAnalysis(sectionScores, totalScore, totalScore >= 70, detailItems)
  };
}

export { scoreExam, parseAmount };
