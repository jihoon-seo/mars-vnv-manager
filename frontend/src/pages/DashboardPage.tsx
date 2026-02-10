import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInputFiles } from '../services/inputFiles';
import { getMarsVersions } from '../services/marsVersions';
import {
  getSimulationResults,
  getComparisonResults,
  runComparison,
} from '../services/simulationResults';
import { getComparisonSettings } from '../services/settings';
import { supabase } from '../services/supabase';
import type { InputFile, MarsVersion, SimulationResult, ComparisonResult, DiffStats } from '../types';
import { matchesCategory } from '../utils/categories';
import CategorySelect from '../components/CategorySelect';

interface CellData {
  simResult: SimulationResult | null;
  comparison: ComparisonResult | null;
}

interface DetailInfo {
  inputFile: InputFile;
  version: MarsVersion;
  cell: CellData;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pass' | 'fail' | 'no_result'>('all');
  const [detail, setDetail] = useState<DetailInfo | null>(null);

  const { data: inputFiles = [] } = useQuery({
    queryKey: ['input-files'],
    queryFn: getInputFiles,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['mars-versions'],
    queryFn: getMarsVersions,
  });

  const { data: simResults = [] } = useQuery({
    queryKey: ['simulation-results'],
    queryFn: getSimulationResults,
  });

  const { data: comparisons = [] } = useQuery({
    queryKey: ['comparison-results'],
    queryFn: getComparisonResults,
  });

  const { data: settings } = useQuery({
    queryKey: ['comparison-settings'],
    queryFn: getComparisonSettings,
  });

  // Build matrix lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, CellData>();

    for (const sr of simResults) {
      const key = `${sr.input_file_id}__${sr.mars_version_id}`;
      const comp = comparisons.find(c => c.simulation_result_id === sr.id) ?? null;
      map.set(key, { simResult: sr, comparison: comp });
    }

    return map;
  }, [simResults, comparisons]);

  const getCell = (inputFileId: string, versionId: string): CellData => {
    return cellMap.get(`${inputFileId}__${versionId}`) ?? { simResult: null, comparison: null };
  };

  const referenceVersion = versions.find(v => v.is_reference);
  const nonRefVersions = versions.filter(v => !v.is_reference);
  const displayVersions = referenceVersion
    ? [referenceVersion, ...nonRefVersions]
    : versions;

  // Filter input files
  const filteredFiles = inputFiles.filter(f => {
    if (filterCategory && !matchesCategory(f.category, filterCategory)) return false;
    if (filterStatus !== 'all') {
      // Check if any cell for this file matches the status filter
      const hasMatch = displayVersions.some(v => {
        const cell = getCell(f.id, v.id);
        if (filterStatus === 'no_result') return !cell.simResult;
        if (filterStatus === 'pass') return cell.comparison?.status === 'pass';
        if (filterStatus === 'fail') return cell.comparison?.status === 'fail';
        return true;
      });
      if (!hasMatch) return false;
    }
    return true;
  });

  // Rerun all comparisons
  const rerunMut = useMutation({
    mutationFn: async () => {
      if (!referenceVersion || !settings) return;

      for (const sr of simResults) {
        if (sr.mars_version_id === referenceVersion.id) continue;

        const refResult = simResults.find(
          r => r.input_file_id === sr.input_file_id && r.mars_version_id === referenceVersion.id
        );
        if (!refResult) continue;

        await runComparison(sr.id, refResult.id, settings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-results'] });
    },
  });

  const getCellColor = (cell: CellData, versionId: string): string => {
    if (!cell.simResult) return '#f5f5f5'; // grey - no result
    if (referenceVersion && versionId === referenceVersion.id) return '#e3f2fd'; // blue tint - reference
    if (!cell.comparison) return '#fff9c4'; // yellow - not compared yet
    return cell.comparison.status === 'pass' ? '#c8e6c9' : '#ffcdd2'; // green / red
  };

  const getCellLabel = (cell: CellData, versionId: string): string => {
    if (!cell.simResult) return '-';
    if (referenceVersion && versionId === referenceVersion.id) return 'REF';
    if (!cell.comparison) return '?';
    return cell.comparison.status === 'pass' ? 'PASS' : 'FAIL';
  };

  const handleDownload = (storagePath: string) => {
    const { data } = supabase.storage.from('plotfl-results').getPublicUrl(storagePath);
    window.open(data.publicUrl, '_blank');
  };

  const formatDiffStats = (stats: DiffStats) => [
    { label: '평균 오차', value: stats.mean_diff.toExponential(3) },
    { label: '최대 오차', value: stats.max_diff.toExponential(3) },
    { label: 'RMS 오차', value: stats.rms_diff.toExponential(3) },
    { label: '불일치 개수', value: `${stats.num_mismatches} / ${stats.total_values}` },
  ];

  // Counts
  const passCount = comparisons.filter(c => c.status === 'pass').length;
  const failCount = comparisons.filter(c => c.status === 'fail').length;
  const totalCells = inputFiles.length * (displayVersions.length - (referenceVersion ? 1 : 0));
  const testedCount = passCount + failCount;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          VnV Matrix
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => rerunMut.mutate()}
          disabled={rerunMut.isPending}
        >
          {rerunMut.isPending ? '비교 중...' : '전체 재비교'}
        </Button>
      </Box>

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`입력 파일: ${inputFiles.length}개`} />
        <Chip label={`MARS 버전: ${versions.length}개`} />
        <Chip label={`PASS: ${passCount}`} color="success" />
        <Chip label={`FAIL: ${failCount}`} color="error" />
        <Chip label={`미테스트: ${totalCells - testedCount}`} variant="outlined" />
        {referenceVersion && (
          <Chip label={`기준: ${referenceVersion.name}`} color="primary" />
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <CategorySelect
          value={filterCategory}
          onChange={setFilterCategory}
          label="카테고리"
          size="small"
          margin="none"
          emptyLabel="전체"
        />
        <TextField
          select
          size="small"
          label="상태"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">전체</MenuItem>
          <MenuItem value="pass">PASS</MenuItem>
          <MenuItem value="fail">FAIL</MenuItem>
          <MenuItem value="no_result">미완료</MenuItem>
        </TextField>
      </Box>

      {/* Matrix Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 320px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  bgcolor: 'background.paper',
                  minWidth: 200,
                }}
              >
                입력 파일
              </TableCell>
              {displayVersions.map(v => (
                <TableCell
                  key={v.id}
                  align="center"
                  sx={{
                    fontWeight: 'bold',
                    minWidth: 100,
                    bgcolor: v.is_reference ? 'primary.50' : 'background.paper',
                  }}
                >
                  <Tooltip title={v.description ?? ''}>
                    <Box>
                      <Typography variant="caption" fontWeight="bold">
                        {v.name}
                      </Typography>
                      {v.os && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {v.os}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFiles.map(f => (
              <TableRow key={f.id} hover>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Tooltip title={f.description ?? ''}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {f.name}
                    </Typography>
                  </Tooltip>
                </TableCell>
                {displayVersions.map(v => {
                  const cell = getCell(f.id, v.id);
                  return (
                    <TableCell
                      key={v.id}
                      align="center"
                      sx={{
                        bgcolor: getCellColor(cell, v.id),
                        cursor: cell.simResult ? 'pointer' : 'default',
                        '&:hover': cell.simResult
                          ? { filter: 'brightness(0.95)' }
                          : {},
                        transition: 'all 0.15s',
                      }}
                      onClick={() =>
                        cell.simResult &&
                        setDetail({ inputFile: f, version: v, cell })
                      }
                    >
                      <Typography variant="caption" fontWeight="bold">
                        {getCellLabel(cell, v.id)}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredFiles.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          표시할 데이터가 없습니다.
        </Typography>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              상세 정보
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  입력 파일
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {detail.inputFile.name}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  MARS 버전
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {detail.version.name}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  실행 날짜
                </Typography>
                <Typography variant="body1">
                  {detail.cell.simResult
                    ? new Date(detail.cell.simResult.executed_at).toLocaleString('ko-KR')
                    : '-'}
                </Typography>
              </Box>

              {detail.cell.comparison && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      비교 결과
                    </Typography>
                    <Chip
                      label={detail.cell.comparison.status.toUpperCase()}
                      color={detail.cell.comparison.status === 'pass' ? 'success' : 'error'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      차이값 통계
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        {formatDiffStats(detail.cell.comparison.diff_stats).map(row => (
                          <TableRow key={row.label}>
                            <TableCell sx={{ fontWeight: 'bold', border: 'none', py: 0.5 }}>
                              {row.label}
                            </TableCell>
                            <TableCell align="right" sx={{ border: 'none', py: 0.5, fontFamily: 'monospace' }}>
                              {row.value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      비교 설정
                    </Typography>
                    <Typography variant="body2">
                      {detail.cell.comparison.comparison_settings.tolerance_type === 'absolute'
                        ? '절대 오차'
                        : '상대 오차'}{' '}
                      ≤ {detail.cell.comparison.comparison_settings.tolerance_value}
                    </Typography>
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              {detail.cell.simResult && (
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(detail.cell.simResult!.plotfl_path)}
                >
                  plotfl 다운로드
                </Button>
              )}
              <Button onClick={() => setDetail(null)}>닫기</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
