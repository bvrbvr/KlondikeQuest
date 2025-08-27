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
    stock: document.getElementById('stock'),
    waste: document.getElementById('waste'),
    winModal: document.getElementById('win-modal'),
    shareResultBtn: document.getElementById('share-result-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    winTime: document.getElementById('win-time'),
    winMoves: document.getElementById('win-moves')
};

// Инициализация игры
function initGame() {
    createDeck();
    shuffleDeck();
    dealCards();
    updateDisplay();
    setupEventListeners();
    applyTheme();
    startTimer();
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
    elements.shareResultBtn.addEventListener('click', shareResult);
    elements.playAgainBtn.addEventListener('click', () => {
        hideWinModal();
        newGame();
    });
    
    // Stock клик
    elements.stock.addEventListener('click', drawFromStock);
    
    // Drag and Drop
    setupDragAndDrop();
    
    // Touch события для мобильных устройств
    setupTouchEvents();
    
    // Двойной клик для тузов
    setupDoubleClickEvents();
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
    }
}

// Показ модального окна победы
function showWinModal() {
    elements.winTime.textContent = formatTime(gameState.timer);
    elements.winMoves.textContent = gameState.moves;
    elements.winModal.classList.remove('hidden');
}

// Скрытие модального окна победы
function hideWinModal() {
    elements.winModal.classList.add('hidden');
}

// Сохранение результата игры
function saveGameResult() {
    const result = {
        time: gameState.timer,
        moves: gameState.moves,
        date: new Date().toISOString()
    };
    
    // Сохранение в Telegram Cloud Storage
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.setItem('bestResult', JSON.stringify(result));
    }
    
    // Сохранение в localStorage как резерв
    localStorage.setItem('klondikeBestResult', JSON.stringify(result));
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
    if (tg && tg.themeParams) {
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
    
    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        updateDisplay();
    });
    
    // Обработка изменения темы Telegram
    if (tg && tg.onEvent) {
        tg.onEvent('themeChanged', applyTheme);
    }
});
