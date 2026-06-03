# ShakerSplit — API Specification

All endpoints are Vercel Serverless Functions under `/api/`.  
Authentication: Supabase JWT in `Authorization: Bearer <token>` header.

---

## Common Types

```typescript
// Generic API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}

// Paginated list response
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error response
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>; // field-level validation errors
}

// Pagination query parameters
interface PaginationParams {
  page?: number; // default: 1
  limit?: number; // default: 20, max: 100
}

// Date range filter
interface DateRangeParams {
  from?: string; // ISO date: 2026-01-01
  to?: string; // ISO date: 2026-01-31
}
```

---

## Middleware Pipeline

Every API request flows through:

```
Request → cors → rateLimit → verifyJWT → validateBody? → controller → response
```

| Middleware     | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `cors`         | Allow `VITE_APP_URL` origin, methods: GET/POST/PUT/PATCH/DELETE   |
| `rateLimit`    | Token bucket: 100 requests/minute per user                        |
| `verifyJWT`    | Decode Supabase JWT, attach `req.user: { id, email, role }`       |
| `validateBody` | Zod schema validation on POST/PUT/PATCH body                      |
| `requireAdmin` | Additional check: `req.user.role === 'ADMIN'` (admin routes only) |

---

## Error Codes

| HTTP Status | Code               | When                                                        |
| ----------- | ------------------ | ----------------------------------------------------------- |
| 400         | `VALIDATION_ERROR` | Request body fails Zod validation                           |
| 401         | `UNAUTHORIZED`     | Missing or invalid JWT token                                |
| 403         | `FORBIDDEN`        | User lacks permission (e.g., non-admin on admin route)      |
| 404         | `NOT_FOUND`        | Resource doesn't exist or not owned by user                 |
| 409         | `CONFLICT`         | Duplicate entry (e.g., weight log already exists for today) |
| 429         | `RATE_LIMITED`     | Too many requests                                           |
| 500         | `INTERNAL_ERROR`   | Unexpected server error                                     |

---

## Handler Factory Pattern

```typescript
// api/_lib/factories/handler.factory.ts
import { VercelRequest, VercelResponse } from "@vercel/node";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface HandlerConfig {
  GET?: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  POST?: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  PUT?: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  PATCH?: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  DELETE?: (req: VercelRequest, res: VercelResponse) => Promise<void>;
  middleware?: Middleware[];
  validation?: Partial<Record<HttpMethod, ZodSchema>>;
}

export function createHandler(config: HandlerConfig) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // 1. CORS
    // 2. Rate limit
    // 3. Verify JWT
    // 4. Route to method handler
    // 5. Validate body if schema provided
    // 6. Execute handler
    // 7. Catch errors → error response
  };
}
```

---

## 1. Food Logs

### `GET /api/food-logs`

List food logs for the authenticated user.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| from | string | - | Start date (ISO) |
| to | string | - | End date (ISO) |
| meal_type | string | - | Filter: BREAKFAST, LUNCH, DINNER, SNACK, PRE_GAME |

**Response:** `PaginatedResponse<FoodLog>`

```typescript
interface FoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "PRE_GAME";
  food_items: FoodItem[];
  total_calories: number | null;
  total_protein_g: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

interface FoodItem {
  name: string;
  quantity: string;
  calories?: number;
  protein_g?: number;
}
```

### `POST /api/food-logs`

Create a new food log.

**Request Body:**

```typescript
interface CreateFoodLog {
  logged_at?: string; // default: now
  meal_type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "PRE_GAME";
  food_items: FoodItem[];
  total_calories?: number;
  total_protein_g?: number;
  photo_url?: string;
  notes?: string;
}
```

**Response:** `ApiResponse<FoodLog>` — 201 Created

### `GET /api/food-logs/:id`

Get a single food log by ID.

**Response:** `ApiResponse<FoodLog>` — 200 OK or 404

### `PUT /api/food-logs/:id`

Update a food log (full replace).

**Request Body:** `CreateFoodLog`  
**Response:** `ApiResponse<FoodLog>` — 200 OK

### `DELETE /api/food-logs/:id`

Delete a food log.

**Response:** `ApiResponse<{ deleted: true }>` — 200 OK

---

## 2. Workout Logs

### `GET /api/workout-logs`

List workout logs for the authenticated user.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| from | string | - | Start date (ISO) |
| to | string | - | End date (ISO) |
| workout_type | string | - | Filter by type |

**Response:** `PaginatedResponse<WorkoutLog>`

```typescript
interface WorkoutLog {
  id: string;
  user_id: string;
  logged_at: string;
  workout_type: WorkoutType;
  duration_minutes: number;
  exercises: Exercise[];
  calories_burned: number | null;
  notes: string | null;
  created_at: string;
}

type WorkoutType =
  | "GYM_PUSH"
  | "GYM_PULL"
  | "GYM_LEGS"
  | "GYM_UPPER"
  | "GYM_LOWER"
  | "GYM_FULL"
  | "RUN"
  | "WALK"
  | "SPORT"
  | "OTHER";

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  distance_km?: number;
  pace_min_km?: number;
  notes?: string;
}
```

### `POST /api/workout-logs`

Create a new workout log.

**Request Body:**

```typescript
interface CreateWorkoutLog {
  logged_at?: string;
  workout_type: WorkoutType;
  duration_minutes: number;
  exercises: Exercise[];
  calories_burned?: number;
  notes?: string;
}
```

**Response:** `ApiResponse<WorkoutLog>` — 201 Created

### `GET /api/workout-logs/:id`

**Response:** `ApiResponse<WorkoutLog>`

### `PUT /api/workout-logs/:id`

**Request Body:** `CreateWorkoutLog`  
**Response:** `ApiResponse<WorkoutLog>`

### `DELETE /api/workout-logs/:id`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 3. Alcohol Logs

### `GET /api/alcohol-logs`

List alcohol logs.

**Query Parameters:** `PaginationParams` + `DateRangeParams`

**Response:** `PaginatedResponse<AlcoholLog>`

```typescript
interface AlcoholLog {
  id: string;
  user_id: string;
  logged_at: string;
  spirit_type: string;
  quantity_ml: number;
  mixer: string | null;
  pre_game_meal_eaten: boolean;
  water_consumed_ml: number;
  intoxication_level: number | null; // 1-5
  hangover_severity: number | null; // 1-5
  notes: string | null;
  created_at: string;
}
```

### `POST /api/alcohol-logs`

**Request Body:**

```typescript
interface CreateAlcoholLog {
  logged_at?: string;
  spirit_type: string;
  quantity_ml: number;
  mixer?: string;
  pre_game_meal_eaten?: boolean;
  water_consumed_ml?: number;
  intoxication_level?: number; // 1-5
  hangover_severity?: number; // 1-5
  notes?: string;
}
```

**Response:** `ApiResponse<AlcoholLog>` — 201 Created

### `GET /api/alcohol-logs/:id`

**Response:** `ApiResponse<AlcoholLog>`

### `PUT /api/alcohol-logs/:id`

**Request Body:** `CreateAlcoholLog`  
**Response:** `ApiResponse<AlcoholLog>`

### `DELETE /api/alcohol-logs/:id`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 4. Weekly Plans

### `GET /api/plans`

List weekly plans.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| is_template | boolean | - | Filter templates only |

**Response:** `PaginatedResponse<WeeklyPlan>`

```typescript
interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start_date: string; // ISO date
  name: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}
```

### `POST /api/plans`

**Request Body:**

```typescript
interface CreatePlan {
  week_start_date: string; // Must be a Monday
  name?: string;
  is_template?: boolean;
}
```

**Response:** `ApiResponse<WeeklyPlan>` — 201 Created

### `GET /api/plans/:planId`

**Response:** `ApiResponse<WeeklyPlan & { entries: PlanEntry[] }>`

### `PUT /api/plans/:planId`

**Request Body:** `Partial<CreatePlan>`  
**Response:** `ApiResponse<WeeklyPlan>`

### `DELETE /api/plans/:planId`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 5. Plan Entries

### `GET /api/plans/:planId/entries`

List entries for a specific plan.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| day_of_week | number | Filter by day (0=Sun, 6=Sat) |
| category | string | FOOD, WORKOUT, ALCOHOL |

**Response:** `ApiResponse<PlanEntry[]>`

```typescript
interface PlanEntry {
  id: string;
  weekly_plan_id: string;
  day_of_week: number; // 0 (Sun) - 6 (Sat)
  category: "FOOD" | "WORKOUT" | "ALCOHOL";
  time_slot: string | null;
  content: PlanContent;
  notes: string | null;
  created_at: string;
}

// Flexible content depending on category
type PlanContent = FoodPlanContent | WorkoutPlanContent | AlcoholPlanContent;

interface FoodPlanContent {
  meal_type: string;
  items: string[];
  estimated_calories?: number;
}

interface WorkoutPlanContent {
  workout_type: string;
  exercises: string[];
  duration_minutes?: number;
}

interface AlcoholPlanContent {
  occasion: string;
  planned_drinks?: number;
  pre_game_plan?: string;
}
```

### `POST /api/plans/:planId/entries`

**Request Body:**

```typescript
interface CreatePlanEntry {
  day_of_week: number;
  category: "FOOD" | "WORKOUT" | "ALCOHOL";
  time_slot?: string;
  content: PlanContent;
  notes?: string;
}
```

**Response:** `ApiResponse<PlanEntry>` — 201 Created

### `PUT /api/plans/:planId/entries/:entryId`

**Request Body:** `Partial<CreatePlanEntry>`  
**Response:** `ApiResponse<PlanEntry>`

### `DELETE /api/plans/:planId/entries/:entryId`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 6. Recipes

### `GET /api/recipes`

List recipes (public + own private).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| category | string | PRE_WORKOUT, POST_WORKOUT, PRE_GAME, HEALTHY, COCKTAIL, SNACK |
| search | string | Search title/description |

**Response:** `PaginatedResponse<Recipe>`

```typescript
interface Recipe {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: string | null;
  youtube_url: string | null;
  category: RecipeCategory;
  calories: number | null;
  protein_g: number | null;
  prep_time_minutes: number | null;
  photo_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

type RecipeCategory =
  | "PRE_WORKOUT"
  | "POST_WORKOUT"
  | "PRE_GAME"
  | "HEALTHY"
  | "COCKTAIL"
  | "SNACK";

interface Ingredient {
  name: string;
  quantity: string;
  unit?: string;
}
```

### `POST /api/recipes`

**Request Body:**

```typescript
interface CreateRecipe {
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions?: string;
  youtube_url?: string;
  category: RecipeCategory;
  calories?: number;
  protein_g?: number;
  prep_time_minutes?: number;
  photo_url?: string;
  is_public?: boolean; // default: true
}
```

**Response:** `ApiResponse<Recipe>` — 201 Created

### `GET /api/recipes/:id`

**Response:** `ApiResponse<Recipe>`

### `PUT /api/recipes/:id`

**Request Body:** `CreateRecipe`  
**Response:** `ApiResponse<Recipe>`

### `DELETE /api/recipes/:id`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 7. Workout Routines

### `GET /api/routines`

List routines (public + own private).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| workout_type | string | Filter by workout type |
| difficulty | string | BEGINNER, INTERMEDIATE, ADVANCED |
| search | string | Search title/description |

**Response:** `PaginatedResponse<WorkoutRoutine>`

```typescript
interface WorkoutRoutine {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  workout_type: WorkoutType;
  exercises: RoutineExercise[];
  youtube_url: string | null;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface RoutineExercise {
  name: string;
  sets: number;
  reps: string; // "8-12" or "to failure"
  rest_seconds?: number;
  notes?: string;
}
```

### `POST /api/routines`

**Request Body:**

```typescript
interface CreateRoutine {
  title: string;
  description?: string;
  workout_type: WorkoutType;
  exercises: RoutineExercise[];
  youtube_url?: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  is_public?: boolean;
}
```

**Response:** `ApiResponse<WorkoutRoutine>` — 201 Created

### `GET /api/routines/:id`

**Response:** `ApiResponse<WorkoutRoutine>`

### `PUT /api/routines/:id`

**Request Body:** `CreateRoutine`  
**Response:** `ApiResponse<WorkoutRoutine>`

### `DELETE /api/routines/:id`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 8. Weight Logs

### `GET /api/weight-logs`

List weight logs.

**Query Parameters:** `PaginationParams` + `DateRangeParams`

**Response:** `PaginatedResponse<WeightLog>`

```typescript
interface WeightLog {
  id: string;
  user_id: string;
  logged_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  notes: string | null;
  created_at: string;
}
```

### `POST /api/weight-logs`

**Request Body:**

```typescript
interface CreateWeightLog {
  logged_at?: string;
  weight_kg: number;
  body_fat_pct?: number;
  notes?: string;
}
```

**Response:** `ApiResponse<WeightLog>` — 201 Created  
**Error:** 409 if entry already exists for that date

### `GET /api/weight-logs/:id`

**Response:** `ApiResponse<WeightLog>`

### `PUT /api/weight-logs/:id`

**Request Body:** `CreateWeightLog`  
**Response:** `ApiResponse<WeightLog>`

### `DELETE /api/weight-logs/:id`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 9. Mental Health Logs

### `GET /api/mental-health-logs`

List mental health logs.

**Query Parameters:** `PaginationParams` + `DateRangeParams`

**Response:** `PaginatedResponse<MentalHealthLog>`

```typescript
interface MentalHealthLog {
  id: string;
  user_id: string;
  logged_at: string;
  mood_score: number; // 1-10
  sleep_hours: number | null;
  sleep_quality: number | null; // 1-5
  journal_entry: string | null;
  tags: string[];
  created_at: string;
}
```

### `POST /api/mental-health-logs`

**Request Body:**

```typescript
interface CreateMentalHealthLog {
  logged_at?: string;
  mood_score: number; // 1-10
  sleep_hours?: number;
  sleep_quality?: number; // 1-5
  journal_entry?: string;
  tags?: string[];
}
```

**Response:** `ApiResponse<MentalHealthLog>` — 201 Created

### `GET /api/mental-health-logs/:id`

**Response:** `ApiResponse<MentalHealthLog>`

### `PUT /api/mental-health-logs/:id`

**Request Body:** `CreateMentalHealthLog`  
**Response:** `ApiResponse<MentalHealthLog>`

### `DELETE /api/mental-health-logs/:id`

**Response:** `ApiResponse<{ deleted: true }>`

---

## 10. Analytics

### `GET /api/analytics/dashboard`

Get today's summary + weekly progress.

**Response:**

```typescript
interface DashboardData {
  today: {
    calories_consumed: number;
    protein_consumed_g: number;
    workouts_completed: number;
    water_consumed_ml: number;
    mood_score: number | null;
  };
  this_week: {
    total_workouts: number;
    total_calories: number;
    avg_mood_score: number | null;
    alcohol_days: number;
    alcohol_free_days: number;
  };
  streaks: StreakData;
}
```

### `GET /api/analytics/trends`

Get time-series data for charts.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| metric | string | Required: calories, weight, workouts, alcohol, mood, sleep |
| from | string | Start date (ISO) |
| to | string | End date (ISO) |
| granularity | string | day (default), week, month |

**Response:**

```typescript
interface TrendResponse {
  metric: string;
  granularity: string;
  data_points: TrendDataPoint[];
}

interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}
```

### `GET /api/analytics/streaks`

Get current and best streaks.

**Response:**

```typescript
interface StreakData {
  food_log: { current: number; longest: number };
  workout: { current: number; longest: number };
  alcohol_free: { current: number; longest: number };
  overall: { current: number; longest: number };
}
```

---

## 11. Admin

> All admin endpoints require `requireAdmin` middleware.

### `GET /api/admin/users`

List all users.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search by email or display_name |
| role | string | Filter by USER or ADMIN |

**Response:** `PaginatedResponse<AdminUserView>`

```typescript
interface AdminUserView {
  id: string;
  email: string;
  display_name: string | null;
  role: "ADMIN" | "USER";
  created_at: string;
  last_active_at: string | null;
  total_logs: number;
}
```

### `PATCH /api/admin/users/:id`

Update a user's role.

**Request Body:**

```typescript
interface UpdateUserRole {
  role: "ADMIN" | "USER";
}
```

**Response:** `ApiResponse<AdminUserView>`

### `DELETE /api/admin/users/:id`

Delete a user and all their data.

**Response:** `ApiResponse<{ deleted: true }>`

---

## 12. User Profile

### `GET /api/users/me`

Get own profile.

**Response:**

```typescript
interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "ADMIN" | "USER";
  height_cm: number | null;
  weight_kg: number | null;
  date_of_birth: string | null;
  created_at: string;
}
```

### `PATCH /api/users/me`

Update own profile.

**Request Body:**

```typescript
interface UpdateProfile {
  display_name?: string;
  avatar_url?: string;
  height_cm?: number;
  weight_kg?: number;
  date_of_birth?: string;
}
```

**Response:** `ApiResponse<UserProfile>`

### `GET /api/users/me/preferences`

Get user preferences.

**Response:**

```typescript
interface UserPreferences {
  theme: "DARK" | "LIGHT";
  notifications_enabled: boolean;
  default_units: "METRIC" | "IMPERIAL";
  timezone: string;
}
```

### `PATCH /api/users/me/preferences`

Update preferences.

**Request Body:** `Partial<UserPreferences>`  
**Response:** `ApiResponse<UserPreferences>`

---

## 13. Friendships (Phase 3)

### `GET /api/friends`

List accepted friends + pending requests.

**Response:**

```typescript
interface FriendsResponse {
  friends: FriendView[];
  pending_received: FriendRequest[];
  pending_sent: FriendRequest[];
}

interface FriendView {
  id: string;
  display_name: string;
  avatar_url: string | null;
  since: string;
}

interface FriendRequest {
  id: string; // friendship ID
  user: { id: string; display_name: string; avatar_url: string | null };
  created_at: string;
}
```

### `POST /api/friends`

Send friend request.

**Request Body:**

```typescript
interface SendFriendRequest {
  addressee_email: string;
}
```

**Response:** `ApiResponse<{ id: string; status: 'PENDING' }>` — 201

### `PATCH /api/friends/:id`

Accept or decline friend request.

**Request Body:**

```typescript
interface RespondFriendRequest {
  status: "ACCEPTED" | "DECLINED";
}
```

**Response:** `ApiResponse<{ id: string; status: string }>`

### `DELETE /api/friends/:id`

Remove friend / cancel request.

**Response:** `ApiResponse<{ deleted: true }>`

---

## Status Code Summary

| Scenario          | Status | Body                                                    |
| ----------------- | ------ | ------------------------------------------------------- |
| Success (read)    | 200    | `{ success: true, data: ... }`                          |
| Success (create)  | 201    | `{ success: true, data: ... }`                          |
| Validation error  | 400    | `{ success: false, error: { code, message, details } }` |
| Not authenticated | 401    | `{ success: false, error: { code: 'UNAUTHORIZED' } }`   |
| Not authorized    | 403    | `{ success: false, error: { code: 'FORBIDDEN' } }`      |
| Not found         | 404    | `{ success: false, error: { code: 'NOT_FOUND' } }`      |
| Conflict          | 409    | `{ success: false, error: { code: 'CONFLICT' } }`       |
| Rate limited      | 429    | `{ success: false, error: { code: 'RATE_LIMITED' } }`   |
| Server error      | 500    | `{ success: false, error: { code: 'INTERNAL_ERROR' } }` |
