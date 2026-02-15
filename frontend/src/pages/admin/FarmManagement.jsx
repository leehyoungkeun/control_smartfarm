/**
 * 농장 관리 페이지
 * 농장 등록/수정/비활성화
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
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import useAuthStore from '../../store/authStore';

/** 농장 상태별 Chip 설정 */
const STATUS_CHIP_CONFIG = {
  active: { color: 'success', label: '활성' },
  inactive: { color: 'default', label: '비활성' },
  maintenance: { color: 'warning', label: '점검중' },
};

/** 농장 등록/수정 폼 초기값 */
const INITIAL_FORM_DATA = {
  name: '',
  location: '',
  aws_thing_name: '',
  mqtt_topic_prefix: '',
};

const FarmManagement = () => {
  const api = useApi();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  // 농장 목록 상태
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 등록/수정 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // 비활성화 확인 다이얼로그 상태
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  /** 농장 목록 조회 */
  const fetchFarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/farms');
      setFarms(response.data);
    } catch (err) {
      setError('농장 목록을 불러오는데 실패했습니다.');
      console.error('농장 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  /** 초기 데이터 로드 */
  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  /** 농장 등록 다이얼로그 열기 */
  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setDialogOpen(true);
  };

  /** 농장 수정 다이얼로그 열기 */
  const handleOpenEditDialog = (farm) => {
    setDialogMode('edit');
    setFormData({
      id: farm.id,
      name: farm.name || '',
      location: farm.location || '',
      aws_thing_name: farm.aws_thing_name || '',
      mqtt_topic_prefix: farm.mqtt_topic_prefix || '',
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
    const value = event.target.value;
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Thing Name 입력 시 MQTT 토픽 프리픽스 자동 생성
      if (field === 'aws_thing_name') {
        updated.mqtt_topic_prefix = value ? `farm/${value}` : '';
      }

      return updated;
    });

    // 입력 시 해당 필드 에러 초기화
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  /** 폼 유효성 검증 */
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = '농장명은 필수입니다.';
    }
    if (!formData.location.trim()) {
      errors.location = '위치는 필수입니다.';
    }
    if (!formData.aws_thing_name.trim()) {
      errors.aws_thing_name = 'AWS Thing Name은 필수입니다.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** 농장 저장 (등록 또는 수정) */
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = { ...formData };

      if (dialogMode === 'add') {
        delete payload.id;
        await api.post('/api/farms', payload);
      } else {
        const farmId = payload.id;
        delete payload.id;
        await api.put(`/api/farms/${farmId}`, payload);
      }

      handleCloseDialog();
      // 목록 새로고침
      fetchFarms();
    } catch (err) {
      const message =
        err.response?.data?.message || '저장에 실패했습니다.';
      setFormErrors({ submit: message });
      console.error('농장 저장 실패:', err);
    } finally {
      setSaving(false);
    }
  };

  /** 비활성화 확인 다이얼로그 열기 */
  const handleOpenDeactivateDialog = (farm) => {
    setDeactivateTarget(farm);
    setDeactivateDialogOpen(true);
  };

  /** 비활성화 확인 다이얼로그 닫기 */
  const handleCloseDeactivateDialog = () => {
    setDeactivateDialogOpen(false);
    setDeactivateTarget(null);
  };

  /** 농장 비활성화 처리 */
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;

    setDeactivating(true);
    try {
      await api.put(`/api/farms/${deactivateTarget.id}`, {
        status: 'inactive',
      });
      handleCloseDeactivateDialog();
      // 목록 새로고침
      fetchFarms();
    } catch (err) {
      console.error('농장 비활성화 실패:', err);
      setError('농장 비활성화에 실패했습니다.');
    } finally {
      setDeactivating(false);
    }
  };

  /** 농장 상세 페이지로 이동 */
  const handleViewDetail = (farmId) => {
    navigate(`/farm/${farmId}`);
  };

  /** 상태 Chip 렌더링 */
  const renderStatusChip = (status) => {
    const config = STATUS_CHIP_CONFIG[status] || STATUS_CHIP_CONFIG.inactive;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  /** 마지막 접속 시간 포매팅 */
  const formatLastConnection = (dateString) => {
    if (!dateString) {
      return (
        <Typography variant="body2" color="error">
          오프라인
        </Typography>
      );
    }
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch {
      return (
        <Typography variant="body2" color="error">
          오프라인
        </Typography>
      );
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
          농장 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          sx={{ height: 44 }}
        >
          농장 등록
        </Button>
      </Box>

      {/* 에러 알림 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 농장 테이블 */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>농장명</TableCell>
              <TableCell>위치</TableCell>
              <TableCell>Thing Name</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell>마지막 접속</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : farms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    등록된 농장이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              farms.map((farm) => (
                <TableRow key={farm.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{farm.name}</Typography>
                  </TableCell>
                  <TableCell>{farm.location}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {farm.aws_thing_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {renderStatusChip(farm.status)}
                  </TableCell>
                  <TableCell>
                    {formatLastConnection(farm.last_connection)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="상세보기">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleViewDetail(farm.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditDialog(farm)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="비활성화">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleOpenDeactivateDialog(farm)}
                        disabled={farm.status === 'inactive'}
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 농장 등록/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'add' ? '농장 등록' : '농장 수정'}
        </DialogTitle>
        <DialogContent dividers>
          {/* 서버 에러 메시지 표시 */}
          {formErrors.submit && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.submit}
            </Alert>
          )}

          {/* 농장명 */}
          <TextField
            label="농장명"
            value={formData.name}
            onChange={handleFormChange('name')}
            error={!!formErrors.name}
            helperText={formErrors.name}
            fullWidth
            margin="normal"
            required
          />

          {/* 위치 */}
          <TextField
            label="위치"
            value={formData.location}
            onChange={handleFormChange('location')}
            error={!!formErrors.location}
            helperText={formErrors.location}
            fullWidth
            margin="normal"
            required
            placeholder="예: 경기도 화성시"
          />

          {/* AWS Thing Name */}
          <TextField
            label="AWS Thing Name"
            value={formData.aws_thing_name}
            onChange={handleFormChange('aws_thing_name')}
            error={!!formErrors.aws_thing_name}
            helperText={
              formErrors.aws_thing_name ||
              '고유한 AWS IoT Thing 이름을 입력하세요.'
            }
            fullWidth
            margin="normal"
            required
            placeholder="예: smartfarm-001"
          />

          {/* MQTT Topic Prefix (자동 생성) */}
          <TextField
            label="MQTT Topic Prefix"
            value={formData.mqtt_topic_prefix}
            onChange={handleFormChange('mqtt_topic_prefix')}
            fullWidth
            margin="normal"
            helperText="Thing Name 기반으로 자동 생성됩니다. 필요 시 수동 수정 가능합니다."
            InputProps={{
              sx: { fontFamily: 'monospace' },
            }}
          />
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

      {/* 비활성화 확인 다이얼로그 */}
      <Dialog
        open={deactivateDialogOpen}
        onClose={handleCloseDeactivateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>농장 비활성화 확인</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deactivateTarget?.name}</strong> 농장을 비활성화하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            비활성화된 농장은 모니터링 및 제어가 중단됩니다.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDeactivateDialog} disabled={deactivating}>
            취소
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDeactivate}
            disabled={deactivating}
          >
            {deactivating ? <CircularProgress size={20} /> : '비활성화'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FarmManagement;
