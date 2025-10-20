# API Documentation Playground

Vue 3 application for interactive browsing and testing of API routes with a modern interface and advanced navigation capabilities.

## 🚀 Quick Start

### Requirements

1. **Node.js** 20.19.0 or higher (22.12.0+ is also supported)
2. **API server** running at `http://127.0.0.1:8088`

### Installation and Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📋 API Requirements

The API server must expose the following endpoint:

```
GET http://127.0.0.1:8088/api/doc/routes
```

### Response Format

```json
{
  "pathPrefix": "/api",
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
      "name": "UserResponse",
      "module": "types",
      "fields": "{id: number, name: string}"
    }
  }
}
```

### Nested Groups Support

The API supports nested route groups for better organization:

```json
{
  "httpRoutes": [
    {
      "prefix": "api",
      "description": "API Routes",
      "group": [
        {
          "prefix": "users",
          "description": "User Management",
          "group": [
            {
              "url": "/users/:id",
              "method": "get",
              "description": "Get user by ID"
            }
          ]
        }
      ]
    }
  ]
}
```

## ✨ Key Features

### Navigation and Organization

- 📚 Automatic loading and display of API routes
- 🗂️ Three-panel responsive layout:
  - **Left Panel** (SiteNavigation) - tree navigation with groups and subgroups
  - **Center Panel** - detailed route display with testing capabilities
  - **Right Panel** (OnThisPage) - quick navigation to routes on the page
- 🔍 Smart search across routes, descriptions, and handlers
- 🌳 Support for nested route groups of any depth
- 📱 Responsive design with mobile navigation
- 🔗 Unique URL for each route

### API Testing

- 🧪 Interactive route testing directly from the interface
- 📝 Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE)
- 🔧 Request headers configuration
- 📊 Request body sending with JSON validation
- ⏱️ Response time display
- 📈 Multiple requests for load testing
- 📉 Aggregated statistics (min/max/average response time)

### Documentation

- 📖 Detailed information for each route:
  - HTTP method and URL
  - Description and purpose
  - URL parameters with types
  - Validation schema for incoming data
  - Response format with examples
  - Rate limits (at route and group level)
  - Middleware and their execution order
- 🎨 Color-coded HTTP methods
- 📋 Validation schemas with types and required fields

### UI/UX

- 🌓 Dark/Light theme with localStorage persistence
- ⚡ Smooth animations and transitions
- 🎯 Automatic scrolling to selected route
- 🔄 Loading and error handling indicators
- 📏 Custom thin scrollbars
- 🎨 Modern design with Tailwind CSS

## 🛠️ Tech Stack

### Core

- **Vue 3** (v3.5.22) - Composition API with `<script setup>`
- **TypeScript** (v5.9.0) - Strict typing
- **Pinia** (v3.0.3) - State management
- **Vue Router** (v4.5.1) - Client-side routing

### Styling & Build

- **Tailwind CSS** (v3.4.0) - Utility-first CSS framework
- **PostCSS** & **Autoprefixer** - CSS processing
- **Vite** (v7.1.7) - Bundler and dev server
- **Vue DevTools** (v8.0.2) - Development tools

### Code Quality

- **ESLint** (v9.33.0) - Code linting
- **Prettier** (v3.6.2) - Code formatting
- **Vue TSC** (v3.1.0) - Type checking

## 📁 Project Structure

```
src/
├── components/
│   ├── api/                  # API display components
│   │   ├── ApiHeader.vue     # Header with search and theme toggle
│   │   ├── ApiGroup.vue      # Route group
│   │   ├── ApiRoute.vue      # Single route details
│   │   └── TestForm.vue      # API testing form
│   ├── navigation/           # Navigation components
│   │   ├── SiteNavigation.vue      # Left sidebar (tree navigation)
│   │   ├── OnThisPage.vue          # Right sidebar (quick links)
│   │   ├── RouteGroupsMenu.vue     # Route groups menu
│   │   ├── TreeGroup.vue           # Tree group with nesting
│   │   ├── MobileNavigation.vue    # Mobile navigation
│   │   └── MobileGroupItem.vue     # Mobile group item
│   └── icons/                # SVG icons
├── composables/
│   └── useTheme.ts          # Theme management composable
├── stores/
│   └── api-doc.ts           # Pinia store for API data management
├── views/
│   ├── ApiHomeView.vue      # Home page with all routes
│   └── RouteDetailView.vue  # Route detail view page
├── router/
│   └── index.ts             # Vue Router configuration
├── utils/
│   └── apiHelpers.ts        # Helper functions
├── assets/                  # Styles and assets
│   ├── main.css
│   ├── base.css
│   └── api-doc.css
├── App.vue                  # Root component
└── main.ts                  # Application entry point
```

## 📖 Additional Documentation

- [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) - Detailed project structure and usage documentation
- [API-TESTING-IMPROVEMENTS.md](./API-TESTING-IMPROVEMENTS.md) - API testing functionality improvement proposals
- [ROADMAP.md](./ROADMAP.md) - Project development roadmap

## 🔧 Configuration

### Changing the API Endpoint

If your API server is hosted elsewhere, update `target` in `vite.config.ts`:

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

### Theme Configuration

Color scheme is configured in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        // ... other shades
      },
    },
  },
}
```

Theme is automatically saved to `localStorage` and applied on next visit.

## 📝 Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript type checking
npm run lint         # Check and auto-fix code (ESLint)
npm run format       # Format code (Prettier)
```

## 🚦 How It Works

### 1. Data Loading

On application startup, Pinia store (`api-doc.ts`) automatically loads data from the API server:

```typescript
// In ApiHomeView.vue
onMounted(async () => {
  if (apiStore.httpRouteGroups.length === 0) {
    await apiStore.fetchRoutes()
  }
})
```

### 2. Data Processing

The store processes received data and creates two structures:

- **Tree structure** (`httpRouteGroups`) - for navigation with nested groups
- **Flat structure** (`flatHttpRoute`) - for quick access and search

### 3. Routing

The application uses Vue Router with two main routes:

- `/` - home page with all routes
- `/route/:routeId` - detailed view of a specific route

### 4. Application State

State management through Pinia store includes:

- `searchTerm` - current search query
- `currentRouteType` - route type (http/ws)
- `expandedRoute` - expanded route ID
- `activeRoute` - active route ID
- `selectedRouteId` - selected route ID

### 5. Search and Filtering

Search works in real-time across:

- Route URL
- Description
- Handler name
- Full URL (including prefixes)

## 🐛 Troubleshooting

### "Failed to fetch" Error

Make sure that:

1. API server is running at `http://127.0.0.1:8088`
2. Endpoint `/api/doc/routes` is accessible
3. Dev server was restarted after editing `vite.config.ts`
4. CORS is configured correctly on the API server

### Styles Not Applied

1. Ensure Tailwind CSS is installed
2. Verify `tailwind.config.js` exists
3. Restart the dev server
4. Clear browser cache

### TypeScript Issues

If you encounter type errors:

```bash
# Rebuild types
npm run type-check

# Restart TypeScript server in IDE
```

### Navigation Not Working

1. Check that data is loaded (`apiStore.httpRouteGroups.length > 0`)
2. Ensure routes have unique IDs
3. Check browser console for errors

## 🎯 Core Architecture Principles

### Composition and Reusability

The application uses Composition API and composables for reusable logic:

```typescript
// useTheme.ts - theme management
export function useTheme() {
  const isDark = ref(false)
  const toggleTheme = () => {
    /* ... */
  }
  return { isDark, toggleTheme }
}
```

### Reactivity

All logic is built on reactive computed properties:

```typescript
// Computed for filtering
const filteredFlatRoutes = computed(() => {
  if (!searchTerm.value) return flatHttpRoute.value
  return flatHttpRoute.value.filter(/* filtering */)
})
```

### Separation of Concerns

- **Store** - data management and business logic
- **Components** - display and user interaction
- **Composables** - reusable logic
- **Utils** - helper pure functions

## 🚀 Extension Possibilities

### Adding New Route Types

The application supports HTTP and WebSocket routes. To add a new type:

1. Add the type to `currentRouteType` in store
2. Create computed properties for the new type
3. Update UI to display new routes

### Theme Customization

Create your own color scheme in `App.vue` and `tailwind.config.js`

### Adding New Fields

Extend interfaces in `api-doc.ts` and update components to display new data

## 📊 Project Statistics

- **Components**: 13 Vue components
- **Stores**: 1 Pinia store with full state management
- **Composables**: 1 reusable composable
- **Views**: 2 main views
- **Support**: HTTP and WebSocket routes
- **Typing**: Full TypeScript typing

## 👨‍💻 Author

**Blazheiko**

## 📄 License

MIT
