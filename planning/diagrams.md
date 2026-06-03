# ShakerSplit — Architecture & Design Diagrams

---

## 1. System Architecture (C4 Context Level)

```mermaid
graph TD
    U["👤 User<br/>(Web Browser / Mobile)"]
    A["👤 Admin<br/>(Web Browser)"]
    PWA["📱 ShakerSplit PWA<br/>(React + Vite + Tailwind)"]
    VERCEL["☁️ Vercel<br/>(Hosting + Serverless Functions)"]
    SUPA["🗄️ Supabase<br/>(PostgreSQL + Auth + Storage)"]

    U -->|"HTTPS"| PWA
    A -->|"HTTPS"| PWA
    PWA -->|"Deployed on"| VERCEL
    VERCEL -->|"API Calls (REST)"| SUPA
    PWA -->|"Direct Auth (OAuth/JWT)"| SUPA

    style U fill:#4CAF50,color:#fff
    style A fill:#FF5722,color:#fff
    style PWA fill:#2196F3,color:#fff
    style VERCEL fill:#000,color:#fff
    style SUPA fill:#3ECF8E,color:#fff
```

---

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ WEEKLY_PLANS : creates
    USERS ||--o{ FOOD_LOGS : logs
    USERS ||--o{ WORKOUT_LOGS : logs
    USERS ||--o{ ALCOHOL_LOGS : logs
    USERS ||--o{ MENTAL_HEALTH_LOGS : logs
    USERS ||--o{ RECIPES : creates
    USERS ||--o{ WORKOUT_ROUTINES : creates
    USERS ||--o{ WEIGHT_LOGS : tracks
    USERS ||--o{ FRIENDSHIPS : "requests (requester)"
    USERS ||--o{ FRIENDSHIPS : "receives (addressee)"
    USERS ||--|| USER_PREFERENCES : has
    USERS ||--o{ ACTIVITY_STREAKS : has
    WEEKLY_PLANS ||--o{ PLAN_ENTRIES : contains

    USERS {
        uuid id PK
        varchar email "NOT NULL UNIQUE"
        varchar display_name
        text avatar_url
        enum role "ADMIN | USER"
        decimal height_cm
        decimal weight_kg
        date date_of_birth
        timestamptz created_at
        timestamptz updated_at
    }

    WEEKLY_PLANS {
        uuid id PK
        uuid user_id FK
        date week_start_date "NOT NULL"
        varchar name
        boolean is_template "DEFAULT FALSE"
        timestamptz created_at
        timestamptz updated_at
    }

    PLAN_ENTRIES {
        uuid id PK
        uuid weekly_plan_id FK
        int day_of_week "0-6"
        enum category "FOOD | WORKOUT | ALCOHOL"
        varchar time_slot
        jsonb content
        text notes
        timestamptz created_at
    }

    FOOD_LOGS {
        uuid id PK
        uuid user_id FK
        timestamptz logged_at "NOT NULL"
        enum meal_type "BREAKFAST | LUNCH | DINNER | SNACK | PRE_GAME"
        jsonb food_items
        decimal total_calories
        decimal total_protein_g
        text photo_url
        text notes
        timestamptz created_at
    }

    WORKOUT_LOGS {
        uuid id PK
        uuid user_id FK
        timestamptz logged_at "NOT NULL"
        enum workout_type "GYM_PUSH | GYM_PULL | GYM_LEGS | RUN | WALK | OTHER"
        int duration_minutes
        jsonb exercises
        decimal calories_burned
        text notes
        timestamptz created_at
    }

    ALCOHOL_LOGS {
        uuid id PK
        uuid user_id FK
        timestamptz logged_at "NOT NULL"
        varchar spirit_type
        decimal quantity_ml "NOT NULL"
        varchar mixer
        boolean pre_game_meal_eaten
        decimal water_consumed_ml
        int intoxication_level "1-5"
        int hangover_severity "1-5"
        text notes
        timestamptz created_at
    }

    MENTAL_HEALTH_LOGS {
        uuid id PK
        uuid user_id FK
        timestamptz logged_at "NOT NULL"
        int mood_score "1-10"
        decimal sleep_hours
        int sleep_quality "1-5"
        text journal_entry
        text_array tags
        timestamptz created_at
    }

    RECIPES {
        uuid id PK
        uuid created_by FK
        varchar title "NOT NULL"
        text description
        jsonb ingredients
        text instructions
        text youtube_url
        varchar category
        decimal calories
        decimal protein_g
        int prep_time_minutes
        text photo_url
        boolean is_public "DEFAULT TRUE"
        timestamptz created_at
    }

    WORKOUT_ROUTINES {
        uuid id PK
        uuid created_by FK
        varchar title "NOT NULL"
        text description
        enum workout_type "GYM_PUSH | GYM_PULL | RUN | etc."
        jsonb exercises
        text youtube_url
        enum difficulty "BEGINNER | INTERMEDIATE | ADVANCED"
        boolean is_public "DEFAULT TRUE"
        timestamptz created_at
    }

    WEIGHT_LOGS {
        uuid id PK
        uuid user_id FK
        timestamptz logged_at "NOT NULL"
        decimal weight_kg "NOT NULL"
        decimal body_fat_pct
        text notes
        timestamptz created_at
    }

    FRIENDSHIPS {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        enum status "PENDING | ACCEPTED | DECLINED"
        timestamptz created_at
    }

    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK "UNIQUE"
        enum theme "DARK | LIGHT"
        boolean notifications_enabled
        varchar default_units
        varchar timezone
        timestamptz created_at
        timestamptz updated_at
    }

    ACTIVITY_STREAKS {
        uuid id PK
        uuid user_id FK
        enum streak_type "FOOD_LOG | WORKOUT | ALCOHOL_FREE | OVERALL"
        int current_count
        int longest_count
        timestamptz last_logged_at
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 3. Use Case Diagram

```mermaid
graph TB
    subgraph Actors
        USER["👤 USER"]
        ADMIN["👤 ADMIN"]
    end

    subgraph "Planning"
        P1["Create Weekly Plan"]
        P2["Edit Plan Entries"]
        P3["Save Plan as Template"]
        P4["Load Template"]
        P5["View Day Detail"]
    end

    subgraph "Logging"
        L1["Log Food Intake"]
        L2["Log Workout"]
        L3["Log Alcohol Consumption"]
        L4["Log Mental Health / Mood"]
        L5["Log Weight"]
        L6["Upload Food Photo"]
    end

    subgraph "Exploring"
        E1["Browse Recipes"]
        E2["Browse Workout Routines"]
        E3["Watch YouTube Links"]
        E4["Save Recipe to Favorites"]
    end

    subgraph "Analytics"
        AN1["View Dashboard Summary"]
        AN2["View Trends & Charts"]
        AN3["View Activity Streaks"]
        AN4["Track Weight Over Time"]
    end

    subgraph "Social"
        S1["Send Friend Request"]
        S2["Accept/Decline Request"]
        S3["View Friend Activity"]
    end

    subgraph "Admin Panel"
        AD1["Manage Users (CRUD)"]
        AD2["Moderate Recipes & Routines"]
        AD3["View All Users Analytics"]
        AD4["Send Push Notifications"]
        AD5["Configure Global Settings"]
    end

    USER --> P1
    USER --> P2
    USER --> P3
    USER --> P4
    USER --> P5
    USER --> L1
    USER --> L2
    USER --> L3
    USER --> L4
    USER --> L5
    USER --> L6
    USER --> E1
    USER --> E2
    USER --> E3
    USER --> E4
    USER --> AN1
    USER --> AN2
    USER --> AN3
    USER --> AN4
    USER --> S1
    USER --> S2
    USER --> S3

    ADMIN --> AD1
    ADMIN --> AD2
    ADMIN --> AD3
    ADMIN --> AD4
    ADMIN --> AD5
    ADMIN -.->|"inherits"| USER
```

---

## 4. Sequence Diagrams

### 4a. Login Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant R as React App (PWA)
    participant SA as Supabase Auth
    participant DB as Supabase (PostgreSQL)

    U->>R: Opens app / clicks "Sign In"
    R->>R: Shows login form (Email or Google OAuth)

    alt Email Login
        U->>R: Enters email + password
        R->>SA: signInWithPassword(email, password)
    else Google OAuth
        U->>R: Clicks "Sign in with Google"
        R->>SA: signInWithOAuth({ provider: 'google' })
        SA->>U: Redirects to Google consent screen
        U->>SA: Grants permission
    end

    SA->>SA: Validates credentials
    SA-->>R: Returns session { access_token (JWT), user }
    R->>R: Stores JWT in memory / cookie
    R->>DB: GET /rest/v1/users?id=eq.{user_id}
    DB-->>R: User profile + role
    R->>R: Redirects to Dashboard
    R-->>U: Renders Dashboard with user data
```

### 4b. Log Food

```mermaid
sequenceDiagram
    participant U as User
    participant R as React App
    participant API as Vercel Serverless (/api/food-logs)
    participant C as Controller
    participant S as Service Layer
    participant Repo as Repository
    participant DB as Supabase (PostgreSQL)

    U->>R: Navigates to Log Food page
    U->>R: Fills form (meal type, items, calories, photo)
    R->>R: Client-side validation (Zod)
    R->>API: POST /api/food-logs<br/>Headers: { Authorization: Bearer JWT }<br/>Body: { meal_type, food_items, ... }
    API->>C: Route to FoodLogController
    C->>C: Validate JWT, extract user_id
    C->>S: createFoodLog(user_id, payload)
    S->>S: Business logic (calculate totals)
    S->>Repo: insert(foodLogData)
    Repo->>DB: INSERT INTO food_logs (...)
    DB-->>Repo: { id, created_at, ... }
    Repo-->>S: Created food log record
    S-->>C: FoodLogDTO
    C-->>API: 201 Created { data: foodLog }
    API-->>R: HTTP 201 + response body
    R-->>U: Success toast notification<br/>Updates dashboard stats
```

### 4c. Create Weekly Plan

```mermaid
sequenceDiagram
    participant U as User
    participant R as React App
    participant API as Vercel Serverless (/api/plans)
    participant S as Service Layer
    participant DB as Supabase (PostgreSQL)

    U->>R: Navigates to Plan tab
    U->>R: Selects week (date picker)
    R->>API: GET /api/plans?week_start=2026-06-01
    API->>DB: SELECT * FROM weekly_plans WHERE ...
    DB-->>API: Existing plan (or empty)
    API-->>R: Plan data (or null)

    alt No existing plan
        R-->>U: Shows empty week grid
        U->>R: Clicks "Create New Plan"
        R->>API: POST /api/plans { week_start_date, name }
        API->>DB: INSERT INTO weekly_plans
        DB-->>API: New plan { id }
        API-->>R: 201 Created
    end

    U->>R: Adds entries (Food/Workout/Alcohol per day)
    U->>R: Fills time_slot, content, notes for each entry
    R->>API: POST /api/plans/{plan_id}/entries<br/>Body: [{ day_of_week, category, time_slot, content }]
    API->>S: createPlanEntries(plan_id, entries[])
    S->>DB: INSERT INTO plan_entries (batch)
    DB-->>S: Inserted entries
    S-->>API: PlanEntryDTO[]
    API-->>R: 201 Created { entries }
    R-->>U: Week plan rendered with all entries

    opt Save as Template
        U->>R: Clicks "Save as Template"
        R->>API: PATCH /api/plans/{plan_id} { is_template: true, name: "My Template" }
        API->>DB: UPDATE weekly_plans SET is_template = true
        DB-->>API: Updated
        API-->>R: 200 OK
        R-->>U: "Template saved!" confirmation
    end
```

### 4d. PWA Install Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant SW as Service Worker
    participant M as Web App Manifest
    participant U as User
    participant OS as Operating System

    B->>M: Fetches manifest.json on page load
    M-->>B: { name, icons, start_url, display: standalone, theme_color }
    B->>SW: Registers service-worker.js
    SW->>SW: install event → caches static assets
    SW-->>B: Service Worker active

    B->>B: Checks PWA install criteria<br/>(HTTPS, manifest, service worker, engagement)
    B->>B: Fires 'beforeinstallprompt' event
    B-->>U: Shows install banner / button in UI

    U->>B: Clicks "Install App"
    B->>OS: Requests app installation
    OS->>OS: Creates app icon on home screen
    OS-->>B: Installation complete

    B->>SW: Activates offline caching strategy
    SW->>SW: Caches API responses (stale-while-revalidate)
    SW-->>B: App ready for offline use

    U->>OS: Taps app icon on home screen
    OS->>B: Launches PWA in standalone mode (no browser UI)
    B->>SW: Intercepts requests, serves from cache
    SW-->>B: Cached content (fast load)
    B-->>U: Full-screen app experience
```

---

## 5. Navigation Flow (14 Pages)

```mermaid
flowchart TD
    LOGIN["1. Login / Register"]
    DASH["2. Dashboard"]
    PLAN_WEEK["3. Plan - Weekly View"]
    PLAN_DAY["4. Plan - Day Detail"]
    PLAN_TMPL["5. Plan - Templates"]
    LOG_FOOD["6. Log - Food"]
    LOG_WORK["7. Log - Workout"]
    LOG_ALC["8. Log - Alcohol"]
    EXP_RECIPE["9. Explore - Recipes"]
    EXP_WORKOUT["10. Explore - Workouts"]
    ANALYTICS["11. Analytics"]
    PROFILE["12. Profile / Settings"]
    ADMIN["13. Admin Panel"]
    MENTAL["14. Mental Health"]

    LOGIN -->|"Auth success"| DASH

    %% Bottom Tab Navigation
    DASH <-->|"Tab: Plan"| PLAN_WEEK
    DASH <-->|"Tab: Log"| LOG_FOOD
    DASH <-->|"Tab: Explore"| EXP_RECIPE
    DASH <-->|"Tab: Profile"| PROFILE

    %% Plan sub-navigation
    PLAN_WEEK -->|"Tap day"| PLAN_DAY
    PLAN_WEEK -->|"Templates button"| PLAN_TMPL
    PLAN_TMPL -->|"Load template"| PLAN_WEEK
    PLAN_DAY -->|"Back"| PLAN_WEEK

    %% Log sub-tabs
    LOG_FOOD <-->|"Sub-tab"| LOG_WORK
    LOG_WORK <-->|"Sub-tab"| LOG_ALC
    LOG_FOOD <-->|"Sub-tab"| LOG_ALC

    %% Explore sub-navigation
    EXP_RECIPE <-->|"Sub-tab"| EXP_WORKOUT

    %% Dashboard quick actions
    DASH -->|"Quick add: Food"| LOG_FOOD
    DASH -->|"Quick add: Workout"| LOG_WORK
    DASH -->|"Quick add: Alcohol"| LOG_ALC
    DASH -->|"View trends"| ANALYTICS

    %% Profile links
    PROFILE -->|"Analytics"| ANALYTICS
    PROFILE -->|"Mental Health"| MENTAL
    PROFILE -->|"Admin (role=ADMIN)"| ADMIN

    style LOGIN fill:#607D8B,color:#fff
    style DASH fill:#4CAF50,color:#fff
    style PLAN_WEEK fill:#FF9800,color:#fff
    style PLAN_DAY fill:#FF9800,color:#fff
    style PLAN_TMPL fill:#FF9800,color:#fff
    style LOG_FOOD fill:#4CAF50,color:#fff
    style LOG_WORK fill:#FF9800,color:#fff
    style LOG_ALC fill:#9C27B0,color:#fff
    style EXP_RECIPE fill:#00BCD4,color:#fff
    style EXP_WORKOUT fill:#00BCD4,color:#fff
    style ANALYTICS fill:#2196F3,color:#fff
    style PROFILE fill:#607D8B,color:#fff
    style ADMIN fill:#F44336,color:#fff
    style MENTAL fill:#2196F3,color:#fff
```

---

## 6. Frontend Component Architecture

```mermaid
graph TD
    subgraph "Pages (Route-level)"
        PG1["LoginPage"]
        PG2["DashboardPage"]
        PG3["PlanWeekPage"]
        PG4["PlanDayPage"]
        PG5["PlanTemplatesPage"]
        PG6["LogFoodPage"]
        PG7["LogWorkoutPage"]
        PG8["LogAlcoholPage"]
        PG9["ExploreRecipesPage"]
        PG10["ExploreWorkoutsPage"]
        PG11["AnalyticsPage"]
        PG12["ProfilePage"]
        PG13["AdminPage"]
        PG14["MentalHealthPage"]
    end

    subgraph "Feature Components"
        F1["WeeklyCalendar"]
        F2["DayPlanEditor"]
        F3["FoodLogForm"]
        F4["WorkoutLogForm"]
        F5["AlcoholLogForm"]
        F6["RecipeCard / RecipeList"]
        F7["RoutineCard / RoutineList"]
        F8["StreakCounter"]
        F9["TrendChart"]
        F10["FriendsList"]
        F11["MoodSlider"]
        F12["WeightGraph"]
    end

    subgraph "Shared UI Components (Shadcn/UI)"
        UI1["Button"]
        UI2["Card"]
        UI3["Input / Textarea"]
        UI4["Select / Dropdown"]
        UI5["Modal / Dialog"]
        UI6["Toast / Notification"]
        UI7["Tabs"]
        UI8["Avatar"]
        UI9["Badge"]
        UI10["Skeleton Loader"]
    end

    subgraph "Hooks & State"
        H1["useAuth()"]
        H2["useFoodLogs()"]
        H3["useWorkoutLogs()"]
        H4["useAlcoholLogs()"]
        H5["usePlans()"]
        H6["useRecipes()"]
        H7["useStreaks()"]
        H8["useSupabase()"]
        ST1["authStore (Zustand)"]
        ST2["themeStore (Zustand)"]
        ST3["uiStore (Zustand)"]
        ST4["queryClient (TanStack)"]
    end

    %% Pages use Feature Components
    PG2 --> F8
    PG2 --> F9
    PG3 --> F1
    PG4 --> F2
    PG6 --> F3
    PG7 --> F4
    PG8 --> F5
    PG9 --> F6
    PG10 --> F7
    PG11 --> F9
    PG11 --> F12
    PG14 --> F11

    %% Feature Components use UI Primitives
    F1 --> UI2
    F2 --> UI3
    F3 --> UI3
    F3 --> UI4
    F3 --> UI1
    F4 --> UI3
    F5 --> UI4
    F6 --> UI2
    F8 --> UI9
    F9 --> UI2

    %% Hooks connect to stores
    H1 --> ST1
    H2 --> ST4
    H3 --> ST4
    H5 --> ST4
    H8 --> ST1
```

---

## 7. Backend API Layer (MVC + Service + Repository)

```mermaid
graph TD
    subgraph "Client Layer"
        CLIENT["React PWA<br/>(fetch / axios)"]
    end

    subgraph "API Gateway (Vercel Serverless Functions)"
        MW["Middleware<br/>(CORS, Rate Limit, Auth JWT Verify)"]
    end

    subgraph "Controller Layer (/api/*)"
        C1["authController"]
        C2["foodLogController"]
        C3["workoutLogController"]
        C4["alcoholLogController"]
        C5["planController"]
        C6["recipeController"]
        C7["routineController"]
        C8["analyticsController"]
        C9["userController"]
        C10["adminController"]
    end

    subgraph "Service Layer (Business Logic)"
        S1["AuthService"]
        S2["FoodLogService"]
        S3["WorkoutLogService"]
        S4["AlcoholLogService"]
        S5["PlanService"]
        S6["RecipeService"]
        S7["RoutineService"]
        S8["AnalyticsService"]
        S9["UserService"]
        S10["StreakService"]
    end

    subgraph "Repository Layer (Data Access)"
        R1["userRepository"]
        R2["foodLogRepository"]
        R3["workoutLogRepository"]
        R4["alcoholLogRepository"]
        R5["planRepository"]
        R6["planEntryRepository"]
        R7["recipeRepository"]
        R8["routineRepository"]
        R9["weightLogRepository"]
        R10["friendshipRepository"]
        R11["streakRepository"]
    end

    subgraph "Data Layer"
        DB["Supabase PostgreSQL"]
        STORAGE["Supabase Storage<br/>(Photos)"]
        AUTH["Supabase Auth<br/>(JWT Issuer)"]
    end

    %% Flow
    CLIENT -->|"HTTPS + JWT"| MW
    MW --> C1
    MW --> C2
    MW --> C3
    MW --> C4
    MW --> C5
    MW --> C6
    MW --> C7
    MW --> C8
    MW --> C9
    MW --> C10

    C1 --> S1
    C2 --> S2
    C3 --> S3
    C4 --> S4
    C5 --> S5
    C6 --> S6
    C7 --> S7
    C8 --> S8
    C9 --> S9

    S1 --> R1
    S2 --> R2
    S2 --> S10
    S3 --> R3
    S3 --> S10
    S4 --> R4
    S4 --> S10
    S5 --> R5
    S5 --> R6
    S6 --> R7
    S7 --> R8
    S8 --> R2
    S8 --> R3
    S8 --> R4
    S8 --> R9
    S9 --> R1
    S10 --> R11

    R1 --> DB
    R2 --> DB
    R3 --> DB
    R4 --> DB
    R5 --> DB
    R6 --> DB
    R7 --> DB
    R8 --> DB
    R9 --> DB
    R10 --> DB
    R11 --> DB

    S2 -.->|"Photo upload"| STORAGE
    S1 -.->|"Verify tokens"| AUTH

    style CLIENT fill:#2196F3,color:#fff
    style MW fill:#FF9800,color:#fff
    style DB fill:#3ECF8E,color:#fff
    style STORAGE fill:#3ECF8E,color:#fff
    style AUTH fill:#3ECF8E,color:#fff
```

---

## Summary

| #   | Diagram                | Type            | Purpose                                 |
| --- | ---------------------- | --------------- | --------------------------------------- |
| 1   | System Architecture    | C4 Context      | High-level system boundaries            |
| 2   | E-R Diagram            | erDiagram       | Full database schema with all 13 tables |
| 3   | Use Case Diagram       | graph TB        | All actor-action mappings               |
| 4a  | Login Flow             | sequenceDiagram | Auth sequence with OAuth                |
| 4b  | Log Food               | sequenceDiagram | Full MVC request lifecycle              |
| 4c  | Create Weekly Plan     | sequenceDiagram | Plan creation with template save        |
| 4d  | PWA Install            | sequenceDiagram | Service worker + install prompt         |
| 5   | Navigation Flow        | flowchart TD    | 14-page routing map                     |
| 6   | Component Architecture | graph TD        | Frontend layers + hooks + stores        |
| 7   | Backend API Layer      | graph TD        | MVC + Service + Repository pattern      |
