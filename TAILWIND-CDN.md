# Вариант без PostCSS - Tailwind через CDN

Если хотите избавиться от PostCSS полностью, выполните следующие шаги:

## 1. Удалите PostCSS зависимости

```bash
npm uninstall tailwindcss postcss autoprefixer
```

## 2. Удалите файлы конфигурации

```bash
rm tailwind.config.js postcss.config.js
```

## 3. Измените src/assets/main.css

Удалите строки:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 4. Добавьте CDN в index.html

Откройте `index.html` и добавьте в `<head>`:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
        },
      },
    },
  }
</script>
```

## Минусы CDN варианта:

- Медленнее загружается (загрузка через интернет)
- Не оптимизируется при сборке
- Больший размер финального bundle
- Не рекомендуется для production

## Рекомендация

Используйте текущую версию с PostCSS (v3.4.0) - это стандартный и оптимальный подход.
