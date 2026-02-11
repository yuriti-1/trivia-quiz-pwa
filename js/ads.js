/**
 * ads.js - 広告管理
 * Google AdSense バナー広告の表示制御
 * プレミアムユーザーには広告を非表示
 */

import { StorageManager } from './storage.js';

// AdSense のパブリッシャーID（プレースホルダー）
const AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';

// 広告スロットID（プレースホルダー）
const AD_SLOTS = {
  home: 'XXXXXXXXXX',
  result: 'XXXXXXXXXX',
  stats: 'XXXXXXXXXX',
};

/**
 * 広告バナーの DOM 要素を作成
 * @param {string} slotName - 広告スロット名 ('home', 'result', 'stats')
 * @returns {HTMLElement} 広告コンテナ要素
 */
export function createAdBanner(slotName) {
  const container = document.createElement('div');
  container.className = 'ad-banner';
  container.setAttribute('data-slot', slotName);

  // プレミアムユーザーチェック
  // 注意: StorageManager のインスタンスは呼び出し側から渡すのではなく、
  // ここではシンプルに localStorage を直接チェック
  if (_isPremium()) {
    // プレミアムユーザーには広告を表示しない
    container.style.display = 'none';
    return container;
  }

  // AdSense が利用可能か確認
  if (typeof adsbygoogle !== 'undefined') {
    // 本番用: AdSense のインススクリプト広告ユニット
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.textAlign = 'center';
    ins.setAttribute('data-ad-client', AD_CLIENT);
    ins.setAttribute('data-ad-slot', AD_SLOTS[slotName] || '');
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    container.appendChild(ins);

    // 広告をリクエスト
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense エラーは無視
    }
  } else {
    // 開発環境用: プレースホルダー表示
    container.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.className = 'ad-placeholder';
    placeholder.textContent = '広告スペース';
    container.appendChild(placeholder);
  }

  return container;
}

/**
 * 全ての広告を非表示にする（プレミアム購入時に呼ぶ）
 */
export function hideAllAds() {
  const ads = document.querySelectorAll('.ad-banner');
  ads.forEach(ad => {
    ad.style.display = 'none';
  });
}

/**
 * 全ての広告を表示する（プレミアム解除時に呼ぶ）
 */
export function showAllAds() {
  if (_isPremium()) return;
  const ads = document.querySelectorAll('.ad-banner');
  ads.forEach(ad => {
    ad.style.display = '';
  });
}

/**
 * プレミアム状態をチェック（localStorage直接参照）
 */
function _isPremium() {
  try {
    const data = JSON.parse(localStorage.getItem('trivia-quiz-data') || '{}');
    return data.premium === true;
  } catch {
    return false;
  }
}
