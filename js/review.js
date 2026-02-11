/**
 * review.js - 復習モードの問題選択エンジン
 * 間違えた問題を重み付けで優先的に出題する
 */

/**
 * 問題の復習重みを計算
 * @param {Object|null} history - { correct, wrong, lastSeen, lastResult }
 * @returns {number} 重み（大きいほど出題されやすい）
 */
export function calcWeight(history) {
  if (!history) return 2; // 未回答

  const { correct, wrong, lastResult, lastSeen } = history;
  const total = correct + wrong;

  if (total === 0) return 2;

  // 最後に間違えた問題を最優先
  if (!lastResult) return 4;

  // 不正解率が高いほど重み大
  const wrongRate = wrong / total;
  if (wrongRate > 0) return 3 * wrongRate;

  // 最近正解した問題は重み小
  const daysSince = _daysSince(lastSeen);
  if (daysSince < 1) return 0.3;
  if (daysSince < 3) return 0.5;
  if (daysSince < 7) return 0.8;

  return 1.0; // 昔正解した問題は普通の重み
}

// lastSeen からの経過日数
function _daysSince(dateStr) {
  if (!dateStr) return 999;
  const then = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/**
 * 重み付きランダム選択
 * @param {Array} items - { question, weight } の配列
 * @param {number} count - 選択数
 * @returns {Array} 選択された question の配列
 */
export function weightedSelect(items, count = 10) {
  // 重みに基づいてソート（重い順）+ ランダム要素
  const scored = items.map(item => ({
    ...item,
    score: item.weight * (0.5 + Math.random())
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.question);
}

/**
 * 復習用の問題セットを生成
 * @param {Array} allCategoriesWithQuestions - [{ meta, questions }] 全カテゴリ
 * @param {Object} questionHistory - StorageManager.getQuestionHistory() の戻り値
 * @param {number} count - 問題数
 * @returns {Array} GameEngine形式の問題配列
 */
export function getReviewQuestions(allCategoriesWithQuestions, questionHistory, count = 10) {
  const candidates = [];

  for (const { meta, questions } of allCategoriesWithQuestions) {
    questions.forEach((q, index) => {
      const key = `${meta.id}_${index}`;
      const history = questionHistory[key] || null;
      const weight = calcWeight(history);

      // 重みが0以下は除外（完全に習得済み扱いにはしない、最低0.1）
      if (weight > 0.1) {
        candidates.push({
          question: q,
          weight,
          categoryId: meta.id,
          questionIndex: index,
        });
      }
    });
  }

  return weightedSelect(candidates, count);
}

/**
 * カテゴリ別の弱点分析
 * @param {Array} allCategories - カテゴリメタデータ配列
 * @param {Object} questionHistory - 全問題の回答履歴
 * @returns {Array} [{ categoryId, name, emoji, totalAnswered, accuracy, weakCount }]
 */
export function analyzeWeaknesses(allCategories, questionHistory) {
  const analysis = [];

  for (const meta of allCategories) {
    let totalCorrect = 0;
    let totalWrong = 0;
    let weakCount = 0;

    for (const [key, history] of Object.entries(questionHistory)) {
      if (!key.startsWith(meta.id + '_')) continue;
      totalCorrect += history.correct;
      totalWrong += history.wrong;

      // 不正解率50%以上を「弱点」とする
      const total = history.correct + history.wrong;
      if (total > 0 && history.wrong / total >= 0.5) {
        weakCount++;
      }
    }

    const totalAnswered = totalCorrect + totalWrong;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    analysis.push({
      categoryId: meta.id,
      name: meta.name,
      emoji: meta.emoji,
      color: meta.color,
      totalAnswered,
      accuracy,
      weakCount,
    });
  }

  // 正解率が低い順にソート
  analysis.sort((a, b) => a.accuracy - b.accuracy);

  return analysis;
}
