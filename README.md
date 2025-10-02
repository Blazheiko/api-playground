# API Documentation Playground

Vue 3 приложение для интерактивного просмотра и тестирования API маршрутов.

## 🚀 Быстрый старт

### Предварительные требования

1. **Node.js** 20.19.0 или выше
2. **API сервер** должен быть запущен на `http://127.0.0.1:8088`

### Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

## 📋 Требования к API

API сервер должен предоставлять endpoint:

```
GET http://127.0.0.1:8088/api/doc/routes
```

### Формат ответа

```json
{
  "httpRoutes": [
    {
      "prefix": "users",
      "description": "User Management",
      "middlewares": ["auth"],
      "rateLimit": {
        "windowMs": 60000,
        "maxRequests": 100
      },
      "group": [
        {
          "url": "/users/:id",
          "method": "get",
          "description": "Get user by ID",
          "handler": "getUserById",
          "validator": "userIdSchema"
        }
      ]
    }
  ],
  "wsRoutes": [],
  "validationSchemas": {
    "userIdSchema": {
      "id": {
        "type": "number",
        "required": true,
        "description": "User ID"
      }
    }
  },
  "responseTypes": {
    "UserResponse": {
      "fields": {
        "id": { "type": "number", "required": true, "example": 1 },
        "name": { "type": "string", "required": true, "example": "John Doe" }
      }
    }
  },
  "handlerTypeMapping": {
    "getUserById": "UserResponse"
  }
}
```

## ✨ Возможности

- 📚 Автоматическая загрузка и отображение API маршрутов
- 🔍 Поиск по маршрутам
- 🌓 Темная/светлая тема
- 🧪 Интерактивное тестирование API
- 📊 Детальная информация о валидации и ответах
- 🔗 Уникальные URL для каждого маршрута
- 📱 Адаптивный дизайн

## 🛠️ Технологии

- Vue 3 (Composition API)
- TypeScript
- Pinia (State Management)
- Vue Router
- Tailwind CSS
- Vite

## 📖 Дополнительная документация

Смотрите [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) для подробной документации по структуре проекта и использованию.

## 🔧 Настройка

### Изменение API endpoint

Если ваш API находится по другому адресу, измените `target` в `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://YOUR_API_URL',  // Замените на ваш URL
      changeOrigin: true,
      secure: false,
    },
  },
}
```

## 📝 Скрипты

```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка для production
npm run preview      # Предпросмотр production сборки
npm run type-check   # Проверка типов TypeScript
npm run lint         # Линтинг кода
npm run format       # Форматирование кода
```

## 🐛 Устранение проблем

### Ошибка "Failed to fetch"

Убедитесь, что:

1. API сервер запущен на `http://127.0.0.1:8088`
2. Endpoint `/api/doc/routes` доступен
3. Dev сервер перезапущен после изменения `vite.config.ts`

### Стили не применяются

1. Убедитесь, что Tailwind CSS установлен
2. Проверьте, что `tailwind.config.js` создан
3. Перезапустите dev сервер

## 📄 Лицензия

MIT
