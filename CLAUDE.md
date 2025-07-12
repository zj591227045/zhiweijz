# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZhiWeiJZ (只为记账) is a personal finance management application with AI-powered smart accounting features. It's built as a monorepo supporting multiple platforms: web, mobile (iOS/Android), and WeChat mini-program integration. The project uses a Node.js/TypeScript backend with PostgreSQL database and a Next.js React frontend.

重要：使用中文进行沟通；

## Development Commands

### Backend (Server)
```bash
cd server

# Development
npm run dev                    # Start development server with hot reload
npm run start:dev             # Alternative development command
npm run build                 # Build TypeScript to JavaScript
npm run start                 # Start production server

# Database & Migrations
npm run migrate:status         # Check migration status
npm run migrate:upgrade        # Run pending migrations
npm run migrate:check          # Validate migrations
npm run prisma:generate        # Generate Prisma client

# Testing
npm test                       # Run Jest tests
npm test:watch                 # Run tests in watch mode
npm test:coverage              # Run tests with coverage

# Admin & Utilities
npm run admin:init             # Initialize admin user
npm run health                 # Run health check
npm run wechat:dev             # Start WeChat development environment
```

### Frontend (Web App)
```bash
cd apps/web

# Development
npm run dev                    # Start Next.js development server on port 3003
npm run dev:web               # Web-specific build mode
npm run dev:mobile            # Mobile-specific build mode

# Building
npm run build                 # Build for production
npm run build:web             # Build web version
npm run build:mobile          # Build mobile version
npm run build:static          # Build static export for mobile

# Mobile Development
npm run build:android         # Build Android app
npm run build:ios             # Build iOS app
npm run run:android           # Run on Android device/emulator
npm run build:apk             # Build APK file

# Quality Assurance
npm run lint                  # Run ESLint
npm run type-check            # Run TypeScript checks
```

### Docker Deployment
```bash
cd docker
./start.sh                    # Start all services
./stop.sh                     # Stop all services
./stop.sh --clean             # Stop and clean all data
```

## Architecture Overview

### Monorepo Structure
- **`server/`**: Node.js/Express backend with Prisma ORM
- **`apps/web/`**: Next.js React frontend with Capacitor for mobile
- **`apps/android/`** & **`apps/ios/`**: Native mobile app builds
- **`docker/`**: Containerized deployment configuration
- **`docs/`**: Comprehensive project documentation

### Key Technologies
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: Next.js 14, React 18, Tailwind CSS, Zustand (state management)
- **Mobile**: Capacitor 7 for native iOS/Android builds
- **AI Integration**: LangChain, OpenAI compatible APIs, multimodal AI (speech/vision)
- **Authentication**: JWT-based auth with bcrypt password hashing

### Database Architecture
The project uses Prisma ORM with PostgreSQL. Key models include:
- **Users**: Core user management with deletion fields and custodial support
- **Families**: Multi-user family account sharing
- **AccountBooks**: Financial account organization
- **Transactions**: Financial records with AI-enhanced categorization
- **Budgets**: Personal and family budget management with auto-rollover
- **Categories**: Hierarchical transaction categorization
- **Tags**: Flexible transaction tagging system
- **UserAccountingPoints**: AI service usage credit system
- **UserMembership**: Subscription management for donor members

### AI & Multimodal Features
- **Smart Accounting**: AI-powered transaction categorization and budget matching
- **Speech Recognition**: Baidu Cloud integration for voice-to-text
- **Vision Recognition**: Image-based receipt processing
- **LLM Integration**: Multi-provider support (OpenAI, custom APIs) with load balancing
- **Accounting Points System**: Credit-based system for AI service usage

### State Management
- **Zustand stores** for frontend state:
  - `accounting-points-store.ts`: AI service credits
  - `membership-store.ts`: User membership status
  - `dashboard-store.ts`: Main dashboard data
  - Cross-store synchronization for membership and accounting points

## Development Standards

### File Organization
- **Controllers**: Handle HTTP requests in `server/src/controllers/`
- **Services**: Business logic in `server/src/services/`
- **Routes**: API route definitions in `server/src/routes/`
- **Models**: Database models in `server/src/models/`
- **Middlewares**: Express middlewares in `server/src/middlewares/`
- **Frontend Components**: React components in `apps/web/src/components/`
- **API Services**: Frontend API clients in `apps/web/src/lib/api/`

### Migration System
- **Incremental migrations** in `server/migrations/incremental/`
- Use `migration-manager.js` for database version management
- All migrations must be backwards-compatible for Docker deployments
- Migration files follow naming convention: `feature-name.sql`

### API Patterns
- RESTful APIs with consistent response format
- Authentication required for most endpoints (except auth and public system config)
- Daily gift middleware (`dailyFirstVisitGift`) automatically grants accounting points
- Error handling with custom `AppError` class
- Request validation using Joi schemas

### Frontend Architecture
- **Next.js App Router** for routing
- **Tailwind CSS** for styling with theme support
- **React Hook Form** with Zod validation
- **Tanstack Query** for server state management
- **PageContainer** component for consistent page layouts
- Mobile-first responsive design

### WeChat Integration
- Dedicated WeChat controller and service layer
- OAuth-style account binding flow
- Smart accounting via WeChat messages
- Menu-driven interface for common operations

## Key Integration Points

### Membership & Accounting Points
The membership system integrates with accounting points for AI service credits:
- Donor members get monthly accounting points (default 1000)
- Points are consumed for AI features (text: 1pt, voice: 2pts, image: 3pts)
- Cross-store synchronization ensures UI reflects accurate balances
- Member points are granted automatically when upgrading to donor membership

### AI Service Configuration
- Global AI service management in admin panel
- Per-user token limits and usage tracking
- Fallback provider configuration for high availability
- Multimodal AI support (speech, vision, text)

### Family Sharing
- Multi-user account books with role-based permissions
- Custodial member support for non-registered users (children)
- Family budget sharing with individual member budgets
- Transaction assignment to family members

## Testing Strategy

### Backend Testing
- Jest unit tests for services and controllers
- Integration tests for API endpoints
- Database testing with test fixtures
- Run tests with `npm test` in server directory

### Frontend Testing
- Component testing with Jest
- API integration testing
- Mobile compatibility testing on iOS/Android simulators

## Deployment Notes

### Environment Variables
Key environment variables for server configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `ENABLE_MEMBERSHIP_SYSTEM`: Enable/disable membership features
- `ENABLE_ACCOUNTING_POINTS_SYSTEM`: Enable/disable AI credits system
- `MEMBERSHIP_MONTHLY_POINTS`: Points granted to donor members (default 1000)

### Docker Deployment
- Multi-stage builds for frontend and backend
- PostgreSQL database with persistent volumes
- Nginx reverse proxy with SSL support
- Health checks and automatic restart policies

### Migration Management
- Use `npm run migrate:upgrade` to apply new migrations
- Database schema versioning tracks applied migrations
- Docker deployments include automatic migration execution

## Common Issues & Solutions

### Mobile Development
- Use `BUILD_MODE=mobile` for mobile-specific builds
- Capacitor requires separate iOS/Android project builds
- Audio format conversion needed for cross-platform compatibility

### Database Operations
- Always use Prisma client for database operations
- Include proper transaction handling for complex operations
- Use proper indexing for performance-critical queries

### AI Service Integration
- Handle provider fallbacks gracefully
- Implement proper token usage tracking
- Cache AI responses when appropriate to reduce costs

## Documentation

Extensive documentation is available in the `docs/` directory covering:
- API design and endpoints
- Database schema and relationships
- AI implementation details
- Mobile app development guides
- Deployment and operations guides
- WeChat integration setup

Key documentation files:
- `docs/backend/api_implementation.md`: Complete API documentation
- `docs/AI/`: AI service implementation guides
- `docs/client/`: Frontend development standards
- `docker/docs/`: Deployment and operations guides