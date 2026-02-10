export interface UserRole {
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface InputFile {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  file_path: string | null;
  is_internal_only: boolean;
  uploaded_at: string;
  uploaded_by: string | null;
}

export interface MarsVersion {
  id: string;
  name: string;
  os: string | null;
  description: string | null;
  is_reference: boolean;
  created_at: string;
  created_by: string | null;
}

export interface SimulationResult {
  id: string;
  input_file_id: string;
  mars_version_id: string;
  plotfl_path: string;
  executed_at: string;
  uploaded_by: string | null;
  metadata: Record<string, unknown> | null;
}

export interface DiffStats {
  mean_diff: number;
  max_diff: number;
  rms_diff: number;
  num_mismatches: number;
  total_values: number;
}

export interface ComparisonSettings {
  tolerance_type: 'absolute' | 'relative';
  tolerance_value: number;
}

export interface ComparisonResult {
  id: string;
  simulation_result_id: string;
  reference_result_id: string | null;
  status: 'pass' | 'fail';
  diff_stats: DiffStats;
  compared_at: string;
  comparison_settings: ComparisonSettings;
}

export interface GlobalSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

// VnV Matrix cell data
export interface MatrixCell {
  input_file_id: string;
  mars_version_id: string;
  simulation_result_id: string | null;
  comparison_result: ComparisonResult | null;
  status: 'pass' | 'fail' | 'no_result' | 'no_reference';
}
