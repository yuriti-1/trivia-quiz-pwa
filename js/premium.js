/**
 * premium.js - プレミアム状態管理
 * 広告非表示の課金オプション
 * MVP: localStorage フラグ + Stripe Checkout 接続用インターフェース
 */

import { hideAllAds } from './ads.js';

// Stripe の価格ID（プレースホルダー - Stripe ダッシュボードで設定後に差し替え）
const STRIPE_PRICE_ID = 'price_XXXXXXXXXXXXXXXX';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_XXXXXXXXXXXXXXXX';

/**
 * プレミアムプランの情報
 */
export const PREMIUM_PLAN = {
  name: 'プレミアムプラン',
  price: 480,
  currency: 'JPY',
  description: '広告非表示でクイズに集中',
  features: [
    '全ての広告を非表示',
    '集中モードでプレイ',
    '今後の新機能を優先利用',
  ],
};

/**
 * プレミアム購入フローを開始
 * Stripe Checkout にリダイレクト（Stripe 設定後に有効化）
 * @param {StorageManager} storage
 * @returns {Promise<boolean>} 購入成功かどうか
 */
export async function startPurchase(storage) {
  // Stripe が利用可能か確認
  if (typeof Stripe !== 'undefined' && STRIPE_PUBLISHABLE_KEY !== 'pk_test_XXXXXXXXXXXXXXXX') {
    try {
      const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        successUrl: window.location.origin + window.location.pathname + '?premium=success',
        cancelUrl: window.location.origin + window.location.pathname + '?premium=cancel',
      });

      if (error) {
        console.warn('Stripe エラー:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Stripe 購入フローに失敗:', e);
      return false;
    }
  }

  // Stripe 未設定の場合はデモモード（開発用）
  // 確認ダイアログで即座にプレミアムを有効化
  const confirmed = confirm(
    `${PREMIUM_PLAN.name}（${PREMIUM_PLAN.price}円）\n` +
    `${PREMIUM_PLAN.description}\n\n` +
    '【開発モード】Stripe 未設定のため、即座にプレミアムを有効化します。\n' +
    '本番環境では Stripe Checkout で決済されます。\n\n' +
    '有効化しますか？'
  );

  if (confirmed) {
    activatePremium(storage);
    return true;
  }
  return false;
}

/**
 * プレミアムを有効化
 * @param {StorageManager} storage
 */
export function activatePremium(storage) {
  storage.setPremium(true);
  hideAllAds();
}

/**
 * プレミアム状態を確認
 * @param {StorageManager} storage
 * @returns {boolean}
 */
export function checkPremium(storage) {
  return storage.isPremium();
}

/**
 * URLパラメータから購入結果を処理（Stripe Checkout 戻り後）
 * @param {StorageManager} storage
 * @returns {'success' | 'cancel' | null}
 */
export function handlePurchaseReturn(storage) {
  const params = new URLSearchParams(window.location.search);
  const premiumParam = params.get('premium');

  if (premiumParam === 'success') {
    activatePremium(storage);
    // URLパラメータをクリーン
    window.history.replaceState({}, '', window.location.pathname);
    return 'success';
  }

  if (premiumParam === 'cancel') {
    window.history.replaceState({}, '', window.location.pathname);
    return 'cancel';
  }

  return null;
}
