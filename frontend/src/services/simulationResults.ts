import { supabase } from './supabase';
import type { SimulationResult, ComparisonResult, ComparisonSettings } from '../types';
import { parsePlotfl, compareResults } from '../utils/plotflParser';

export async function getSimulationResults() {
  const { data, error } = await supabase
    .from('simulation_results')
    .select('*')
    .order('executed_at', { ascending: false });
  if (error) throw error;
  return data as SimulationResult[];
}

export async function uploadResult(
  inputFileId: string,
  marsVersionId: string,
  plotflFile: File,
  metadata?: Record<string, unknown>
) {
  const storagePath = `${inputFileId}/${marsVersionId}/plotfl`;

  // Remove existing file if any
  await supabase.storage.from('plotfl-results').remove([storagePath]);

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from('plotfl-results')
    .upload(storagePath, plotflFile, { upsert: true });
  if (uploadError) throw uploadError;

  // Upsert simulation result
  const { data, error } = await supabase
    .from('simulation_results')
    .upsert(
      {
        input_file_id: inputFileId,
        mars_version_id: marsVersionId,
        plotfl_path: storagePath,
        metadata: metadata ?? null,
      },
      { onConflict: 'input_file_id,mars_version_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as SimulationResult;
}

export async function getPlotflContent(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('plotfl-results')
    .download(storagePath);
  if (error) throw error;
  return await data.text();
}

export async function runComparison(
  simulationResultId: string,
  referenceResultId: string,
  settings: ComparisonSettings
): Promise<ComparisonResult> {
  // Get both simulation results
  const { data: simResult } = await supabase
    .from('simulation_results')
    .select('plotfl_path')
    .eq('id', simulationResultId)
    .single();

  const { data: refResult } = await supabase
    .from('simulation_results')
    .select('plotfl_path')
    .eq('id', referenceResultId)
    .single();

  if (!simResult || !refResult) throw new Error('Result not found');

  // Download and parse both plotfl files
  const [targetContent, referenceContent] = await Promise.all([
    getPlotflContent(simResult.plotfl_path),
    getPlotflContent(refResult.plotfl_path),
  ]);

  const targetValues = parsePlotfl(targetContent);
  const referenceValues = parsePlotfl(referenceContent);

  // Compare
  const result = compareResults(referenceValues, targetValues, settings);

  // Save comparison result
  const { data, error } = await supabase
    .from('comparison_results')
    .upsert(
      {
        simulation_result_id: simulationResultId,
        reference_result_id: referenceResultId,
        status: result.status,
        diff_stats: result.diff_stats,
        comparison_settings: settings,
      },
      { onConflict: 'simulation_result_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as ComparisonResult;
}

export async function getComparisonResults() {
  const { data, error } = await supabase
    .from('comparison_results')
    .select('*');
  if (error) throw error;
  return data as ComparisonResult[];
}

export async function getMatrixData() {
  // Get all simulation results with their comparison results
  const { data, error } = await supabase
    .from('simulation_results')
    .select(`
      *,
      comparison_results (*)
    `);
  if (error) throw error;
  return data;
}
