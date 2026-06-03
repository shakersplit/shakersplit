# ShakerSplit — Repository Structure

Monorepo deployed on Vercel: React SPA (frontend) + `/api` serverless functions (backend).

---

## Complete File Tree

```
shakersplit/
│
├── api/                                    # Vercel Serverless Functions (Node.js + Express-like handlers)
│   ├── food-logs.ts                        # /api/food-logs — GET (list), POST (create)
│   ├── food-logs/
│   │   └── [id].ts                         # /api/food-logs/:id — GET, PUT, DELETE single food log
│   ├── workout-logs.ts                     # /api/workout-logs — GET (list), POST (create)
│   ├── workout-logs/
│   │   └── [id].ts                         # /api/workout-logs/:id — GET, PUT, DELETE single workout log
│   ├── alcohol-logs.ts                     # /api/alcohol-logs — GET (list), POST (create)
│   ├── alcohol-logs/
│   │   └── [id].ts                         # /api/alcohol-logs/:id — GET, PUT, DELETE single alcohol log
│   ├── plans.ts                            # /api/plans — GET (list), POST (create weekly plan)
│   ├── plans/
│   │   ├── [planId].ts                     # /api/plans/:planId — GET, PUT, DELETE single plan
│   │   └── [planId]/
│   │       ├── entries.ts                  # /api/plans/:planId/entries — GET (list), POST (create entry)
│   │       └── entries/
│   │           └── [entryId].ts            # /api/plans/:planId/entries/:entryId — PUT, DELETE
│   ├── recipes.ts                          # /api/recipes — GET (list public), POST (create)
│   ├── recipes/
│   │   └── [id].ts                         # /api/recipes/:id — GET, PUT, DELETE single recipe
│   ├── routines.ts                         # /api/routines — GET (list public), POST (create)
│   ├── routines/
│   │   └── [id].ts                         # /api/routines/:id — GET, PUT, DELETE single routine
│   ├── weight-logs.ts                      # /api/weight-logs — GET (list), POST (create)
│   ├── weight-logs/
│   │   └── [id].ts                         # /api/weight-logs/:id — GET, PUT, DELETE single weight log
│   ├── mental-health-logs.ts               # /api/mental-health-logs — GET (list), POST (create)
│   ├── mental-health-logs/
│   │   └── [id].ts                         # /api/mental-health-logs/:id — GET, PUT, DELETE
│   ├── analytics/
│   │   ├── dashboard.ts                    # /api/analytics/dashboard — GET aggregated today/week stats
│   │   ├── trends.ts                       # /api/analytics/trends — GET time-series data for charts
│   │   └── streaks.ts                      # /api/analytics/streaks — GET current/best streaks
│   ├── admin/
│   │   ├── users.ts                        # /api/admin/users — GET all users (admin only)
│   │   └── users/
│   │       └── [id].ts                     # /api/admin/users/:id — PATCH (update role), DELETE
│   ├── users/
│   │   ├── me.ts                           # /api/users/me — GET/PATCH own profile
│   │   └── me/
│   │       └── preferences.ts             # /api/users/me/preferences — GET/PATCH user prefs
│   │
│   └── _lib/                               # Shared backend code (underscore prefix = not a route)
│       ├── controllers/
│       │   ├── food-log.controller.ts      # Handles request parsing, calls service, sends response
│       │   ├── workout-log.controller.ts   # Workout log request handling
│       │   ├── alcohol-log.controller.ts   # Alcohol log request handling
│       │   ├── plan.controller.ts          # Weekly plan + entries request handling
│       │   ├── recipe.controller.ts        # Recipe CRUD request handling
│       │   ├── routine.controller.ts       # Workout routine request handling
│       │   ├── weight-log.controller.ts    # Weight log request handling
│       │   ├── mental-health.controller.ts # Mental health log request handling
│       │   ├── analytics.controller.ts     # Analytics aggregation request handling
│       │   ├── admin.controller.ts         # Admin user management
│       │   └── user.controller.ts          # User profile/preferences
│       ├── services/
│       │   ├── food-log.service.ts         # Business logic: validation, calculations, orchestration
│       │   ├── workout-log.service.ts      # Workout logic: duration calc, calorie estimation
│       │   ├── alcohol-log.service.ts      # Alcohol logic: unit conversion, risk assessment
│       │   ├── plan.service.ts             # Plan logic: template duplication, week boundaries
│       │   ├── recipe.service.ts           # Recipe logic: visibility, nutrition calc
│       │   ├── routine.service.ts          # Routine logic: difficulty, public access
│       │   ├── weight-log.service.ts       # Weight logic: BMI calc, trend detection
│       │   ├── mental-health.service.ts    # Mental health logic: streak detection
│       │   ├── analytics.service.ts        # Aggregation: summaries, trends, streaks
│       │   ├── admin.service.ts            # Admin logic: role changes, user listing
│       │   └── user.service.ts             # Profile updates, preference management
│       ├── repositories/
│       │   ├── food-log.repository.ts      # Supabase queries for food_logs table
│       │   ├── workout-log.repository.ts   # Supabase queries for workout_logs table
│       │   ├── alcohol-log.repository.ts   # Supabase queries for alcohol_logs table
│       │   ├── plan.repository.ts          # Supabase queries for weekly_plans + plan_entries
│       │   ├── recipe.repository.ts        # Supabase queries for recipes table
│       │   ├── routine.repository.ts       # Supabase queries for workout_routines table
│       │   ├── weight-log.repository.ts    # Supabase queries for weight_logs table
│       │   ├── mental-health.repository.ts # Supabase queries for mental_health_logs table
│       │   ├── analytics.repository.ts     # Complex aggregation queries across tables
│       │   └── user.repository.ts          # Supabase queries for users + preferences
│       ├── middleware/
│       │   ├── auth.middleware.ts          # Verifies Supabase JWT, attaches user to request
│       │   ├── admin.middleware.ts         # Checks user role === 'ADMIN'
│       │   ├── rate-limit.middleware.ts    # Token-bucket rate limiting (100 req/min)
│       │   ├── cors.middleware.ts          # CORS headers configuration
│       │   ├── validate.middleware.ts      # Zod schema validation for request bodies
│       │   └── error-handler.middleware.ts # Global error catching, formats error response
│       ├── validators/
│       │   ├── food-log.validator.ts       # Zod schemas for food log create/update
│       │   ├── workout-log.validator.ts    # Zod schemas for workout log create/update
│       │   ├── alcohol-log.validator.ts    # Zod schemas for alcohol log create/update
│       │   ├── plan.validator.ts           # Zod schemas for plan + entry create/update
│       │   ├── recipe.validator.ts         # Zod schemas for recipe create/update
│       │   ├── routine.validator.ts        # Zod schemas for routine create/update
│       │   ├── weight-log.validator.ts     # Zod schemas for weight log create/update
│       │   ├── mental-health.validator.ts  # Zod schemas for mental health create/update
│       │   ├── user.validator.ts           # Zod schemas for profile/preferences update
│       │   └── common.validator.ts         # Shared: pagination params, UUID, date range
│       ├── types/
│       │   ├── index.ts                    # Re-exports all types
│       │   ├── api.types.ts               # ApiResponse, PaginatedResponse, ApiError
│       │   ├── food-log.types.ts           # FoodLog, CreateFoodLog, UpdateFoodLog, FoodItem
│       │   ├── workout-log.types.ts        # WorkoutLog, Exercise, RunData
│       │   ├── alcohol-log.types.ts        # AlcoholLog, CreateAlcoholLog
│       │   ├── plan.types.ts              # WeeklyPlan, PlanEntry, CreatePlan
│       │   ├── recipe.types.ts            # Recipe, Ingredient, CreateRecipe
│       │   ├── routine.types.ts           # WorkoutRoutine, CreateRoutine
│       │   ├── weight-log.types.ts        # WeightLog, CreateWeightLog
│       │   ├── mental-health.types.ts     # MentalHealthLog, CreateMentalHealthLog
│       │   ├── analytics.types.ts         # DashboardData, TrendData, StreakData
│       │   ├── user.types.ts              # User, UserProfile, UserPreferences
│       │   └── auth.types.ts              # AuthUser, JwtPayload, UserRole
│       ├── utils/
│       │   ├── response.util.ts           # Helpers: success(), paginated(), error()
│       │   ├── date.util.ts               # Week boundaries, date range parsing
│       │   ├── pagination.util.ts         # Parse page/limit from query, calc offset
│       │   └── logger.util.ts             # Structured logging for serverless
│       ├── config/
│       │   ├── supabase.config.ts         # Supabase client initialization (service role key)
│       │   ├── cors.config.ts             # Allowed origins, methods, headers
│       │   └── env.config.ts              # Environment variable validation + export
│       └── factories/
│           └── handler.factory.ts         # Creates Vercel handler with middleware pipeline
│
├── src/                                    # React Frontend (Vite SPA)
│   ├── main.tsx                            # App entry point, renders <App />
│   ├── vite-env.d.ts                       # Vite TypeScript environment declarations
│   ├── app/
│   │   ├── App.tsx                         # Root component: providers + router outlet
│   │   ├── router.tsx                      # React Router config: all routes + guards
│   │   ├── providers.tsx                   # Wraps QueryClientProvider, AuthProvider, ThemeProvider
│   │   └── auth-guard.tsx                  # Route protection: redirects if not authenticated
│   ├── pages/
│   │   ├── LoginPage.tsx                   # Email + Google OAuth login/register
│   │   ├── DashboardPage.tsx               # Today's summary, streaks, quick-add FAB
│   │   ├── PlanWeeklyPage.tsx              # Calendar grid: meal/workout/alcohol plans
│   │   ├── PlanDayDetailPage.tsx           # Single day plan with editable slots
│   │   ├── PlanTemplatesPage.tsx           # Save/load weekly plan templates
│   │   ├── LogFoodPage.tsx                 # Add/edit food entries with optional photo
│   │   ├── LogWorkoutPage.tsx              # Log gym exercises or run data
│   │   ├── LogAlcoholPage.tsx              # Log drinks + damage-control checklist
│   │   ├── ExploreRecipesPage.tsx          # Browse/search recipe library
│   │   ├── ExploreWorkoutsPage.tsx         # Browse workout routines with videos
│   │   ├── AnalyticsPage.tsx               # Charts: weight, alcohol, workout trends
│   │   ├── ProfilePage.tsx                 # Edit profile, preferences, settings
│   │   ├── AdminPage.tsx                   # User management, content moderation (admin only)
│   │   └── MentalHealthPage.tsx            # Mood/journal/sleep tracker (Phase 3)
│   ├── features/
│   │   ├── food-log/
│   │   │   ├── components/
│   │   │   │   ├── FoodLogForm.tsx         # Form: meal type, items, calories, photo upload
│   │   │   │   ├── FoodLogCard.tsx         # Single food log display card
│   │   │   │   ├── FoodLogList.tsx         # Scrollable list of food logs for a day
│   │   │   │   ├── FoodItemInput.tsx       # Dynamic input row for a food item
│   │   │   │   └── MealTypeSelector.tsx    # Breakfast/Lunch/Dinner/Snack toggle
│   │   │   ├── hooks/
│   │   │   │   ├── useFoodLogs.ts          # TanStack Query: fetch food logs with filters
│   │   │   │   ├── useCreateFoodLog.ts     # TanStack Mutation: create food log
│   │   │   │   ├── useUpdateFoodLog.ts     # TanStack Mutation: update food log
│   │   │   │   └── useDeleteFoodLog.ts     # TanStack Mutation: delete food log
│   │   │   ├── services/
│   │   │   │   └── food-log.api.ts         # API client functions: getFoodLogs, createFoodLog, etc.
│   │   │   ├── types/
│   │   │   │   └── food-log.types.ts       # Frontend types: FoodLog, FoodLogFormValues
│   │   │   └── index.ts                    # Public exports for this feature module
│   │   ├── workout-log/
│   │   │   ├── components/
│   │   │   │   ├── WorkoutLogForm.tsx      # Form: type, exercises/distance, duration
│   │   │   │   ├── WorkoutLogCard.tsx      # Single workout log display card
│   │   │   │   ├── WorkoutLogList.tsx      # List of workout logs
│   │   │   │   ├── ExerciseInput.tsx       # Dynamic exercise row (name, sets, reps, weight)
│   │   │   │   ├── RunDataInput.tsx        # Distance + pace input for runs
│   │   │   │   └── WorkoutTypeSelector.tsx # Push/Pull/Legs/Run/etc. selector
│   │   │   ├── hooks/
│   │   │   │   ├── useWorkoutLogs.ts       # TanStack Query: fetch workout logs
│   │   │   │   ├── useCreateWorkoutLog.ts  # TanStack Mutation: create workout log
│   │   │   │   ├── useUpdateWorkoutLog.ts  # TanStack Mutation: update workout log
│   │   │   │   └── useDeleteWorkoutLog.ts  # TanStack Mutation: delete workout log
│   │   │   ├── services/
│   │   │   │   └── workout-log.api.ts      # API client functions for workout logs
│   │   │   ├── types/
│   │   │   │   └── workout-log.types.ts    # Frontend types: WorkoutLog, Exercise
│   │   │   └── index.ts                    # Public exports
│   │   ├── alcohol-log/
│   │   │   ├── components/
│   │   │   │   ├── AlcoholLogForm.tsx      # Form: spirit, qty, mixer, checklist
│   │   │   │   ├── AlcoholLogCard.tsx      # Single alcohol log display card
│   │   │   │   ├── AlcoholLogList.tsx      # List of alcohol logs
│   │   │   │   ├── IntoxicationSlider.tsx  # 1-5 scale slider for drunk level
│   │   │   │   └── HangoverInput.tsx       # Next-morning hangover rating input
│   │   │   ├── hooks/
│   │   │   │   ├── useAlcoholLogs.ts       # TanStack Query: fetch alcohol logs
│   │   │   │   ├── useCreateAlcoholLog.ts  # TanStack Mutation: create alcohol log
│   │   │   │   ├── useUpdateAlcoholLog.ts  # TanStack Mutation: update alcohol log
│   │   │   │   └── useDeleteAlcoholLog.ts  # TanStack Mutation: delete alcohol log
│   │   │   ├── services/
│   │   │   │   └── alcohol-log.api.ts      # API client functions for alcohol logs
│   │   │   ├── types/
│   │   │   │   └── alcohol-log.types.ts    # Frontend types: AlcoholLog, CreateAlcoholLog
│   │   │   └── index.ts                    # Public exports
│   │   ├── plans/
│   │   │   ├── components/
│   │   │   │   ├── WeeklyCalendar.tsx      # 7-day grid showing plan overview
│   │   │   │   ├── DayPlanCard.tsx         # Single day card with meal/workout/alcohol slots
│   │   │   │   ├── PlanEntryForm.tsx       # Add/edit a plan entry (time slot, content)
│   │   │   │   ├── PlanEntryItem.tsx       # Single plan entry display
│   │   │   │   ├── TemplateSelector.tsx    # Dropdown to load a saved template
│   │   │   │   └── WeekNavigator.tsx       # Previous/next week navigation
│   │   │   ├── hooks/
│   │   │   │   ├── usePlans.ts             # TanStack Query: fetch weekly plans
│   │   │   │   ├── useCreatePlan.ts        # TanStack Mutation: create plan
│   │   │   │   ├── useUpdatePlan.ts        # TanStack Mutation: update plan
│   │   │   │   ├── useDeletePlan.ts        # TanStack Mutation: delete plan
│   │   │   │   ├── usePlanEntries.ts       # TanStack Query: fetch entries for a plan
│   │   │   │   ├── useCreatePlanEntry.ts   # TanStack Mutation: create entry
│   │   │   │   ├── useUpdatePlanEntry.ts   # TanStack Mutation: update entry
│   │   │   │   └── useDeletePlanEntry.ts   # TanStack Mutation: delete entry
│   │   │   ├── services/
│   │   │   │   └── plan.api.ts             # API client functions for plans + entries
│   │   │   ├── types/
│   │   │   │   └── plan.types.ts           # Frontend types: WeeklyPlan, PlanEntry
│   │   │   └── index.ts                    # Public exports
│   │   ├── recipes/
│   │   │   ├── components/
│   │   │   │   ├── RecipeCard.tsx           # Recipe preview card with image + meta
│   │   │   │   ├── RecipeDetail.tsx         # Full recipe view with ingredients + video
│   │   │   │   ├── RecipeForm.tsx           # Create/edit recipe form
│   │   │   │   ├── RecipeGrid.tsx           # Grid layout of recipe cards
│   │   │   │   └── RecipeFilters.tsx        # Category + search filters
│   │   │   ├── hooks/
│   │   │   │   ├── useRecipes.ts            # TanStack Query: fetch recipes
│   │   │   │   ├── useCreateRecipe.ts       # TanStack Mutation: create recipe
│   │   │   │   ├── useUpdateRecipe.ts       # TanStack Mutation: update recipe
│   │   │   │   └── useDeleteRecipe.ts       # TanStack Mutation: delete recipe
│   │   │   ├── services/
│   │   │   │   └── recipe.api.ts            # API client functions for recipes
│   │   │   ├── types/
│   │   │   │   └── recipe.types.ts          # Frontend types: Recipe, Ingredient
│   │   │   └── index.ts                     # Public exports
│   │   ├── routines/
│   │   │   ├── components/
│   │   │   │   ├── RoutineCard.tsx          # Routine preview card with difficulty badge
│   │   │   │   ├── RoutineDetail.tsx        # Full routine view with exercises + video
│   │   │   │   ├── RoutineForm.tsx          # Create/edit routine form
│   │   │   │   ├── RoutineGrid.tsx          # Grid layout of routine cards
│   │   │   │   └── RoutineFilters.tsx       # Type + difficulty filters
│   │   │   ├── hooks/
│   │   │   │   ├── useRoutines.ts           # TanStack Query: fetch routines
│   │   │   │   ├── useCreateRoutine.ts      # TanStack Mutation: create routine
│   │   │   │   ├── useUpdateRoutine.ts      # TanStack Mutation: update routine
│   │   │   │   └── useDeleteRoutine.ts      # TanStack Mutation: delete routine
│   │   │   ├── services/
│   │   │   │   └── routine.api.ts           # API client functions for routines
│   │   │   ├── types/
│   │   │   │   └── routine.types.ts         # Frontend types: WorkoutRoutine
│   │   │   └── index.ts                     # Public exports
│   │   ├── weight/
│   │   │   ├── components/
│   │   │   │   ├── WeightLogForm.tsx        # Form: weight, body fat, notes
│   │   │   │   ├── WeightChart.tsx          # Recharts line chart of weight over time
│   │   │   │   └── WeightLogList.tsx        # History list of weight entries
│   │   │   ├── hooks/
│   │   │   │   ├── useWeightLogs.ts         # TanStack Query: fetch weight logs
│   │   │   │   ├── useCreateWeightLog.ts    # TanStack Mutation: create weight log
│   │   │   │   └── useDeleteWeightLog.ts    # TanStack Mutation: delete weight log
│   │   │   ├── services/
│   │   │   │   └── weight-log.api.ts        # API client functions for weight logs
│   │   │   ├── types/
│   │   │   │   └── weight-log.types.ts      # Frontend types: WeightLog
│   │   │   └── index.ts                     # Public exports
│   │   ├── mental-health/
│   │   │   ├── components/
│   │   │   │   ├── MoodForm.tsx             # Form: mood score, sleep, journal
│   │   │   │   ├── MoodCard.tsx             # Single mood entry display
│   │   │   │   ├── MoodChart.tsx            # Mood trend line chart
│   │   │   │   ├── MoodTagSelector.tsx      # Tag chips: anxious, energetic, etc.
│   │   │   │   └── SleepInput.tsx           # Hours + quality slider
│   │   │   ├── hooks/
│   │   │   │   ├── useMentalHealthLogs.ts   # TanStack Query: fetch mental health logs
│   │   │   │   ├── useCreateMentalHealth.ts # TanStack Mutation: create entry
│   │   │   │   └── useDeleteMentalHealth.ts # TanStack Mutation: delete entry
│   │   │   ├── services/
│   │   │   │   └── mental-health.api.ts     # API client functions
│   │   │   ├── types/
│   │   │   │   └── mental-health.types.ts   # Frontend types: MentalHealthLog
│   │   │   └── index.ts                     # Public exports
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── DashboardSummary.tsx     # Today + this week quick stats
│   │   │   │   ├── StreakDisplay.tsx        # Current + best streak badges
│   │   │   │   ├── TrendChart.tsx           # Generic Recharts trend line
│   │   │   │   ├── CalorieTrendChart.tsx    # Calories over time chart
│   │   │   │   ├── WorkoutFrequencyChart.tsx# Bar chart: workouts per week
│   │   │   │   ├── AlcoholTrendChart.tsx    # Alcohol consumption over time
│   │   │   │   └── WeeklyProgressBars.tsx   # Progress bars: meals, workouts, hydration
│   │   │   ├── hooks/
│   │   │   │   ├── useDashboard.ts          # TanStack Query: /api/analytics/dashboard
│   │   │   │   ├── useTrends.ts             # TanStack Query: /api/analytics/trends
│   │   │   │   └── useStreaks.ts            # TanStack Query: /api/analytics/streaks
│   │   │   ├── services/
│   │   │   │   └── analytics.api.ts         # API client functions for analytics
│   │   │   ├── types/
│   │   │   │   └── analytics.types.ts       # Frontend types: Dashboard, Trends
│   │   │   └── index.ts                     # Public exports
│   │   └── admin/
│   │       ├── components/
│   │       │   ├── UserTable.tsx             # Data table of all users
│   │       │   ├── UserRoleSelect.tsx        # Dropdown to change user role
│   │       │   └── UserDeleteDialog.tsx      # Confirm dialog for user deletion
│   │       ├── hooks/
│   │       │   ├── useAdminUsers.ts          # TanStack Query: fetch all users
│   │       │   ├── useUpdateUserRole.ts      # TanStack Mutation: patch user role
│   │       │   └── useDeleteUser.ts          # TanStack Mutation: delete user
│   │       ├── services/
│   │       │   └── admin.api.ts              # API client functions for admin
│   │       ├── types/
│   │       │   └── admin.types.ts            # Frontend types for admin views
│   │       └── index.ts                      # Public exports
│   ├── components/
│   │   ├── ui/                              # Shadcn/UI primitives (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── label.tsx
│   │   │   ├── form.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── table.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── layout/
│   │   │   ├── RootLayout.tsx              # Top-level layout: header + content + nav
│   │   │   ├── BottomTabs.tsx              # Mobile bottom tab navigation (5 tabs)
│   │   │   ├── Sidebar.tsx                 # Desktop sidebar navigation
│   │   │   ├── Header.tsx                  # Top bar with logo + avatar + theme toggle
│   │   │   └── PageContainer.tsx           # Max-width wrapper + padding for page content
│   │   └── shared/
│   │       ├── QuickAddFAB.tsx             # Floating action button for fast logging
│   │       ├── DatePicker.tsx              # Reusable date picker (wraps calendar)
│   │       ├── DateRangePicker.tsx         # Date range selector for filters
│   │       ├── PhotoUpload.tsx             # Camera/file upload for food photos
│   │       ├── EmptyState.tsx             # "No data yet" placeholder component
│   │       ├── ErrorBoundary.tsx          # React error boundary with fallback UI
│   │       ├── LoadingSpinner.tsx         # Centered spinner component
│   │       ├── ConfirmDialog.tsx          # Reusable delete/action confirmation
│   │       ├── SearchInput.tsx            # Debounced search input field
│   │       └── ThemeToggle.tsx            # Dark/light mode toggle button
│   ├── hooks/
│   │   ├── useAuth.ts                      # Auth context hook: user, login, logout, session
│   │   ├── useMediaQuery.ts                # Responsive breakpoint hook (mobile/desktop)
│   │   ├── useDebounce.ts                  # Debounce value hook for search
│   │   ├── useLocalStorage.ts              # Typed localStorage read/write hook
│   │   └── useTheme.ts                     # Dark/light theme state hook
│   ├── lib/
│   │   ├── supabase.ts                     # Supabase client init (anon key, URL)
│   │   ├── api-client.ts                   # Fetch wrapper: base URL, JWT injection, error handling
│   │   ├── query-client.ts                 # TanStack Query client config (stale time, retries)
│   │   └── utils.ts                        # cn() classname merger, formatDate, etc.
│   ├── stores/
│   │   ├── auth.store.ts                   # Zustand: user session, role, token
│   │   ├── theme.store.ts                  # Zustand: dark/light mode preference
│   │   └── ui.store.ts                     # Zustand: sidebar open, active tab, modals
│   ├── types/
│   │   ├── index.ts                        # Re-exports all global types
│   │   ├── api.types.ts                    # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │   ├── auth.types.ts                   # User, Session, AuthState
│   │   └── enums.ts                        # MealType, WorkoutType, UserRole, etc.
│   ├── styles/
│   │   └── globals.css                     # Tailwind directives + CSS variables + dark mode
│   └── assets/
│       ├── logo.svg                        # ShakerSplit logo
│       └── icons/                          # Custom SVG icons (if needed beyond Lucide)
│
├── public/                                 # Static assets served at root
│   ├── manifest.json                       # PWA manifest: name, icons, theme, display
│   ├── robots.txt                          # SEO: allow/disallow crawlers
│   ├── favicon.ico                         # Browser tab icon
│   └── icons/
│       ├── icon-192x192.png               # PWA icon (standard)
│       ├── icon-512x512.png               # PWA icon (large)
│       ├── apple-touch-icon.png           # iOS home screen icon
│       └── maskable-icon.png              # Android maskable icon
│
├── planning/                               # Planning documents (not deployed)
│   ├── plan.md                             # Master plan: features, architecture, phases
│   ├── diagrams.md                         # All Mermaid architecture diagrams
│   ├── schema.sql                          # Full PostgreSQL schema + RLS + seed data
│   ├── repository-structure.md            # This file
│   └── api-specification.md               # API endpoint documentation
│
├── supabase/                               # Supabase local dev + migrations
│   ├── config.toml                         # Supabase CLI project config
│   └── migrations/
│       ├── 001_initial_schema.sql          # Core tables: users, preferences, logs
│       ├── 002_plans_and_entries.sql       # Weekly plans + plan entries
│       ├── 003_recipes_routines.sql        # Recipes + workout routines
│       ├── 004_social_streaks.sql          # Friendships + activity streaks
│       └── 005_rls_policies.sql            # Row-level security policies
│
├── package.json                            # Dependencies: React, Vite, TanStack, Zustand, Zod
├── tsconfig.json                           # Root TypeScript config
├── tsconfig.app.json                       # Frontend TS config (React, JSX, paths)
├── tsconfig.node.json                      # Build tooling TS config
├── vite.config.ts                          # Vite: plugins (React, PWA), proxy /api in dev
├── tailwind.config.ts                      # Tailwind: custom colors, fonts, breakpoints
├── postcss.config.js                       # PostCSS: Tailwind + autoprefixer
├── components.json                         # Shadcn/UI config (style, paths, aliases)
├── vercel.json                             # Vercel: rewrites (SPA fallback), headers, regions
├── .env.example                            # Template: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.
├── .gitignore                              # Ignore: node_modules, dist, .env.local, .vercel
├── .eslintrc.cjs                           # ESLint config: React, TypeScript rules
├── .prettierrc                             # Prettier config: semi, single quotes, trailing commas
└── README.md                               # Project overview, setup instructions, deploy guide
```

---

## Architecture Pattern Mapping

| Layer             | Pattern          | Files                                                             |
| ----------------- | ---------------- | ----------------------------------------------------------------- |
| **Route Handler** | Thin entry point | `api/*.ts` → delegates to controller                              |
| **Controller**    | HTTP adapter     | `api/_lib/controllers/` → parses request, sends response          |
| **Service**       | Business logic   | `api/_lib/services/` → orchestrates, validates, calculates        |
| **Repository**    | Data access      | `api/_lib/repositories/` → wraps Supabase client queries          |
| **Middleware**    | Cross-cutting    | `api/_lib/middleware/` → auth, CORS, validation, errors           |
| **Validator**     | Input schemas    | `api/_lib/validators/` → Zod schemas for request bodies           |
| **Factory**       | Handler creation | `api/_lib/factories/` → builds middleware pipeline                |
| **Page**          | Route view       | `src/pages/` → full-page components                               |
| **Feature**       | Domain module    | `src/features/` → self-contained feature (hooks, components, API) |
| **Hook**          | Data bridge      | `src/features/*/hooks/` → TanStack Query + mutations              |
| **Store**         | Client state     | `src/stores/` → Zustand for UI-only state                         |
| **Component**     | UI primitive     | `src/components/ui/` → Shadcn/UI building blocks                  |

---

## Key Configuration Files

### vercel.json

```json
{
  "rewrites": [{ "source": "/((?!api).*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ]
}
```

### .env.example

```bash
# Supabase (public — safe for frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase (private — backend only, never expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
VITE_APP_URL=http://localhost:5173
```
