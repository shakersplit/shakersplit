import { supabaseAdmin } from '../config/supabase.config';
import type { PaginationParams } from '../types';

interface WorkoutLogFilters {
  userId: string;
  from?: string;
  to?: string;
  workout_type?: string;
}

export const workoutLogRepository = {
  async findAll(filters: WorkoutLogFilters, pagination: PaginationParams) {
    let query = supabaseAdmin
      .from('workout_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', filters.userId)
      .order('logged_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (filters.from) query = query.gte('logged_at', filters.from);
    if (filters.to) query = query.lte('logged_at', filters.to);
    if (filters.workout_type) query = query.eq('workout_type', filters.workout_type);

    return query;
  },

  async findById(id: string, userId: string) {
    return supabaseAdmin
      .from('workout_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
  },

  async create(data: Record<string, unknown>) {
    return supabaseAdmin.from('workout_logs').insert(data).select().single();
  },

  async update(id: string, userId: string, data: Record<string, unknown>) {
    return supabaseAdmin
      .from('workout_logs')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
  },

  async delete(id: string, userId: string) {
    return supabaseAdmin.from('workout_logs').delete().eq('id', id).eq('user_id', userId);
  },
};
