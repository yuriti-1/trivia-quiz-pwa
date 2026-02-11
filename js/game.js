/**
 * GameEngine - トリビアクイズのゲームロジック
 * ステートマシン: idle -> playing -> answered -> roundComplete
 */

// ステート定数
const STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  ANSWERED: 'answered',
  ROUND_COMPLETE: 'roundComplete',
};

// ゲーム設定
const CONFIG = {
  TIME_LIMIT: 15,           // 制限時間(秒)
  BASE_POINTS: 100,         // 正解基本点
  MAX_SPEED_BONUS: 50,      // スピードボーナス最大値
  PERFECT_BONUS: 500,       // パーフェクトボーナス
  QUESTIONS_PER_ROUND: 10,  // 1ラウンドの問題数
};

// ストリーク倍率テーブル
const STREAK_MULTIPLIERS = [
  { threshold: 10, multiplier: 3.0 },
  { threshold: 5,  multiplier: 2.0 },
  { threshold: 3,  multiplier: 1.5 },
];

/**
 * ストリーク数に応じた倍率を返す
 */
function getStreakMultiplier(streak) {
  for (const { threshold, multiplier } of STREAK_MULTIPLIERS) {
    if (streak >= threshold) return multiplier;
  }
  return 1.0;
}

export class GameEngine {
  constructor() {
    this._state = STATE.IDLE;
    this._score = 0;
    this._questions = [];
    this._questionIndex = 0;
    this._streak = 0;
    this._bestStreak = 0;
    this._correctCount = 0;
    this._secondsRemaining = CONFIG.TIME_LIMIT;
    this._timerId = null;

    // コールバック
    this._onTick = null;
    this._onTimeUp = null;
  }

  // --- コールバック設定 ---

  /** タイマー毎秒コールバック (remaining) => void */
  onTick(callback) {
    this._onTick = callback;
  }

  /** 時間切れコールバック () => void */
  onTimeUp(callback) {
    this._onTimeUp = callback;
  }

  // --- ゲーム操作 ---

  /**
   * ラウンド開始 - 10問の配列を受け取る
   * 各問題は { question, choices, correctIndex, explanation } を想定
   */
  startRound(questions, options = {}) {
    this._noTimer = options.noTimer || false;
    this._questions = questions.slice(0, CONFIG.QUESTIONS_PER_ROUND);
    this._questionIndex = 0;
    this._score = 0;
    this._streak = 0;
    this._bestStreak = 0;
    this._correctCount = 0;
    this._state = STATE.PLAYING;
    if (!this._noTimer) {
      this._startTimer();
    }
  }

  /** 現在の問題を返す */
  getCurrentQuestion() {
    if (this._state === STATE.IDLE || this._state === STATE.ROUND_COMPLETE) {
      return null;
    }
    const q = this._questions[this._questionIndex];
    return {
      question: q.question,
      choices: q.choices,
      questionNumber: this._questionIndex + 1,
      totalQuestions: this._questions.length,
    };
  }

  /**
   * 回答送信
   * @param {number} choiceIndex - 選択肢のインデックス
   * @returns 結果オブジェクト
   */
  submitAnswer(choiceIndex) {
    if (this._state !== STATE.PLAYING) return null;

    this._stopTimer();
    this._state = STATE.ANSWERED;

    const question = this._questions[this._questionIndex];
    const correct = choiceIndex === question.correctIndex;

    let pointsEarned = 0;
    let speedBonus = 0;
    let streakMultiplier = 1.0;

    if (correct) {
      this._streak++;
      this._correctCount++;
      if (this._streak > this._bestStreak) {
        this._bestStreak = this._streak;
      }

      // スピードボーナス: 残り秒数に比例
      speedBonus = Math.round(CONFIG.MAX_SPEED_BONUS * this._secondsRemaining / CONFIG.TIME_LIMIT);

      // ストリーク倍率
      streakMultiplier = getStreakMultiplier(this._streak);

      // スコア計算
      pointsEarned = Math.round((CONFIG.BASE_POINTS + speedBonus) * streakMultiplier);
      this._score += pointsEarned;
    } else {
      // 不正解でストリークリセット
      this._streak = 0;
    }

    return {
      correct,
      correctIndex: question.correctIndex,
      explanation: question.explanation || '',
      deepDive: question.deepDive || null,
      pointsEarned,
      streak: this._streak,
      speedBonus,
      streakMultiplier,
    };
  }

  /**
   * 次の問題へ進む
   * 最終問題後はnullを返しroundComplete状態に遷移
   */
  nextQuestion() {
    if (this._state !== STATE.ANSWERED) return null;

    this._questionIndex++;

    // 全問終了チェック
    if (this._questionIndex >= this._questions.length) {
      this._state = STATE.ROUND_COMPLETE;
      this._addPerfectBonus();
      return null;
    }

    // 次の問題へ
    this._state = STATE.PLAYING;
    if (!this._noTimer) {
      this._startTimer();
    }
    return this.getCurrentQuestion();
  }

  // --- 情報取得 ---

  /** ラウンド結果を返す */
  getRoundResult() {
    const total = this._questions.length;
    const accuracy = total > 0 ? Math.round((this._correctCount / total) * 100) : 0;
    const isPerfect = this._correctCount === total && total > 0;

    let stars;
    if (accuracy >= 90) {
      stars = 3;
    } else if (accuracy >= 70) {
      stars = 2;
    } else {
      stars = 1;
    }

    return {
      score: this._score,
      correct: this._correctCount,
      total,
      accuracy,
      bestStreak: this._bestStreak,
      stars,
      isPerfect,
    };
  }

  /** 現在のステートを返す */
  getState() {
    return this._state;
  }

  /** 現在のスコアを返す */
  getScore() {
    return this._score;
  }

  /** 現在のストリークを返す */
  getStreak() {
    return this._streak;
  }

  // --- クリーンアップ ---

  /** タイマークリア・リソース解放 */
  destroy() {
    this._stopTimer();
    this._onTick = null;
    this._onTimeUp = null;
  }

  // --- プライベートメソッド ---

  /** タイマー開始 */
  _startTimer() {
    this._stopTimer();
    this._secondsRemaining = CONFIG.TIME_LIMIT;

    // 初回のtickを即座に通知
    if (this._onTick) {
      this._onTick(this._secondsRemaining);
    }

    this._timerId = setInterval(() => {
      this._secondsRemaining--;

      if (this._onTick) {
        this._onTick(this._secondsRemaining);
      }

      if (this._secondsRemaining <= 0) {
        this._stopTimer();
        // 時間切れ → ストリークリセット、answered状態に遷移
        this._streak = 0;
        this._state = STATE.ANSWERED;
        if (this._onTimeUp) {
          this._onTimeUp();
        }
      }
    }, 1000);
  }

  /** タイマー停止 */
  _stopTimer() {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  /** パーフェクトボーナス加算 */
  _addPerfectBonus() {
    if (this._correctCount === this._questions.length && this._questions.length > 0) {
      this._score += CONFIG.PERFECT_BONUS;
    }
  }
}
