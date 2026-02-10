import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInputFiles,
  createInputFile,
  updateInputFile,
  deleteInputFile,
  getInputFileDownloadUrl,
  bulkCreateInputFiles,
} from '../services/inputFiles';
import { useAuth } from '../contexts/AuthContext';
import type { InputFile } from '../types';
import CategorySelect from '../components/CategorySelect';
import { getCategoryLabel, matchesCategory, getCategoryOptions } from '../utils/categories';

// Level 1 & 2 categories for filter chips
const FILTER_CATEGORIES = getCategoryOptions().filter(c => c.level <= 2);

export default function InputFilesPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InputFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InputFile | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  // Single form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formInternal, setFormInternal] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<{
    succeeded: string[];
    failed: { name: string; error: string }[];
  } | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['input-files'],
    queryFn: getInputFiles,
  });

  const createMut = useMutation({
    mutationFn: (params: { file: Parameters<typeof createInputFile>[0]; uploadFile?: File }) =>
      createInputFile(params.file, params.uploadFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['input-files'] });
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: (params: { id: string; updates: Partial<InputFile> }) =>
      updateInputFile(params.id, params.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['input-files'] });
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteInputFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['input-files'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setFormName('');
    setFormDesc('');
    setFormCategory('');
    setFormInternal(false);
    setFormFile(null);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (file: InputFile) => {
    setEditTarget(file);
    setFormName(file.name);
    setFormDesc(file.description ?? '');
    setFormCategory(file.category ?? '');
    setFormInternal(file.is_internal_only);
    setFormFile(null);
    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = () => {
    if (!formName.trim()) {
      setFormError('파일명을 입력해 주세요.');
      return;
    }

    if (editTarget) {
      updateMut.mutate({
        id: editTarget.id,
        updates: {
          name: formName,
          description: formDesc || null,
          category: formCategory || null,
          is_internal_only: formInternal,
        },
      });
    } else {
      createMut.mutate({
        file: {
          name: formName,
          description: formDesc || null,
          category: formCategory || null,
          file_path: null,
          is_internal_only: formInternal,
        },
        uploadFile: formFile ?? undefined,
      });
    }
  };

  const filtered = filterCategory
    ? files.filter(f => matchesCategory(f.category, filterCategory))
    : files;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          입력 파일 관리
        </Typography>
        {role === 'admin' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              입력 파일 추가
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => {
                setBulkFiles([]);
                setBulkCategory('');
                setBulkError('');
                setBulkResult(null);
                setBulkDialogOpen(true);
              }}
            >
              일괄 업로드
            </Button>
          </Box>
        )}
      </Box>

      {/* Filter */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="전체"
          onClick={() => setFilterCategory('')}
          variant={filterCategory === '' ? 'filled' : 'outlined'}
          color={filterCategory === '' ? 'primary' : 'default'}
        />
        {FILTER_CATEGORIES.map(cat => (
          <Chip
            key={cat.id}
            label={cat.label}
            onClick={() => setFilterCategory(cat.id)}
            variant={filterCategory === cat.id ? 'filled' : 'outlined'}
            color={filterCategory === cat.id ? 'primary' : 'default'}
            size={cat.level === 1 ? 'medium' : 'small'}
          />
        ))}
      </Box>

      {isLoading ? (
        <Typography>로딩 중...</Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            '& .row': {
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 3fr auto',
              alignItems: 'center',
              p: 1.5,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            },
          }}
        >
          {/* Header */}
          <Box className="row" sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>
            <Typography variant="subtitle2" fontWeight="bold">
              파일명
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              카테고리
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              설명
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              작업
            </Typography>
          </Box>

          {filtered.map(file => (
            <Box key={file.id} className="row">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" noWrap>
                  {file.name}
                </Typography>
                {file.is_internal_only && (
                  <Tooltip title="원자력연구원 내부 전용">
                    <LockIcon fontSize="small" color="warning" />
                  </Tooltip>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {file.category ? getCategoryLabel(file.category) : '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {file.description ?? '-'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {file.file_path && !file.is_internal_only && (
                  <Tooltip title="다운로드">
                    <IconButton
                      size="small"
                      href={getInputFileDownloadUrl(file.file_path)}
                      target="_blank"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {role === 'admin' && (
                  <>
                    <Tooltip title="수정">
                      <IconButton size="small" onClick={() => openEdit(file)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(file)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>
          ))}

          {filtered.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              등록된 입력 파일이 없습니다.
            </Typography>
          )}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget ? '입력 파일 수정' : '입력 파일 추가'}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            fullWidth
            label="파일명"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            margin="normal"
            required
          />
          <CategorySelect
            value={formCategory}
            onChange={setFormCategory}
          />
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
            control={
              <Checkbox
                checked={formInternal}
                onChange={e => setFormInternal(e.target.checked)}
              />
            }
            label="원자력연구원 내부 전용 (파일 업로드 불가)"
          />
          {!formInternal && !editTarget && (
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" component="label">
                파일 선택
                <input
                  type="file"
                  hidden
                  onChange={e => setFormFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {formFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {formFile.name}
                </Typography>
              )}
            </Box>
          )}
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

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>입력 파일 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            "{deleteTarget?.name}" 파일을 삭제하시겠습니까? 관련된 시뮬레이션 결과도 함께
            삭제됩니다.
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

      {/* Bulk Upload Dialog */}
      <Dialog
        open={bulkDialogOpen}
        onClose={() => !bulkUploading && setBulkDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>입력 파일 일괄 업로드</DialogTitle>
        <DialogContent>
          {bulkError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bulkError}
            </Alert>
          )}

          {bulkResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                {bulkResult.succeeded.length}개 파일 업로드 성공
              </Alert>
              {bulkResult.failed.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {bulkResult.failed.length}개 파일 실패:
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    {bulkResult.failed.map((f, i) => (
                      <li key={i}>
                        {f.name}: {f.error}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </Box>
          ) : (
            <>
              <CategorySelect
                value={bulkCategory}
                onChange={setBulkCategory}
                label="카테고리 (전체 적용)"
              />

              <Box sx={{ mt: 2, mb: 1 }}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  파일 선택 (다중 선택 가능)
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={e => {
                      const selected = Array.from(e.target.files ?? []);
                      setBulkFiles(selected);
                    }}
                  />
                </Button>
              </Box>

              {bulkFiles.length > 0 && (
                <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                    선택된 파일: {bulkFiles.length}개
                  </Typography>
                  {bulkFiles.map((f, i) => (
                    <Typography key={i} variant="body2" color="text.secondary">
                      {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </Typography>
                  ))}
                </Box>
              )}

              {bulkUploading && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  업로드 중... ({bulkFiles.length}개 파일 처리 중)
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {bulkResult ? (
            <Button
              variant="contained"
              onClick={() => {
                setBulkDialogOpen(false);
                setBulkResult(null);
              }}
            >
              닫기
            </Button>
          ) : (
            <>
              <Button onClick={() => setBulkDialogOpen(false)} disabled={bulkUploading}>
                취소
              </Button>
              <Button
                variant="contained"
                disabled={bulkFiles.length === 0 || bulkUploading}
                onClick={async () => {
                  setBulkUploading(true);
                  setBulkError('');
                  try {
                    const result = await bulkCreateInputFiles(
                      bulkFiles,
                      bulkCategory || null
                    );
                    setBulkResult(result);
                    queryClient.invalidateQueries({ queryKey: ['input-files'] });
                  } catch (err) {
                    setBulkError((err as Error).message);
                  } finally {
                    setBulkUploading(false);
                  }
                }}
              >
                {bulkUploading ? '업로드 중...' : `${bulkFiles.length}개 파일 업로드`}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
