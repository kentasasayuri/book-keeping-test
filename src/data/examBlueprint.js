const DEFAULT_EXAM_BLUEPRINT = {
  q1: {
    total: 15,
    categoryQuotas: {
      現金預金取引: 2,
      売掛買掛: 2,
      手形・電子記録: 2,
      固定資産: 2,
      給与・社会保険: 2,
      決算整理: 4,
      '株式・配当等': 1
    }
  },
  q2: {
    ledgerCount: 1,
    inventoryCount: 1,
    patternWeights: [
      { patterns: ['C', 'D'], weight: 42 },
      { patterns: ['C', 'A'], weight: 22 },
      { patterns: ['C', 'B'], weight: 12 },
      { patterns: ['D', 'A'], weight: 8 },
      { patterns: ['D', 'B'], weight: 6 },
      { patterns: ['E', 'A'], weight: 5 },
      { patterns: ['E', 'B'], weight: 3 },
      { patterns: ['E', 'D'], weight: 2 }
    ]
  },
  q3: {
    count: 1,
    typeWeights: {
      worksheet: 45,
      bspl: 40,
      worksheet8: 15
    }
  }
};

export { DEFAULT_EXAM_BLUEPRINT };
