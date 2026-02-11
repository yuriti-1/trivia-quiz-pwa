/**
 * ranking.js - ランキングシステム
 * Firestore を使ったグローバルランキング
 */

import { getFirestore, getCurrentUserId, isFirebaseAvailable } from './firebase-config.js';

/**
 * カテゴリ別スコアを投稿
 * @param {string} categoryId - カテゴリID
 * @param {string} displayName - ニックネーム
 * @param {number} score - スコア
 * @param {number} accuracy - 正解率
 */
export async function submitCategoryScore(categoryId, displayName, score, accuracy) {
  if (!isFirebaseAvailable()) return;
  const db = getFirestore();
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const docRef = db.collection('rankings').doc(categoryId)
      .collection('scores').doc(userId);

    const existing = await docRef.get();

    // ハイスコアの場合のみ更新
    if (!existing.exists || existing.data().score < score) {
      await docRef.set({
        userId,
        displayName,
        score,
        accuracy,
        date: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn('スコア投稿に失敗:', e);
  }
}

/**
 * 総合スコアを更新
 * @param {string} displayName - ニックネーム
 * @param {number} lifetimeScore - 累計スコア
 * @param {number} level - レベル
 */
export async function updateGlobalRanking(displayName, lifetimeScore, level) {
  if (!isFirebaseAvailable()) return;
  const db = getFirestore();
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    await db.collection('rankings').doc('global')
      .collection('scores').doc(userId).set({
        userId,
        displayName,
        lifetimeScore,
        level,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (e) {
    console.warn('総合ランキング更新に失敗:', e);
  }
}

/**
 * カテゴリ別ランキングを取得（トップN）
 * @param {string} categoryId - カテゴリID
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} ランキング配列
 */
export async function getCategoryRanking(categoryId, limit = 50) {
  if (!isFirebaseAvailable()) return [];
  const db = getFirestore();

  try {
    const snapshot = await db.collection('rankings').doc(categoryId)
      .collection('scores')
      .orderBy('score', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      ...doc.data(),
    }));
  } catch (e) {
    console.warn('ランキング取得に失敗:', e);
    return [];
  }
}

/**
 * 総合ランキングを取得
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>}
 */
export async function getGlobalRanking(limit = 50) {
  if (!isFirebaseAvailable()) return [];
  const db = getFirestore();

  try {
    const snapshot = await db.collection('rankings').doc('global')
      .collection('scores')
      .orderBy('lifetimeScore', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      ...doc.data(),
    }));
  } catch (e) {
    console.warn('総合ランキング取得に失敗:', e);
    return [];
  }
}

/**
 * 自分のランキング位置を取得
 * @param {string} categoryId - カテゴリID (null で総合)
 * @returns {Promise<{rank: number, total: number}|null>}
 */
export async function getMyRank(categoryId = null) {
  if (!isFirebaseAvailable()) return null;
  const db = getFirestore();
  const userId = getCurrentUserId();
  if (!userId) return null;

  try {
    const collection = categoryId
      ? db.collection('rankings').doc(categoryId).collection('scores')
      : db.collection('rankings').doc('global').collection('scores');

    const orderField = categoryId ? 'score' : 'lifetimeScore';

    // 自分のスコアを取得
    const myDoc = await collection.doc(userId).get();
    if (!myDoc.exists) return null;

    const myScore = myDoc.data()[orderField];

    // 自分より上のスコア数をカウント
    const aboveSnapshot = await collection
      .where(orderField, '>', myScore)
      .get();

    const rank = aboveSnapshot.size + 1;

    // 全体数を取得（概算）
    const totalSnapshot = await collection.get();

    return { rank, total: totalSnapshot.size };
  } catch (e) {
    console.warn('ランク取得に失敗:', e);
    return null;
  }
}
