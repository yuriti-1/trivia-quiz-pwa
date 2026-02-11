/**
 * app.js - メインアプリケーション
 *
 * ルーターとゲームフローの統合。
 * 画面遷移: splash -> home -> quiz -> result -> home
 *                                        |
 *                                     stats -> home
 */

import { GameEngine } from './game.js';
import { StorageManager } from './storage.js';
import { getCategories, getQuestions, getAllQuestions, getCategoryMeta, getAllCategoriesWithQuestions, convertQuestion } from './questions.js';
import { getDailyChallengeQuestions } from './daily.js';
import { generateShareText, shareResult } from './share.js';
import { clearScreen, renderSplash, renderHome, renderQuiz, renderResult, renderStats, renderReviewHome, renderRanking, renderSettings, renderNicknamePrompt, createAdPlaceholder } from './ui.js';
import { getReviewQuestions, analyzeWeaknesses } from './review.js';
import { initFirebase, signInAnonymously, isFirebaseAvailable } from './firebase-config.js';
import { submitCategoryScore, updateGlobalRanking, getCategoryRanking, getGlobalRanking, getMyRank } from './ranking.js';
import { createAdBanner } from './ads.js';
import { checkPremium, startPurchase, handlePurchaseReturn, PREMIUM_PLAN } from './premium.js';

class App {
  constructor() {
    this.storage = new StorageManager();
    this.engine = null;
    this.currentCategoryId = null;
    this.isDailyChallenge = false;
  }

  /** アプリケーション初期化 */
  async init() {
    // Firebase初期化（失敗しても続行）
    initFirebase();
    try {
      await signInAnonymously();
    } catch (e) {
      // Firebase unavailable - ランキング機能は無効
    }

    // プレミアム購入からの復帰チェック
    const purchaseResult = handlePurchaseReturn(this.storage);
    if (purchaseResult === 'success') {
      // premium activated via handlePurchaseReturn
    }

    this.showSplash();
  }

  /** スプラッシュ画面を表示 */
  showSplash() {
    clearScreen();
    renderSplash(() => this.showHome());
  }

  /** ホーム画面を表示 */
  showHome() {
    clearScreen();
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    const categories = getCategories();
    renderHome({
      categories,
      storage: this.storage,
      onSelectCategory: (categoryId) => this.startQuiz(categoryId),
      onDailyChallenge: () => this.startDailyChallenge(),
      onShowStats: () => this.showStats(),
    });

    // Add extra navigation buttons to home footer
    const homeFooter = document.querySelector('.home__footer');
    if (homeFooter && !homeFooter.dataset.enhanced) {
      homeFooter.dataset.enhanced = 'true';

      const reviewBtn = document.createElement('button');
      reviewBtn.className = 'btn-secondary home__stats-btn';
      reviewBtn.textContent = '\uD83D\uDCDA 復習モード';
      reviewBtn.setAttribute('aria-label', '復習モードを開く');
      reviewBtn.addEventListener('click', () => this.showReviewHome());

      const rankingBtn = document.createElement('button');
      rankingBtn.className = 'btn-secondary home__stats-btn';
      rankingBtn.textContent = '\uD83C\uDFC6 ランキング';
      rankingBtn.setAttribute('aria-label', 'ランキングを見る');
      rankingBtn.addEventListener('click', () => this.showRanking());

      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'btn-secondary home__stats-btn';
      settingsBtn.textContent = '\u2699\uFE0F 設定';
      settingsBtn.setAttribute('aria-label', '設定を開く');
      settingsBtn.addEventListener('click', () => this.showSettings());

      homeFooter.appendChild(reviewBtn);
      homeFooter.appendChild(rankingBtn);
      homeFooter.appendChild(settingsBtn);
    }

    // Add ad banner to home
    const homeEl = document.querySelector('.home');
    if (homeEl) {
      homeEl.appendChild(createAdBanner('home'));
    }
  }

  /**
   * 通常カテゴリのクイズを開始
   * @param {string} categoryId - カテゴリID
   */
  startQuiz(categoryId) {
    this.currentCategoryId = categoryId;
    this.isDailyChallenge = false;

    const questions = getQuestions(categoryId);
    const meta = getCategoryMeta(categoryId);

    this._runQuiz(questions, meta.name, meta.emoji, meta.color);
  }

  /** デイリーチャレンジを開始 */
  startDailyChallenge() {
    if (this.storage.hasDailyChallengePlayed()) {
      this.showHome();
      return;
    }

    this.currentCategoryId = 'daily';
    this.isDailyChallenge = true;

    const allQ = getAllQuestions();
    const questions = getDailyChallengeQuestions(allQ);

    this._runQuiz(questions, '今日のチャレンジ', '\u{1F308}', '#6C5CE7');
  }

  /**
   * クイズ画面を構築し、GameEngineとUIを接続してラウンドを実行する
   * @param {Array} questions - GameEngine形式の問題配列
   * @param {string} categoryName - カテゴリ表示名
   * @param {string} categoryEmoji - カテゴリ絵文字
   * @param {string} categoryColor - カテゴリカラー
   */
  _runQuiz(questions, categoryName, categoryEmoji, categoryColor) {
    clearScreen();

    // GameEngine セットアップ
    if (this.engine) this.engine.destroy();
    this.engine = new GameEngine();

    // UI セットアップ
    const ui = renderQuiz({ categoryName, categoryEmoji, categoryColor });

    // 問題配列への参照を保持（時間切れ時に正解情報を参照するため）
    // getCurrentQuestion().questionNumber は 1-indexed なので -1 してインデックスとして使う
    const questionsRef = questions;

    // タイマー毎秒コールバック
    this.engine.onTick((remaining) => {
      ui.updateTimer(remaining, 15);
    });

    // 時間切れコールバック
    // 注意: onTimeUp 発火時、engine は既に ANSWERED 状態に遷移しており
    // submitAnswer() は呼べない。getCurrentQuestion() は ANSWERED 状態でも値を返すが
    // correctIndex / explanation を含まないため、元の問題配列から取得する。
    this.engine.onTimeUp(() => {
      ui.disableAnswers();

      const current = this.engine.getCurrentQuestion();
      if (!current) return;
      const questionData = questionsRef[current.questionNumber - 1];

      ui.showResult(false, questionData.correctIndex, -1, questionData.explanation, 0, questionData.deepDive || null);
      ui.setNextButtonHandler(() => this._handleNext(ui));
    });

    // 選択肢クリックコールバック
    ui.setAnswerHandler((choiceIndex) => {
      const result = this.engine.submitAnswer(choiceIndex);
      if (!result) return;

      ui.showResult(
        result.correct,
        result.correctIndex,
        choiceIndex,
        result.explanation,
        result.pointsEarned,
        result.deepDive  // NEW: pass deepDive
      );
      ui.updateScore(this.engine.getScore());
      ui.updateStreak(result.streak);

      ui.setNextButtonHandler(() => this._handleNext(ui));
    });

    // ラウンド開始
    this.engine.startRound(questions);
    const q = this.engine.getCurrentQuestion();
    ui.updateQuestion(q.question, q.choices, q.questionNumber, q.totalQuestions);
    ui.updateScore(0);
    ui.updateStreak(0);
  }

  /**
   * 次の問題へ進む、または結果画面に遷移する
   * @param {Object} ui - renderQuiz が返した UIコントロールオブジェクト
   */
  _handleNext(ui) {
    const nextQ = this.engine.nextQuestion();

    if (!nextQ) {
      // ラウンド完了 → 結果画面へ
      this._showResult();
      return;
    }

    // 次の問題を表示
    ui.updateQuestion(nextQ.question, nextQ.choices, nextQ.questionNumber, nextQ.totalQuestions);
    ui.updateScore(this.engine.getScore());
  }

  /** 結果画面を表示し、スコアを保存する */
  async _showResult() {
    const result = this.engine.getRoundResult();
    const categoryId = this.currentCategoryId;
    const isDailyChallenge = this.isDailyChallenge;

    // スコア保存
    if (isDailyChallenge) {
      this.storage.saveDailyResult(result.score);
    } else {
      const saveResult = this.storage.saveRoundResult(categoryId, result.score, result.correct, result.total);
      if (saveResult.levelUp) {
        result.levelUp = true;
        result.newLevel = saveResult.levelAfter;
      }
    }

    // ランキング投稿（非同期、エラーは無視）
    const nickname = this.storage.getNickname();
    if (nickname && isFirebaseAvailable()) {
      const displayName = nickname;
      if (!isDailyChallenge) {
        submitCategoryScore(categoryId, displayName, result.score, result.accuracy).catch(() => {});
      }
      updateGlobalRanking(displayName, this.storage.getLifetimeScore(), this.storage.getLevel()).catch(() => {});
    }

    const meta = isDailyChallenge
      ? { name: '今日のチャレンジ', emoji: '\u{1F308}' }
      : getCategoryMeta(categoryId);

    clearScreen();
    renderResult({
      result,
      categoryName: meta.name,
      categoryEmoji: meta.emoji,
      onRetry: () => {
        if (isDailyChallenge) {
          this.showHome();
        } else {
          this.startQuiz(categoryId);
        }
      },
      onHome: () => this.showHome(),
      onShare: async () => {
        const text = generateShareText(
          meta.name,
          result.score,
          result.accuracy,
          result.bestStreak,
          result.stars
        );
        await shareResult(text);
      },
    });

    // 結果画面に広告バナーを追加
    const resultEl = document.querySelector('.result');
    if (resultEl) {
      const actionsEl = resultEl.querySelector('.result__actions');
      if (actionsEl) {
        resultEl.insertBefore(createAdBanner('result'), actionsEl);
      }
    }
  }

  /** 統計画面を表示 */
  showStats() {
    clearScreen();
    const stats = this.storage.getAllStats();
    renderStats({
      stats,
      onBack: () => this.showHome(),
    });
  }

  /** 復習モードホーム画面を表示 */
  showReviewHome() {
    clearScreen();
    const categories = getCategories();
    const questionHistory = this.storage.getQuestionHistory();
    const hasHistory = Object.keys(questionHistory).length > 0;
    const weaknesses = analyzeWeaknesses(categories, questionHistory);

    renderReviewHome({
      weaknesses,
      hasHistory,
      onStartReview: () => this.startReviewQuiz(),
      onBack: () => this.showHome(),
    });
  }

  /** 復習クイズを開始 */
  startReviewQuiz() {
    this.currentCategoryId = 'review';
    this.isDailyChallenge = false;

    const allCats = getAllCategoriesWithQuestions();
    const questionHistory = this.storage.getQuestionHistory();
    const rawQuestions = getReviewQuestions(allCats, questionHistory, 10);

    // rawQuestions は生データ形式なので convertQuestion で変換
    const questions = rawQuestions.map(q => convertQuestion(q));

    if (questions.length === 0) {
      this.showReviewHome();
      return;
    }

    this._runQuiz(questions, '復習モード', '\uD83D\uDCDA', '#34C7A5');

    // 復習モードはタイマーなし
    if (this.engine) {
      this.engine._noTimer = true;
      this.engine._stopTimer();
    }

    // UIのタイマーを非表示
    const timerWrapper = document.querySelector('.quiz__timer-wrapper');
    if (timerWrapper) timerWrapper.style.display = 'none';
  }

  /** ランキング画面を表示 */
  async showRanking() {
    clearScreen();

    // ニックネーム未設定ならプロンプト
    if (!this.storage.getNickname()) {
      renderNicknamePrompt((name) => {
        if (name) this.storage.setNickname(name);
        this._loadRanking();
      });
    } else {
      this._loadRanking();
    }
  }

  async _loadRanking() {
    const categories = getCategories();
    let globalRanking = [];
    let myRank = null;

    if (isFirebaseAvailable()) {
      globalRanking = await getGlobalRanking(50);
      myRank = await getMyRank(null);
    }

    const ui = renderRanking({
      globalRanking,
      categoryRankings: [],
      categories,
      myRank,
      onBack: () => this.showHome(),
      onSelectCategory: async (catId) => {
        if (isFirebaseAvailable()) {
          const rankings = await getCategoryRanking(catId, 50);
          ui.updateCategoryRanking(rankings);
        }
      },
    });
  }

  /** 設定画面を表示 */
  showSettings() {
    clearScreen();
    renderSettings({
      storage: this.storage,
      isPremium: checkPremium(this.storage),
      onBack: () => this.showHome(),
      onPurchasePremium: async () => {
        const purchased = await startPurchase(this.storage);
        if (purchased) {
          this.showSettings(); // reload settings to reflect premium status
        }
      },
      onSetNickname: (name) => {
        this.storage.setNickname(name);
      },
      onResetData: () => {
        this.storage.resetAll();
        this.showHome();
      },
    });
  }
}

// アプリ起動
const app = new App();
app.init();
