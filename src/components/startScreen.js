import { getHistorySummary, getAttemptCount, getWeakCategories, clearHistory } from '../examHistory.js';

function renderStartScreen() {
  const summary = getHistorySummary();
  const attemptCount = getAttemptCount();
  const weakCategories = getWeakCategories();
  const hasHistory = attemptCount > 0;
  const canUseWeakness = attemptCount >= 2;

  const historySection = hasHistory
    ? `
      <div class="start-card__history">
        <h3>受験履歴</h3>
        <div class="history-stats">
          <div class="history-stat">
            <span class="history-stat__label">受験回数</span>
            <span class="history-stat__value">${summary.count}回</span>
          </div>
          <div class="history-stat">
            <span class="history-stat__label">最高点</span>
            <span class="history-stat__value">${summary.best}点</span>
          </div>
          <div class="history-stat">
            <span class="history-stat__label">平均点</span>
            <span class="history-stat__value">${summary.average}点</span>
          </div>
          <div class="history-stat">
            <span class="history-stat__label">合格回数</span>
            <span class="history-stat__value">${summary.passCount}/${summary.count}</span>
          </div>
        </div>
        ${weakCategories.length > 0
      ? `<div class="history-weak">
                <p class="history-weak__title">⚠ 苦手カテゴリ（正答率70%未満）</p>
                <ul class="history-weak__list">
                  ${weakCategories.map((w) => `<li>${w.category}（${Math.round(w.rate * 100)}%）</li>`).join('')}
                </ul>
              </div>`
      : '<p class="history-weak__none">✅ すべてのカテゴリで正答率70%以上です</p>'
    }
        <button type="button" class="btn btn--text btn--sm" data-action="clear-history">
          履歴をリセット
        </button>
      </div>`
    : '';

  const modeSection = canUseWeakness
    ? `
      <div class="start-card__mode">
        <h3>出題モード</h3>
        <div class="mode-options">
          <label class="mode-option">
            <input type="radio" name="exam-mode" value="normal" checked />
            <span class="mode-option__label">通常モード</span>
            <span class="mode-option__desc">標準配分で出題</span>
          </label>
          <label class="mode-option">
            <input type="radio" name="exam-mode" value="weakness" />
            <span class="mode-option__label">苦手克服モード</span>
            <span class="mode-option__desc">正答率の低いカテゴリを重点出題</span>
          </label>
        </div>
      </div>`
    : '';

  return `
    <section class="start-screen">
      <div class="start-card">
        <div class="start-card__badge">日商簿記3級 CBT模擬</div>
        <h1 class="start-card__title">日商簿記3級 ネット試験模擬アプリ</h1>
        <p class="start-card__subtitle">60分・100点満点・70点以上で合格</p>

        <div class="start-card__info">
          <div class="info-tile">
            <p class="info-tile__label">試験時間</p>
            <p class="info-tile__value">60</p>
            <p class="info-tile__unit">分</p>
          </div>
          <div class="info-tile">
            <p class="info-tile__label">問題構成</p>
            <p class="info-tile__value">3</p>
            <p class="info-tile__unit">大問</p>
          </div>
          <div class="info-tile">
            <p class="info-tile__label">問題プール</p>
            <p class="info-tile__value">8,200+</p>
            <p class="info-tile__unit">問</p>
          </div>
        </div>

        ${historySection}
        ${modeSection}

        <div class="start-card__rules">
          <h3>試験の流れ</h3>
          <ul>
            <li>第1問（仕訳15問・45点） 第2問（2問・20点） 第3問（35点）</li>
            <li>第2問は語句選択・補助簿選択・勘定記入・商品有高帳・伝票記入から2題を出題</li>
            <li>第3問は決算整理後残高試算表型 / 精算表8欄型 / B/S・P/L作成型のいずれか1題</li>
            <li>本番寄せ比率: 第2問はC+D中心（42%）/ 第3問は残高試算表45%・B/S/P/L40%・精算表8欄15%</li>
            <li>問題プール: 第1問 4,640問 / 第2問 1,800問 / 第3問 1,800問</li>
            <li>勘定科目はプルダウン選択、金額は数字のみ入力</li>
            <li>金額はカンマなし入力後、Enterキーで3桁区切り表示</li>
            <li>一時退席ボタンでタイマーを停止し、再開で続きから受験可能</li>
            <li>制限時間到達または「試験終了」で採点・結果表示</li>
            <li>採点後は詳細解説・弱点分析・復習URL確認とPDFダウンロードが可能</li>
          </ul>
        </div>

        <button type="button" class="btn btn--primary btn--lg" data-action="start-exam">
          試験開始
        </button>
      </div>
    </section>
  `;
}

function bindStartScreenEvents(root, { onStart }) {
  const startButton = root.querySelector('[data-action="start-exam"]');

  if (startButton) {
    startButton.addEventListener('click', () => {
      const modeRadio = root.querySelector('input[name="exam-mode"]:checked');
      const mode = modeRadio ? modeRadio.value : 'normal';
      onStart(mode);
    });
  }

  const clearBtn = root.querySelector('[data-action="clear-history"]');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (window.confirm('受験履歴をすべて削除しますか？')) {
        clearHistory();
        // Re-render to update display
        const app = root.closest('#app') || root;
        app.innerHTML = renderStartScreen();
        bindStartScreenEvents(app, { onStart });
      }
    });
  }
}

export { renderStartScreen, bindStartScreenEvents };
