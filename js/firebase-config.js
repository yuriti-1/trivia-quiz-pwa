/**
 * firebase-config.js - Firebase 初期化・認証
 * Firebase SDK はグローバルに読み込み済み前提
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAwmkW3vCLpjpPNfk-wFtUOgSIRBp6TXQE",
  authDomain: "trivia-quiz-pwa-6307d.firebaseapp.com",
  projectId: "trivia-quiz-pwa-6307d",
  storageBucket: "trivia-quiz-pwa-6307d.firebasestorage.app",
  messagingSenderId: "785729671630",
  appId: "1:785729671630:web:285942acacbc168dc25b9f"
};

let _app = null;
let _auth = null;
let _db = null;
let _currentUser = null;
let _initialized = false;

/**
 * Firebase を初期化
 * index.html で Firebase SDK が読み込まれた後に呼ぶ
 */
export function initFirebase() {
  if (_initialized) return;

  try {
    // グローバルの firebase オブジェクトを使用
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK が読み込まれていません。ランキング機能は無効です。');
      return;
    }

    _app = firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    _db = firebase.firestore();
    _initialized = true;
  } catch (e) {
    console.warn('Firebase の初期化に失敗しました:', e);
  }
}

/**
 * 匿名認証でサインイン
 * @returns {Promise<string|null>} ユーザーID or null
 */
export async function signInAnonymously() {
  if (!_auth) return null;

  try {
    if (_auth.currentUser) {
      _currentUser = _auth.currentUser;
      return _currentUser.uid;
    }

    const result = await _auth.signInAnonymously();
    _currentUser = result.user;
    return _currentUser.uid;
  } catch (e) {
    console.warn('匿名認証に失敗しました:', e);
    return null;
  }
}

/** 現在のユーザーIDを取得 */
export function getCurrentUserId() {
  return _currentUser ? _currentUser.uid : null;
}

/** Firestore インスタンスを取得 */
export function getFirestore() {
  return _db;
}

/** Firebase が使用可能か（認証成功済みの場合のみtrue） */
export function isFirebaseAvailable() {
  return _initialized && _db !== null && _currentUser !== null;
}
