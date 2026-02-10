import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComparisonSettings,
  saveComparisonSettings,
  getUserRoles,
  updateUserRole,
} from '../services/settings';
import type { ComparisonSettings } from '../types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [toleranceType, setToleranceType] = useState<'absolute' | 'relative'>('absolute');
  const [toleranceValue, setToleranceValue] = useState('0.001');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['comparison-settings'],
    queryFn: getComparisonSettings,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: getUserRoles,
  });

  useEffect(() => {
    if (settings) {
      setToleranceType(settings.tolerance_type);
      setToleranceValue(String(settings.tolerance_value));
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (s: ComparisonSettings) => saveComparisonSettings(s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparison-settings'] });
      setSaveSuccess('설정이 저장되었습니다.');
      setSaveError('');
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      setSaveSuccess('');
    },
  });

  const roleUpdateMut = useMutation({
    mutationFn: (params: { userId: string; role: 'admin' | 'user' }) =>
      updateUserRole(params.userId, params.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });

  const handleSaveSettings = () => {
    const val = parseFloat(toleranceValue);
    if (isNaN(val) || val <= 0) {
      setSaveError('유효한 허용 오차 값을 입력해 주세요.');
      return;
    }
    saveMut.mutate({ tolerance_type: toleranceType, tolerance_value: val });
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        설정
      </Typography>

      {/* Comparison Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          비교 설정 (허용 오차)
        </Typography>

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {saveSuccess}
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            select
            label="오차 유형"
            value={toleranceType}
            onChange={e => setToleranceType(e.target.value as 'absolute' | 'relative')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="absolute">절대 오차 (|a - b| ≤ tol)</MenuItem>
            <MenuItem value="relative">상대 오차 (|a - b| / |ref| ≤ tol)</MenuItem>
          </TextField>

          <TextField
            label="허용 오차 값"
            value={toleranceValue}
            onChange={e => setToleranceValue(e.target.value)}
            type="number"
            inputProps={{ step: 'any', min: 0 }}
            sx={{ minWidth: 180 }}
          />

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={saveMut.isPending}
          >
            저장
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {toleranceType === 'absolute'
            ? `두 값의 차이가 ${toleranceValue} 이하이면 PASS`
            : `두 값의 상대 차이가 ${toleranceValue} (${(parseFloat(toleranceValue) * 100).toFixed(1)}%) 이하이면 PASS`}
        </Typography>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* User Role Management */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          사용자 역할 관리
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>이메일</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>역할</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>변경</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userRoles.map((ur: { user_id: string; role: string; auth_user?: { email: string } }) => (
                <TableRow key={ur.user_id}>
                  <TableCell>{ur.auth_user?.email ?? ur.user_id}</TableCell>
                  <TableCell>{ur.role}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={ur.role}
                      onChange={e =>
                        roleUpdateMut.mutate({
                          userId: ur.user_id,
                          role: e.target.value as 'admin' | 'user',
                        })
                      }
                    >
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="user">User</MenuItem>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {userRoles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>등록된 사용자가 없습니다.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
