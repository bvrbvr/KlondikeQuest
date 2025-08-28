// Инициализация Telegram Web App
let tg;
if (window.Telegram && window.Telegram.WebApp) {
	tg = window.Telegram.WebApp;
	tg.ready();
	tg.expand();
	// Полностью отключаем тактильную отдачу SDK (версии ниже 6.1 спамят предупреждения)
	if (tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function') {
		try { tg.HapticFeedback.impactOccurred = function noop() {}; } catch (e) {}
	}
}

// Константы игры
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = {
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
	spades: '♠'
};

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
    deckToggleBtn: document.getElementById('deck-toggle-btn')
};

// Инициализация игры
function initGame() {
    createDeck();
    shuffleDeck();
    dealCards();
    updateDisplay();
    setupEventListeners();
    applyTheme();
    applyDeck();
    // Таймер не запускается автоматически - нужно сделать первый ход
    // startTimer();
    // Проверка отсутствия ходов на старте (на случай тупика после раздачи)
    notifyNoMovesIfNeeded();
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
}

// Обновление tableau
function updateTableau() {
    const tableauSlots = document.querySelectorAll('.tableau-slot');
    
    tableauSlots.forEach((slot, index) => {
        slot.innerHTML = '';
        const cards = gameState.tableau[index];
        
        cards.forEach((card, cardIndex) => {
            const cardElement = createCardElement(card, cardIndex === cards.length - 1);
            cardElement.dataset.slotIndex = index;
            cardElement.dataset.cardIndex = cardIndex;
            slot.appendChild(cardElement);
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
	
	if (card.faceUp) {
		cardElement.innerHTML = `
			<div class="card-top">
				<span class="card-value">${card.value}</span>
				<span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
			</div>
			<div class="card-bottom">
				<span class="card-value">${card.value}</span>
				<span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
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
    // Гарантируем наличие кнопок темы и колоды (если отсутствуют в HTML)
    ensureControlButtons();
    // Переключение темы
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }
    // Переключение колоды
    if (elements.deckToggleBtn) {
        elements.deckToggleBtn.addEventListener('click', toggleDeck);
    }
    
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
    const controls = document.querySelector('.game-header .game-controls');
    if (!controls) return;
    if (!elements.themeToggleBtn) {
        const btn = document.createElement('button');
        btn.id = 'theme-toggle-btn';
        btn.className = 'btn btn-secondary';
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        btn.textContent = 'Тема: ' + (current === 'dark' ? 'Тёмная' : 'Светлая');
        controls.appendChild(btn);
        elements.themeToggleBtn = btn;
    }
    if (!elements.deckToggleBtn) {
        const btn = document.createElement('button');
        btn.id = 'deck-toggle-btn';
        btn.className = 'btn btn-secondary';
        const deck = document.documentElement.getAttribute('data-deck') || 'blue';
        btn.textContent = 'Колода: ' + (deck === 'red' ? 'Красная' : 'Синяя');
        controls.appendChild(btn);
        elements.deckToggleBtn = btn;
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
    
    document.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.card');
        if (card && card.draggable) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            draggedElement = card;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (draggedElement) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            }
        }
    });
    
    document.addEventListener('touchend', (e) => {
        if (draggedElement) {
            const touchEndTime = Date.now();
            const touchDuration = touchEndTime - touchStartTime;
            
            if (touchDuration < 200) {
                // Короткое касание - попытка автоматического перемещения
                const target = findBestTarget(draggedElement);
                if (target) {
                    const cards = getCardSequence(draggedElement);
                    const source = getCardLocation(draggedElement);
                    moveCards(cards, source, target);
                }
            }
            
            draggedElement.style.transform = '';
            draggedElement = null;
        }
    });
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
        
        // Показ popup в Telegram
        if (tg && tg.showPopup) {
            tg.showPopup({
                title: 'Поздравляем!',
                message: `Вы собрали все карты за ${formatTime(gameState.timer)} и ${gameState.moves} ходов!`,
                buttons: [
                    { type: 'ok', text: 'Отлично!' }
                ]
            });
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
function showHint() {
    const bestMove = findBestMove();
    
    if (!bestMove) {
        // Если нет доступных ходов, предлагаем взять карту из колоды
        if (gameState.stock.length > 0) {
            showHintMessage('🎴 Возьмите карту из колоды - возможно, появится полезный ход!');
        } else {
            showHintMessage('😔 Нет доступных ходов. Попробуйте отменить последний ход или начать новую игру.');
        }
        return;
    }
    
    // Подсвечиваем карту и цель
    highlightHint(bestMove);
    
    // Показываем сообщение с подсказкой
    showHintMessage(bestMove.description);
}

// Подсветка подсказки
function highlightHint(move) {
    // Убираем предыдущие подсветки
    clearHintHighlights();
    
    // Подсвечиваем источник
    const sourceElement = getElementByLocation(move.source);
    if (sourceElement) {
        sourceElement.classList.add('hint-highlight');
    }
    
    // Подсвечиваем цель
    const targetElement = getElementByLocation(move.target);
    if (targetElement) {
        targetElement.classList.add('hint-highlight');
    }
    
    // Убираем подсветку через 3 секунды
    setTimeout(clearHintHighlights, 3000);
}

// Получение элемента по местоположению
function getElementByLocation(location) {
    if (location.type === 'tableau') {
        return document.querySelector(`[data-slot="tableau-${location.index}"]`);
    } else if (location.type === 'foundation') {
        return document.querySelector(`[data-slot="foundation-${location.index}"]`);
    } else if (location.type === 'waste') {
        return document.getElementById('waste');
    }
    return null;
}

// Очистка подсветки подсказок
function clearHintHighlights() {
    document.querySelectorAll('.hint-highlight').forEach(el => {
        el.classList.remove('hint-highlight');
    });
}

// Показ сообщения с подсказкой
function showHintMessage(message) {
    // Создаем временное сообщение
    const hintMessage = document.createElement('div');
    hintMessage.className = 'hint-message';
    hintMessage.textContent = message;
    hintMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 1001;
        pointer-events: none;
        animation: hint-fade-in-out 3s ease-in-out forwards;
    `;
    
    document.body.appendChild(hintMessage);
    
    // Удаляем сообщение через 3 секунды
    setTimeout(() => {
        if (hintMessage.parentNode) {
            hintMessage.parentNode.removeChild(hintMessage);
        }
    }, 3000);
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
	const url = getApiBase() + '/results';
	
	console.log('Отправка результата на:', url);
	
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...result, userId, username })
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

function getApiBase() {
    const envHost = 'zioj.duckdns.org';
    const baseUrl = 'https://' + envHost + '/api/api/v1/';
    
    console.log('API Base URL:', baseUrl);
    return baseUrl;
}

function showStatsPopup(stats) {
	if (!stats) {
		if (tg && tg.showPopup) {
			return tg.showPopup({ title: 'Статистика', message: 'Статистика недоступна', buttons: [{ type: 'ok', text: 'Ок' }] });
		}
		return alert('Статистика недоступна');
	}
	const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
	const msg = [
		`Игр: ${stats.totalGames}`,
		stats.bestTime != null ? `Лучшее время: ${fmt(stats.bestTime)}` : null,
		stats.bestMoves != null ? `Меньше ходов: ${stats.bestMoves}` : null,
		stats.averageTime != null ? `Среднее время: ${fmt(stats.averageTime)}` : null,
		stats.averageMoves != null ? `Средние ходы: ${stats.averageMoves}` : null
	].filter(Boolean).join('\n');
	if (tg && tg.showPopup) {
		tg.showPopup({ title: 'Статистика', message: msg, buttons: [{ type: 'ok', text: 'Ок' }] });
	} else {
		alert(msg);
	}
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
	const stats = await fetchStats();
	showStatsPopup(stats);
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

// Применение темы Telegram
function applyTheme() {
    // Приоритет локального сохранения пользователя
    const savedTheme = safeStorageGet('kq_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (tg && tg.themeParams) {
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
        
        // Определение темной темы
        const isDark = theme.bg_color && theme.bg_color.toLowerCase().includes('1a1a1a');
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    updateThemeToggleLabel();
}

// Применение выбранной колоды (оформление рубашки)
function applyDeck() {
    const savedDeck = safeStorageGet('kq_deck') || 'blue';
    document.documentElement.setAttribute('data-deck', savedDeck);
    updateDeckToggleLabel();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    safeStorageSet('kq_theme', next);
    updateThemeToggleLabel();
    
    // Обновляем фон при смене темы
    updateBackgroundTheme();
}

function toggleDeck() {
    const current = document.documentElement.getAttribute('data-deck') || 'blue';
    const next = current === 'blue' ? 'red' : 'blue';
    document.documentElement.setAttribute('data-deck', next);
    safeStorageSet('kq_deck', next);
    updateDeckToggleLabel();
}

function updateThemeToggleLabel() {
    if (!elements.themeToggleBtn) return;
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    elements.themeToggleBtn.textContent = 'Тема: ' + (current === 'dark' ? 'Тёмная' : 'Светлая');
}

function updateDeckToggleLabel() {
    if (!elements.deckToggleBtn) return;
    const current = document.documentElement.getAttribute('data-deck') || 'blue';
    elements.deckToggleBtn.textContent = 'Колода: ' + (current === 'red' ? 'Красная' : 'Синяя');
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
function findBestMove() {
    const moves = [];
    
    // 1. Проверяем тузы (приоритет 1) - самый высокий приоритет
    for (let t = 0; t < 7; t++) {
        const pile = gameState.tableau[t];
        if (pile.length > 0) {
            const topCard = pile[pile.length - 1];
            if (topCard.faceUp && topCard.value === 'A') {
                for (let f = 0; f < 4; f++) {
                    if (canMoveToFoundation(topCard, f)) {
                        moves.push({
                            priority: 1,
                            source: { type: 'tableau', index: t },
                            target: { type: 'foundation', index: f },
                            card: topCard,
                            description: `🎯 Переместите ${topCard.value}${SUIT_SYMBOLS[topCard.suit]} в foundation - это откроет карту под ней!`
                        });
                    }
                }
            }
        }
    }
    
    // 2. Проверяем карты из waste в foundation (приоритет 2)
    if (gameState.waste.length > 0) {
        const topCard = gameState.waste[gameState.waste.length - 1];
        for (let f = 0; f < 4; f++) {
            if (canMoveToFoundation(topCard, f)) {
                moves.push({
                    priority: 2,
                    source: { type: 'waste', index: 0 },
                    target: { type: 'foundation', index: f },
                    card: topCard,
                    description: `⭐ Переместите ${topCard.value}${SUIT_SYMBOLS[topCard.suit]} из waste в foundation`
                });
            }
        }
    }
    
    // 3. Проверяем королей для пустых tableau (приоритет 3)
    for (let t = 0; t < 7; t++) {
        if (gameState.tableau[t].length === 0) {
            // Ищем королей в других tableau
            for (let sourceT = 0; sourceT < 7; sourceT++) {
                if (sourceT === t) continue;
                const pile = gameState.tableau[sourceT];
                if (pile.length > 0) {
                    const topCard = pile[pile.length - 1];
                    if (topCard.faceUp && topCard.value === 'K') {
                        moves.push({
                            priority: 3,
                            source: { type: 'tableau', index: sourceT },
                            target: { type: 'tableau', index: t },
                            card: topCard,
                            description: `👑 Переместите ${topCard.value}${SUIT_SYMBOLS[topCard.suit]} в пустой tableau - освободит место`
                        });
                    }
                }
            }
        }
    }
    
    // 4. Проверяем ходы, которые откроют закрытые карты (приоритет 4)
    for (let t = 0; t < 7; t++) {
        const pile = gameState.tableau[t];
        if (pile.length > 1) {
            const topCard = pile[pile.length - 1];
            const cardBelow = pile[pile.length - 2];
            if (topCard.faceUp && !cardBelow.faceUp) {
                // Проверяем, можно ли переместить верхнюю карту
                for (let targetT = 0; targetT < 7; targetT++) {
                    if (targetT === t) continue;
                    if (canMoveToTableau(topCard, targetT)) {
                        moves.push({
                            priority: 4,
                            source: { type: 'tableau', index: t },
                            target: { type: 'tableau', index: targetT },
                            card: topCard,
                            description: `🔓 Переместите ${topCard.value}${SUIT_SYMBOLS[topCard.suit]} - откроет карту под ней!`
                        });
                        break; // Нашли один ход, достаточно
                    }
                }
            }
        }
    }
    
    // 5. Проверяем ходы из waste в tableau (приоритет 5)
    if (gameState.waste.length > 0) {
        const topCard = gameState.waste[gameState.waste.length - 1];
        for (let t = 0; t < 7; t++) {
            if (canMoveToTableau(topCard, t)) {
                moves.push({
                    priority: 5,
                    source: { type: 'waste', index: 0 },
                    target: { type: 'tableau', index: t },
                    card: topCard,
                    description: `📄 Переместите ${topCard.value}${SUIT_SYMBOLS[topCard.suit]} из waste в tableau`
                });
            }
        }
    }
    
    // 6. Проверяем обычные ходы в tableau (приоритет 6) - только если нет лучших вариантов
    if (moves.length === 0) {
        for (let t = 0; t < 7; t++) {
            const pile = gameState.tableau[t];
            if (pile.length > 0) {
                const topCard = pile[pile.length - 1];
                if (topCard.faceUp) {
                    for (let targetT = 0; targetT < 7; targetT++) {
                        if (targetT === t) continue;
                        if (canMoveToTableau(topCard, targetT)) {
                            moves.push({
                                priority: 6,
                                source: { type: 'tableau', index: t },
                                target: { type: 'tableau', index: targetT },
                                card: topCard,
                                description: `🔄 Переместите ${topCard.value}${SUIT_SYMBOLS[topCard.suit]} в tableau`
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Сортируем по приоритету и возвращаем лучший ход
    moves.sort((a, b) => a.priority - b.priority);
    return moves.length > 0 ? moves[0] : null;
}

// Настройка двойного клика для тузов
function setupDoubleClickEvents() {
	document.addEventListener('dblclick', (e) => {
		const cardEl = e.target.closest('.card');
		if (!cardEl) return;
		// Определяем источник и убеждаемся, что это верхняя карта стопки (для tableau)
		const source = getCardLocation(cardEl);
		if (!source) return;
		if (source.type === 'tableau') {
			const pile = gameState.tableau[source.index];
			const topIndex = pile.length - 1;
			const cardIndex = Number.isInteger(parseInt(cardEl.dataset.cardIndex)) ? parseInt(cardEl.dataset.cardIndex) : topIndex;
			if (cardIndex !== topIndex) return; // только верхняя карта
		}
		// Формируем цель foundation, если возможен ход
		const card = { suit: cardEl.dataset.suit, value: cardEl.dataset.value };
		let target = null;
		for (let f = 0; f < 4; f++) {
			if (canMoveToFoundation(card, f)) { target = { type: 'foundation', index: f }; break; }
		}
		if (target) {
			// Переносим только одну карту
			moveCards([card], source, target);
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
		if (tg && tg.showPopup) {
			tg.showPopup({ title: 'Игра окончена', message, buttons: [{ type: 'ok', text: 'Ок' }] });
		} else {
			alert(message);
		}
	}
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    initBackgroundAnimation();
    
    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        updateDisplay();
    });
    
    // Обработка изменения темы Telegram
    if (tg && tg.onEvent) {
        tg.onEvent('themeChanged', applyTheme);
    }
});

// Инициализация анимированного фона
function initBackgroundAnimation() {
    const background = document.querySelector('.background-animation');
    if (!background) return;
    
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
    
    // Добавляем эффект при клике
    document.addEventListener('click', (e) => {
        if (e.target.closest('.game-container')) {
            createRippleEffect(e.clientX, e.clientY);
        }
    });
}

// Создание эффекта волн при клике
function createRippleEffect(x, y) {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: fixed;
        left: ${x - 25}px;
        top: ${y - 25}px;
        width: 50px;
        height: 50px;
        border: 2px solid var(--btn-primary-bg);
        border-radius: 50%;
        opacity: 0.6;
        z-index: 0;
        pointer-events: none;
        animation: ripple 1s ease-out forwards;
    `;
    
    document.body.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 1000);
}

// Добавляем CSS для эффекта волн
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        0% {
            transform: scale(0);
            opacity: 0.6;
        }
        100% {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);
