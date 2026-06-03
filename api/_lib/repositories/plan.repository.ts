import { supabaseAdmin } from '../config/supabase.config';
import type { PaginationParams } from '../types';

interface PlanFilters {
  userId: string;
  isTemplate?: boolean;
  weekStartDate?: string;
}

/**
 * Repository for weekly_plans + plan_entries. All access is scoped by userId via the
 * admin client — we never trust route params alone. Plan ownership is checked at the
 * plan level for entry operations (a user can only mutate entries on plans they own).
 */
export const planRepository = {
  // ── plans ────────────────────────────────────────────────────────────────
  async findAll(filters: PlanFilters, pagination: PaginationParams) {
    let query = supabaseAdmin
      .from('weekly_plans')
      .select('*', { count: 'exact' })
      .eq('user_id', filters.userId)
      .order('week_start_date', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (filters.isTemplate !== undefined) {
      query = query.eq('is_template', filters.isTemplate);
    }
    if (filters.weekStartDate) {
      query = query.eq('week_start_date', filters.weekStartDate);
    }
    return query;
  },

  async findByWeek(userId: string, weekStartDate: string) {
    return supabaseAdmin
      .from('weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .maybeSingle();
  },

  async findById(planId: string, userId: string) {
    return supabaseAdmin
      .from('weekly_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();
  },

  async findByIdWithEntries(planId: string, userId: string) {
    const { data: plan, error: planErr } = await supabaseAdmin
      .from('weekly_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();
    if (planErr || !plan) return { data: null, error: planErr ?? new Error('Plan not found') };

    const { data: entries, error: entriesErr } = await supabaseAdmin
      .from('plan_entries')
      .select('*')
      .eq('weekly_plan_id', planId)
      .order('day_of_week', { ascending: true });
    if (entriesErr) return { data: null, error: entriesErr };

    return { data: { ...plan, entries: entries ?? [] }, error: null };
  },

  async create(data: { user_id: string; week_start_date: string; name?: string; is_template?: boolean }) {
    return supabaseAdmin.from('weekly_plans').insert(data).select().single();
  },

  async update(planId: string, userId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('weekly_plans')
      .update(data)
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();
  },

  async delete(planId: string, userId: string) {
    return supabaseAdmin.from('weekly_plans').delete().eq('id', planId).eq('user_id', userId);
  },

  // ── entries (scoped by parent plan ownership) ────────────────────────────
  async findEntries(planId: string, userId: string, filters?: { day_of_week?: number; category?: string }) {
    // First confirm the plan belongs to this user — return early if not.
    const { data: plan } = await supabaseAdmin
      .from('weekly_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!plan) return { data: null, error: new Error('Plan not found') };

    let query = supabaseAdmin
      .from('plan_entries')
      .select('*')
      .eq('weekly_plan_id', planId)
      .order('day_of_week', { ascending: true });

    if (filters?.day_of_week !== undefined) query = query.eq('day_of_week', filters.day_of_week);
    if (filters?.category) query = query.eq('category', filters.category);

    return query;
  },

  async ensurePlanOwnership(planId: string, userId: string) {
    const { data } = await supabaseAdmin
      .from('weekly_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  },

  async createEntry(planId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('plan_entries')
      .insert({ ...data, weekly_plan_id: planId })
      .select()
      .single();
  },

  async updateEntry(entryId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('plan_entries')
      .update(data)
      .eq('id', entryId)
      .select()
      .single();
  },

  async deleteEntry(entryId: string) {
    return supabaseAdmin.from('plan_entries').delete().eq('id', entryId);
  },

  async findEntryWithPlanOwner(entryId: string, userId: string) {
    // Used to check whether the entry belongs to a plan owned by this user.
    const { data, error } = await supabaseAdmin
      .from('plan_entries')
      .select('*, weekly_plans!inner(user_id)')
      .eq('id', entryId)
      .single();
    if (error || !data) return { data: null, error };
    // @ts-expect-error — Supabase typing for the joined object is `unknown[]` in some versions
    if (data.weekly_plans?.user_id !== userId) return { data: null, error: new Error('Forbidden') };
    return { data, error: null };
  },
};
