/**
 * Admin single-file router. Dispatches by ?resource= and ?id=:
 *   GET    /api/admin?resource=stats                                stats summary
 *   GET    /api/admin?resource=users                                user list
 *   PATCH  /api/admin?resource=users&id=:id                         change role / display_name
 *   DELETE /api/admin?resource=users&id=:id                         delete user
 *   GET    /api/admin?resource=recipes                              list ALL recipes (incl. private)
 *   POST   /api/admin?resource=recipes                              create recipe
 *   PATCH  /api/admin?resource=recipes&id=:id                       update recipe
 *   DELETE /api/admin?resource=recipes&id=:id                       delete recipe
 *   GET    /api/admin?resource=routines                             list ALL workout routines
 *   POST   /api/admin?resource=routines                             create routine
 *   PATCH  /api/admin?resource=routines&id=:id                      update routine
 *   DELETE /api/admin?resource=routines&id=:id                      delete routine
 *
 * Admin-only — requireAdmin middleware enforces 403 for non-ADMIN users.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/middleware/cors.middleware';
import { requireAdmin } from './_lib/middleware/auth.middleware';
import { supabaseAdmin } from './_lib/config/supabase.config';
import { success, error } from './_lib/utils/response.util';
import { sendPushToUsers } from './_lib/utils/push.util';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const resource = (req.query.resource as string | undefined) ?? 'stats';
  const id = req.query.id as string | undefined;
  const method = req.method?.toUpperCase();

  try {
    if (resource === 'stats' && method === 'GET') return await handleStats(res);

    if (resource === 'users') {
      if (method === 'GET' && !id) return await handleListUsers(res);
      if (method === 'PATCH' && id) return await handlePatchUser(req, res, admin.id, id);
      if (method === 'DELETE' && id) return await handleDeleteUser(res, admin.id, id);
    }

    if (resource === 'recipes') {
      if (method === 'GET' && !id) return await handleListRecipes(res);
      if (method === 'POST') return await handleCreateRecipe(req, res, admin.id);
      if (method === 'PATCH' && id) return await handleUpdateRecipe(req, res, id);
      if (method === 'DELETE' && id) return await handleDeleteRecipe(res, id);
    }

    if (resource === 'routines') {
      if (method === 'GET' && !id) return await handleListRoutines(res);
      if (method === 'POST') return await handleCreateRoutine(req, res, admin.id);
      if (method === 'PATCH' && id) return await handleUpdateRoutine(req, res, id);
      if (method === 'DELETE' && id) return await handleDeleteRoutine(res, id);
    }

    // Push broadcast — sends a notification to every user with at least one subscription.
    if (resource === 'push' && method === 'POST') return await handlePushBroadcast(req, res);

    return error(res, 400, 'VALIDATION_ERROR', `Unsupported: resource=${resource} method=${method} ${id ? 'with id' : 'without id'}`);
  } catch (err) {
    console.error('admin error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}

// ── stats ───────────────────────────────────────────────────────────────────
async function handleStats(res: VercelResponse) {
  const [users, food, workout, alcohol, weight, plans, mental, recipes, routines] = await Promise.all([
    supabaseAdmin.from('users').select('id, role, created_at', { count: 'exact', head: false }),
    supabaseAdmin.from('food_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('workout_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('alcohol_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('weight_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('weekly_plans').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('mental_health_logs').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('recipes').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('workout_routines').select('id', { count: 'exact', head: true }),
  ]);
  if (users.error) return error(res, 500, 'INTERNAL_ERROR', users.error.message);

  const totalUsers = users.count ?? 0;
  const adminUsers = (users.data ?? []).filter((u) => u.role === 'ADMIN').length;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newSignups7d = (users.data ?? []).filter((u) => new Date(u.created_at) >= sevenDaysAgo).length;

  return success(res, {
    total_users: totalUsers,
    admin_users: adminUsers,
    new_signups_7d: newSignups7d,
    total_food_logs: food.count ?? 0,
    total_workout_logs: workout.count ?? 0,
    total_alcohol_logs: alcohol.count ?? 0,
    total_weight_logs: weight.count ?? 0,
    total_mental_logs: mental.count ?? 0,
    total_plans: plans.count ?? 0,
    total_recipes: recipes.count ?? 0,
    total_routines: routines.count ?? 0,
  });
}

// ── users ───────────────────────────────────────────────────────────────────
async function handleListUsers(res: VercelResponse) {
  const { data: users, error: dbErr } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name, role, created_at, height_cm, weight_kg')
    .order('created_at', { ascending: false });
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);

  const ids = (users ?? []).map((u) => u.id);
  if (ids.length === 0) return success(res, []);

  const [foodCounts, workoutCounts, alcoholCounts] = await Promise.all([
    supabaseAdmin.from('food_logs').select('user_id').in('user_id', ids),
    supabaseAdmin.from('workout_logs').select('user_id').in('user_id', ids),
    supabaseAdmin.from('alcohol_logs').select('user_id').in('user_id', ids),
  ]);

  const tally = (rows: { user_id: string }[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return m;
  };

  const foodMap = tally(foodCounts.data);
  const workoutMap = tally(workoutCounts.data);
  const alcoholMap = tally(alcoholCounts.data);

  const enriched = (users ?? []).map((u) => ({
    ...u,
    food_log_count: foodMap.get(u.id) ?? 0,
    workout_log_count: workoutMap.get(u.id) ?? 0,
    alcohol_log_count: alcoholMap.get(u.id) ?? 0,
  }));

  return success(res, enriched);
}

async function handlePatchUser(req: VercelRequest, res: VercelResponse, adminId: string, targetId: string) {
  if (targetId === adminId) {
    return error(res, 400, 'VALIDATION_ERROR', "You can't modify your own admin role.");
  }
  const { role, display_name } = (req.body ?? {}) as { role?: string; display_name?: string };
  const updates: Record<string, unknown> = {};
  if (role !== undefined) {
    if (!['USER', 'ADMIN'].includes(role)) return error(res, 400, 'VALIDATION_ERROR', 'role must be USER or ADMIN');
    updates.role = role;
  }
  if (display_name !== undefined) updates.display_name = display_name;
  if (Object.keys(updates).length === 0) return error(res, 400, 'VALIDATION_ERROR', 'No fields to update');

  const { data, error: dbErr } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', targetId)
    .select()
    .single();
  if (dbErr || !data) return error(res, 500, 'INTERNAL_ERROR', dbErr?.message ?? 'Update failed');
  return success(res, data);
}

async function handleDeleteUser(res: VercelResponse, adminId: string, targetId: string) {
  if (targetId === adminId) {
    return error(res, 400, 'VALIDATION_ERROR', "You can't delete your own account from the admin panel. Use Profile → Delete account.");
  }
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
  if (authErr) return error(res, 500, 'INTERNAL_ERROR', `Auth delete failed: ${authErr.message}`);
  await supabaseAdmin.from('users').delete().eq('id', targetId);
  return success(res, { deleted: true });
}

// ── recipes ─────────────────────────────────────────────────────────────────
async function handleListRecipes(res: VercelResponse) {
  const { data, error: dbErr } = await supabaseAdmin
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, data ?? []);
}

async function handleCreateRecipe(req: VercelRequest, res: VercelResponse, adminId: string) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!body.title || !body.category) return error(res, 400, 'VALIDATION_ERROR', 'title and category required');
  const { data, error: dbErr } = await supabaseAdmin
    .from('recipes')
    .insert({
      created_by: adminId,
      title: body.title,
      description: body.description ?? null,
      ingredients: body.ingredients ?? [],
      instructions: body.instructions ?? null,
      youtube_url: body.youtube_url ?? null,
      category: body.category,
      calories: body.calories ?? null,
      protein_g: body.protein_g ?? null,
      prep_time_minutes: body.prep_time_minutes ?? null,
      photo_url: body.photo_url ?? null,
      is_public: body.is_public ?? true,
    })
    .select()
    .single();
  if (dbErr || !data) return error(res, 500, 'INTERNAL_ERROR', dbErr?.message ?? 'Insert failed');
  return success(res, data, 201);
}

async function handleUpdateRecipe(req: VercelRequest, res: VercelResponse, id: string) {
  const updates = (req.body ?? {}) as Record<string, unknown>;
  delete updates.id;
  delete updates.created_at;
  delete updates.created_by;
  const { data, error: dbErr } = await supabaseAdmin
    .from('recipes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (dbErr || !data) return error(res, 404, 'NOT_FOUND', dbErr?.message ?? 'Recipe not found');
  return success(res, data);
}

async function handleDeleteRecipe(res: VercelResponse, id: string) {
  const { error: dbErr } = await supabaseAdmin.from('recipes').delete().eq('id', id);
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, { deleted: true });
}

// ── workout routines ───────────────────────────────────────────────────────
async function handleListRoutines(res: VercelResponse) {
  const { data, error: dbErr } = await supabaseAdmin
    .from('workout_routines')
    .select('*')
    .order('created_at', { ascending: false });
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, data ?? []);
}

async function handleCreateRoutine(req: VercelRequest, res: VercelResponse, adminId: string) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (!body.title || !body.workout_type || !body.difficulty) {
    return error(res, 400, 'VALIDATION_ERROR', 'title, workout_type, and difficulty required');
  }
  const { data, error: dbErr } = await supabaseAdmin
    .from('workout_routines')
    .insert({
      created_by: adminId,
      title: body.title,
      description: body.description ?? null,
      workout_type: body.workout_type,
      exercises: body.exercises ?? [],
      youtube_url: body.youtube_url ?? null,
      difficulty: body.difficulty,
      is_public: body.is_public ?? true,
    })
    .select()
    .single();
  if (dbErr || !data) return error(res, 500, 'INTERNAL_ERROR', dbErr?.message ?? 'Insert failed');
  return success(res, data, 201);
}

async function handleUpdateRoutine(req: VercelRequest, res: VercelResponse, id: string) {
  const updates = (req.body ?? {}) as Record<string, unknown>;
  delete updates.id;
  delete updates.created_at;
  delete updates.created_by;
  const { data, error: dbErr } = await supabaseAdmin
    .from('workout_routines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (dbErr || !data) return error(res, 404, 'NOT_FOUND', dbErr?.message ?? 'Routine not found');
  return success(res, data);
}

async function handleDeleteRoutine(res: VercelResponse, id: string) {
  const { error: dbErr } = await supabaseAdmin.from('workout_routines').delete().eq('id', id);
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);
  return success(res, { deleted: true });
}

// ── push broadcast ──────────────────────────────────────────────────────────
async function handlePushBroadcast(req: VercelRequest, res: VercelResponse) {
  const { title, body, url, tag } = (req.body ?? {}) as {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  };
  if (!title?.trim() || !body?.trim()) {
    return error(res, 400, 'VALIDATION_ERROR', 'title and body required');
  }

  // Get every user_id with at least one push subscription.
  const { data: subs, error: dbErr } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id');
  if (dbErr) return error(res, 500, 'INTERNAL_ERROR', dbErr.message);

  const uniqueUsers = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
  if (uniqueUsers.length === 0) {
    return success(res, { sent: 0, recipients: 0 });
  }

  const sent = await sendPushToUsers(uniqueUsers, {
    title: title.trim(),
    body: body.trim(),
    url: url?.trim() || '/app',
    tag: tag?.trim() || 'broadcast',
  });
  return success(res, { sent, recipients: uniqueUsers.length });
}
