import { DEFAULT_EXAM_BLUEPRINT } from './data/examBlueprint.js';

const STORAGE_KEY = 'boki3-exam-history';
const MAX_ATTEMPTS = 50;

function loadRawHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { attempts: [] };
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.attempts)) return { attempts: [] };
        return parsed;
    } catch {
        return { attempts: [] };
    }
}

function persistHistory(history) {
    try {
        const trimmed = {
            attempts: history.attempts.slice(-MAX_ATTEMPTS)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // localStorage unavailable or full — silently ignore
    }
}

/**
 * Save exam result to localStorage.
 * @param {object} result - The scored exam result from scoreExam()
 */
function saveAttempt(result) {
    const history = loadRawHistory();

    const categoryStats = {};

    if (result.detail) {
        result.detail.forEach((item) => {
            const topic = item.topic || 'その他';
            if (!categoryStats[topic]) {
                categoryStats[topic] = { score: 0, maxScore: 0, count: 0 };
            }
            categoryStats[topic].score += item.score ?? 0;
            categoryStats[topic].maxScore += item.maxScore ?? 0;
            categoryStats[topic].count += 1;
        });
    }

    history.attempts.push({
        timestamp: new Date().toISOString(),
        totalScore: result.totalScore ?? 0,
        maxScore: result.maxScore ?? 100,
        passed: (result.totalScore ?? 0) >= 70,
        q1Score: result.q1Score ?? 0,
        q2Score: result.q2Score ?? 0,
        q3Score: result.q3Score ?? 0,
        categoryStats
    });

    persistHistory(history);
}

/**
 * Get all exam history.
 */
function getHistory() {
    return loadRawHistory();
}

/**
 * Get the number of past attempts.
 */
function getAttemptCount() {
    return loadRawHistory().attempts.length;
}

/**
 * Aggregate category stats across all attempts.
 * Returns { [category]: { totalScore, totalMax, rate } }
 */
function getAggregatedStats() {
    const history = loadRawHistory();
    const aggregated = {};

    history.attempts.forEach((attempt) => {
        if (!attempt.categoryStats) return;
        Object.entries(attempt.categoryStats).forEach(([category, stats]) => {
            if (!aggregated[category]) {
                aggregated[category] = { totalScore: 0, totalMax: 0 };
            }
            aggregated[category].totalScore += stats.score;
            aggregated[category].totalMax += stats.maxScore;
        });
    });

    Object.keys(aggregated).forEach((key) => {
        const item = aggregated[key];
        item.rate = item.totalMax > 0 ? item.totalScore / item.totalMax : 1;
    });

    return aggregated;
}

/**
 * Get categories with accuracy below threshold.
 * @param {number} threshold - accuracy threshold (default 0.7 = 70%)
 */
function getWeakCategories(threshold = 0.7) {
    const stats = getAggregatedStats();
    return Object.entries(stats)
        .filter(([, item]) => item.rate < threshold && item.totalMax >= 3)
        .sort((a, b) => a[1].rate - b[1].rate)
        .map(([category, item]) => ({ category, ...item }));
}

/**
 * Build an exam blueprint that focuses on weak categories.
 * Increases quotas for weak Q1 categories and decreases strong ones.
 */
function buildWeaknessFocusedBlueprint() {
    const stats = getAggregatedStats();
    const base = JSON.parse(JSON.stringify(DEFAULT_EXAM_BLUEPRINT));
    const quotas = { ...base.q1.categoryQuotas };

    const q1Categories = Object.keys(quotas);
    const weak = [];
    const strong = [];

    q1Categories.forEach((cat) => {
        const stat = stats[cat];
        if (!stat || stat.totalMax < 3) return;
        if (stat.rate < 0.7) {
            weak.push(cat);
        } else if (stat.rate >= 0.85) {
            strong.push(cat);
        }
    });

    if (weak.length === 0) {
        return base;
    }

    // Reduce strong categories
    let budget = 0;
    strong.forEach((cat) => {
        if (quotas[cat] > 1) {
            quotas[cat] -= 1;
            budget += 1;
        }
    });

    // Distribute budget to weak categories
    let i = 0;
    while (budget > 0 && weak.length > 0) {
        const cat = weak[i % weak.length];
        quotas[cat] = (quotas[cat] || 1) + 1;
        budget -= 1;
        i += 1;
    }

    // Ensure total is still 15
    const total = Object.values(quotas).reduce((sum, v) => sum + v, 0);
    if (total > base.q1.total) {
        // Trim excess from the largest
        const sorted = Object.entries(quotas).sort((a, b) => b[1] - a[1]);
        let excess = total - base.q1.total;
        for (const [cat] of sorted) {
            if (excess <= 0) break;
            if (quotas[cat] > 1) {
                quotas[cat] -= 1;
                excess -= 1;
            }
        }
    }

    base.q1.categoryQuotas = quotas;
    return base;
}

/**
 * Get summary stats for display on start screen.
 */
function getHistorySummary() {
    const history = loadRawHistory();
    const attempts = history.attempts;

    if (attempts.length === 0) {
        return { count: 0, best: 0, average: 0, passCount: 0, lastScore: null };
    }

    const scores = attempts.map((a) => a.totalScore);
    const best = Math.max(...scores);
    const average = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const passCount = attempts.filter((a) => a.passed).length;
    const lastScore = scores[scores.length - 1];

    return { count: attempts.length, best, average, passCount, lastScore };
}

/**
 * Clear all history.
 */
function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // silently ignore
    }
}

export {
    saveAttempt,
    getHistory,
    getAttemptCount,
    getAggregatedStats,
    getWeakCategories,
    buildWeaknessFocusedBlueprint,
    getHistorySummary,
    clearHistory
};
