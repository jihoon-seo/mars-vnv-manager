import { supabase } from './supabase';
import type { ComparisonSettings } from '../types';

const DEFAULT_SETTINGS: ComparisonSettings = {
  tolerance_type: 'absolute',
  tolerance_value: 0.001,
};

export async function getComparisonSettings(): Promise<ComparisonSettings> {
  const { data, error } = await supabase
    .from('global_settings')
    .select('value')
    .eq('key', 'comparison_settings')
    .single();
  if (error || !data) return DEFAULT_SETTINGS;
  return data.value as ComparisonSettings;
}

export async function saveComparisonSettings(settings: ComparisonSettings) {
  const { error } = await supabase.from('global_settings').upsert({
    key: 'comparison_settings',
    value: settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getUserRoles() {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*, auth_user:user_id(email)')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId: string, role: 'admin' | 'user') {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role });
  if (error) throw error;
}
