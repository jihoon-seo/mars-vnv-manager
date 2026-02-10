import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInputFiles } from '../services/inputFiles';
import { getMarsVersions } from '../services/marsVersions';
import {
  uploadResult,
  getSimulationResults,
  runComparison,
} from '../services/simulationResults';
import { getComparisonSettings } from '../services/settings';
import type { SimulationResult } from '../types';

export default function ResultUploadPage() {
  const queryClient = useQueryClient();
  const [selectedInputFile, setSelectedInputFile] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data: inputFiles = [] } = useQuery({
    queryKey: ['input-files'],
    queryFn: getInputFiles,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['mars-versions'],
    queryFn: getMarsVersions,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['simulation-results'],
    queryFn: getSimulationResults,
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!selectedInputFile || !selectedVersion || !file) {
        throw new Error('모든 필드를 입력해 주세요.');
      }

      // Upload result
      const result = await uploadResult(selectedInputFile, selectedVersion, file);

      // Auto-compare with reference version if available
      const refVersion = versions.find(v => v.is_reference);
      if (refVersion && refVersion.id !== selectedVersion) {
        // Find reference result for same input file
        const allResults = await queryClient.fetchQuery({
          queryKey: ['simulation-results'],
          queryFn: getSimulationResults,
        }) as SimulationResult[];
        const refResult = allResults.find(
          r => r.input_file_id === selectedInputFile && r.mars_version_id === refVersion.id
        );
        if (refResult) {
          const settings = await getComparisonSettings();
          await runComparison(result.id, refResult.id, settings);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulation-results'] });
      queryClient.invalidateQueries({ queryKey: ['comparison-results'] });
      queryClient.invalidateQueries({ queryKey: ['matrix-data'] });
      setSuccess('결과 파일이 업로드되었습니다.');
      setError('');
      setFile(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const recentResults = results.slice(0, 10);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        시뮬레이션 결과 업로드
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <TextField
          fullWidth
          select
          label="입력 파일 선택"
          value={selectedInputFile}
          onChange={e => setSelectedInputFile(e.target.value)}
          margin="normal"
        >
          {inputFiles.map(f => (
            <MenuItem key={f.id} value={f.id}>
              {f.name}
              {f.is_internal_only ? ' (내부 전용)' : ''}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          select
          label="MARS 버전 선택"
          value={selectedVersion}
          onChange={e => setSelectedVersion(e.target.value)}
          margin="normal"
        >
          {versions.map(v => (
            <MenuItem key={v.id} value={v.id}>
              {v.name}
              {v.is_reference ? ' (기준)' : ''}
              {v.os ? ` - ${v.os}` : ''}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ mt: 2, mb: 2 }}>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            plotfl 파일 선택
            <input
              type="file"
              hidden
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={() => uploadMut.mutate()}
          disabled={!selectedInputFile || !selectedVersion || !file || uploadMut.isPending}
          startIcon={<UploadFileIcon />}
        >
          {uploadMut.isPending ? '업로드 중...' : '업로드'}
        </Button>
      </Paper>

      {/* Recent results */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        최근 업로드
      </Typography>
      <Paper>
        <List>
          {recentResults.map(r => {
            const inputFile = inputFiles.find(f => f.id === r.input_file_id);
            const version = versions.find(v => v.id === r.mars_version_id);
            return (
              <ListItem key={r.id}>
                <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                <ListItemText
                  primary={`${inputFile?.name ?? '?'} + ${version?.name ?? '?'}`}
                  secondary={new Date(r.executed_at).toLocaleString('ko-KR')}
                />
                <Chip label={version?.os ?? ''} size="small" variant="outlined" />
              </ListItem>
            );
          })}
          {recentResults.length === 0 && (
            <ListItem>
              <ListItemText primary="업로드된 결과가 없습니다." />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
}
