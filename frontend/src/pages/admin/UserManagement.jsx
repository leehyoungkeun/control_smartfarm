/**
 * 사용자 관리 페이지
 * 조직 내 사용자 CRUD 및 농장 권한 관리
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import useApi from '../../hooks/useApi';
import useAuthStore from '../../store/authStore';

/** 역할별 Chip 색상 매핑 */
const ROLE_CHIP_CONFIG = {
  superadmin: { color: 'error', label: '슈퍼관리자' },
  admin: { color: 'primary', label: '관리자' },
  operator: { color: 'success', label: '운영자' },
  viewer: { color: 'default', label: '뷰어' },
};

/** 사용자 추가/수정 다이얼로그 초기값 */
const INITIAL_FORM_DATA = {
  username: '',
  email: '',
  password: '',
  role: 'viewer',
  phone: '',
  farm_ids: [],
};

const UserManagement = () => {
  const api = useApi();
  const { user: currentUser } = useAuthStore();

  // 사용자 목록 상태
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 농장 목록 (권한 체크박스용)
  const [farms, setFarms] = useState([]);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // 삭제 확인 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /** 사용자 목록 조회 */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err) {
      setError('사용자 목록을 불러오는데 실패했습니다.');
      console.error('사용자 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  /** 농장 목록 조회 (권한 설정용) */
  const fetchFarms = useCallback(async () => {
    try {
      const response = await api.get('/api/farms');
      setFarms(response.data);
    } catch (err) {
      console.error('농장 목록 조회 실패:', err);
    }
  }, [api]);

  /** 초기 데이터 로드 */
  useEffect(() => {
    fetchUsers();
    fetchFarms();
  }, [fetchUsers, fetchFarms]);

  /** 사용자 추가 다이얼로그 열기 */
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setDialogOpen(true);
  };

  /** 사용자 수정 다이얼로그 열기 */
  const handleOpenEditDialog = (user) => {
    setDialogMode('edit');
    setFormData({
      id: user.id,
      username: user.username || '',
      email: user.email || '',
      password: '', // 수정 시 비밀번호는 빈값
      role: user.role || 'viewer',
      phone: user.phone || '',
      farm_ids: user.farm_ids || [],
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /** 다이얼로그 닫기 */
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
  };

  /** 폼 입력값 변경 핸들러 */
  const handleFormChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    // 입력 시 해당 필드 에러 초기화
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  /** 농장 접근 권한 체크박스 변경 핸들러 */
  const handleFarmToggle = (farmId) => {
    setFormData((prev) => {
      const currentFarms = prev.farm_ids;
      const isSelected = currentFarms.includes(farmId);
      return {
        ...prev,
        farm_ids: isSelected
          ? currentFarms.filter((id) => id !== farmId)
          : [...currentFarms, farmId],
      };
    });
  };

  /** 폼 유효성 검증 */
  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = '사용자명은 필수입니다.';
    }
    if (!formData.email.trim()) {
      errors.email = '이메일은 필수입니다.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '올바른 이메일 형식을 입력하세요.';
    }
    // 추가 모드에서만 비밀번호 필수
    if (dialogMode === 'add' && !formData.password.trim()) {
      errors.password = '비밀번호는 필수입니다.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** 사용자 저장 (추가 또는 수정) */
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // 전송 데이터 구성 (수정 시 비밀번호가 비어있으면 제외)
      const payload = { ...formData };
      if (dialogMode === 'edit') {
        delete payload.id;
        if (!payload.password) {
          delete payload.password;
        }
      }

      if (dialogMode === 'add') {
        await api.post('/api/users', payload);
      } else {
        await api.put(`/api/users/${formData.id}`, payload);
      }

      handleCloseDialog();
      // 목록 새로고침
      fetchUsers();
    } catch (err) {
      const message =
        err.response?.data?.message || '저장에 실패했습니다.';
      setFormErrors({ submit: message });
      console.error('사용자 저장 실패:', err);
    } finally {
      setSaving(false);
    }
  };

  /** 삭제 확인 다이얼로그 열기 */
  const handleOpenDeleteDialog = (user) => {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  };

  /** 삭제 확인 다이얼로그 닫기 */
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  /** 사용자 삭제 (소프트 삭제: is_active = false) */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/api/users/${deleteTarget.id}`);
      handleCloseDeleteDialog();
      // 목록 새로고침
      fetchUsers();
    } catch (err) {
      console.error('사용자 삭제 실패:', err);
      setError('사용자 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  /** 역할 Chip 렌더링 */
  const renderRoleChip = (role) => {
    const config = ROLE_CHIP_CONFIG[role] || ROLE_CHIP_CONFIG.viewer;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  /** 상태 Chip 렌더링 */
  const renderStatusChip = (isActive) => {
    return isActive ? (
      <Chip label="활성" color="success" size="small" variant="outlined" />
    ) : (
      <Chip label="비활성" color="default" size="small" variant="outlined" />
    );
  };

  /** 마지막 로그인 날짜 포매팅 */
  const formatLastLogin = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch {
      return '-';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 페이지 헤더 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          사용자 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ height: 44 }}
        >
          사용자 추가
        </Button>
      </Box>

      {/* 에러 알림 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 사용자 테이블 */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>사용자명</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>역할</TableCell>
              <TableCell align="center">접근 농장 수</TableCell>
              <TableCell>마지막 로그인</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    등록된 사용자가 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{renderRoleChip(user.role)}</TableCell>
                  <TableCell align="center">
                    {user.farm_ids?.length || 0}
                  </TableCell>
                  <TableCell>
                    {formatLastLogin(user.last_login)}
                  </TableCell>
                  <TableCell align="center">
                    {renderStatusChip(user.is_active)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditDialog(user)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(user)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 사용자 추가/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? '사용자 추가' : '사용자 수정'}
        </DialogTitle>
        <DialogContent dividers>
          {/* 서버 에러 메시지 표시 */}
          {formErrors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.submit}
            </Alert>
          )}

          {/* 사용자명 */}
          <TextField
            label="사용자명"
            value={formData.username}
            onChange={handleFormChange('username')}
            error={!!formErrors.username}
            helperText={formErrors.username}
            fullWidth
            margin="normal"
            required
          />

          {/* 이메일 */}
          <TextField
            label="이메일"
            type="email"
            value={formData.email}
            onChange={handleFormChange('email')}
            error={!!formErrors.email}
            helperText={formErrors.email}
            fullWidth
            margin="normal"
            required
          />

          {/* 비밀번호 (추가 모드에서만 필수) */}
          <TextField
            label="비밀번호"
            type="password"
            value={formData.password}
            onChange={handleFormChange('password')}
            error={!!formErrors.password}
            helperText={
              formErrors.password ||
              (dialogMode === 'edit' ? '변경하지 않으려면 비워두세요.' : '')
            }
            fullWidth
            margin="normal"
            required={dialogMode === 'add'}
          />

          {/* 역할 선택 */}
          <FormControl fullWidth margin="normal">
            <InputLabel>역할</InputLabel>
            <Select
              value={formData.role}
              onChange={handleFormChange('role')}
              label="역할"
            >
              <MenuItem value="admin">관리자</MenuItem>
              <MenuItem value="operator">운영자</MenuItem>
              <MenuItem value="viewer">뷰어</MenuItem>
            </Select>
          </FormControl>

          {/* 전화번호 */}
          <TextField
            label="전화번호"
            value={formData.phone}
            onChange={handleFormChange('phone')}
            fullWidth
            margin="normal"
            placeholder="010-0000-0000"
          />

          {/* 농장 접근 권한 */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            농장 접근 권한
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
            <FormGroup>
              {farms.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  등록된 농장이 없습니다.
                </Typography>
              ) : (
                farms.map((farm) => (
                  <FormControlLabel
                    key={farm.id}
                    control={
                      <Checkbox
                        checked={formData.farm_ids.includes(farm.id)}
                        onChange={() => handleFarmToggle(farm.id)}
                        size="small"
                      />
                    }
                    label={farm.name}
                  />
                ))
              )}
            </FormGroup>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} disabled={saving}>
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>사용자 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.username}</strong> 사용자를 비활성화하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            비활성화된 사용자는 시스템에 로그인할 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            취소
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} /> : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
