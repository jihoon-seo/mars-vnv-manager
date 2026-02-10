import { supabase } from './supabase';
import type { MarsVersion } from '../types';

export async function getMarsVersions() {
  const { data, error } = await supabase
    .from('mars_versions')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data as MarsVersion[];
}

export async function createMarsVersion(
  version: Omit<MarsVersion, 'id' | 'created_at' | 'created_by'>
) {
  // If setting as reference, unset existing reference first
  if (version.is_reference) {
    await supabase
      .from('mars_versions')
      .update({ is_reference: false })
      .eq('is_reference', true);
  }

  const { data, error } = await supabase
    .from('mars_versions')
    .insert(version)
    .select()
    .single();
  if (error) throw error;
  return data as MarsVersion;
}

export async function updateMarsVersion(id: string, updates: Partial<MarsVersion>) {
  if (updates.is_reference) {
    await supabase
      .from('mars_versions')
      .update({ is_reference: false })
      .eq('is_reference', true);
  }

  const { data, error } = await supabase
    .from('mars_versions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as MarsVersion;
}

export async function deleteMarsVersion(id: string) {
  const { error } = await supabase.from('mars_versions').delete().eq('id', id);
  if (error) throw error;
}
