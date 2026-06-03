import { supabaseAdmin } from '../config/supabase.config';
import type { PaginationParams } from '../types';

interface WeightLogFilters {
  userId: string;
  from?: string;
  to?: string;
}

export const weightLogRepository = {
  async findAll(filters: WeightLogFilters, pagination: PaginationParams) {
    let query = supabaseAdmin
      .from('weight_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', filters.userId)
      .order('logged_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (filters.from) query = query.gte('logged_at', filters.from);
    if (filters.to) query = query.lte('logged_at', filters.to);

    return query;
  },

  /** Returns the latest weight entry, plus the one before that, for delta calculations. */
  async findRecent(userId: string, limit = 30) {
    return supabaseAdmin
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);
  },

  async create(data: Record<string, unknown>) {
    return supabaseAdmin.from('weight_logs').insert(data).select().single();
  },

  async update(id: string, userId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('weight_logs')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
  },

  async delete(id: string, userId: string) {
    return supabaseAdmin.from('weight_logs').delete().eq('id', id).eq('user_id', userId);
  },
};
