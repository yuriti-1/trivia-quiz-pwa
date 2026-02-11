/**
 * ui.js - 画面レンダリングモジュール
 * 全画面を document.createElement で構築する（innerHTML は使わない）
 */

import { getAllLevelTitles } from './storage.js';

// ヘルパー: 要素を作成してクラスとテキストを設定
function el(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined && textContent !== null) {
    node.textContent = textContent;
  }
  return node;
}

// ヘルパー: 複数の子要素を追加
function append(parent, ...children) {
  for (const child of children) {
    if (child != null) {
      parent.appendChild(child);
    }
  }
  return parent;
}

// ============================================================
// アプリコンテナ取得 / 画面クリア
// ============================================================

export function getApp() {
  return document.getElementById('app');
}

export function clearScreen() {
  const app = getApp();
  app.innerHTML = '';
}

// ============================================================
// スプラッシュ画面
// ============================================================

export function renderSplash(onStart) {
  clearScreen();
  const app = getApp();

  const splash = el('div', 'splash fade-in');

  // パーティクル装飾
  const particles = el('div', 'splash__particles');
  for (let i = 0; i < 8; i++) {
    particles.appendChild(el('div', 'splash__particle'));
  }
  splash.appendChild(particles);

  // コンテンツ
  const content = el('div', 'splash__content');

  const title = el('h1', 'splash__title', '雑学クイズ');
  const subtitle = el('p', 'splash__subtitle', 'あなたの知識を試そう！');

  const startBtn = el('button', 'btn-primary splash__start-btn pulse', 'はじめる');
  startBtn.setAttribute('aria-label', 'ゲームを開始する');
  startBtn.addEventListener('click', () => {
    startBtn.classList.remove('pulse');
    onStart();
  });

  append(content, title, subtitle, startBtn);
  splash.appendChild(content);
  app.appendChild(splash);
}

// ============================================================
// ホーム画面（カテゴリ選択）
// ============================================================

export function renderHome({ categories, storage, onSelectCategory, onDailyChallenge, onShowStats }) {
  clearScreen();
  const app = getApp();

  const home = el('div', 'home slide-in-right');

  // --- ヘッダー ---
  const header = el('div', 'home__header');

  const levelInfo = storage.getLevelInfo();
  const levelBadge = el('div', 'home__level-badge');
  levelBadge.style.cursor = 'pointer';
  levelBadge.setAttribute('role', 'button');
  levelBadge.setAttribute('aria-label', 'レベル一覧を表示');
  const levelNum = el('span', 'home__level-number', 'Lv.' + levelInfo.level);
  const levelTitle = el('span', 'home__level-title', levelInfo.title);
  append(levelBadge, levelNum, levelTitle);
  levelBadge.addEventListener('click', () => {
    _showLevelListModal(levelInfo.level);
  });

  const statsRow = el('div', 'home__stats-row');

  const scoreEl = el('span', 'home__score');
  const scoreLabelText = document.createTextNode('累計 ');
  const scoreValue = el('span', 'home__score-value', storage.getLifetimeScore().toLocaleString('ja-JP'));
  const scoreSuffix = document.createTextNode(' pt');
  append(scoreEl, scoreLabelText, scoreValue, scoreSuffix);

  const streakEl = el('span', 'home__streak');
  const streakIcon = el('span', 'home__streak-icon', '\uD83D\uDD25');
  const streakValue = el('span', 'home__streak-value', String(storage.getPlayStreak()));
  const streakSuffix = document.createTextNode(' 日');
  append(streakEl, streakIcon, streakValue, streakSuffix);

  append(statsRow, scoreEl, streakEl);
  append(header, levelBadge, statsRow);
  home.appendChild(header);

  // --- デイリーチャレンジ ---
  const dailyTitle = el('h2', 'home__section-title', '今日のチャレンジ');
  home.appendChild(dailyTitle);

  const dailyPlayed = storage.hasDailyChallengePlayed();
  const dailyScore = dailyPlayed ? storage.getDailyResult() : null;

  const dailyCard = el('div', 'home__daily-card daily-card card-hover');
  if (dailyPlayed) {
    dailyCard.classList.add('home__daily-card--played');
  }
  dailyCard.setAttribute('role', 'button');
  dailyCard.setAttribute('aria-label', dailyPlayed ? '今日のチャレンジはプレイ済みです' : '今日のチャレンジをプレイする');
  dailyCard.setAttribute('tabindex', '0');

  const dailyEmoji = el('span', 'home__daily-emoji', '\uD83C\uDF1F');
  const dailyInfo = el('div', 'home__daily-info');
  const dailyName = el('div', 'home__daily-name', '今日のチャレンジ');
  const dailyDesc = el('div', 'home__daily-desc', '全カテゴリからランダム出題');
  append(dailyInfo, dailyName, dailyDesc);

  if (dailyPlayed && dailyScore !== null) {
    const scoreDisplay = el('div', 'home__daily-score', dailyScore.toLocaleString('ja-JP') + ' pt');
    dailyInfo.appendChild(scoreDisplay);
  }

  append(dailyCard, dailyEmoji, dailyInfo);

  if (!dailyPlayed) {
    dailyCard.addEventListener('click', () => onDailyChallenge());
    dailyCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDailyChallenge();
      }
    });
  }

  home.appendChild(dailyCard);

  // --- カテゴリ一覧 ---
  const catTitle = el('h2', 'home__section-title', 'カテゴリを選ぶ');
  home.appendChild(catTitle);

  const grid = el('div', 'home__category-grid');

  for (const cat of categories) {
    const catStats = storage.getCategoryStats(cat.id);

    const card = el('div', 'home__category-card card-hover');
    card.style.borderLeftColor = cat.color || 'var(--primary)';
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', cat.name + 'カテゴリをプレイする');
    card.setAttribute('tabindex', '0');

    const emoji = el('span', 'home__category-emoji', cat.emoji);
    const name = el('span', 'home__category-name', cat.name);

    // 星表示
    const starsContainer = el('div', 'home__category-stars');
    const maxStars = 3;
    for (let i = 0; i < maxStars; i++) {
      const star = el('span', i < catStats.stars ? 'home__category-star' : 'home__category-star home__category-star--empty', '\u2B50');
      starsContainer.appendChild(star);
    }

    const plays = el('span', 'home__category-plays',
      catStats.timesPlayed > 0 ? catStats.timesPlayed + '回プレイ' : '未プレイ');

    append(card, emoji, name, starsContainer, plays);

    card.addEventListener('click', () => onSelectCategory(cat.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectCategory(cat.id);
      }
    });

    grid.appendChild(card);
  }

  home.appendChild(grid);

  // --- 統計ボタン ---
  const footer = el('div', 'home__footer');
  const statsBtn = el('button', 'btn-secondary home__stats-btn', '\uD83D\uDCCA 統計を見る');
  statsBtn.setAttribute('aria-label', '統計画面を開く');
  statsBtn.addEventListener('click', () => onShowStats());
  footer.appendChild(statsBtn);
  home.appendChild(footer);

  app.appendChild(home);
}

// ============================================================
// クイズ画面
// ============================================================

export function renderQuiz({ categoryName, categoryEmoji, categoryColor }) {
  clearScreen();
  const app = getApp();

  const quiz = el('div', 'quiz slide-in-right');

  // --- ヘッダー ---
  const header = el('div', 'quiz__header');

  const category = el('div', 'quiz__category');
  const catEmoji = el('span', 'quiz__category-emoji', categoryEmoji);
  const catName = document.createTextNode(categoryName);
  append(category, catEmoji, catName);

  const progress = el('span', 'quiz__progress', '1/10');
  const scoreDisplay = el('span', 'quiz__score', '0 pt');

  append(header, category, progress, scoreDisplay);
  quiz.appendChild(header);

  // --- タイマー ---
  const timerWrapper = el('div', 'quiz__timer-wrapper');
  const timer = el('div', 'quiz__timer');

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'quiz__timer-svg');
  svg.setAttribute('viewBox', '0 0 116 116');

  const circleBg = document.createElementNS(svgNS, 'circle');
  circleBg.setAttribute('class', 'quiz__timer-bg');
  circleBg.setAttribute('cx', '58');
  circleBg.setAttribute('cy', '58');
  circleBg.setAttribute('r', '50');

  const circleProgress = document.createElementNS(svgNS, 'circle');
  circleProgress.setAttribute('class', 'quiz__timer-progress');
  circleProgress.setAttribute('cx', '58');
  circleProgress.setAttribute('cy', '58');
  circleProgress.setAttribute('r', '50');
  const circumference = 2 * Math.PI * 50; // ~314.16
  circleProgress.setAttribute('stroke-dasharray', String(circumference));
  circleProgress.setAttribute('stroke-dashoffset', '0');

  svg.appendChild(circleBg);
  svg.appendChild(circleProgress);

  const timerText = el('span', 'quiz__timer-text', '15');

  append(timer, svg, timerText);
  timerWrapper.appendChild(timer);
  quiz.appendChild(timerWrapper);

  // --- 問題テキスト ---
  const question = el('p', 'quiz__question');
  quiz.appendChild(question);

  // --- ストリーク ---
  const streak = el('div', 'quiz__streak');
  quiz.appendChild(streak);

  // --- 選択肢 ---
  const choices = el('div', 'quiz__choices');
  const labels = ['A', 'B', 'C', 'D'];
  const choiceBtns = [];

  for (let i = 0; i < 4; i++) {
    const btn = el('button', 'quiz__choice-btn');
    btn.setAttribute('aria-label', labels[i] + 'の選択肢');

    const label = el('span', 'quiz__choice-label', labels[i]);
    const text = el('span', 'quiz__choice-text');

    append(btn, label, text);
    choices.appendChild(btn);
    choiceBtns.push(btn);
  }

  quiz.appendChild(choices);

  // --- 解説エリア（初期非表示） ---
  const explanationArea = el('div', 'quiz__explanation slide-up');
  explanationArea.style.display = 'none';

  const explanationLabel = el('div', 'quiz__explanation-label', '解説');
  const explanationText = el('div', 'quiz__explanation-text');
  append(explanationArea, explanationLabel, explanationText);
  quiz.appendChild(explanationArea);

  // --- 深掘りエリア（初期非表示） ---
  const deepDiveArea = el('div', 'quiz__deep-dive slide-up');
  deepDiveArea.style.display = 'none';

  const deepDiveBtn = el('button', 'btn-secondary quiz__deep-dive-btn', 'もっと知る');
  const deepDiveText = el('div', 'quiz__deep-dive-text');
  append(deepDiveArea, deepDiveBtn, deepDiveText);
  quiz.appendChild(deepDiveArea);

  // --- 次の問題ボタン（初期非表示） ---
  const nextBtn = el('button', 'btn-primary quiz__next-btn', '次の問題');
  nextBtn.setAttribute('aria-label', '次の問題に進む');
  nextBtn.style.display = 'none';
  quiz.appendChild(nextBtn);

  app.appendChild(quiz);

  // --- 内部ステート ---
  let answerHandler = null;
  let answersDisabled = false;
  let nextBtnHandler = null;

  // 選択肢のクリックイベント
  choiceBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      if (answersDisabled) return;
      if (answerHandler) {
        answerHandler(index);
      }
    });
  });

  // --- UIコントロールオブジェクト ---
  return {
    updateQuestion(q, choicesList, questionNumber, totalQuestions) {
      // 回答状態リセット
      answersDisabled = false;
      question.textContent = q;
      progress.textContent = questionNumber + '/' + totalQuestions;

      // 選択肢の更新
      choiceBtns.forEach((btn, i) => {
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong', 'shake');
        const textSpan = btn.querySelector('.quiz__choice-text');
        if (i < choicesList.length) {
          textSpan.textContent = choicesList[i];
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
        }
      });

      // 解説・次ボタンを隠す
      explanationArea.style.display = 'none';
      nextBtn.style.display = 'none';

      // 深掘りエリアをリセット
      deepDiveArea.style.display = 'none';
      deepDiveBtn.style.display = '';
      deepDiveText.style.display = 'none';

      // タイマーの点滅・警告をリセット
      timerText.classList.remove('quiz__timer-text--warning', 'timer-blink');
      circleProgress.classList.remove('quiz__timer-progress--warning');
    },

    updateTimer(remaining, total) {
      if (total === undefined) total = 15;
      timerText.textContent = String(remaining);

      const fraction = remaining / total;
      const offset = circumference * (1 - fraction);
      circleProgress.setAttribute('stroke-dashoffset', String(offset));

      // 残り5秒以下で警告
      if (remaining <= 5) {
        circleProgress.classList.add('quiz__timer-progress--warning');
        timerText.classList.add('quiz__timer-text--warning', 'timer-blink');
      } else {
        circleProgress.classList.remove('quiz__timer-progress--warning');
        timerText.classList.remove('quiz__timer-text--warning', 'timer-blink');
      }
    },

    updateScore(score) {
      scoreDisplay.textContent = score.toLocaleString('ja-JP') + ' pt';
    },

    updateStreak(streakNum) {
      if (streakNum >= 2) {
        streak.textContent = '';
        const fire = el('span', 'quiz__streak-value fire-grow', '\uD83D\uDD25 ' + streakNum + ' 連続正解！');
        streak.appendChild(fire);
      } else {
        streak.textContent = '';
      }
    },

    showResult(correct, correctIndex, selectedIndex, explanation, pointsEarned, deepDive) {
      answersDisabled = true;

      // 全ボタン無効化
      choiceBtns.forEach((btn) => {
        btn.disabled = true;
      });

      // 正解ボタンにcorrectクラス
      if (correctIndex >= 0 && correctIndex < choiceBtns.length) {
        choiceBtns[correctIndex].classList.add('correct');
      }

      if (correct) {
        // 正解: confetti演出
        _showConfetti();
        if (pointsEarned > 0) {
          _showPointsFly(pointsEarned, scoreDisplay);
        }
      } else {
        // 不正解: 選択ボタンにwrong + shake
        if (selectedIndex >= 0 && selectedIndex < choiceBtns.length) {
          choiceBtns[selectedIndex].classList.add('wrong', 'shake');
        }
      }

      // 解説表示
      if (explanation) {
        explanationText.textContent = explanation;
        explanationArea.style.display = '';
        // slideUpを再トリガー
        explanationArea.classList.remove('slide-up');
        void explanationArea.offsetWidth; // reflow
        explanationArea.classList.add('slide-up');
      }

      // 深掘り表示
      if (deepDive) {
        deepDiveArea.style.display = '';
        deepDiveText.textContent = deepDive;
        deepDiveText.style.display = 'none';
        deepDiveBtn.addEventListener('click', () => {
          deepDiveText.style.display = '';
          deepDiveBtn.style.display = 'none';
          deepDiveArea.classList.remove('slide-up');
          void deepDiveArea.offsetWidth;
          deepDiveArea.classList.add('slide-up');
        }, { once: true });
      } else {
        deepDiveArea.style.display = 'none';
      }

      // 次ボタン表示
      nextBtn.style.display = '';
    },

    setNextButtonHandler(handler) {
      if (nextBtnHandler) {
        nextBtn.removeEventListener('click', nextBtnHandler);
      }
      nextBtnHandler = () => handler();
      nextBtn.addEventListener('click', nextBtnHandler);
    },

    setAnswerHandler(handler) {
      answerHandler = handler;
    },

    disableAnswers() {
      answersDisabled = true;
      choiceBtns.forEach((btn) => {
        btn.disabled = true;
      });
    },

    hideTimer() {
      timerWrapper.style.display = 'none';
    },
  };
}

// confetti演出 (純CSS)
function _showConfetti() {
  const container = el('div', 'confetti-container');
  for (let i = 0; i < 12; i++) {
    container.appendChild(el('div', 'confetti-piece'));
  }
  document.body.appendChild(container);

  // 3秒後に削除
  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 3000);
}

// ポイントフライアニメーション
function _showPointsFly(points, anchorEl) {
  const flyEl = el('span', 'points-fly', '+' + points);
  flyEl.style.position = 'absolute';
  // anchorElの位置に配置
  const rect = anchorEl.getBoundingClientRect();
  flyEl.style.left = rect.left + 'px';
  flyEl.style.top = (rect.top - 10) + 'px';
  flyEl.style.zIndex = '999';
  document.body.appendChild(flyEl);

  setTimeout(() => {
    if (flyEl.parentNode) {
      flyEl.parentNode.removeChild(flyEl);
    }
  }, 900);
}

// ============================================================
// 結果画面
// ============================================================

export function renderResult({ result, categoryName, categoryEmoji, onRetry, onHome, onShare }) {
  clearScreen();
  const app = getApp();

  const resultDiv = el('div', 'result fade-in');

  // カテゴリ表示
  const categoryEl = el('div', 'result__category');
  const catEmoji = el('span', 'result__category-emoji', categoryEmoji);
  const catText = document.createTextNode(categoryName);
  append(categoryEl, catEmoji, catText);
  resultDiv.appendChild(categoryEl);

  // スコアラベル
  const scoreLabel = el('div', 'result__score-label', 'スコア');
  resultDiv.appendChild(scoreLabel);

  // スコア（カウントアップアニメーション）
  const scoreEl = el('div', 'result__score count-up scale-in');
  const scoreNum = el('span', 'result__score-number', '0');
  const scoreSuffix = el('span', 'result__score-suffix', ' 点');
  append(scoreEl, scoreNum, scoreSuffix);
  resultDiv.appendChild(scoreEl);

  // カウントアップアニメーション
  _animateCountUp(scoreNum, result.score, 1200);

  // 星表示
  const starsContainer = el('div', 'result__stars');
  const maxStars = 3;
  for (let i = 0; i < maxStars; i++) {
    const star = el('span',
      i < result.stars ? 'result__star star-pop' : 'result__star result__star--empty star-pop',
      '\u2B50');
    starsContainer.appendChild(star);
  }
  resultDiv.appendChild(starsContainer);

  // パーフェクト演出
  if (result.isPerfect) {
    const perfectEl = el('div', 'result__perfect perfect-text', 'PERFECT!');
    resultDiv.appendChild(perfectEl);
    // パーフェクト時に豪華confetti
    _showConfetti();
    setTimeout(() => _showConfetti(), 500);
  }

  // 統計情報
  const statsRow = el('div', 'result__stats');

  const statCorrect = _createResultStat(result.correct + '/' + result.total, '正解数');
  const statAccuracy = _createResultStat(result.accuracy + '%', '正解率');
  const statStreak = _createResultStat(String(result.bestStreak), '最大連続');

  append(statsRow, statCorrect, statAccuracy, statStreak);
  resultDiv.appendChild(statsRow);

  // ボタン
  const actions = el('div', 'result__actions');

  const retryBtn = el('button', 'btn-primary', '\uD83D\uDD04 もう一回');
  retryBtn.setAttribute('aria-label', 'もう一回プレイする');
  retryBtn.addEventListener('click', () => onRetry());

  const homeBtn = el('button', 'btn-secondary', '\uD83C\uDFE0 カテゴリに戻る');
  homeBtn.setAttribute('aria-label', 'カテゴリ選択に戻る');
  homeBtn.addEventListener('click', () => onHome());

  const shareBtn = el('button', 'btn-secondary', '\uD83D\uDCE4 結果をシェア');
  shareBtn.setAttribute('aria-label', '結果をシェアする');
  shareBtn.addEventListener('click', () => onShare());

  append(actions, retryBtn, homeBtn, shareBtn);
  resultDiv.appendChild(actions);

  app.appendChild(resultDiv);
}

// 結果画面の統計項目ヘルパー
function _createResultStat(value, label) {
  const stat = el('div', 'result__stat');
  const valEl = el('div', 'result__stat-value', value);
  const labelEl = el('div', 'result__stat-label', label);
  append(stat, valEl, labelEl);
  return stat;
}

// カウントアップアニメーション
function _animateCountUp(element, target, duration) {
  const start = performance.now();
  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    element.textContent = current.toLocaleString('ja-JP');
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

// ============================================================
// 統計画面
// ============================================================

export function renderStats({ stats, onBack }) {
  clearScreen();
  const app = getApp();

  const statsDiv = el('div', 'stats slide-in-right');

  // --- ヘッダー ---
  const header = el('div', 'stats__header');
  const backBtn = el('button', 'stats__back-btn', '\u2190');
  backBtn.setAttribute('aria-label', '前の画面に戻る');
  backBtn.addEventListener('click', () => onBack());
  const title = el('h1', 'stats__title', '統計');
  append(header, backBtn, title);
  statsDiv.appendChild(header);

  // --- レベルカード ---
  const levelCard = el('div', 'stats__level-card');
  const levelNum = el('div', 'stats__level-number', 'Lv.' + stats.level);
  const levelTitle = el('div', 'stats__level-title', stats.levelInfo.title);
  append(levelCard, levelNum, levelTitle);
  statsDiv.appendChild(levelCard);

  // --- 概要グリッド ---
  const overview = el('div', 'stats__overview');

  const items = [
    { value: stats.lifetimeScore.toLocaleString('ja-JP'), label: '累計スコア' },
    { value: String(stats.totalQuestionsAnswered), label: '総回答数' },
    { value: stats.overallAccuracy + '%', label: '全体正解率' },
    { value: String(stats.playStreak) + '日', label: '連続プレイ' },
  ];

  for (const item of items) {
    const card = el('div', 'stats__overview-item');
    const val = el('div', 'stats__overview-value', item.value);
    const label = el('div', 'stats__overview-label', item.label);
    append(card, val, label);
    overview.appendChild(card);
  }

  statsDiv.appendChild(overview);

  // --- カテゴリ別正解率バー ---
  const catSectionTitle = el('h2', 'stats__category-section-title', 'カテゴリ別正解率');
  statsDiv.appendChild(catSectionTitle);

  const catList = el('div', 'stats__category-list');

  const categoryStats = stats.categoryStats;
  const categoryIds = Object.keys(categoryStats);

  if (categoryIds.length === 0) {
    const emptyMsg = el('div', 'stats__category-item');
    emptyMsg.appendChild(el('div', 'stats__category-name', 'まだプレイしていません'));
    catList.appendChild(emptyMsg);
  } else {
    for (const catId of categoryIds) {
      const cs = categoryStats[catId];
      const item = el('div', 'stats__category-item');

      const headerRow = el('div', 'stats__category-header');
      const name = el('span', 'stats__category-name', catId);
      const accuracyText = el('span', 'stats__category-accuracy-text', cs.accuracy + '%');
      append(headerRow, name, accuracyText);

      const barBg = el('div', 'stats__category-bar-bg');
      const barFill = el('div', 'stats__category-bar-fill');
      barFill.style.width = '0%';
      barBg.appendChild(barFill);

      append(item, headerRow, barBg);
      catList.appendChild(item);

      // アニメーションで幅を更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          barFill.style.width = cs.accuracy + '%';
        });
      });
    }
  }

  statsDiv.appendChild(catList);

  // --- 戻るボタン ---
  const footer = el('div', 'stats__footer');
  const backBottomBtn = el('button', 'btn-secondary stats__back-bottom-btn', '\u2190 戻る');
  backBottomBtn.setAttribute('aria-label', '前の画面に戻る');
  backBottomBtn.addEventListener('click', () => onBack());
  footer.appendChild(backBottomBtn);
  statsDiv.appendChild(footer);

  app.appendChild(statsDiv);
}

// ============================================================
// 復習モードホーム画面
// ============================================================

export function renderReviewHome({ weaknesses, hasHistory, onStartReview, onBack }) {
  clearScreen();
  const app = getApp();
  const page = el('div', 'review-home slide-in-right');

  // Header
  const header = el('div', 'stats__header');
  const backBtn = el('button', 'stats__back-btn', '\u2190');
  backBtn.addEventListener('click', () => onBack());
  const title = el('h1', 'stats__title', '復習モード');
  append(header, backBtn, title);
  page.appendChild(header);

  // Description
  const desc = el('p', 'review-home__desc', '間違えた問題や苦手な問題を重点的に復習できます。タイマーなしでじっくり学べます。');
  page.appendChild(desc);

  if (!hasHistory) {
    const emptyMsg = el('div', 'review-home__empty');
    emptyMsg.appendChild(el('div', 'review-home__empty-icon', '\uD83D\uDCDA'));
    emptyMsg.appendChild(el('p', 'review-home__empty-text', 'まずはカテゴリからクイズをプレイして、復習データを蓄積しましょう！'));
    page.appendChild(emptyMsg);
  } else {
    // Start review button
    const startBtn = el('button', 'btn-primary review-home__start-btn', '復習をはじめる');
    startBtn.addEventListener('click', () => onStartReview());
    page.appendChild(startBtn);

    // Weakness analysis
    if (weaknesses && weaknesses.length > 0) {
      const weakTitle = el('h2', 'home__section-title', '弱点分析');
      weakTitle.style.marginTop = '28px';
      page.appendChild(weakTitle);

      const weakList = el('div', 'review-home__weak-list');
      for (const w of weaknesses) {
        if (w.totalAnswered === 0) continue;
        const item = el('div', 'review-home__weak-item');

        const itemHeader = el('div', 'review-home__weak-header');
        const nameEl = el('span', 'review-home__weak-name', w.emoji + ' ' + w.name);
        const accEl = el('span', 'review-home__weak-accuracy', w.accuracy + '%');
        if (w.accuracy < 50) accEl.classList.add('review-home__weak-accuracy--low');
        append(itemHeader, nameEl, accEl);

        const barBg = el('div', 'stats__category-bar-bg');
        const barFill = el('div', 'stats__category-bar-fill');
        barFill.style.width = '0%';
        barBg.appendChild(barFill);

        const info = el('div', 'review-home__weak-info');
        info.textContent = w.weakCount > 0 ? '苦手な問題: ' + w.weakCount + '問' : '回答数: ' + w.totalAnswered;

        append(item, itemHeader, barBg, info);
        weakList.appendChild(item);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            barFill.style.width = w.accuracy + '%';
          });
        });
      }
      page.appendChild(weakList);
    }
  }

  app.appendChild(page);
}

// ============================================================
// ランキング画面
// ============================================================

export function renderRanking({ globalRanking, categoryRankings, categories, myRank, onBack, onSelectCategory }) {
  clearScreen();
  const app = getApp();
  const page = el('div', 'ranking slide-in-right');

  // Header
  const header = el('div', 'stats__header');
  const backBtn = el('button', 'stats__back-btn', '\u2190');
  backBtn.addEventListener('click', () => onBack());
  const title = el('h1', 'stats__title', 'ランキング');
  append(header, backBtn, title);
  page.appendChild(header);

  // My rank
  if (myRank) {
    const myRankCard = el('div', 'ranking__my-rank');
    const myRankLabel = el('div', 'ranking__my-rank-label', 'あなたの順位');
    const myRankValue = el('div', 'ranking__my-rank-value', myRank.rank + '位');
    const myRankTotal = el('div', 'ranking__my-rank-total', '/ ' + myRank.total + '人中');
    append(myRankCard, myRankLabel, myRankValue, myRankTotal);
    page.appendChild(myRankCard);
  }

  // Tab: global / category
  const tabs = el('div', 'ranking__tabs');
  const tabGlobal = el('button', 'ranking__tab ranking__tab--active', '総合');
  const tabCategory = el('button', 'ranking__tab', 'カテゴリ別');
  append(tabs, tabGlobal, tabCategory);
  page.appendChild(tabs);

  // Content areas
  const globalContent = el('div', 'ranking__content');
  const categoryContent = el('div', 'ranking__content');
  categoryContent.style.display = 'none';

  // Global ranking list
  if (globalRanking.length === 0) {
    globalContent.appendChild(el('div', 'ranking__empty', 'ランキングデータがありません'));
  } else {
    const list = _createRankingList(globalRanking, 'lifetimeScore', 'pt');
    globalContent.appendChild(list);
  }

  // Category selector + ranking
  if (categories && categories.length > 0) {
    const catSelector = el('div', 'ranking__cat-selector');
    for (const cat of categories) {
      const catBtn = el('button', 'ranking__cat-btn', cat.emoji + ' ' + cat.name);
      catBtn.addEventListener('click', () => {
        if (onSelectCategory) onSelectCategory(cat.id);
      });
      catSelector.appendChild(catBtn);
    }
    categoryContent.appendChild(catSelector);
  }
  categoryContent.appendChild(el('div', 'ranking__cat-list'));

  page.appendChild(globalContent);
  page.appendChild(categoryContent);

  // Tab switching
  tabGlobal.addEventListener('click', () => {
    tabGlobal.classList.add('ranking__tab--active');
    tabCategory.classList.remove('ranking__tab--active');
    globalContent.style.display = '';
    categoryContent.style.display = 'none';
  });
  tabCategory.addEventListener('click', () => {
    tabCategory.classList.add('ranking__tab--active');
    tabGlobal.classList.remove('ranking__tab--active');
    categoryContent.style.display = '';
    globalContent.style.display = 'none';
  });

  app.appendChild(page);

  return {
    updateCategoryRanking(rankings) {
      const listContainer = page.querySelector('.ranking__cat-list');
      listContainer.innerHTML = '';
      if (rankings.length === 0) {
        listContainer.appendChild(el('div', 'ranking__empty', 'データがありません'));
      } else {
        listContainer.appendChild(_createRankingList(rankings, 'score', 'pt'));
      }
    }
  };
}

function _createRankingList(entries, scoreField, unit) {
  const list = el('div', 'ranking__list');
  for (const entry of entries) {
    const row = el('div', 'ranking__row');

    const rankEl = el('span', 'ranking__rank');
    if (entry.rank <= 3) {
      const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
      rankEl.textContent = medals[entry.rank - 1];
    } else {
      rankEl.textContent = entry.rank;
    }

    const nameEl = el('span', 'ranking__name', entry.displayName || '匿名');
    const scoreEl = el('span', 'ranking__score-val', (entry[scoreField] || 0).toLocaleString('ja-JP') + ' ' + unit);

    append(row, rankEl, nameEl, scoreEl);
    list.appendChild(row);
  }
  return list;
}

// ============================================================
// 設定画面
// ============================================================

export function renderSettings({ storage, isPremium, onBack, onPurchasePremium, onSetNickname, onResetData }) {
  clearScreen();
  const app = getApp();
  const page = el('div', 'settings slide-in-right');

  // Header
  const header = el('div', 'stats__header');
  const backBtn = el('button', 'stats__back-btn', '\u2190');
  backBtn.addEventListener('click', () => onBack());
  const title = el('h1', 'stats__title', '設定');
  append(header, backBtn, title);
  page.appendChild(header);

  // Nickname section
  const nickSection = el('div', 'settings__section');
  const nickTitle = el('h2', 'settings__section-title', 'ニックネーム');
  const nickDesc = el('p', 'settings__section-desc', 'ランキングに表示される名前です');

  const nickRow = el('div', 'settings__nick-row');
  const nickInput = document.createElement('input');
  nickInput.type = 'text';
  nickInput.className = 'settings__nick-input';
  nickInput.placeholder = 'ニックネームを入力';
  nickInput.maxLength = 12;
  nickInput.value = storage.getNickname() || '';

  const nickSaveBtn = el('button', 'btn-primary settings__nick-save', '保存');
  nickSaveBtn.addEventListener('click', () => {
    const name = nickInput.value.trim();
    if (name) {
      onSetNickname(name);
      nickSaveBtn.textContent = '保存しました';
      setTimeout(() => { nickSaveBtn.textContent = '保存'; }, 1500);
    }
  });

  append(nickRow, nickInput, nickSaveBtn);
  append(nickSection, nickTitle, nickDesc, nickRow);
  page.appendChild(nickSection);

  // Premium section
  const premSection = el('div', 'settings__section');
  const premTitle = el('h2', 'settings__section-title', 'プレミアムプラン');
  premSection.appendChild(premTitle);

  if (isPremium) {
    const premStatus = el('div', 'settings__premium-active');
    premStatus.appendChild(el('span', 'settings__premium-badge', 'PREMIUM'));
    premStatus.appendChild(el('span', null, ' 有効'));
    premSection.appendChild(premStatus);
  } else {
    const premDesc = el('p', 'settings__section-desc', '広告を非表示にして、クイズに集中できます。');
    const premPrice = el('div', 'settings__premium-price', '\u00A5480');
    const premBtn = el('button', 'btn-primary settings__premium-btn', 'プレミアムに登録');
    premBtn.addEventListener('click', () => onPurchasePremium());
    append(premSection, premDesc, premPrice, premBtn);
  }
  page.appendChild(premSection);

  // Danger zone
  const dangerSection = el('div', 'settings__section settings__section--danger');
  const dangerTitle = el('h2', 'settings__section-title', 'データ管理');
  const resetBtn = el('button', 'btn-secondary settings__reset-btn', 'データをリセット');
  resetBtn.style.color = 'var(--danger)';
  resetBtn.style.borderColor = 'var(--danger)';
  resetBtn.addEventListener('click', () => {
    if (confirm('全てのデータが削除されます。よろしいですか？')) {
      onResetData();
    }
  });
  append(dangerSection, dangerTitle, resetBtn);
  page.appendChild(dangerSection);

  app.appendChild(page);
}

// ============================================================
// 広告バナープレースホルダー
// ============================================================

export function createAdPlaceholder() {
  const container = el('div', 'ad-banner-wrapper');
  return container;
}

// ============================================================
// ニックネーム設定モーダル
// ============================================================

export function renderNicknamePrompt(onSubmit) {
  const overlay = el('div', 'nickname-overlay fade-in');
  const modal = el('div', 'nickname-modal scale-in');

  const title = el('h2', 'nickname-modal__title', 'ニックネームを設定');
  const desc = el('p', 'nickname-modal__desc', 'ランキングに表示される名前を決めましょう');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nickname-modal__input';
  input.placeholder = '名前を入力（12文字まで）';
  input.maxLength = 12;

  const submitBtn = el('button', 'btn-primary nickname-modal__submit', '決定');
  const skipBtn = el('button', 'btn-secondary nickname-modal__skip', 'スキップ');

  submitBtn.addEventListener('click', () => {
    const name = input.value.trim();
    onSubmit(name || null);
    overlay.remove();
  });

  skipBtn.addEventListener('click', () => {
    onSubmit(null);
    overlay.remove();
  });

  append(modal, title, desc, input, submitBtn, skipBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ============================================================
// レベル一覧モーダル
// ============================================================

function _showLevelListModal(currentLevel) {
  const allTitles = getAllLevelTitles();

  const overlay = el('div', 'nickname-overlay fade-in');
  const modal = el('div', 'level-modal scale-in');

  const title = el('h2', 'level-modal__title', 'レベル & 肩書き一覧');
  modal.appendChild(title);

  const list = el('div', 'level-modal__list');

  for (const entry of allTitles) {
    const row = el('div', 'level-modal__row');
    const isUnlocked = currentLevel >= entry.level;
    const isCurrent = false;

    // Check if this is the current title
    const nextEntry = allTitles[allTitles.indexOf(entry) + 1];
    const isCurrentTitle = currentLevel >= entry.level && (!nextEntry || currentLevel < nextEntry.level);

    if (isCurrentTitle) {
      row.classList.add('level-modal__row--current');
    } else if (!isUnlocked) {
      row.classList.add('level-modal__row--locked');
    }

    const lockEl = el('span', 'level-modal__lock', isUnlocked ? '' : '🔒');
    const infoEl = el('div', 'level-modal__info');
    const titleEl = el('div', 'level-modal__row-title', isUnlocked ? entry.title : '???');
    const levelEl = el('div', 'level-modal__row-level', 'Lv.' + entry.level + ' ~');

    append(infoEl, titleEl, levelEl);

    if (isCurrentTitle) {
      const badge = el('span', 'level-modal__current-badge', 'NOW');
      append(row, lockEl, infoEl, badge);
    } else {
      append(row, lockEl, infoEl);
    }

    list.appendChild(row);
  }

  modal.appendChild(list);

  const closeBtn = el('button', 'btn-primary level-modal__close', '閉じる');
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
