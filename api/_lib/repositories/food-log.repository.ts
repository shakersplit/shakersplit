import { supabaseAdmin } from '../config/supabase.config';
import type { PaginationParams } from '../types';

interface FoodLogFilters {
  userId: string;
  from?: string;
  to?: string;
  meal_type?: string;
}

export const foodLogRepository = {
  async findAll(filters: FoodLogFilters, pagination: PaginationParams) {
    let query = supabaseAdmin
      .from('food_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', filters.userId)
      .order('logged_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (filters.from) query = query.gte('logged_at', filters.from);
    if (filters.to) query = query.lte('logged_at', filters.to);
    if (filters.meal_type) query = query.eq('meal_type', filters.meal_type);

    return query;
  },

  async findById(id: string, userId: string) {
    return supabaseAdmin
      .from('food_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
  },

  async create(data: Record<string, unknown>) {
    return supabaseAdmin.from('food_logs').insert(data).select().single();
  },

  async update(id: string, userId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('food_logs')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
  },

  async delete(id: string, userId: string) {
    return supabaseAdmin.from('food_logs').delete().eq('id', id).eq('user_id', userId);
  },
};
