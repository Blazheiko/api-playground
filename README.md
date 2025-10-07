# API Documentation Playground

Vue 3 application for interactive browsing and testing of API routes.

## 🚀 Quick Start

### Prerequisites

1. **Node.js** 20.19.0 or higher
2. **API server** running at `http://127.0.0.1:8088`

### Install and Run

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📋 API Requirements

The API server must expose the following endpoint:

```
GET http://127.0.0.1:8088/api/doc/routes
```

### Response Format

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

## ✨ Features

- 📚 Automatic loading and rendering of API routes
- 🔍 Search across routes
- 🌓 Dark/Light theme
- 🧪 Interactive API testing
- 📊 Detailed validation and response info
- 🔗 Unique URLs for each route
- 📱 Responsive design

## 🛠️ Tech Stack

- Vue 3 (Composition API)
- TypeScript
- Pinia (State Management)
- Vue Router
- Tailwind CSS
- Vite

## 📖 Additional Documentation

See [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) for detailed project structure and usage.

## 🔧 Configuration

### Changing the API endpoint

If your API is hosted elsewhere, update `target` in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://YOUR_API_URL',  // Replace with your URL
      changeOrigin: true,
      secure: false,
    },
  },
}
```

## 📝 Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript type check
npm run lint         # Lint code
npm run format       # Format code
```

## 🐛 Troubleshooting

### Error "Failed to fetch"

Make sure that:

1. The API server runs at `http://127.0.0.1:8088`
2. The `/api/doc/routes` endpoint is accessible
3. The dev server was restarted after editing `vite.config.ts`

### Styles are not applied

1. Ensure Tailwind CSS is installed
2. Verify `tailwind.config.js` exists
3. Restart the dev server

## 📄 License

MIT
