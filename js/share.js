/**
 * 結果シェア機能
 */

/**
 * シェア用テキストを生成する
 * @param {string} categoryName - カテゴリ表示名（例: '科学'）
 * @param {number} score - スコア
 * @param {number} accuracy - 正解率（0-100）
 * @param {number} bestStreak - 最大連続正解数
 * @param {number} stars - 星の数（1-3）
 * @returns {string} シェア用テキスト
 */
export function generateShareText(categoryName, score, accuracy, bestStreak, stars) {
  const starStr = '\u2B50'.repeat(stars);
  const formattedScore = score.toLocaleString('ja-JP');

  return [
    `\uD83E\uDDE0 雑学クイズ【${categoryName}】`,
    `スコア: ${formattedScore}点 ${starStr}`,
    `正解率: ${accuracy}% | 最大連続: ${bestStreak}問`,
    `#雑学クイズ`,
  ].join('\n');
}

/**
 * シェアを実行する（Web Share API またはクリップボード）
 * @param {string} text - シェアするテキスト
 * @returns {Promise<{method: 'share'|'clipboard', success: boolean}>}
 */
export async function shareResult(text) {
  // Web Share API が使えるか判定
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return { method: 'share', success: true };
    } catch (e) {
      // ユーザーがキャンセルした場合など
      if (e.name === 'AbortError') {
        return { method: 'share', success: false };
      }
      // Share API が失敗した場合はクリップボードにフォールバック
    }
  }

  // クリップボードにコピー
  try {
    await navigator.clipboard.writeText(text);
    return { method: 'clipboard', success: true };
  } catch (e) {
    console.error('クリップボードへのコピーに失敗しました:', e);
    return { method: 'clipboard', success: false };
  }
}
