// === Telegram viewport adapter: пишет размеры и инсет в CSS переменные ===
(function () {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg) return;
  
    // Просим максимум высоты
    try { tg.expand?.(); tg.requestFullscreen?.(); } catch (e) {}
  
    const r = document.documentElement.style;
  
    function setVars() {
      // базовые размеры
      if (typeof tg.viewportWidth === 'number')  r.setProperty('--tg-vw', tg.viewportWidth + 'px');
      if (typeof tg.viewportHeight === 'number') r.setProperty('--tg-vh', tg.viewportHeight + 'px');
  
      // обычный safe area
      const sa = tg.safeAreaInset || {};
      if ('top' in sa)    r.setProperty('--tg-safe-top',    (sa.top ?? 0) + 'px');
      if ('right' in sa)  r.setProperty('--tg-safe-right',  (sa.right ?? 0) + 'px');
      if ('bottom' in sa) r.setProperty('--tg-safe-bottom', (sa.bottom ?? 0) + 'px');
      if ('left' in sa)   r.setProperty('--tg-safe-left',   (sa.left ?? 0) + 'px');
  
      // CONTENT safe area — учитывает панели Telegram и жестовую зону (это главное)
      const cs = tg.contentSafeAreaInset || {};
      if ('top' in cs)    r.setProperty('--tg-csafe-top',    (cs.top ?? 0) + 'px');
      if ('right' in cs)  r.setProperty('--tg-csafe-right',  (cs.right ?? 0) + 'px');
      if ('bottom' in cs) r.setProperty('--tg-csafe-bottom', (cs.bottom ?? 0) + 'px');
      if ('left' in cs)   r.setProperty('--tg-csafe-left',   (cs.left ?? 0) + 'px');
    }
  
    setVars();
  
    tg.onEvent?.('viewport_changed', setVars);
    tg.onEvent?.('content_safe_area_changed', setVars);
    tg.onEvent?.('viewport_state_changed', setVars);
  })();
  
  // Инициализация Telegram Web App
let tg;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.onEvent?.('theme_changed', () => {
        if (userSettings.theme === 'auto') {
            applyTheme('auto');
        }
    });
    // Полностью отключаем тактильную отдачу SDK (версии ниже 6.1 спамят предупреждения)
    if (tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function') {
        try { tg.HapticFeedback.impactOccurred = function noop() {}; } catch (e) {}
    }
}

// Система онбординга для новых пользователей
const onboarding = {
    steps: [
        {
            target: '.stock-pile',
            title: 'Колода карт',
            content: 'Нажмите на колоду, чтобы взять карту',
            position: 'bottom'
        },
        {
            target: '.waste-pile',
            title: 'Открытые карты',
            content: 'Здесь отображаются открытые карты из колоды',
            position: 'bottom'
        },
        {
            target: '.foundation-area',
            title: 'Фундамент',
            content: 'Перетащите карты сюда, начиная с тузов и заканчивая королями',
            position: 'bottom'
        },
        {
            target: '.tableau-area',
            title: 'Игровое поле',
            content: 'Перетаскивайте карты, чтобы создать последовательности в порядке убывания с чередованием цветов',
            position: 'top'
        },
        {
            target: '.btn-hint',
            title: 'Подсказки',
            content: 'Нажмите, чтобы получить подсказку о возможном ходе',
            position: 'left'
        }
    ],
    currentStep: 0,
    isActive: false,
    
    // Проверка, нужно ли показывать онбординг
    shouldShow() {
        return !localStorage.getItem('onboardingCompleted');
    },
    
    // Запуск онбординга
    start() {
        if (!this.shouldShow()) return;
        
        // Проверяем, загружена ли игра полностью
        if (!document.querySelector('.stock-pile')) {
            setTimeout(() => this.start(), 1000);
            return;
        }
        
        this.isActive = true;
        this.currentStep = 0;
        this.showStep();
        
        // Создаем оверлей для онбординга
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        document.body.appendChild(overlay);
    },
    
    // Показ текущего шага
    showStep() {
        if (!this.isActive || this.currentStep >= this.steps.length) {
            this.complete();
            return;
        }
        
        const step = this.steps[this.currentStep];
        const target = document.querySelector(step.target);
        
        if (!target) {
            this.nextStep();
            return;
        }
        
        // Создаем подсказку
        const tooltip = document.createElement('div');
        tooltip.className = 'onboarding-tooltip ' + step.position;
        tooltip.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.content}</p>
            <div class="onboarding-buttons">
                <button class="onboarding-next">Далее</button>
                <button class="onboarding-skip">Пропустить</button>
            </div>
        `;
        
        // Позиционируем подсказку
        const targetRect = target.getBoundingClientRect();
        document.body.appendChild(tooltip);
        
        // Подсвечиваем целевой элемент
        target.classList.add('onboarding-highlight');
        
        // Обработчики кнопок
        tooltip.querySelector('.onboarding-next').addEventListener('click', () => {
            target.classList.remove('onboarding-highlight');
            tooltip.remove();
            this.nextStep();
        });
        
        tooltip.querySelector('.onboarding-skip').addEventListener('click', () => {
            this.complete();
        });
    },
    
    // Переход к следующему шагу
    nextStep() {
        this.currentStep++;
        this.showStep();
    },
    
    // Завершение онбординга
    complete() {
        this.isActive = false;
        
        // Удаляем все элементы онбординга
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });
        
        document.querySelectorAll('.onboarding-tooltip').forEach(el => {
            el.remove();
        });
        
        const overlay = document.querySelector('.onboarding-overlay');
        if (overlay) overlay.remove();
        
        // Запоминаем, что онбординг пройден
        localStorage.setItem('onboardingCompleted', 'true');
        
        // Обновляем прогресс-бар
        updateProgressBar(10);
    }
};
  
  // Константы игры
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_SYMBOLS = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
  };

  const DEFAULT_SETTINGS = {
      theme: 'auto',
      deck: 'classic',
      animations: true,
      haptics: true
  };

  const DEFAULT_STATS = {
      totalWins: 0,
      bestTime: null,
      bestMoves: null,
      winStreak: 0,
      longestStreak: 0,
      lastWinTime: null,
      lastWinMoves: null
  };

  const ACHIEVEMENTS = [
      {
          id: 'first_win',
          title: 'Первая победа',
          description: 'Завершите первую игру',
          check: (stats) => stats.totalWins >= 1
      },
      {
          id: 'speed_runner',
          title: 'Скоростной сборщик',
          description: 'Победа быстрее 2 минут',
          check: (stats) => typeof stats.lastWinTime === 'number' && stats.lastWinTime <= 120
      },
      {
          id: 'smart_moves',
          title: 'Стратег',
          description: 'Победа менее чем за 120 ходов',
          check: (stats) => typeof stats.lastWinMoves === 'number' && stats.lastWinMoves <= 120
      },
      {
          id: 'streak_master',
          title: 'Серия из трёх',
          description: 'Выиграйте три игры подряд',
          check: (stats) => stats.winStreak >= 3
      }
  ];

  let userSettings = loadUserSettings();
  let localStats = loadLocalStats();
  let unlockedAchievements = loadUnlockedAchievements();
  let modalSettings = null;
  const prefersDarkMedia = window.matchMedia && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
  if (prefersDarkMedia && typeof prefersDarkMedia.addEventListener === 'function') {
      prefersDarkMedia.addEventListener('change', () => {
          if (userSettings.theme === 'auto') {
              applyTheme('auto');
          }
      });
  }

  // Ensure a styled exit confirmation UI exists and is wired
  function ensureExitUI() {
      const existingCloseBtn = document.getElementById('close-app-btn');
      if (!existingCloseBtn) {
          const controls = document.querySelector('.game-controls');
          if (controls) {
              const btn = document.createElement('button');
              btn.id = 'close-app-btn';
              btn.className = 'btn btn-secondary';
              btn.textContent = 'Закрыть';
              controls.appendChild(btn);
          }
      }

      if (!document.getElementById('confirm-exit-modal')) {
          const container = document.querySelector('.game-container') || document.body;
          const wrapper = document.createElement('div');
          wrapper.id = 'confirm-exit-modal';
          wrapper.className = 'modal hidden';
          wrapper.innerHTML = `
              <div class=\"modal-content\">\n\
                  <h2>Выйти из игры?</h2>\n\
                  <p>Текущий прогресс может быть не сохранён. Вы уверены, что хотите закрыть игру?</p>\n\
                  <div class=\"modal-footer\" style=\"display:flex; gap: 12px; justify-content: flex-end; margin-top: 16px;\">\n\
                      <button id=\\\"cancel-exit-btn\\\" class=\\\"btn btn-secondary\\\">Отмена</button>\n\
                      <button id=\\\"confirm-exit-btn\\\" class=\\\"btn btn-primary\\\">Выйти</button>\n\
                  </div>\n\
              </div>`;
          container.appendChild(wrapper);
      }

      const closeBtn = document.getElementById('close-app-btn');
      const modal = document.getElementById('confirm-exit-modal');
      const cancelBtn = document.getElementById('cancel-exit-btn');
      const confirmBtn = document.getElementById('confirm-exit-btn');

      if (closeBtn && modal) {
          closeBtn.addEventListener('click', () => {
              modal.classList.remove('hidden');
          });
      }
      if (cancelBtn && modal) {
          cancelBtn.addEventListener('click', () => {
              modal.classList.add('hidden');
          });
      }
      if (confirmBtn) {
          confirmBtn.addEventListener('click', () => {
              try {
                  if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.close === 'function') {
                      window.Telegram.WebApp.close();
                      return;
                  }
              } catch (e) {}
              window.close();
              setTimeout(() => { try { location.href = 'about:blank'; } catch (_) {} }, 50);
          });
      }

      try {
          if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.enableClosingConfirmation === 'function') {
              window.Telegram.WebApp.enableClosingConfirmation(true);
          }
      } catch (e) {}

      window.addEventListener('beforeunload', (e) => {
          const inProgress = !!(gameState && (gameState.gameStarted || (gameState.moves && gameState.moves > 0)));
          if (inProgress) {
              e.preventDefault();
              e.returnValue = '';
              return '';
          }
      });
  }
  
  // Состояние игры
  class GameState {
      constructor() {
          this.deck = [];
          this.tableau = [[], [], [], [], [], [], []];
          this.foundation = [[], [], [], []];
          this.stock = [];
          this.waste = [];
          this.moves = 0;
          this.timer = 0;
          this.timerInterval = null;
          this.gameStarted = false;
          this.moveHistory = [];
          this.draggedCards = [];
          this.dragSource = null;
      }
  }
  
  let gameState = new GameState();
  
  // DOM элементы
  const elements = {
      timer: document.getElementById('timer'),
      moves: document.getElementById('moves'),
      newGameBtn: document.getElementById('new-game-btn'),
      undoBtn: document.getElementById('undo-btn'),
      hintBtn: document.getElementById('hint-btn'),
      statsBtn: document.getElementById('stats-btn'),
      stock: document.getElementById('stock'),
      waste: document.getElementById('waste'),
      winModal: document.getElementById('win-modal'),
      shareResultBtn: document.getElementById('share-result-btn'),
      playAgainBtn: document.getElementById('play-again-btn'),
      winTime: document.getElementById('win-time'),
      winMoves: document.getElementById('win-moves'),
      themeToggleBtn: document.getElementById('theme-toggle-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      settingsModal: document.getElementById('settings-modal'),
      closeSettingsBtn: document.getElementById('close-settings-btn'),
      saveSettingsBtn: document.getElementById('save-settings-btn'),
      themeOptionButtons: Array.from(document.querySelectorAll('.theme-option')),
      deckOptionButtons: Array.from(document.querySelectorAll('.deck-option')),
      toggleAnimations: document.getElementById('toggle-animations'),
      toggleHaptics: document.getElementById('toggle-haptics'),
      // Новые элементы для псевдонимов и статистики
      nicknameModal: document.getElementById('nickname-modal'),
      nicknameInput: document.getElementById('nickname-input'),
      saveNicknameBtn: document.getElementById('save-nickname-btn'),
      statsModal: document.getElementById('stats-modal'),
      leaderboardList: document.getElementById('leaderboard-list'),
      userNickname: document.getElementById('user-nickname'),
      closeStatsBtn: document.getElementById('close-stats-btn'),
      achievementsList: document.getElementById('achievements-list')
  };
  
  // Инициализация игры
  function initGame() {
      createDeck();
      shuffleDeck();
      dealCards();
      updateDisplay();
      setupEventListeners();
      // Ensure exit UI and confirmation are available
      ensureExitUI();
      applyTheme(userSettings.theme);
      applyDeckTheme(userSettings.deck);
      applyEffectsSettings();
      syncSettingsControls();
      renderAchievements();
      updateProgressBar();
      // Проверяем, есть ли у пользователя псевдоним
      checkUserNickname();
      // Таймер не запускается автоматически - нужно сделать первый ход
      // startTimer();
      // Проверка отсутствия ходов на старте (на случай тупика после раздачи)
      notifyNoMovesIfNeeded();
      
      // Запуск онбординга для новых пользователей
      if (!localStorage.getItem('onboardingCompleted')) {
          setTimeout(() => {
              if (onboarding && typeof onboarding.start === 'function') {
                  onboarding.start();
              }
          }, 1000);
      }
  }
  
  // Проверка псевдонима пользователя
  function checkUserNickname() {
      const nickname = localStorage.getItem('userNickname');
      if (!nickname) {
          showNicknameModal();
      } else {
          updateUserNicknameDisplay(nickname);
      }
  }
  
  // Показать модальное окно для ввода псевдонима
  function showNicknameModal() {
      elements.nicknameModal.classList.remove('hidden');
      elements.nicknameInput.focus();
  }
  
  // Скрыть модальное окно псевдонима
  function hideNicknameModal() {
      elements.nicknameModal.classList.add('hidden');
  }
  
  // Сохранить псевдоним
  async function saveNickname() {
      // Проверяем, что поле ввода существует
      if (!elements.nicknameInput) {
          console.error('Поле ввода псевдонима не найдено');
          return;
      }
      
      const nickname = elements.nicknameInput.value.trim();
      
      // Улучшенная валидация
      if (!nickname) {
          showErrorMessage('Введите псевдоним');
          elements.nicknameInput.focus();
          return;
      }
      
      if (nickname.length < 2) {
          showErrorMessage('Псевдоним должен содержать минимум 2 символа');
          elements.nicknameInput.focus();
          return;
      }
      
      if (nickname.length > 20) {
          showErrorMessage('Псевдоним не должен превышать 20 символов');
          elements.nicknameInput.focus();
          return;
      }
      
      // Проверяем на допустимые символы
      const validPattern = /^[a-zA-Zа-яА-Я0-9\s\-_]+$/;
      if (!validPattern.test(nickname)) {
          showErrorMessage('Псевдоним может содержать только буквы, цифры, пробелы, дефисы и подчеркивания');
          elements.nicknameInput.focus();
          return;
      }
      
      try {
          // Отправляем псевдоним на сервер для регистрации
          const result = await registerUser(nickname);
          
          if (result.success) {
              localStorage.setItem('userNickname', nickname);
              updateUserNicknameDisplay(nickname);
              hideNicknameModal();
              showSuccessMessage('Псевдоним успешно сохранен!');
          } else if (result.error === 'nickname_taken') {
              // Показываем ошибку занятого псевдонима
              showErrorMessage(result.message || 'Этот псевдоним уже занят другим игроком');
              // Очищаем поле ввода
              elements.nicknameInput.value = '';
              elements.nicknameInput.focus();
          } else {
              // Другие ошибки
              showErrorMessage('Не удалось сохранить псевдоним. Проверьте подключение к интернету и попробуйте еще раз.');
          }
      } catch (error) {
          console.error('Ошибка при сохранении псевдонима:', error);
          showErrorMessage('Произошла ошибка при сохранении. Попробуйте еще раз.');
      }
  }
  
  // Показать сообщение об ошибке
  function showErrorMessage(message) {
      if (tg && typeof tg.showPopup === 'function') {
          try {
              tg.showPopup({
                  title: 'Ошибка',
                  message: message,
                  buttons: [{ type: 'ok', text: 'Ок' }]
              });
          } catch (e) {
              alert(message);
          }
      } else {
          alert(message);
      }
  }
  
  // Показать сообщение об успехе
  function showSuccessMessage(message) {
      if (tg && typeof tg.showPopup === 'function') {
          try {
              tg.showPopup({
                  title: 'Успешно',
                  message: message,
                  buttons: [{ type: 'ok', text: 'Ок' }]
              });
          } catch (e) {
              alert(message);
          }
      } else {
          alert(message);
      }
  }
  
  // Обновить отображение псевдонима пользователя
  function updateUserNicknameDisplay(nickname) {
      if (elements.userNickname) {
          elements.userNickname.textContent = nickname;
      }
  }
  
  // Регистрация пользователя на сервере
  async function registerUser(nickname) {
      try {
          const tgUser = tg?.initDataUnsafe?.user;
          const userId = tgUser?.id;
          const username = tgUser?.username;
          
          if (!userId) {
              console.error('Не удалось получить ID пользователя Telegram');
              return { success: false, error: 'no_user_id', message: 'Не удалось получить данные пользователя Telegram' };
          }
          
          console.log('Отправка запроса на регистрацию:', { userId, username, nickname });
          
          const response = await fetch(getApiBase() + '/register', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  userId: userId,
                  username: username,
                  nickname: nickname
              })
          });
          
          console.log('Получен ответ от сервера:', response.status, response.statusText);
          
          let data;
          try {
              data = await response.json();
          } catch (parseError) {
              console.error('Ошибка при парсинге ответа сервера:', parseError);
              return { success: false, error: 'parse_error', message: 'Ошибка при обработке ответа сервера' };
          }
          
          if (response.ok) {
              console.log('Пользователь успешно зарегистрирован');
              return { success: true };
          } else if (response.status === 409 && data.error === 'nickname_taken') {
              console.log('Псевдоним занят:', data.message);
              return { success: false, error: 'nickname_taken', message: data.message };
          } else if (response.status === 400) {
              console.log('Ошибка валидации:', data.message);
              return { success: false, error: 'validation_error', message: data.message || 'Некорректные данные' };
          } else if (response.status >= 500) {
              console.log('Ошибка сервера:', response.status);
              return { success: false, error: 'server_error', message: 'Ошибка сервера. Попробуйте позже.' };
          } else {
              console.log('Неизвестная ошибка при регистрации:', response.status, data);
              return { success: false, error: 'unknown_error', message: 'Неизвестная ошибка при регистрации' };
          }
      } catch (error) {
          console.error('Ошибка сети при регистрации:', error);
          if (error.name === 'TypeError' && error.message.includes('fetch')) {
              return { success: false, error: 'network_error', message: 'Ошибка подключения к серверу. Проверьте интернет-соединение.' };
          }
          return { success: false, error: 'network_error', message: 'Ошибка сети при регистрации' };
      }
  }
  
  // Создание колоды
  function createDeck() {
      gameState.deck = [];
      for (let suit of SUITS) {
          for (let value of VALUES) {
              gameState.deck.push({
                  suit: suit,
                  value: value,
                  faceUp: false
              });
          }
      }
  }
  
  // Перемешивание колоды (Fisher-Yates)
  function shuffleDeck() {
      for (let i = gameState.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
      }
  }
  
  // Раздача карт
  function dealCards() {
      // Раздача в tableau
      for (let i = 0; i < 7; i++) {
          for (let j = i; j < 7; j++) {
              const card = gameState.deck.pop();
              card.faceUp = (i === j); // Только верхняя карта открыта
              gameState.tableau[j].push(card);
          }
      }
      
      // Оставшиеся карты в stock
      gameState.stock = [...gameState.deck];
      gameState.deck = [];
  }
  
  // Обновление отображения
  function updateDisplay() {
      updateTableau();
      updateFoundation();
      updateStockWaste();
      updateInfo();
      updateTimerState();
      updateProgressBar();
  }
  
  // Обновление tableau
  function updateTableau() {
      const tableauSlots = document.querySelectorAll('.tableau-slot');
      
      tableauSlots.forEach((slot, index) => {
          slot.innerHTML = '';
          const cards = gameState.tableau[index];
          
          let y = 6; // отступ сверху в слоте
          const isNarrow = window.innerWidth <= 480;
          const isTablet = window.innerWidth <= 768;
          const faceDownOffset = isNarrow ? 14 : (isTablet ? 16 : 18);
          const faceUpOffset = isNarrow ? 22 : (isTablet ? 24 : 28);
          cards.forEach((card, cardIndex) => {
              const cardElement = createCardElement(card, cardIndex === cards.length - 1);
              cardElement.dataset.slotIndex = index;
              cardElement.dataset.cardIndex = cardIndex;
              cardElement.style.top = y + 'px';
              slot.appendChild(cardElement);
              y += card.faceUp ? faceUpOffset : faceDownOffset;
          });
      });
  }
  
  // Обновление foundation
  function updateFoundation() {
      const foundationSlots = document.querySelectorAll('.foundation-slot');
      
      foundationSlots.forEach((slot, index) => {
          slot.innerHTML = '';
          const cards = gameState.foundation[index];
          
          if (cards.length > 0) {
              const topCard = cards[cards.length - 1];
              const cardElement = createCardElement(topCard, true);
              cardElement.dataset.slotIndex = index;
              
              // Добавляем счетчик карт, если в стопке больше одной карты
              if (cards.length > 1) {
                  const counter = document.createElement('div');
                  counter.className = 'card-counter';
                  counter.textContent = cards.length;
                  cardElement.appendChild(counter);
              }
              
              slot.appendChild(cardElement);
          }
      });
  }
  
  // Обновление stock и waste
  function updateStockWaste() {
      // Stock
      elements.stock.innerHTML = '';
      if (gameState.stock.length > 0) {
          const stockCard = document.createElement('div');
          stockCard.className = 'card face-down';
          stockCard.innerHTML = '<div class="card-top"><span class="card-value">♠</span></div>';
          elements.stock.appendChild(stockCard);
      }
      
      // Waste
      elements.waste.innerHTML = '';
      if (gameState.waste.length > 0) {
          const topCard = gameState.waste[gameState.waste.length - 1];
          const cardElement = createCardElement(topCard, true);
          cardElement.dataset.slot = 'waste';
          elements.waste.appendChild(cardElement);
      }
  }
  
  // Создание элемента карты
  function createCardElement(card, isTopCard) {
      const cardElement = document.createElement('div');
      cardElement.className = `card ${card.faceUp ? '' : 'face-down'} ${card.faceUp && (card.suit === 'hearts' || card.suit === 'diamonds') ? 'red' : 'black'}`;
      cardElement.dataset.suit = card.suit;
      cardElement.dataset.value = card.value;
      // Разрешаем перетаскивать любую открытую карту (для переноса последовательностей)
      cardElement.draggable = card.faceUp;
      // Принудительно устанавливаем draggable для мобильных устройств
      if (card.faceUp) {
          cardElement.setAttribute('draggable', 'true');
      } else {
          cardElement.setAttribute('draggable', 'false');
      } 
      
      if (card.faceUp) {
          cardElement.innerHTML = `
              <div class="card-corner card-corner-top">
                  <div class="card-rank">${card.value}</div>
                  <div class="card-suit-small">${SUIT_SYMBOLS[card.suit]}</div>
              </div>
              <div class="card-suit-center">${SUIT_SYMBOLS[card.suit]}</div>
              <div class="card-corner card-corner-bottom">
                  <div class="card-rank">${card.value}</div>
                  <div class="card-suit-small">${SUIT_SYMBOLS[card.suit]}</div>
              </div>
          `;
      }
      
      return cardElement;
  }
  
  // Обновление информации
  function updateInfo() {
      elements.moves.textContent = gameState.moves;
      elements.timer.textContent = formatTime(gameState.timer);
      
      // Обновляем скорость анимации карт в зависимости от количества ходов
      updateBackgroundSpeed();
  }
  
  // Обновление состояния таймера
  function updateTimerState() {
      const timerElement = document.querySelector('.timer');
      if (timerElement) {
          if (!gameState.gameStarted) {
              timerElement.classList.add('not-started');
          } else {
              timerElement.classList.remove('not-started');
          }
      }
  }
  
  // Форматирование времени
  function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // Настройка обработчиков событий
  function setupEventListeners() {
      /* injectMobileTouchStyles disabled */

      // Кнопки управления
      elements.newGameBtn.addEventListener('click', newGame);
      elements.undoBtn.addEventListener('click', undoMove);
      elements.hintBtn.addEventListener('click', showHint);
      if (elements.statsBtn) {
          elements.statsBtn.addEventListener('click', showStatistics);
      }
      elements.shareResultBtn.addEventListener('click', shareResult);
      elements.playAgainBtn.addEventListener('click', () => {
          hideWinModal();
          newGame();
      });
      
      if (elements.settingsBtn) {
          elements.settingsBtn.addEventListener('click', openSettingsModal);
      }
      if (elements.closeSettingsBtn) {
          elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
      }
      if (elements.saveSettingsBtn) {
          elements.saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
      }
      if (elements.settingsModal) {
          elements.settingsModal.addEventListener('click', (event) => {
              if (event.target === elements.settingsModal) {
                  closeSettingsModal();
              }
          });
      }
      if (elements.themeOptionButtons && elements.themeOptionButtons.length) {
          elements.themeOptionButtons.forEach((button) => {
              button.addEventListener('click', () => selectThemeOption(button.dataset.theme));
          });
      }
      if (elements.deckOptionButtons && elements.deckOptionButtons.length) {
          elements.deckOptionButtons.forEach((button) => {
              button.addEventListener('click', () => selectDeckOption(button.dataset.deck));
          });
      }
      if (elements.toggleAnimations) {
          elements.toggleAnimations.addEventListener('change', (event) => setModalAnimations(event.target.checked));
      }
      if (elements.toggleHaptics) {
          elements.toggleHaptics.addEventListener('change', (event) => setModalHaptics(event.target.checked));
      }
      
      // Новые обработчики для псевдонимов и статистики
      if (elements.saveNicknameBtn) {
          elements.saveNicknameBtn.addEventListener('click', saveNickname);
      }
      if (elements.closeStatsBtn) {
          elements.closeStatsBtn.addEventListener('click', hideStatsModal);
      }
      
      // Обработчик Enter для ввода псевдонима
      if (elements.nicknameInput) {
          elements.nicknameInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                  e.preventDefault(); // Предотвращаем стандартное поведение
                  const nickname = elements.nicknameInput.value.trim();
                  if (nickname) {
                      saveNickname();
                  } else {
                      showErrorMessage('Введите псевдоним');
                      elements.nicknameInput.focus();
                  }
              }
          });
          
          // Добавляем обработчик для предотвращения отправки пустого значения
          elements.nicknameInput.addEventListener('input', (e) => {
              // Убираем лишние пробелы в начале и конце
              const value = e.target.value;
              if (value !== value.trim()) {
                  e.target.value = value.trim();
              }
          });
      }
      
      // Гарантируем наличие кнопок темы и колоды (если отсутствуют в HTML)
      ensureControlButtons();
      // Переключение темы
      if (elements.themeToggleBtn) {
          elements.themeToggleBtn.addEventListener('click', toggleTheme);
      }
      // Переключение колоды
      // Переключатель колоды удалён
      
      // Stock клик
      elements.stock.addEventListener('click', drawFromStock);
      
      // Drag and Drop
      setupDragAndDrop();
      
      // Touch события для мобильных устройств
      setupTouchEvents();
      
      // Двойной клик для тузов
      setupDoubleClickEvents();
  }
  
  // Создание кнопок темы/колоды, если их нет в разметке
  function ensureControlButtons() {
      // Настройки и переключатель темы временно отключены.
      return;
  }

  function openSettingsModal() {
      if (!elements.settingsModal) return;
      modalSettings = { ...userSettings };
      elements.settingsModal.classList.remove('hidden');
      elements.settingsModal.classList.add('active');
      populateSettingsModal();
      document.addEventListener('keydown', handleSettingsKeydown);
  }

  function closeSettingsModal() {
      if (!elements.settingsModal) return;
      elements.settingsModal.classList.remove('active');
      elements.settingsModal.classList.add('hidden');
      modalSettings = null;
      document.removeEventListener('keydown', handleSettingsKeydown);
  }

  function handleSettingsKeydown(event) {
      if (event.key === 'Escape') {
          closeSettingsModal();
      }
  }

  function populateSettingsModal() {
      if (!modalSettings) return;
      updateThemeOptionState(modalSettings.theme);
      updateDeckOptionState(modalSettings.deck);
      if (elements.toggleAnimations) {
          elements.toggleAnimations.checked = Boolean(modalSettings.animations);
      }
      if (elements.toggleHaptics) {
          elements.toggleHaptics.checked = Boolean(modalSettings.haptics);
      }
  }

  function selectThemeOption(theme) {
      if (!modalSettings) return;
      modalSettings.theme = theme || DEFAULT_SETTINGS.theme;
      updateThemeOptionState(modalSettings.theme);
  }

  function selectDeckOption(deck) {
      if (!modalSettings) return;
      modalSettings.deck = deck || DEFAULT_SETTINGS.deck;
      updateDeckOptionState(modalSettings.deck);
  }

  function setModalAnimations(enabled) {
      if (!modalSettings) return;
      modalSettings.animations = Boolean(enabled);
  }

  function setModalHaptics(enabled) {
      if (!modalSettings) return;
      modalSettings.haptics = Boolean(enabled);
  }

  function saveSettingsFromModal() {
      if (!modalSettings) {
          closeSettingsModal();
          return;
      }
      applySettings(modalSettings);
      closeSettingsModal();
  }

  function applySettings(nextSettings) {
      const normalized = {
          theme: nextSettings.theme || DEFAULT_SETTINGS.theme,
          deck: nextSettings.deck || DEFAULT_SETTINGS.deck,
          animations: typeof nextSettings.animations === 'boolean' ? nextSettings.animations : DEFAULT_SETTINGS.animations,
          haptics: typeof nextSettings.haptics === 'boolean' ? nextSettings.haptics : DEFAULT_SETTINGS.haptics
      };
      
      const themeChanged = userSettings.theme !== normalized.theme;
      const deckChanged = userSettings.deck !== normalized.deck;
      const animationChanged = userSettings.animations !== normalized.animations;
      const hapticsChanged = userSettings.haptics !== normalized.haptics;
      
      userSettings = normalized;
      persistUserSettings();
      applyTheme(userSettings.theme);
      applyDeckTheme(userSettings.deck);
      applyEffectsSettings();
      syncSettingsControls();
      
      if (themeChanged || deckChanged || animationChanged || hapticsChanged) {
          showSuccessMessage('Настройки сохранены');
      }
  }

  function syncSettingsControls() {
      updateThemeToggleLabel();
      updateThemeOptionState(userSettings.theme);
      updateDeckOptionState(userSettings.deck);
      if (elements.toggleAnimations) {
          elements.toggleAnimations.checked = Boolean(userSettings.animations);
      }
      if (elements.toggleHaptics) {
          elements.toggleHaptics.checked = Boolean(userSettings.haptics);
      }
  }
  
  // Настройка Drag and Drop
  function setupDragAndDrop() {
      document.addEventListener('dragstart', handleDragStart);
      document.addEventListener('dragover', handleDragOver);
      document.addEventListener('drop', handleDrop);
      document.addEventListener('dragend', handleDragEnd);
  }
  
  // Обработка начала перетаскивания
  function handleDragStart(e) {
      if (e.target.classList.contains('card') && e.target.draggable) {
          e.target.classList.add('dragging');
          gameState.draggedCards = getCardSequence(e.target);
          gameState.dragSource = getCardLocation(e.target);
          if (e.dataTransfer) {
              e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'card' }));
              e.dataTransfer.effectAllowed = 'move';
          }
          try { console.log('DragStart sequence size:', gameState.draggedCards.length, 'from source:', gameState.dragSource); } catch (_) {}
      }
  }
  
  // Обработка перетаскивания
  function handleDragOver(e) {
      e.preventDefault();
      if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
      }
      if (e.target.classList.contains('card') || e.target.classList.contains('foundation-slot') || 
          e.target.classList.contains('tableau-slot') || e.target.classList.contains('waste')) {
          e.target.classList.add('drag-over');
      }
  }
  
  // Обработка сброса
  function handleDrop(e) {
      e.preventDefault();
      
      if (!gameState.draggedCards.length) return;
      
      const target = e.target.closest('.foundation-slot, .tableau-slot, .waste');
      if (!target) return;
      
      const targetLocation = getSlotLocation(target);
      console.log('Drop target:', target, 'targetLocation:', targetLocation);
      console.log('Dragged cards:', gameState.draggedCards, 'source:', gameState.dragSource);
      
      if (targetLocation && canMoveCards(gameState.draggedCards, targetLocation)) {
          console.log('Moving cards...');
          moveCards(gameState.draggedCards, gameState.dragSource, targetLocation);
      } else {
          console.log('Cannot move cards. targetLocation:', targetLocation, 'canMove:', targetLocation ? canMoveCards(gameState.draggedCards, targetLocation) : false);
      }
      
      clearDragState();
  }
  
  // Обработка окончания перетаскивания
  function handleDragEnd(e) {
      clearDragState();
  }
  
  // Очистка состояния перетаскивания
  function clearDragState() {
      document.querySelectorAll('.dragging, .drag-over').forEach(el => {
          el.classList.remove('dragging', 'drag-over');
      });
      gameState.draggedCards = [];
      gameState.dragSource = null;
  }
  
  // Настройка Touch событий
  function setupTouchEvents() {
  let touchStartX, touchStartY, touchStartTime;
  let draggedElement = null;
  let hoverTarget = null;
  let scrollLocked = false;

  const lockScroll = () => {
    if (scrollLocked) return;
    scrollLocked = true;
    document.body.style.overflow = 'hidden';
  };
  const unlockScroll = () => {
    scrollLocked = false;
    document.body.style.overflow = '';
  };

  document.addEventListener('touchstart', (e) => {
    const card = e.target.closest('.card');
    console.log('Touch start:', card, 'draggable:', card?.draggable, 'faceUp:', !card?.classList.contains('face-down'));
    
    // В мобильном Telegram WebView проверяем и draggable, и faceUp
    if (card && (card.draggable || !card.classList.contains('face-down'))) {
      // Предотвращаем стандартное поведение для мобильных устройств
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      draggedElement = card;
      // Сохраняем последовательность как при desktop drag
      gameState.draggedCards = getCardSequence(card);
      gameState.dragSource = getCardLocation(card);
      lockScroll();
      // Добавляем классы для блокировки прокрутки
      document.documentElement.classList.add('dragging');
      document.body.classList.add('dragging');
      console.log('Started dragging:', card);
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!draggedElement) return;
    e.preventDefault(); // критично: не даём странице прокручиваться
    console.log('Touch move:', draggedElement);
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // двигаем карту визуально
    draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // ищем слот под пальцем
    draggedElement.style.pointerEvents = 'none';
    const elUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedElement.style.pointerEvents = '';
    const candidate = elUnderFinger && elUnderFinger.closest
      ? elUnderFinger.closest('.foundation-slot, .tableau-slot, .waste, .card')
      : null;
    const slot = candidate && candidate.classList && candidate.classList.contains('card')
      ? candidate.closest('.foundation-slot, .tableau-slot, .waste')
      : candidate;

    if (hoverTarget !== slot) {
      if (hoverTarget && hoverTarget.classList) hoverTarget.classList.remove('drag-over');
      hoverTarget = slot;
      if (hoverTarget && hoverTarget.classList) hoverTarget.classList.add('drag-over');
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!draggedElement) return;
    console.log('Touch end:', draggedElement);

    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;

    // Сбрасываем визуальный сдвиг
    draggedElement.style.transform = '';

    if (touchDuration < 200) {
      // короткий тап — автоход как раньше
      const target = findBestTarget(draggedElement);
      if (target) {
        const cards = getCardSequence(draggedElement);
        const source = getCardLocation(draggedElement);
        moveCards(cards, source, target);
      }
    } else {
      // полноценный drop на слот под пальцем
      const targetSlot = hoverTarget;
      let targetLocation = null;
      if (targetSlot) {
        targetLocation = getSlotLocation(targetSlot);
        if (!targetLocation) {
          // вдруг попали по карте внутри слота
          const innerCard = targetSlot.querySelector && targetSlot.querySelector('.card');
          if (innerCard) targetLocation = getSlotLocation(innerCard);
        }
      }
      if (targetLocation && gameState.draggedCards && gameState.draggedCards.length) {
        if (canMoveCards(gameState.draggedCards, targetLocation)) {
          moveCards(gameState.draggedCards, gameState.dragSource, targetLocation);
        }
      }
    }

    // очистка
    if (hoverTarget && hoverTarget.classList) hoverTarget.classList.remove('drag-over');
    // Убираем классы блокировки прокрутки
    document.documentElement.classList.remove('dragging');
    document.body.classList.remove('dragging');
    hoverTarget = null;
    draggedElement = null;
    gameState.draggedCards = [];
    gameState.dragSource = null;
    unlockScroll();
  }, { passive: false });
}
  
  // Получение последовательности карт
  function getCardSequence(cardElement) {
      // Определяем контейнер
      const container = cardElement.closest('.tableau-slot, .waste, .foundation-slot');
      if (!container) {
          return [{ suit: cardElement.dataset.suit, value: cardElement.dataset.value }];
      }
      // Из waste и foundation тянется только одна карта (верхняя)
      if (container.classList.contains('waste') || container.classList.contains('foundation-slot')) {
          return [{ suit: cardElement.dataset.suit, value: cardElement.dataset.value }];
      }
      // Tableau: берём индекс столбца и индекс карты
      const slotIndex = Number.isInteger(parseInt(cardElement.dataset.slotIndex))
          ? parseInt(cardElement.dataset.slotIndex)
          : (container.dataset.slot && container.dataset.slot.includes('-') ? parseInt(container.dataset.slot.split('-')[1]) : 0);
      const cardIndex = Number.isInteger(parseInt(cardElement.dataset.cardIndex)) ? parseInt(cardElement.dataset.cardIndex) : 0;
      const tableau = gameState.tableau[slotIndex] || [];
      const sequence = [];
      for (let i = cardIndex; i < tableau.length; i++) {
          sequence.push({ suit: tableau[i].suit, value: tableau[i].value });
      }
      return sequence.length ? sequence : [{ suit: cardElement.dataset.suit, value: cardElement.dataset.value }];
  }
  
  // Получение местоположения карты
  function getCardLocation(cardElement) {
      const slot = cardElement.closest('.tableau-slot, .foundation-slot, .waste');
      if (!slot) return null;
      
      if (slot.classList.contains('waste')) {
          return { type: 'waste', index: 0 };
      }
      
      if (slot.classList.contains('foundation-slot')) {
          const slotData = slot.dataset.slot;
          if (slotData && slotData.startsWith('foundation-')) {
              return { 
                  type: 'foundation', 
                  index: parseInt(slotData.split('-')[1]) 
              };
          }
      }
      
      if (slot.classList.contains('tableau-slot')) {
          const slotData = slot.dataset.slot;
          if (slotData && slotData.startsWith('tableau-')) {
              return { 
                  type: 'tableau', 
                  index: parseInt(slotData.split('-')[1]) 
              };
          }
      }
      
      return null;
  }
  
  // Получение местоположения слота
  function getSlotLocation(slotElement) {
      if (!slotElement) return null;
      
      // Если дропнули прямо на карту, берём индекс из карты и определяем тип по родителю
      if (slotElement.classList && slotElement.classList.contains('card')) {
          const parent = slotElement.closest('.tableau-slot, .foundation-slot, .waste');
          if (!parent) return null;
          const idx = slotElement.dataset.slotIndex ? parseInt(slotElement.dataset.slotIndex) : null;
          if (parent.classList.contains('waste')) {
              return { type: 'waste', index: 0 };
          }
          if (parent.classList.contains('foundation-slot')) {
              return { type: 'foundation', index: idx != null ? idx : 0 };
          }
          if (parent.classList.contains('tableau-slot')) {
              return { type: 'tableau', index: idx != null ? idx : 0 };
          }
          return null;
      }
      
      if (slotElement.classList.contains('waste')) {
          return { type: 'waste', index: 0 };
      }
      
      if (slotElement.classList.contains('foundation-slot')) {
          const slotData = slotElement.dataset.slot;
          if (slotData && slotData.startsWith('foundation-')) {
              return { 
                  type: 'foundation', 
                  index: parseInt(slotData.split('-')[1]) 
              };
          }
      }
      
      if (slotElement.classList.contains('tableau-slot')) {
          const slotData = slotElement.dataset.slot;
          if (slotData && slotData.startsWith('tableau-')) {
              return { 
                  type: 'tableau', 
                  index: parseInt(slotData.split('-')[1]) 
              };
          }
      }
      
      return null;
  }
  
  // Проверка возможности перемещения карт
  function canMoveCards(cards, targetLocation) {
      if (!cards.length) return false;
      
      const firstCard = cards[0];
      console.log('Checking if can move card:', firstCard, 'to:', targetLocation);
      
      if (targetLocation.type === 'foundation') {
          const canMove = canMoveToFoundation(firstCard, targetLocation.index);
          console.log('Can move to foundation:', canMove);
          return canMove;
      } else if (targetLocation.type === 'tableau') {
          const canMove = canMoveToTableau(firstCard, targetLocation.index);
          console.log('Can move to tableau:', canMove);
          return canMove;
      }
      
      console.log('Unknown target type:', targetLocation.type);
      return false;
  }
  
  // Проверка возможности перемещения в foundation
  function canMoveToFoundation(card, foundationIndex) {
      const foundation = gameState.foundation[foundationIndex];
      
      if (foundation.length === 0) {
          return card.value === 'A';
      }
      
      const topCard = foundation[foundation.length - 1];
      return card.suit === topCard.suit && getCardValue(card.value) === getCardValue(topCard.value) + 1;
  }
  
  // Проверка возможности перемещения в tableau
  function canMoveToTableau(card, tableauIndex) {
      const tableau = gameState.tableau[tableauIndex];
      
      if (tableau.length === 0) {
          const canMove = card.value === 'K';
          console.log('Empty tableau, can move K:', canMove, 'card value:', card.value);
          return canMove;
      }
      
      const topCard = tableau[tableau.length - 1];
      const oppositeColor = isOppositeColor(card.suit, topCard.suit);
      const correctValue = getCardValue(card.value) === getCardValue(topCard.value) - 1;
      const canMove = oppositeColor && correctValue;
      
      console.log('Tableau check:', {
          card: card,
          topCard: topCard,
          oppositeColor: oppositeColor,
          correctValue: correctValue,
          canMove: canMove
      });
      
      return canMove;
  }
  
  // Получение числового значения карты
  function getCardValue(value) {
      const valueMap = {
          'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
          'J': 11, 'Q': 12, 'K': 13
      };
      return valueMap[value];
  }
  
  // Проверка противоположного цвета
  function isOppositeColor(suit1, suit2) {
      const redSuits = ['hearts', 'diamonds'];
      const blackSuits = ['clubs', 'spades'];
      
      return (redSuits.includes(suit1) && blackSuits.includes(suit2)) ||
             (blackSuits.includes(suit1) && redSuits.includes(suit2));
  }
  
  // Перемещение карт
  function moveCards(cards, source, target) {
      console.log('Moving cards:', cards, 'from', source, 'to', target);
      // Если цель foundation — переносим только одну карту (верхнюю выбранной последовательности)
      let cardsToMove = cards;
      if (target && target.type === 'foundation' && Array.isArray(cards) && cards.length > 1) {
          cardsToMove = [cards[0]];
      }
      // Сохранение хода для отмены
      saveMove(cardsToMove, source, target);
      // Удаление карт из источника
      removeCardsFromSource(cardsToMove, source);
      // Добавление карт в цель
      addCardsToTarget(cardsToMove, target);
      // Обновление отображения
      updateDisplay();
      // Увеличение счетчика ходов
      gameState.moves++;
      // Запуск таймера при первом ходе
      if (!gameState.gameStarted) {
          startTimer();
      }
      
      // Эффект успешного хода на фоне
      if (target.type === 'foundation') {
          triggerBackgroundCelebration();
      }
      
      // Проверка победы
      checkWin();
      // Проверка отсутствия ходов
      notifyNoMovesIfNeeded();
  }
  
  // Сохранение хода
  function saveMove(cards, source, target) {
      gameState.moveHistory.push({
          cards: [...cards],
          source: { ...source },
          target: { ...target }
      });
  }
  
  // Удаление карт из источника
  function removeCardsFromSource(cards, source) {
      if (source.type === 'tableau') {
          const tableau = gameState.tableau[source.index];
          const startIndex = tableau.length - cards.length;
          tableau.splice(startIndex);
          
          // Открытие верхней карты, если она закрыта
          if (tableau.length > 0 && !tableau[tableau.length - 1].faceUp) {
              tableau[tableau.length - 1].faceUp = true;
          }
      } else if (source.type === 'foundation') {
          const foundation = gameState.foundation[source.index];
          foundation.splice(foundation.length - cards.length);
      } else if (source.type === 'waste') {
          gameState.waste.splice(gameState.waste.length - cards.length);
      }
  }
  
  // Добавление карт в цель
  function addCardsToTarget(cards, target) {
      if (target.type === 'tableau') {
          // Преобразуем объекты карт в правильный формат
          const cardObjects = cards.map(card => ({
              suit: card.suit,
              value: card.value,
              faceUp: true
          }));
          gameState.tableau[target.index].push(...cardObjects);
      } else if (target.type === 'foundation') {
          // В foundation переносится только одна карта
          const c = cards[0];
          if (!c) return;
          const cardObject = { suit: c.suit, value: c.value, faceUp: true };
          gameState.foundation[target.index].push(cardObject);
      }
  }
  
  // Взятие карты из колоды
  function drawFromStock() {
      if (gameState.stock.length === 0) {
          // Переворачиваем waste в stock
          if (gameState.waste.length > 0) {
              gameState.stock = [...gameState.waste.reverse()];
              gameState.waste = [];
              gameState.stock.forEach(card => card.faceUp = false);
          }
      } else {
          // Берем карту из stock
          const card = gameState.stock.pop();
          card.faceUp = true;
          gameState.waste.push(card);
      }
      // Запуск таймера при первом ходе
      if (!gameState.gameStarted) {
          startTimer();
      }
      updateDisplay();
      // Проверка отсутствия ходов
      notifyNoMovesIfNeeded();
  }
  
  // Отмена хода
  function undoMove() {
      if (gameState.moveHistory.length === 0) return;
      const lastMove = gameState.moveHistory.pop();
      // Возвращаем карты в исходное положение
      removeCardsFromSource(lastMove.cards, lastMove.target);
      addCardsToTarget(lastMove.cards, lastMove.source);
      updateDisplay();
      gameState.moves--;
      // Проверка отсутствия ходов
      notifyNoMovesIfNeeded();
  }
  
  // Проверка победы
  function checkWin() {
      const totalFoundationCards = gameState.foundation.reduce((sum, foundation) => sum + foundation.length, 0);
      
      if (totalFoundationCards === 52) {
          showWinModal();
          
          // Сохранение результата
          saveGameResult();
          const winResult = { time: gameState.timer, moves: gameState.moves };
          updateLocalStatsOnWin(winResult);
          evaluateAchievements(winResult);
          
          // Показ popup в Telegram (с проверкой поддержки)
          if (tg && typeof tg.showPopup === 'function') {
              try {
                  tg.showPopup({
                      title: 'Поздравляем!',
                      message: `Вы собрали все карты за ${formatTime(gameState.timer)} и ${gameState.moves} ходов!`,
                      buttons: [
                          { type: 'ok', text: 'Отлично!' }
                      ]
                  });
              } catch (e) {
                  console.log('showPopup не поддерживается, показываем модальное окно');
                  showWinModal();
              }
          } else {
              showWinModal();
          }
          // Показ статистики (через MainButton после победы и горячая клавиша S)
          async function showStatistics() {
              const stats = await fetchStats();
              showStatsPopup(stats);
          }
  
          document.addEventListener('keydown', (e) => {
              if (e.key.toLowerCase() === 's') {
                  showStatistics();
              }
          });
      }
  }
  
  // Показ модального окна победы
  function showWinModal() {
      elements.winTime.textContent = formatTime(gameState.timer);
      elements.winMoves.textContent = gameState.moves;
      elements.winModal.classList.remove('hidden');
      
      // Активируем праздничный эффект на фоне
      document.body.classList.add('game-won');
      
      // Создаем дополнительные карты для праздника
      createCelebrationCards();
  }
  
  // Скрытие модального окна победы
  function hideWinModal() {
      elements.winModal.classList.add('hidden');
      
      // Убираем праздничный эффект
      document.body.classList.remove('game-won');
      
      // Удаляем праздничные карты
      const celebrationCards = document.querySelectorAll('.celebration-card');
      celebrationCards.forEach(card => card.remove());
  }
  
  // Создание праздничных карт при победе
  function createCelebrationCards() {
      const background = document.querySelector('.background-animation');
      if (!background) return;
      
      for (let i = 0; i < 10; i++) {
          const card = document.createElement('div');
          card.className = 'floating-card celebration-card';
          card.style.cssText = `
              left: ${Math.random() * 100}%;
              animation: celebrate 3s ease-in-out infinite;
              animation-delay: ${Math.random() * 2}s;
              opacity: 0.3;
          `;
          background.appendChild(card);
      }
  }
  
  // Показ подсказки
    // Hint system
  function showHint() {
      if (!gameState || gameState.gameOver) return;

      if (!gameState.gameStarted) {
          if (Array.isArray(gameState.stock) && gameState.stock.length > 0) {
              highlightStockPile();
              showHintMessage('Сделайте первый ход — откройте карту из колоды.');
              return;
          }
          showHintMessage('Начните новую игру, чтобы получить подсказку.');
          return;
      }

      const move = findBestMove();
      clearHintHighlights();
      if (!move) {
          if (Array.isArray(gameState.stock) && gameState.stock.length > 0) {
              highlightStockPile();
              showHintMessage('Возьмите карту из колоды.');
          } else {
              showHintMessage('Нет доступных ходов. Начните новую игру.');
          }
          return;
      }
      if (move.type === 'draw') {
          highlightStockPile();
          showHintMessage('Возьмите карту из колоды.');
          return;
      }
      highlightHintMove(move);
      showHintMessage(move.message);
  }

  function highlightHintMove(move) {
      const sourceEl = getHintSlotElement(move.fromSource, move.fromIndex);
      if (sourceEl) sourceEl.classList.add('hint-highlight');
      const targetEl = getHintSlotElement(move.toSource, move.toIndex);
      if (targetEl) targetEl.classList.add('hint-highlight');
      setTimeout(clearHintHighlights, 3000);
  }

  function highlightStockPile() {
      const stockEl = document.getElementById('stock');
      if (!stockEl) return;
      stockEl.classList.add('hint-highlight');
      setTimeout(clearHintHighlights, 3000);
  }

  function getHintSlotElement(source, index) {
      if (source === 'stock') return document.getElementById('stock');
      if (source === 'waste') return document.getElementById('waste');
      if (source === 'tableau') return document.querySelector('[data-slot="tableau-' + index + '"]');
      if (source === 'foundation') return document.querySelector('[data-slot="foundation-' + index + '"]');
      return null;
  }

  function clearHintHighlights() {
      document.querySelectorAll('.hint-highlight').forEach(el => {
          el.classList.remove('hint-highlight');
      });
  }

  function showHintMessage(text) {
      let hintMessage = document.querySelector('.hint-message');
      if (!hintMessage) {
          hintMessage = document.createElement('div');
          hintMessage.className = 'hint-message';
          hintMessage.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 20px; background: rgba(0, 0, 0, 0.75); color: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); font-size: 16px; z-index: 5000; opacity: 0; transition: opacity 0.2s ease;';
          document.body.appendChild(hintMessage);
      }
      hintMessage.textContent = text;
      requestAnimationFrame(() => {
          hintMessage.style.opacity = '1';
      });
      setTimeout(() => {
          hintMessage.style.opacity = '0';
      }, 2200);
      setTimeout(() => {
          if (hintMessage && hintMessage.parentNode) {
              hintMessage.parentNode.removeChild(hintMessage);
          }
      }, 2600);
  }

  function findBestMove() {
      if (!gameState) return null;
      const moves = [];
      const wasteLength = Array.isArray(gameState.waste) ? gameState.waste.length : 0;
      if (wasteLength > 0) {
          const wasteCard = gameState.waste[wasteLength - 1];
          for (let f = 0; f < 4; f++) {
              if (canMoveCards([wasteCard], { type: 'foundation', index: f })) {
                  return createHintMove('waste', 0, wasteLength - 1, 'foundation', f, wasteCard, 'Переместите ' + formatCardName(wasteCard, 'accusative') + ' в основание.', 100);
              }
          }
      }
      for (let t = 0; t < 7; t++) {
          const pile = (gameState.tableau && gameState.tableau[t]) || [];
          if (pile.length === 0) continue;
          const topCard = pile[pile.length - 1];
          if (!topCard || !topCard.faceUp) continue;
          for (let f = 0; f < 4; f++) {
              if (canMoveCards([topCard], { type: 'foundation', index: f })) {
                  const reveals = pile.length > 1 && !pile[pile.length - 2].faceUp;
                  const priority = reveals ? 95 : 90;
                  return createHintMove(
                      'tableau',
                      t,
                      pile.length - 1,
                      'foundation',
                      f,
                      topCard,
                      'Переместите ' + formatCardName(topCard, 'accusative') + ' в основание.',
                      priority
                  );
              }
          }
      }
      for (let from = 0; from < 7; from++) {
          const pile = (gameState.tableau && gameState.tableau[from]) || [];
          if (pile.length === 0) continue;
          for (let cardIndex = 0; cardIndex < pile.length; cardIndex++) {
              const card = pile[cardIndex];
              if (!card || !card.faceUp) continue;
              const sequence = pile.slice(cardIndex);
              if (!sequence.length) continue;
              if (!sequence.every(c => c && c.faceUp)) continue;
              for (let to = 0; to < 7; to++) {
                  if (to === from) continue;
                  if (!canMoveCards(sequence, { type: 'tableau', index: to })) continue;
                  const reveals = cardIndex > 0 && !pile[cardIndex - 1].faceUp;
                  const priority = reveals ? 80 : 60;
                  moves.push(
                      createHintMove(
                          'tableau',
                          from,
                          cardIndex,
                          'tableau',
                          to,
                          card,
                          'Переместите ' + formatCardName(card, 'accusative') + ' на колонку ' + (to + 1) + '.',
                          priority
                      )
                  );
              }
          }
      }
      if (wasteLength > 0) {
          const wasteCard = gameState.waste[wasteLength - 1];
          for (let to = 0; to < 7; to++) {
              if (!canMoveCards([wasteCard], { type: 'tableau', index: to })) continue;
              moves.push(
                  createHintMove(
                      'waste',
                      0,
                      wasteLength - 1,
                      'tableau',
                      to,
                      wasteCard,
                      'Переместите ' + formatCardName(wasteCard, 'accusative') + ' на колонку ' + (to + 1) + '.',
                      55
                  )
              );
          }
      }
      if (moves.length > 0) {
          moves.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          return moves[0];
      }
      if (Array.isArray(gameState.stock) && gameState.stock.length > 0) {
          return { type: 'draw' };
      }
      return null;
  }

  function createHintMove(fromSource, fromIndex, fromCardIndex, toSource, toIndex, card, message, priority) {
      return {
          type: 'move',
          fromSource,
          fromIndex,
          fromCardIndex,
          toSource,
          toIndex,
          card,
          message,
          priority: priority || 0
      };
  }

  function formatCardName(card, grammaticalCase = 'nominative') {
      if (!card) return 'карту';
      const valueMap = {
          A: { nominative: 'туз', accusative: 'туза' },
          J: { nominative: 'валет', accusative: 'валета' },
          Q: { nominative: 'дама', accusative: 'даму' },
          K: { nominative: 'король', accusative: 'короля' }
      };
      const suitMap = {
          hearts: { nominative: 'черви', accusative: 'червы' },
          diamonds: { nominative: 'бубны', accusative: 'бубны' },
          clubs: { nominative: 'трефы', accusative: 'трефы' },
          spades: { nominative: 'пики', accusative: 'пики' }
      };
      const valueKey = card.value.toUpperCase();
      const suitKey = card.suit;
      const caseKey = grammaticalCase === 'accusative' ? 'accusative' : 'nominative';
      const valueText = valueMap[valueKey]
          ? valueMap[valueKey][caseKey]
          : card.value;
      const suitText = suitMap[suitKey]
          ? suitMap[suitKey][caseKey]
          : card.suit;
      return `${valueText} ${suitText}`;
  }
  
  // Триггер празднования на фоне при успешном ходе
  function triggerBackgroundCelebration() {
      const cards = document.querySelectorAll('.floating-card:not(.celebration-card)');
      cards.forEach((card, index) => {
          setTimeout(() => {
              card.style.animation = 'pulse-success 0.5s ease-in-out';
              setTimeout(() => {
                  card.style.animation = '';
              }, 500);
          }, index * 50);
      });
  }
  
  // Обновление темы фона
  function updateBackgroundTheme() {
      const cards = document.querySelectorAll('.floating-card');
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      cards.forEach(card => {
          if (isDark) {
              card.style.background = 'var(--card-bg)';
              card.style.borderColor = 'var(--card-border)';
          } else {
              card.style.background = 'var(--card-bg)';
              card.style.borderColor = 'var(--card-border)';
          }
      });
  }
  
  // Обновление скорости анимации фона в зависимости от ходов
  function updateBackgroundSpeed() {
      const cards = document.querySelectorAll('.floating-card:not(.celebration-card)');
      const baseSpeed = 15;
      const speedMultiplier = Math.max(0.5, 1 - (gameState.moves / 100));
      
      cards.forEach((card, index) => {
          const individualSpeed = baseSpeed + (index * 2);
          const newSpeed = individualSpeed * speedMultiplier;
          card.style.animationDuration = `${newSpeed}s`;
      });
  }
  
  // Сохранение результата игры
  function saveGameResult() {
      const result = {
          time: gameState.timer,
          moves: gameState.moves,
          date: new Date().toISOString()
      };
      // Отключаем Telegram CloudStorage для старых версий
      // if (tg && tg.CloudStorage) {
      //     tg.CloudStorage.setItem('bestResult', JSON.stringify(result));
      // }
      // Локальное сохранение на случай оффлайна
      try { localStorage.setItem('klondikeBestResult', JSON.stringify(result)); } catch (_) {}
      // Отправка на backend
      postResultToBackend(result);
  }
  
  async function postResultToBackend(result) {
      const userId = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || null;
      const username = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username) || null;
      const nickname = localStorage.getItem('userNickname') || null;
      const url = getApiBase() + '/results';
      
      console.log('Отправка результата на:', url);
      
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...result, userId, username, nickname })
          });
          
          if (response.ok) {
              console.log('Результат успешно отправлен');
          } else {
              console.warn('Ошибка отправки результата:', response.status, response.statusText);
          }
      } catch (e) {
          console.warn('Не удалось отправить результат на сервер:', e);
      }
  }
  
  async function fetchStats() {
      const url = getApiBase() + '/stats';
      
      console.log('Запрос статистики с:', url);
      
      try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          console.log('Статистика получена:', data);
          return data;
      } catch (e) {
          console.warn('Не удалось получить статистику:', e);
          return null;
      }
  }
  
  // Получение лидерборда топ-5
  async function fetchLeaderboard() {
      const url = getApiBase() + '/leaderboard';
      
      console.log('Запрос лидерборда с:', url);
      
      try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          console.log('Лидерборд получен:', data);
          return data;
      } catch (e) {
          console.warn('Не удалось получить лидерборд:', e);
          return null;
      }
  }
  
  function getApiBase() {
      const envHost = 'zioj.duckdns.org';
      const baseUrl = 'https://' + envHost + '/api/api/v1';
      
      console.log('API Base URL:', baseUrl);
      return baseUrl;
  }
  
  // Показать лидерборд
  async function showLeaderboard() {
      const leaderboard = await fetchLeaderboard();
      showStatsModal();
      renderAchievements();
      if (!leaderboard || !leaderboard.length) {
          if (elements.leaderboardList) {
              elements.leaderboardList.innerHTML = '<div class="leaderboard-empty">Данных пока нет</div>';
          }
          return;
      }
      renderLeaderboard(leaderboard);
  }
  
  // Показать модальное окно статистики
  function showStatsModal() {
      if (!elements.statsModal) return;
      elements.statsModal.classList.remove('hidden');
      elements.statsModal.classList.add('active');
  }

  function hideStatsModal() {
      if (!elements.statsModal) return;
      elements.statsModal.classList.remove('active');
      elements.statsModal.classList.add('hidden');
  }
  
  // Отрисовка лидерборда
  function renderLeaderboard(leaderboard) {
      if (!elements.leaderboardList) return;
  
      elements.leaderboardList.innerHTML = '';
      const players = Array.isArray(leaderboard) ? leaderboard.filter(Boolean) : [];
      const topPlayers = players.slice(0, 4);
      while (topPlayers.length < 4) {
          topPlayers.push(null);
      }
  
      topPlayers.forEach((player, index) => {
          const rank = index + 1;
          const item = document.createElement('div');
          item.className = `leaderboard-item rank-${rank}`;
  
          if (!player) {
              item.classList.add('leaderboard-item--empty');
          }
  
          const rankElement = document.createElement('div');
          rankElement.className = 'leaderboard-rank';
          rankElement.textContent = rank;
  
          const infoElement = document.createElement('div');
          infoElement.className = 'leaderboard-info';
  
          const nameElement = document.createElement('div');
          nameElement.className = 'leaderboard-name';
          nameElement.textContent = player?.nickname || 'Свободно';
  
          const detailsElement = document.createElement('div');
          detailsElement.className = 'leaderboard-details';
  
          const metricsElement = document.createElement('div');
          metricsElement.className = 'leaderboard-metrics';
  
          const timeSpan = document.createElement('span');
          timeSpan.className = 'leaderboard-time';
          const bestTimeValue = player && player.bestTime !== undefined ? Number(player.bestTime) : NaN;
          const hasTime = Number.isFinite(bestTimeValue) && bestTimeValue >= 0;
          timeSpan.textContent = `Время: ${hasTime ? formatTime(bestTimeValue) : '—:—'}`;
  
          const rawScore = player ? (
              Number.isFinite(Number(player.score)) ? Number(player.score) :
              Number.isFinite(Number(player.points)) ? Number(player.points) :
              Number.isFinite(Number(player.bestMoves)) ? Number(player.bestMoves) :
              NaN
          ) : NaN;
          const hasScore = Number.isFinite(rawScore);
          const scoreLabel = player
              ? ((player.score !== undefined || player.points !== undefined) ? 'Очки' : 'Ходы')
              : 'Очки';
          const scoreSpan = document.createElement('span');
          scoreSpan.className = 'leaderboard-score';
          scoreSpan.textContent = `${scoreLabel}: ${hasScore ? rawScore : '—'}`;
  
          metricsElement.appendChild(timeSpan);
          metricsElement.appendChild(scoreSpan);
          detailsElement.appendChild(metricsElement);
  
          infoElement.appendChild(nameElement);
          infoElement.appendChild(detailsElement);
  
          item.appendChild(rankElement);
          item.appendChild(infoElement);
  
          elements.leaderboardList.appendChild(item);
      });
  }
  
  // Поделиться результатом
  function shareResult() {
      const message = `Я собрал пасьянс Klondike за ${formatTime(gameState.timer)} и ${gameState.moves} ходов! 🎉`;
      
      if (tg && tg.MainButton) {
          tg.MainButton.setText('Поделиться');
          tg.MainButton.show();
          tg.MainButton.onClick(() => {
              tg.sendData(JSON.stringify({
                  action: 'share',
                  message: message
              }));
          });
      } else {
          // Fallback для обычного браузера
          if (navigator.share) {
              navigator.share({
                  title: 'Klondike Quest',
                  text: message
              });
          } else {
              // Копирование в буфер обмена
              navigator.clipboard.writeText(message);
              alert('Результат скопирован в буфер обмена!');
          }
      }
  }
  
  // Показ статистики (через MainButton после победы и горячая клавиша S)
  async function showStatistics() {
      await showLeaderboard();
  }
  
  document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 's') {
          showStatistics();
      }
  });
  
  // Новая игра
  function newGame() {
      // Остановка таймера
      if (gameState.timerInterval) {
          clearInterval(gameState.timerInterval);
      }
      
      // Сброс состояния
      gameState = new GameState();
      
      // Инициализация новой игры
      initGame();
  }
  
  // Запуск таймера
  function startTimer() {
      if (!gameState.gameStarted) {
          gameState.gameStarted = true;
          gameState.timerInterval = setInterval(() => {
              gameState.timer++;
              updateInfo();
          }, 1000);
      }
  }
  
  // Темы и визуальные настройки
  function applyTheme(preference = userSettings.theme) {
      const targetPreference = preference || DEFAULT_SETTINGS.theme;
      applyTelegramThemeParams();
      const resolvedTheme = getEffectiveTheme(targetPreference);
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.documentElement.setAttribute('data-theme-preference', targetPreference);
      updateThemeToggleLabel(resolvedTheme, targetPreference);
      updateThemeOptionState(targetPreference);
      updateBackgroundTheme();
  }

  function setThemePreference(preference) {
      const normalized = (preference === 'dark' || preference === 'light' || preference === 'auto')
          ? preference
          : DEFAULT_SETTINGS.theme;
      userSettings.theme = normalized;
      persistUserSettings();
      applyTheme(normalized);
  }

  function toggleTheme() {
      const currentPreference = userSettings.theme;
      const effectiveTheme = getEffectiveTheme(currentPreference);
      const nextPreference = currentPreference === 'auto'
          ? (effectiveTheme === 'dark' ? 'light' : 'dark')
          : (currentPreference === 'dark' ? 'light' : 'dark');
      setThemePreference(nextPreference);
      if (modalSettings) {
          modalSettings.theme = nextPreference;
          updateThemeOptionState(nextPreference);
      }
  }

  function getEffectiveTheme(preference = userSettings.theme) {
      const pref = preference || DEFAULT_SETTINGS.theme;
      if (pref === 'dark' || pref === 'light') return pref;
      const telegramTheme = inferThemeFromTelegram();
      if (telegramTheme) return telegramTheme;
      return detectSystemTheme();
  }

  function detectSystemTheme() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
      }
      return 'light';
  }

  function inferThemeFromTelegram() {
      if (!tg) return null;
      if (typeof tg.colorScheme === 'string') {
          if (tg.colorScheme === 'dark' || tg.colorScheme === 'light') {
              return tg.colorScheme;
          }
      }
      if (tg.themeParams && tg.themeParams.bg_color) {
          return isColorDark(tg.themeParams.bg_color) ? 'dark' : 'light';
      }
      return null;
  }

  function applyTelegramThemeParams() {
      if (!tg || !tg.themeParams) return;
      const theme = tg.themeParams;
      if (theme.bg_color) {
          document.documentElement.style.setProperty('--bg-color', theme.bg_color);
      }
      if (theme.text_color) {
          document.documentElement.style.setProperty('--text-color', theme.text_color);
      }
      if (theme.button_color) {
          document.documentElement.style.setProperty('--btn-primary-bg', theme.button_color);
      }
      if (theme.button_text_color) {
          document.documentElement.style.setProperty('--btn-primary-color', theme.button_text_color);
      }
  }

  function isColorDark(hex) {
      if (typeof hex !== 'string') return false;
      const value = hex.replace('#', '');
      if (value.length !== 6) return false;
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
  }

  function updateThemeToggleLabel(resolvedTheme = getEffectiveTheme(), preference = userSettings.theme) {
      if (!elements.themeToggleBtn) return;
      let label;
      if (preference === 'auto') {
          const readable = resolvedTheme === 'dark' ? 'тёмная' : 'светлая';
          label = `Тема: Авто (${readable})`;
      } else {
          label = `Тема: ${preference === 'dark' ? 'Тёмная' : 'Светлая'}`;
      }
      elements.themeToggleBtn.textContent = label;
  }

  function updateThemeOptionState(selectedTheme) {
      if (!elements.themeOptionButtons || !elements.themeOptionButtons.length) return;
      elements.themeOptionButtons.forEach((button) => {
          const isActive = button.dataset.theme === selectedTheme;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
  }

  function updateDeckOptionState(selectedDeck) {
      if (!elements.deckOptionButtons || !elements.deckOptionButtons.length) return;
      elements.deckOptionButtons.forEach((button) => {
          const isActive = button.dataset.deck === selectedDeck;
          button.classList.toggle('active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
  }

  function applyDeckTheme(deck = userSettings.deck) {
      const selected = deck || DEFAULT_SETTINGS.deck;
      document.documentElement.setAttribute('data-deck', selected);
      updateDeckOptionState(selected);
  }

  function setDeckPreference(deck) {
      const normalized = deck || DEFAULT_SETTINGS.deck;
      userSettings.deck = normalized;
      persistUserSettings();
      applyDeckTheme(normalized);
  }

  function applyEffectsSettings() {
      document.documentElement.setAttribute('data-animations', userSettings.animations ? 'on' : 'off');
      document.documentElement.setAttribute('data-haptics', userSettings.haptics ? 'on' : 'off');
      if (elements.toggleAnimations) {
          elements.toggleAnimations.checked = Boolean(userSettings.animations);
      }
      if (elements.toggleHaptics) {
          elements.toggleHaptics.checked = Boolean(userSettings.haptics);
      }
  }

  function persistUserSettings() {
      safeStorageSet('kq_theme_pref', userSettings.theme);
      if (userSettings.theme === 'light' || userSettings.theme === 'dark') {
          safeStorageSet('kq_theme', userSettings.theme);
      }
      safeStorageSet('kq_deck_theme', userSettings.deck);
      safeStorageSet('kq_animations_enabled', userSettings.animations ? '1' : '0');
      safeStorageSet('kq_haptics_enabled', userSettings.haptics ? '1' : '0');
  }

  function loadUserSettings() {
      const storedTheme = safeStorageGet('kq_theme_pref') || safeStorageGet('kq_theme');
      const storedDeck = safeStorageGet('kq_deck_theme');
      const storedAnimations = safeStorageGet('kq_animations_enabled');
      const storedHaptics = safeStorageGet('kq_haptics_enabled');
      const theme = (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto')
          ? storedTheme
          : DEFAULT_SETTINGS.theme;
      return {
          theme,
          deck: storedDeck || DEFAULT_SETTINGS.deck,
          animations: storedAnimations === null ? DEFAULT_SETTINGS.animations : storedAnimations !== '0',
          haptics: storedHaptics === null ? DEFAULT_SETTINGS.haptics : storedHaptics !== '0'
      };
  }

  function loadLocalStats() {
      const raw = safeStorageGet('kq_local_stats');
      if (!raw) return { ...DEFAULT_STATS };
      try {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_STATS, ...parsed };
      } catch (_) {
          return { ...DEFAULT_STATS };
      }
  }

  function storeLocalStats() {
      safeStorageSet('kq_local_stats', JSON.stringify(localStats));
  }

  function loadUnlockedAchievements() {
      const raw = safeStorageGet('kq_achievements');
      if (!raw) return [];
      try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
          return [];
      }
  }

  function persistAchievements() {
      safeStorageSet('kq_achievements', JSON.stringify(unlockedAchievements));
  }

  function isAchievementUnlocked(id) {
      return unlockedAchievements.some((item) => item.id === id);
  }

  function unlockAchievement(id) {
      if (isAchievementUnlocked(id)) return;
      const achievement = ACHIEVEMENTS.find((item) => item.id === id);
      unlockedAchievements.push({ id, unlockedAt: new Date().toISOString() });
      persistAchievements();
      renderAchievements();
      if (achievement) {
          showSuccessMessage(`Новое достижение: ${achievement.title}`);
      }
  }

  function renderAchievements() {
      if (!elements.achievementsList) return;
      const container = elements.achievementsList;
      container.innerHTML = '';
      const unlockedSet = new Set(unlockedAchievements.map((item) => item.id));
      ACHIEVEMENTS.forEach((achievement) => {
          const badge = document.createElement('div');
          const isUnlocked = unlockedSet.has(achievement.id);
          badge.className = 'achievement-badge' + (isUnlocked ? ' is-unlocked' : '');

          const title = document.createElement('div');
          title.className = 'achievement-title';
          title.textContent = achievement.title;
          badge.appendChild(title);

          const description = document.createElement('div');
          description.className = 'achievement-desc';
          description.textContent = achievement.description;
          badge.appendChild(description);

          if (isUnlocked) {
              const meta = unlockedAchievements.find((item) => item.id === achievement.id);
              if (meta && meta.unlockedAt) {
                  const metaElement = document.createElement('div');
                  metaElement.className = 'achievement-meta';
                  metaElement.textContent = new Date(meta.unlockedAt).toLocaleDateString('ru-RU');
                  badge.appendChild(metaElement);
              }
          } else {
              badge.setAttribute('aria-disabled', 'true');
          }

          container.appendChild(badge);
      });

      if (!ACHIEVEMENTS.length) {
          const placeholder = document.createElement('div');
          placeholder.className = 'achievement-empty';
          placeholder.textContent = 'Достижения пока не добавлены';
          container.appendChild(placeholder);
      }
  }

  function updateLocalStatsOnWin(result) {
      localStats.totalWins += 1;
      localStats.lastWinTime = result.time;
      localStats.lastWinMoves = result.moves;
      if (localStats.bestTime === null || result.time < localStats.bestTime) {
          localStats.bestTime = result.time;
      }
      if (localStats.bestMoves === null || result.moves < localStats.bestMoves) {
          localStats.bestMoves = result.moves;
      }
      localStats.winStreak = (localStats.winStreak || 0) + 1;
      localStats.longestStreak = Math.max(localStats.longestStreak || 0, localStats.winStreak);
      storeLocalStats();
  }

  function evaluateAchievements(result) {
      const context = { ...localStats, lastWinTime: result.time, lastWinMoves: result.moves };
      ACHIEVEMENTS.forEach((achievement) => {
          if (isAchievementUnlocked(achievement.id)) return;
          try {
              if (achievement.check(context)) {
                  unlockAchievement(achievement.id);
              }
          } catch (error) {
              console.warn('Ошибка проверки достижения', achievement.id, error);
          }
      });
  }

  function safeStorageGet(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeStorageSet(key, val) {
      try { localStorage.setItem(key, val); } catch (_) {}
  }
  
  // Поиск лучшей цели для автоматического перемещения
  function findBestTarget(cardElement) {
      const card = {
          suit: cardElement.dataset.suit,
          value: cardElement.dataset.value
      };
      
      // Сначала пробуем foundation
      for (let i = 0; i < 4; i++) {
          if (canMoveToFoundation(card, i)) {
              return { type: 'foundation', index: i };
          }
      }
      
      // Затем tableau
      for (let i = 0; i < 7; i++) {
          if (canMoveToTableau(card, i)) {
              return { type: 'tableau', index: i };
          }
      }
      
      return null;
  }
  
  // Поиск лучшего хода для подсказки
  function setupDoubleClickEvents() {
      document.addEventListener('dblclick', (e) => {
          const cardEl = e.target.closest('.card');
          if (!cardEl) return;
          const source = getCardLocation(cardEl);
          if (!source) return;
          // В tableau разрешаем даблклик только на верхней карте стопки
          if (source.type === 'tableau') {
              const pile = gameState.tableau[source.index];
              const topIndex = pile.length - 1;
              const cardIndex = Number.isInteger(parseInt(cardEl.dataset.cardIndex)) ? parseInt(cardEl.dataset.cardIndex) : topIndex;
              if (cardIndex !== topIndex) return;
          }
          // Находим лучшую цель: сначала foundation, затем tableau
          const best = findBestTarget(cardEl);
          if (!best) return;
          if (best.type === 'foundation') {
              const card = { suit: cardEl.dataset.suit, value: cardEl.dataset.value };
              moveCards([card], source, best);
          } else if (best.type === 'tableau') {
              // В tableau переносим всю последовательность, начиная с выбранной карты
              const seq = getCardSequence(cardEl);
              if (seq && seq.length) {
                  moveCards(seq, source, best);
              }
          }
      });
  }
  
  // Проверка наличия доступных ходов
  function hasAnyMoves() {
      // 1) Любая открытая карта из tableau может на любое tableau по правилу
      for (let t = 0; t < 7; t++) {
          const pile = gameState.tableau[t];
          for (let i = 0; i < pile.length; i++) {
              const card = pile[i];
              if (!card.faceUp) continue;
              // Можно переносить как одиночную карту (быстрая проверка)
              for (let dest = 0; dest < 7; dest++) {
                  if (dest === t) continue;
                  if (canMoveToTableau(card, dest)) return true;
              }
              // И в foundation
              for (let f = 0; f < 4; f++) {
                  if (canMoveToFoundation(card, f)) return true;
              }
          }
      }
      // 2) Верхняя карта из waste
      if (gameState.waste.length > 0) {
          const top = gameState.waste[gameState.waste.length - 1];
          for (let dest = 0; dest < 7; dest++) {
              if (canMoveToTableau(top, dest)) return true;
          }
          for (let f = 0; f < 4; f++) {
              if (canMoveToFoundation(top, f)) return true;
          }
      }
      // 3) Если есть карты в stock — всегда есть ход (можно вытянуть)
      if (gameState.stock.length > 0) return true;
      return false;
  }
  
  function notifyNoMovesIfNeeded() {
      if (!hasAnyMoves()) {
          const message = 'Нет доступных ходов. Конец игры.';
          if (tg && typeof tg.showPopup === 'function') {
              try {
                  tg.showPopup({ title: 'Игра окончена', message, buttons: [{ type: 'ok', text: 'Ок' }] });
              } catch (e) {
                  alert(message);
              }
          } else {
              alert(message);
          }
      }
  }
  
  // Инициализация при загрузке страницы
  document.addEventListener('DOMContentLoaded', () => {
      initGame();
      initBackgroundAnimation();
      try { if (tg) injectMobileTouchStyles(); } catch (e) {}
      
      // Обработка изменения размера окна
      window.addEventListener('resize', () => {
          updateDisplay();
      });
      
      // Обработка изменения темы Telegram
      if (tg && tg.onEvent) {
          tg.onEvent('themeChanged', () => {
              if (userSettings.theme === 'auto') {
                  applyTheme('auto');
              }
          });
      }
  });
  
  // Инициализация анимированного фона
  function initBackgroundAnimation() {
      const background = document.querySelector('.background-animation');
      if (!background) return;
      
      // Случайно расставляем плавающие карты, чтобы не было "призрака" в одном месте
      const cards = background.querySelectorAll('.floating-card');
      cards.forEach((card) => {
          card.style.setProperty('--rand-x', Math.random().toString());
          card.style.setProperty('--rand-y', Math.random().toString());
      });

      // Добавляем интерактивность при движении мыши
      document.addEventListener('mousemove', (e) => {
          const cards = document.querySelectorAll('.floating-card');
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          cards.forEach((card, index) => {
              const rect = card.getBoundingClientRect();
              const cardCenterX = rect.left + rect.width / 2;
              const cardCenterY = rect.top + rect.height / 2;
              
              const distance = Math.sqrt(
                  Math.pow(mouseX - cardCenterX, 2) + 
                  Math.pow(mouseY - cardCenterY, 2)
              );
              
              if (distance < 100) {
                  const angle = Math.atan2(mouseY - cardCenterY, mouseX - cardCenterX);
                  const force = (100 - distance) / 100;
                  card.style.transform += ` translate(${Math.cos(angle) * force * 5}px, ${Math.sin(angle) * force * 5}px)`;
              }
          });
      });
      
      // Убираем эффект при клике - пузыри больше не нужны
      // document.addEventListener('click', (e) => {
      //     if (e.target.closest('.game-container')) {
      //         createRippleEffect(e.clientX, e.clientY);
      //     }
      // });
  }
  
  // Удаляем функцию createRippleEffect - пузыри больше не нужны
  // function createRippleEffect(x, y) { ... }
  
  // Удаляем CSS для эффекта волн
  // const rippleStyle = document.createElement('style');
  // rippleStyle.textContent = `...`;
  // document.head.appendChild(rippleStyle);
  

function injectMobileTouchStyles() {

  if (document.getElementById('mobile-touch-style')) return;
  const style = document.createElement('style');
  style.id = 'mobile-touch-style';
  style.textContent = `
html, body {
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}
.game-container {
  position: fixed;
  inset: 0;
  width: 100%;
  height: calc(var(--tg-vh, 100dvh) - var(--tg-csafe-top, 0px) - var(--tg-csafe-bottom, 0px));
  padding-top: var(--tg-csafe-top, 0px);
  padding-bottom: var(--tg-csafe-bottom, 0px);
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.card, .tableau-slot, .foundation-slot, #waste {
  touch-action: none;
}`;
  document.head.appendChild(style);
}

// Функции для работы с темой и прогресс-баром
// Legacy fallback kept for older code paths; delegates to main toggleTheme above
function legacyToggleTheme() { try { toggleTheme(); } catch (_) {} }

// Legacy fallback for reading theme; main applyTheme handles actual state
function legacyApplyStoredTheme() { try { applyTheme(); } catch (_) {} }

  function updateProgressBar(extra = 0) {
      const progressBar = document.querySelector('.progress-bar');
      if (!progressBar) return;
      const totalFoundationCards = gameState.foundation.reduce((sum, pile) => sum + pile.length, 0);
      const percentage = Math.min(100, ((totalFoundationCards / 52) * 100) + extra);
      progressBar.style.width = percentage + '%';
  }

// Улучшенная система подсказок
function getCardName(card) {
    return `${card.value}${card.suit}`;
}

// Улучшенная функция поиска лучшего хода
function getApiBases() {
    let primary = '';
    try {
        if (location && location.origin) {
            primary = location.origin.replace(/\/$/, '') + '/api/api/v1';
        }
    } catch (_) {}
    const fallback = 'https://zioj.duckdns.org/api/api/v1';
    return [primary, fallback].filter(Boolean);
}

async function fetchJson(path) {
    const bases = getApiBases();
    for (const base of bases) {
        const url = base + path;
        try {
            console.log('Запрос к API:', url);
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (e) {
            console.warn('Ошибка запроса', url, e);
            continue;
        }
    }
    return null;
}

// Override API functions if defined earlier
try { fetchStats = async function() { return await fetchJson('/stats'); }; } catch (_) {}
try { fetchLeaderboard = async function() { return await fetchJson('/leaderboard'); }; } catch (_) {}
try {
    const prevShowLeaderboard = typeof showLeaderboard === 'function' ? showLeaderboard : null;
    showLeaderboard = async function() {
        const leaderboard = await fetchJson('/leaderboard');
        if (typeof showStatsModal === 'function') showStatsModal();
        if (typeof renderAchievements === 'function') renderAchievements();
        const list = document.getElementById('leaderboard-list');
        if (typeof renderLeaderboard === 'function') {
            renderLeaderboard(Array.isArray(leaderboard) ? leaderboard : []);
        } else if (list) {
            if (Array.isArray(leaderboard) && leaderboard.length) {
                list.textContent = JSON.stringify(leaderboard);
            } else {
                list.innerHTML = '<div class="leaderboard-empty">Данных пока нет</div>';
            }
        }
    };
} catch (_) {}













