/**
 * questions.js - カテゴリ登録・問題シャッフル・データ変換モジュール
 *
 * データファイルの形式 { q, choices, answer, explanation } を
 * GameEngine が期待する形式 { question, choices, correctIndex, explanation } に変換する。
 * 変換時に選択肢の順序もシャッフルし、correctIndex を再計算する。
 */

// 全10カテゴリをインポート
import { categoryMeta as scienceMeta, questions as scienceQ } from '../data/science.js';
import { categoryMeta as historyMeta, questions as historyQ } from '../data/history.js';
import { categoryMeta as geographyMeta, questions as geographyQ } from '../data/geography.js';
import { categoryMeta as foodMeta, questions as foodQ } from '../data/food.js';
import { categoryMeta as animalsMeta, questions as animalsQ } from '../data/animals.js';
import { categoryMeta as languageMeta, questions as languageQ } from '../data/language.js';
import { categoryMeta as entertainmentMeta, questions as entertainmentQ } from '../data/entertainment.js';
import { categoryMeta as bodyMeta, questions as bodyQ } from '../data/body.js';
import { categoryMeta as spaceMeta, questions as spaceQ } from '../data/space.js';
import { categoryMeta as sportsMeta, questions as sportsQ } from '../data/sports.js';
import { categoryMeta as artMeta, questions as artQ } from '../data/art.js';
import { categoryMeta as techMeta, questions as techQ } from '../data/tech.js';

// カテゴリ一覧（全12カテゴリ）
const categoryRegistry = [
  { meta: scienceMeta, questions: scienceQ },
  { meta: historyMeta, questions: historyQ },
  { meta: geographyMeta, questions: geographyQ },
  { meta: foodMeta, questions: foodQ },
  { meta: animalsMeta, questions: animalsQ },
  { meta: languageMeta, questions: languageQ },
  { meta: entertainmentMeta, questions: entertainmentQ },
  { meta: bodyMeta, questions: bodyQ },
  { meta: spaceMeta, questions: spaceQ },
  { meta: sportsMeta, questions: sportsQ },
  { meta: artMeta, questions: artQ },
  { meta: techMeta, questions: techQ },
];

/**
 * Fisher-Yates シャッフル
 * 元の配列は変更せず、新しい配列を返す
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * データ形式の変換: { q, choices, answer, explanation }
 *   → GameEngine形式: { question, choices, correctIndex, explanation }
 *
 * 選択肢の順序もシャッフルし、correctIndex を再計算する。
 * これにより毎回選択肢の並びが変わり、位置の暗記を防ぐ。
 */
function convertQuestion(rawQuestion) {
  const { q, choices, answer, explanation, deepDive } = rawQuestion;

  const indices = choices.map((_, i) => i);
  const shuffledIndices = shuffle(indices);

  return {
    question: q,
    choices: shuffledIndices.map(i => choices[i]),
    correctIndex: shuffledIndices.indexOf(answer),
    explanation: explanation,
    deepDive: deepDive || null,
  };
}

/**
 * カテゴリ一覧を取得
 * @returns {Array} カテゴリメタデータの配列 [{ id, name, emoji, description, color }, ...]
 */
export function getCategories() {
  return categoryRegistry.map(c => c.meta);
}

/**
 * 指定カテゴリから count 問をシャッフルして取得（GameEngine形式に変換済み）
 * @param {string} categoryId - カテゴリID
 * @param {number} count - 取得する問題数（デフォルト: 10）
 * @returns {Array} GameEngine形式の問題配列
 */
export function getQuestions(categoryId, count = 10) {
  const category = categoryRegistry.find(c => c.meta.id === categoryId);
  if (!category) return [];

  const shuffled = shuffle(category.questions);
  return shuffled.slice(0, count).map(convertQuestion);
}

/**
 * 全カテゴリの問題を結合して返す（デイリーチャレンジ用、GameEngine形式に変換済み）
 * @returns {Array} 全問題をGameEngine形式に変換した配列
 */
export function getAllQuestions() {
  const all = [];
  for (const cat of categoryRegistry) {
    for (const q of cat.questions) {
      all.push(convertQuestion(q));
    }
  }
  return all;
}

/**
 * カテゴリIDからメタデータを取得
 * @param {string} categoryId - カテゴリID
 * @returns {Object|null} カテゴリメタデータ { id, name, emoji, description, color } or null
 */
export function getCategoryMeta(categoryId) {
  const category = categoryRegistry.find(c => c.meta.id === categoryId);
  return category ? category.meta : null;
}

/**
 * 全カテゴリの問題をメタデータ付きで返す（復習モード用）
 * @returns {Array} [{ meta, questions }] - questions は変換前の生データ
 */
export function getAllCategoriesWithQuestions() {
  return categoryRegistry.map(c => ({
    meta: c.meta,
    questions: c.questions,
  }));
}

export { convertQuestion };

/**
 * 外部JSONから問題パックを読み込み、カテゴリに追加
 * @param {string} url - 問題パックのURL
 * @returns {Promise<{success: boolean, packName: string, categoriesAdded: number}>}
 */
export async function loadExternalQuestions(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    let categoriesAdded = 0;
    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        // 既存カテゴリと重複チェック
        const existing = categoryRegistry.find(c => c.meta.id === cat.meta.id);
        if (existing) {
          // 既存なら問題を追加
          existing.questions.push(...cat.questions);
        } else {
          // 新規カテゴリ
          categoryRegistry.push({ meta: cat.meta, questions: cat.questions });
          categoriesAdded++;
        }
      }
    }

    return { success: true, packName: data.packName || 'Unknown', categoriesAdded };
  } catch (e) {
    console.warn('問題パック読み込みに失敗:', e);
    return { success: false, packName: '', categoriesAdded: 0 };
  }
}
