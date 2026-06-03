import { supabaseAdmin } from '../config/supabase.config';
import type { PaginationParams } from '../types';

interface AlcoholLogFilters {
  userId: string;
  from?: string;
  to?: string;
}

export const alcoholLogRepository = {
  async findAll(filters: AlcoholLogFilters, pagination: PaginationParams) {
    let query = supabaseAdmin
      .from('alcohol_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', filters.userId)
      .order('logged_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (filters.from) query = query.gte('logged_at', filters.from);
    if (filters.to) query = query.lte('logged_at', filters.to);

    return query;
  },

  async findById(id: string, userId: string) {
    return supabaseAdmin
      .from('alcohol_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
  },

  async create(data: Record<string, unknown>) {
    return supabaseAdmin.from('alcohol_logs').insert(data).select().single();
  },

  async update(id: string, userId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('alcohol_logs')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
  },

  async delete(id: string, userId: string) {
    return supabaseAdmin.from('alcohol_logs').delete().eq('id', id).eq('user_id', userId);
  },
};
