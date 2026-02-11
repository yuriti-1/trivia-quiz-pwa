/**
 * daily.js - デイリーチャレンジのシード生成・問題選択
 * 同じ日には同じ問題セットが選ばれることを保証する
 */

/**
 * mulberry32 - シード付き擬似乱数生成器
 * 0〜1の浮動小数点を返す関数を生成
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 今日の日付からシード値を生成 (YYYYMMDD形式の数値)
 * 例: 2024年1月15日 → 20240115
 */
export function getDailySeed() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  return yyyy * 10000 + mm * 100 + dd;
}

/**
 * シード付きFisher-Yatesシャッフル
 * 元の配列は変更せず、新しい配列を返す
 * 同じシードなら常に同じ並び順になる
 */
export function seededShuffle(array, seed) {
  const shuffled = [...array];
  const random = mulberry32(seed);

  // Fisher-Yates (後方から)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * デイリーチャレンジ用の問題を選択
 * 毎日同じシードでシャッフルし、先頭からcount問を取得
 * @param {Array} allQuestions - 全カテゴリの問題を結合した配列
 * @param {number} count - 選択する問題数 (デフォルト: 10)
 * @returns {Array} 選択された問題の配列
 */
export function getDailyChallengeQuestions(allQuestions, count = 10) {
  const seed = getDailySeed();
  const shuffled = seededShuffle(allQuestions, seed);
  return shuffled.slice(0, count);
}
