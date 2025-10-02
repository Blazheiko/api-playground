# API Documentation - Vue 3 Application

Это приложение Vue 3 для отображения и тестирования API маршрутов. Оно автоматически загружает информацию о маршрутах с сервера и предоставляет интерактивный интерфейс для их просмотра и тестирования.

## Структура проекта

```
src/
├── assets/
│   ├── api-doc.css       # Стили для документации API
│   ├── base.css          # Базовые стили
│   └── main.css          # Главный файл стилей
├── components/
│   └── api/
│       ├── ApiHeader.vue     # Хедер с поиском и переключением темы
│       ├── ApiFilters.vue    # Фильтры HTTP/WS маршрутов
│       ├── ApiGroup.vue      # Группа маршрутов
│       ├── ApiRoute.vue      # Отдельный маршрут с деталями
│       └── TestForm.vue      # Форма для тестирования API
├── composables/
│   └── useTheme.ts       # Composable для работы с темой
├── stores/
│   └── api.ts            # Pinia store для управления данными API
├── utils/
│   └── apiHelpers.ts     # Вспомогательные функции
├── views/
│   ├── ApiHomeView.vue       # Главная страница со всеми маршрутами
│   └── RouteDetailView.vue   # Страница детального просмотра маршрута
├── router/
│   └── index.ts          # Конфигурация Vue Router
├── App.vue               # Корневой компонент
└── main.ts               # Точка входа приложения
```

## Основные возможности

### 1. Отображение групп маршрутов

- Группировка маршрутов по префиксам
- Отображение количества endpoints в каждой группе
- Информация о middlewares и rate limits группы

### 2. Детальная информация о маршруте

- HTTP метод и URL
- Описание маршрута
- Параметры URL
- Validation schema (схема валидации входящих данных)
- Request body schema
- Response format с примерами
- Rate limits
- Middlewares

### 3. Тестирование API

- Интерактивная форма для отправки запросов
- Поддержка параметров URL
- Настройка заголовков (Headers)
- Отправка тела запроса (Body) для POST/PUT/PATCH
- Валидация JSON в реальном времени
- Отправка множественных запросов для нагрузочного тестирования
- Детальный вывод результатов с временем ответа
- Статистика для множественных запросов

### 4. Дополнительные функции

- Поиск по маршрутам
- Фильтрация HTTP и WebSocket маршрутов
- Темная/светлая тема
- Expand/Collapse всех маршрутов
- Адаптивный дизайн для мобильных устройств
- Роутинг - каждый маршрут имеет свой URL

## Использование

### Загрузка данных

Приложение автоматически загружает данные о маршрутах при запуске из:

```
GET /api/doc/routes
```

**Важно:** Убедитесь, что ваш API сервер запущен на `http://127.0.0.1:8088`.
Vite dev сервер автоматически проксирует запросы `/api/*` на `http://127.0.0.1:8088`.

Ожидаемый формат ответа:

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
          "validator": "userIdSchema",
          "rateLimit": {
            "windowMs": 60000,
            "maxRequests": 50
          }
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
        "id": {
          "type": "number",
          "required": true,
          "example": 1
        },
        "name": {
          "type": "string",
          "required": true,
          "example": "John Doe"
        }
      }
    }
  },
  "handlerTypeMapping": {
    "getUserById": "UserResponse"
  }
}
```

### Навигация

- **Главная страница** (`/`) - список всех групп маршрутов
- **Детальная страница маршрута** (`/route/:groupIndex/:routeIndex`) - подробная информация о конкретном маршруте

### Работа с компонентами

#### ApiStore (Pinia)

Глобальное хранилище для управления данными:

```typescript
import { useApiStore } from '@/stores/api'

const apiStore = useApiStore()

// Загрузка данных
await apiStore.fetchRoutes()

// Фильтрация
apiStore.setRouteType('http') // или 'ws'
apiStore.setSearchTerm('users')

// Доступ к данным
apiStore.filteredGroups
apiStore.currentRouteGroups
```

#### useTheme Composable

Управление темой приложения:

```typescript
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
```

## Технологический стек

- **Vue 3** - Composition API с `<script setup>`
- **TypeScript** - Типизация
- **Pinia** - Управление состоянием
- **Vue Router** - Роутинг
- **Tailwind CSS** - Стилизация
- **Vite** - Сборка и dev-сервер

## Запуск проекта

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Проверка типов
npm run type-check

# Линтинг
npm run lint
```

## Настройка API endpoint

Если ваш API находится по другому адресу, измените URL в файле `src/stores/api.ts`:

```typescript
async function fetchRoutes() {
  const response = await fetch('YOUR_API_URL/api/doc/routes')
  // ...
}
```

## Особенности реализации

### Компонентная архитектура

Приложение разделено на переиспользуемые компоненты:

- `ApiHeader` - независимый хедер
- `ApiFilters` - фильтры с событиями
- `ApiGroup` - контейнер для группы маршрутов
- `ApiRoute` - самодостаточный компонент маршрута
- `TestForm` - форма тестирования с валидацией

### Глобальное состояние

Вся информация о маршрутах хранится в Pinia store, что позволяет:

- Централизованно управлять данными
- Избежать prop drilling
- Легко масштабировать приложение

### Роутинг

Каждый маршрут API имеет свой URL в приложении:

- Можно делиться ссылками на конкретные маршруты
- Удобная навигация с помощью браузерной истории

### Адаптивность

Приложение полностью адаптивно:

- Mobile-first подход
- Touch-friendly интерфейс
- Оптимизация для разных размеров экранов

## Поддержка

Для вопросов и предложений создавайте issues в репозитории проекта.
