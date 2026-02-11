/**
 * StorageManager - ゲームデータの永続化管理
 */

const STORAGE_KEY = 'trivia-quiz-data';

// レベル計算用マイルストーン [スコア, レベル]
// 全1200問パーフェクト(120ラウンド ≈ 340,000pt)でLv.50到達
const LEVEL_MILESTONES = [
  [0, 1],
  [2800, 2],      // ~1ラウンド
  [8000, 3],      // ~3ラウンド
  [15000, 4],     // ~5ラウンド
  [25000, 5],     // ~9ラウンド
  [40000, 7],     // ~14ラウンド
  [60000, 10],    // ~21ラウンド
  [90000, 15],    // ~32ラウンド
  [130000, 20],   // ~46ラウンド
  [170000, 25],   // ~60ラウンド
  [210000, 30],   // ~74ラウンド
  [270000, 40],   // ~95ラウンド
  [340000, 50],   // ~120ラウンド（全問制覇）
];

// レベル帯ごとのタイトル（楽しい肩書き）
const LEVEL_TITLES = [
  { level: 1,  title: 'ひよっこ' },
  { level: 2,  title: 'おぼえたてベイビー' },
  { level: 3,  title: '好奇心のタマゴ' },
  { level: 4,  title: 'ちょっと詳しい人' },
  { level: 5,  title: '雑学見習い' },
  { level: 7,  title: '豆知識コレクター' },
  { level: 10, title: 'トリビアハンター' },
  { level: 13, title: 'うんちく番長' },
  { level: 15, title: '歩くウィキペディア' },
  { level: 18, title: 'クイズの鬼' },
  { level: 20, title: '博識マスター' },
  { level: 23, title: '知識の魔術師' },
  { level: 25, title: '全方位インテリ' },
  { level: 28, title: '雑学の生き字引' },
  { level: 30, title: '雑学キング' },
  { level: 33, title: '知の守護者' },
  { level: 35, title: '森羅万象マニア' },
  { level: 38, title: '人間Google' },
  { level: 40, title: '伝説のクイズ王' },
  { level: 43, title: '知識の化身' },
  { level: 45, title: '天才の中の天才' },
  { level: 48, title: '超越者' },
  { level: 50, title: '全知全能の神' },
];

function getLevelTitle(level) {
  for (let i = LEVEL_TITLES.length - 1; i >= 0; i--) {
    if (level >= LEVEL_TITLES[i].level) return LEVEL_TITLES[i].title;
  }
  return LEVEL_TITLES[0].title;
}

/** 全レベル肩書き一覧を取得（UI表示用） */
export function getAllLevelTitles() {
  return LEVEL_TITLES;
}

// 累計スコアからレベルを計算（マイルストーン間を線形補間）
function calcLevel(score) {
  if (score >= 340000) return 50;

  for (let i = LEVEL_MILESTONES.length - 1; i >= 0; i--) {
    const [msScore, msLevel] = LEVEL_MILESTONES[i];
    if (score >= msScore) {
      // 最後のマイルストーンならそのレベルを返す
      if (i === LEVEL_MILESTONES.length - 1) return msLevel;

      const [nextScore, nextLevel] = LEVEL_MILESTONES[i + 1];
      const progress = (score - msScore) / (nextScore - msScore);
      return Math.floor(msLevel + progress * (nextLevel - msLevel));
    }
  }
  return 1;
}

// 指定レベルに到達するのに必要なスコアを逆算
function scoreForLevel(targetLevel) {
  if (targetLevel <= 1) return 0;
  if (targetLevel >= 50) return 340000;

  for (let i = 0; i < LEVEL_MILESTONES.length - 1; i++) {
    const [msScore, msLevel] = LEVEL_MILESTONES[i];
    const [nextScore, nextLevel] = LEVEL_MILESTONES[i + 1];

    if (targetLevel >= msLevel && targetLevel < nextLevel) {
      const ratio = (targetLevel - msLevel) / (nextLevel - msLevel);
      return Math.floor(msScore + ratio * (nextScore - msScore));
    }
  }
  return 500000;
}

// デフォルトデータ
function createDefaultData() {
  return {
    version: 1,
    lifetimeScore: 0,
    playStreak: 0,
    lastPlayDate: null,
    categories: {},
    dailyChallenge: {
      lastDate: null,
      lastScore: null,
    },
    questionHistory: {},
    nickname: null,
    premium: false,
    premiumDate: null,
  };
}

// カテゴリのデフォルト統計
function createDefaultCategoryStats() {
  return {
    highScore: 0,
    totalCorrect: 0,
    totalAttempted: 0,
    timesPlayed: 0,
  };
}

export class StorageManager {
  constructor() {
    this.data = this._load();
  }

  // --- スコア関連 ---

  /** ラウンド結果を保存し、レベルアップ判定を返す */
  saveRoundResult(categoryId, score, correct, total) {
    const levelBefore = this.getLevel();

    // カテゴリ統計の初期化・更新
    if (!this.data.categories[categoryId]) {
      this.data.categories[categoryId] = createDefaultCategoryStats();
    }
    const cat = this.data.categories[categoryId];

    const isHighScore = score > cat.highScore;
    if (isHighScore) {
      cat.highScore = score;
    }
    cat.totalCorrect += correct;
    cat.totalAttempted += total;
    cat.timesPlayed += 1;

    // 累計スコア加算
    this.data.lifetimeScore += score;

    // ストリーク更新
    const today = this._getToday();
    if (this.data.lastPlayDate) {
      const yesterday = this._addDays(today, -1);
      if (this.data.lastPlayDate === yesterday) {
        this.data.playStreak += 1;
      } else if (this.data.lastPlayDate !== today) {
        // 前日でも今日でもなければリセット
        this.data.playStreak = 1;
      }
      // 今日既にプレイ済みならストリークは変えない
    } else {
      this.data.playStreak = 1;
    }
    this.data.lastPlayDate = today;

    this._save();

    const levelAfter = this.getLevel();
    return {
      isHighScore,
      levelBefore,
      levelAfter,
      levelUp: levelAfter > levelBefore,
    };
  }

  /** カテゴリのハイスコアを返す */
  getHighScore(categoryId) {
    return this.data.categories[categoryId]?.highScore ?? 0;
  }

  /** 累計スコアを返す */
  getLifetimeScore() {
    return this.data.lifetimeScore;
  }

  // --- レベル関連 ---

  /** 現在のレベルを返す */
  getLevel() {
    return calcLevel(this.data.lifetimeScore);
  }

  /** レベル詳細情報を返す */
  getLevelInfo() {
    const level = this.getLevel();
    const title = getLevelTitle(level);
    const currentScore = this.data.lifetimeScore;
    const nextLevel = level >= 50 ? 50 : level + 1;
    const currentLevelScore = scoreForLevel(level);
    const nextLevelScore = scoreForLevel(nextLevel);

    // 現在レベル内での進捗率
    let progress = 0;
    if (level < 50) {
      const range = nextLevelScore - currentLevelScore;
      progress = range > 0 ? (currentScore - currentLevelScore) / range : 1;
      progress = Math.min(Math.max(progress, 0), 1);
    } else {
      progress = 1;
    }

    return { level, title, currentScore, nextLevelScore, progress };
  }

  // --- カテゴリ統計 ---

  /** カテゴリの統計を返す */
  getCategoryStats(categoryId) {
    const cat = this.data.categories[categoryId];
    if (!cat || cat.timesPlayed === 0) {
      return {
        highScore: 0,
        totalCorrect: 0,
        totalAttempted: 0,
        timesPlayed: 0,
        accuracy: 0,
        stars: 0,
      };
    }

    const accuracy =
      cat.totalAttempted > 0
        ? Math.round((cat.totalCorrect / cat.totalAttempted) * 100)
        : 0;

    let stars = 1;
    if (accuracy >= 90) stars = 3;
    else if (accuracy >= 70) stars = 2;

    return {
      highScore: cat.highScore,
      totalCorrect: cat.totalCorrect,
      totalAttempted: cat.totalAttempted,
      timesPlayed: cat.timesPlayed,
      accuracy,
      stars,
    };
  }

  /** 全カテゴリの統計を返す */
  getAllCategoryStats() {
    const result = {};
    for (const categoryId of Object.keys(this.data.categories)) {
      result[categoryId] = this.getCategoryStats(categoryId);
    }
    return result;
  }

  // --- ストリーク ---

  /** 連続プレイ日数を返す */
  getPlayStreak() {
    return this.data.playStreak;
  }

  // --- デイリーチャレンジ ---

  /** デイリーチャレンジの結果を保存 */
  saveDailyResult(score) {
    this.data.dailyChallenge.lastDate = this._getToday();
    this.data.dailyChallenge.lastScore = score;
    this._save();
  }

  /** 今日のデイリー結果を返す（未プレイなら null） */
  getDailyResult() {
    if (this.data.dailyChallenge.lastDate === this._getToday()) {
      return this.data.dailyChallenge.lastScore;
    }
    return null;
  }

  /** 今日のデイリーチャレンジをプレイ済みか */
  hasDailyChallengePlayed() {
    return this.data.dailyChallenge.lastDate === this._getToday();
  }

  // --- 全体統計 ---

  /** 統計画面用の全データを返す */
  getAllStats() {
    const categoryStats = this.getAllCategoryStats();
    const categoryIds = Object.keys(categoryStats);

    let totalQuestionsAnswered = 0;
    let totalCorrect = 0;
    for (const id of categoryIds) {
      totalQuestionsAnswered += categoryStats[id].totalAttempted;
      totalCorrect += categoryStats[id].totalCorrect;
    }

    const overallAccuracy =
      totalQuestionsAnswered > 0
        ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
        : 0;

    return {
      lifetimeScore: this.data.lifetimeScore,
      level: this.getLevel(),
      levelInfo: this.getLevelInfo(),
      playStreak: this.data.playStreak,
      totalQuestionsAnswered,
      overallAccuracy,
      categoriesPlayed: categoryIds.length,
      categoryStats,
    };
  }

  // --- 問題回答履歴 ---

  /**
   * 問題の回答結果を記録
   * @param {string} categoryId
   * @param {number} questionIndex - カテゴリ内の問題インデックス
   * @param {boolean} correct - 正解したか
   */
  recordQuestionResult(categoryId, questionIndex, correct) {
    const key = `${categoryId}_${questionIndex}`;
    if (!this.data.questionHistory) {
      this.data.questionHistory = {};
    }
    if (!this.data.questionHistory[key]) {
      this.data.questionHistory[key] = { correct: 0, wrong: 0, lastSeen: null, lastResult: null };
    }
    const entry = this.data.questionHistory[key];
    if (correct) {
      entry.correct++;
    } else {
      entry.wrong++;
    }
    entry.lastSeen = this._getToday();
    entry.lastResult = correct;
    this._save();
  }

  /** 全問題の回答履歴を返す */
  getQuestionHistory() {
    return this.data.questionHistory || {};
  }

  /** 特定問題の回答履歴を返す */
  getQuestionRecord(categoryId, questionIndex) {
    const key = `${categoryId}_${questionIndex}`;
    return (this.data.questionHistory || {})[key] || null;
  }

  // --- ニックネーム ---

  /** ニックネームを保存 */
  setNickname(name) {
    this.data.nickname = name;
    this._save();
  }

  /** ニックネームを取得 */
  getNickname() {
    return this.data.nickname || null;
  }

  // --- プレミアム ---

  /** プレミアム状態を設定 */
  setPremium(isPremium) {
    this.data.premium = isPremium;
    if (isPremium) {
      this.data.premiumDate = this._getToday();
    }
    this._save();
  }

  /** プレミアム状態を取得 */
  isPremium() {
    return this.data.premium === true;
  }

  // --- リセット ---

  /** 全データを削除して初期化 */
  resetAll() {
    this.data = createDefaultData();
    localStorage.removeItem(STORAGE_KEY);
  }

  // --- 内部メソッド ---

  /** localStorage に保存 */
  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('データの保存に失敗しました:', e);
    }
  }

  /** localStorage から読み込み（なければデフォルト生成） */
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('データの読み込みに失敗しました:', e);
    }
    return createDefaultData();
  }

  /** 今日の日付を 'YYYY-MM-DD' 形式で返す */
  _getToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** 日付文字列に日数を加算した文字列を返す */
  _addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
