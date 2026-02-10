import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMarsVersions,
  createMarsVersion,
  updateMarsVersion,
  deleteMarsVersion,
} from '../services/marsVersions';
import { useAuth } from '../contexts/AuthContext';
import type { MarsVersion } from '../types';

export default function MarsVersionsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MarsVersion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarsVersion | null>(null);
  const [formError, setFormError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formOs, setFormOs] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRef, setFormRef] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['mars-versions'],
    queryFn: getMarsVersions,
  });

  const createMut = useMutation({
    mutationFn: createMarsVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mars-versions'] });
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: (params: { id: string; updates: Partial<MarsVersion> }) =>
      updateMarsVersion(params.id, params.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mars-versions'] });
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMarsVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mars-versions'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setFormName('');
    setFormOs('');
    setFormDesc('');
    setFormRef(false);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (v: MarsVersion) => {
    setEditTarget(v);
    setFormName(v.name);
    setFormOs(v.os ?? '');
    setFormDesc(v.description ?? '');
    setFormRef(v.is_reference);
    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      setFormError('버전명을 입력해 주세요.');
      return;
    }
    const payload = {
      name: formName,
      os: formOs || null,
      description: formDesc || null,
      is_reference: formRef,
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, updates: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          MARS 버전 관리
        </Typography>
        {role === 'admin' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            버전 추가
          </Button>
        )}
      </Box>

      {isLoading ? (
        <Typography>로딩 중...</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {versions.map(v => (
            <Card
              key={v.id}
              variant="outlined"
              sx={{ border: v.is_reference ? '2px solid' : undefined, borderColor: 'primary.main' }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {v.name}
                  </Typography>
                  {v.is_reference && (
                    <Chip icon={<StarIcon />} label="기준 버전" size="small" color="primary" />
                  )}
                </Box>
                {v.os && (
                  <Chip label={v.os} size="small" variant="outlined" sx={{ mb: 1 }} />
                )}
                <Typography variant="body2" color="text.secondary">
                  {v.description || '설명 없음'}
                </Typography>
              </CardContent>
              {role === 'admin' && (
                <CardActions>
                  <Button size="small" onClick={() => openEdit(v)}>
                    수정
                  </Button>
                  <Button size="small" color="error" onClick={() => setDeleteTarget(v)}>
                    삭제
                  </Button>
                </CardActions>
              )}
            </Card>
          ))}
          {versions.length === 0 && (
            <Typography color="text.secondary">등록된 MARS 버전이 없습니다.</Typography>
          )}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? 'MARS 버전 수정' : 'MARS 버전 추가'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="버전명"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            margin="normal"
            required
            placeholder="예: MARS 3.1, MARS-KS 1.0"
          />
          <TextField
            fullWidth
            select
            label="OS"
            value={formOs}
            onChange={e => setFormOs(e.target.value)}
            margin="normal"
          >
            <MenuItem value="">미지정</MenuItem>
            <MenuItem value="Windows">Windows</MenuItem>
            <MenuItem value="Linux">Linux</MenuItem>
            <MenuItem value="Both">Both</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="설명"
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControlLabel
            control={<Checkbox checked={formRef} onChange={e => setFormRef(e.target.checked)} />}
            label="기준 버전으로 설정 (비교 기준이 됨)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMut.isPending || updateMut.isPending}
          >
            {editTarget ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>MARS 버전 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            "{deleteTarget?.name}" 버전을 삭제하시겠습니까? 관련된 시뮬레이션 결과도 함께 삭제됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>취소</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            disabled={deleteMut.isPending}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
