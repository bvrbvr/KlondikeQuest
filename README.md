# Klondike Quest - Telegram Mini App

Классическая карточная игра Klondike Solitaire, реализованная как Telegram Mini App с использованием HTML, CSS и JavaScript.

## 🎮 Особенности

- **Полная интеграция с Telegram Web App API**
- **Адаптивный дизайн** для мобильных и десктопных устройств
- **Поддержка тем Telegram** (светлая/темная)
- **Drag & Drop** для десктопа и touch-события для мобильных
- **Таймер и счетчик ходов**
- **Функция отмены хода (Undo)**
- **Автоматическое сохранение результатов**
- **Тактильная отдача** на мобильных устройствах
- **Анимации и плавные переходы**

## 🚀 Быстрый старт

### Локальная разработка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd KlondikeQuest
```

2. Откройте `index.html` в браузере или запустите локальный сервер:
```bash
# Используя Python
python -m http.server 8000

# Используя Node.js
npx serve .

# Используя PHP
php -S localhost:8000
```

3. Откройте `http://localhost:8000` в браузере

### Развертывание в Telegram

1. **Создайте бота** через [@BotFather](https://t.me/BotFather)
2. **Настройте Mini App** в BotFather:
   ```
   /newapp
   Выберите бота
   Введите название: Klondike Quest
   Введите описание: Классический пасьянс
   Введите URL: https://your-domain.com
   ```

3. **Загрузите файлы** на хостинг с поддержкой HTTPS:
   - Vercel: `vercel --prod`
   - Netlify: Перетащите папку в Netlify
   - GitHub Pages: Включите в настройках репозитория

4. **Обновите URL** в настройках бота

## 📁 Структура проекта

```
KlondikeQuest/
├── index.html          # Основной HTML файл
├── styles.css          # Стили и адаптивность
├── script.js           # Игровая логика и Telegram API
├── README.md           # Документация
└── tz_app.txt          # Техническое задание
```

## 🎯 Игровая механика

### Правила игры
- **Цель**: Собрать все 52 карты в 4 стопки foundation по мастям (от A до K)
- **Tableau**: 7 стопок для раскладки карт в убывающем порядке с чередованием цветов
- **Stock**: Колода закрытых карт, клик открывает одну карту в waste
- **Foundation**: 4 ячейки для финальных стопок по мастям

### Управление
- **Десктоп**: Drag & Drop карт
- **Мобильные**: Touch-события с автоматическим поиском лучшей цели
- **Кнопки**: "Новая игра", "Отменить ход"

## 🔧 Технические детали

### Telegram Web App API
```javascript
// Инициализация
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Темы
tg.themeParams.bg_color
tg.themeParams.text_color

// Тактильная отдача
tg.HapticFeedback.impactOccurred('light');

// Сохранение данных
tg.CloudStorage.setItem('bestResult', JSON.stringify(result));
```

### Адаптивность
- **Мобильные**: 320px - 768px (3-4 колонки tableau)
- **Планшеты**: 768px - 1024px (4-7 колонок tableau)
- **Десктоп**: 1024px+ (7 колонок tableau)

### Производительность
- **Оптимизированные анимации** с `transform` и `will-change`
- **Минимальные DOM-операции** при обновлении
- **Lazy loading** для карт
- **Debounced resize** обработчик

## 🎨 Кастомизация

### Цвета и темы
CSS переменные в `styles.css`:
```css
:root {
    --bg-color: #ffffff;
    --text-color: #000000;
    --card-bg: #ffffff;
    --btn-primary-bg: #007bff;
    /* ... */
}
```

### Добавление новых функций
1. **Новые анимации**: Добавьте в `styles.css`
2. **Дополнительные правила**: Расширьте функции в `script.js`
3. **Новые API**: Интегрируйте в существующие обработчики

## 🔒 Безопасность

### Валидация данных Telegram
```javascript
// Проверка HMAC для initData (если используется backend)
function validateInitData(initData, botToken) {
    const secret = crypto.createHmac('sha256', 'WebAppData');
    const hash = secret.update(initData).digest('hex');
    return hash === expectedHash;
}
```

### Лучшие практики
- ✅ Используйте HTTPS
- ✅ Валидируйте все входные данные
- ✅ Ограничьте размер сохраняемых данных
- ✅ Обрабатывайте ошибки API

## 📱 Тестирование

### Браузеры
- ✅ Chrome 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Edge 90+

### Устройства
- ✅ iPhone (iOS 14+)
- ✅ Android (Chrome 90+)
- ✅ iPad (Safari 14+)
- ✅ Десктоп (все современные браузеры)

### Telegram
- ✅ Telegram Web App (встроенный браузер)
- ✅ Telegram Desktop
- ✅ Telegram Mobile

## 🚀 Развертывание

### Vercel (рекомендуется)
```bash
npm i -g vercel
vercel --prod
```

### Netlify
1. Перетащите папку в Netlify
2. Настройте домен
3. Обновите URL в BotFather

### GitHub Pages
1. Включите Pages в настройках репозитория
2. Выберите ветку `main`
3. Используйте URL: `https://username.github.io/repo-name`

## 📊 Аналитика и мониторинг

### Telegram Analytics
```javascript
// Отправка событий
tg.sendData(JSON.stringify({
    action: 'game_completed',
    time: gameState.timer,
    moves: gameState.moves
}));
```

### Ошибки и логи
```javascript
// Логирование ошибок
window.addEventListener('error', (e) => {
    console.error('Game error:', e.error);
    // Отправка в аналитику
});
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей.

## 🆘 Поддержка

- **Issues**: Создайте issue в GitHub
- **Telegram**: Свяжитесь с разработчиком бота
- **Документация**: [Telegram Web App API](https://core.telegram.org/bots/webapps)

## 🔄 Обновления

### v1.0.0 (текущая)
- ✅ Базовая игровая механика
- ✅ Интеграция с Telegram
- ✅ Адаптивный дизайн
- ✅ Drag & Drop
- ✅ Сохранение результатов

### Планируемые функции
- [ ] Звуковые эффекты
- [ ] Статистика игр
- [ ] Достижения
- [ ] Мультиплеер
- [ ] Кастомизация карт

---

**Приятной игры! 🎮**
