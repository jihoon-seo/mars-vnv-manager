import { supabase } from './supabase';
import type { InputFile } from '../types';

export async function getInputFiles() {
  const { data, error } = await supabase
    .from('input_files')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as InputFile[];
}

export async function getInputFile(id: string) {
  const { data, error } = await supabase
    .from('input_files')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as InputFile;
}

export async function createInputFile(
  file: Omit<InputFile, 'id' | 'uploaded_at' | 'uploaded_by'>,
  uploadFile?: File
) {
  let filePath: string | null = null;

  if (uploadFile && !file.is_internal_only) {
    const storagePath = `${Date.now()}_${uploadFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('input-files')
      .upload(storagePath, uploadFile);
    if (uploadError) throw uploadError;
    filePath = storagePath;
  }

  const { data, error } = await supabase
    .from('input_files')
    .insert({ ...file, file_path: filePath })
    .select()
    .single();
  if (error) throw error;
  return data as InputFile;
}

export async function updateInputFile(id: string, updates: Partial<InputFile>) {
  const { data, error } = await supabase
    .from('input_files')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as InputFile;
}

export async function deleteInputFile(id: string) {
  // First get the file to clean up storage
  const { data: file } = await supabase
    .from('input_files')
    .select('file_path')
    .eq('id', id)
    .single();

  if (file?.file_path) {
    await supabase.storage.from('input-files').remove([file.file_path]);
  }

  const { error } = await supabase.from('input_files').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkCreateInputFiles(
  files: File[],
  category: string | null
): Promise<{ succeeded: string[]; failed: { name: string; error: string }[] }> {
  const succeeded: string[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const file of files) {
    try {
      const storagePath = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('input-files')
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('input_files').insert({
        name: file.name,
        description: null,
        category,
        file_path: storagePath,
        is_internal_only: false,
      });
      if (dbError) throw dbError;

      succeeded.push(file.name);
    } catch (err) {
      failed.push({ name: file.name, error: (err as Error).message });
    }
  }

  return { succeeded, failed };
}

export function getInputFileDownloadUrl(filePath: string) {
  const { data } = supabase.storage.from('input-files').getPublicUrl(filePath);
  return data.publicUrl;
}
