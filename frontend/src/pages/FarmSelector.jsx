/**
 * 농장 선택 페이지
 * 원격 모드에서 접근 가능한 농장 목록 표시
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, CircularProgress, Alert, Chip,
} from '@mui/material';
import { Agriculture as FarmIcon } from '@mui/icons-material';
import useApi from '../hooks/useApi';
import FarmCard from '../components/FarmCard';

const FarmSelector = () => {
  const navigate = useNavigate();
  const api = useApi();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const res = await api.get('/farms');
        setFarms(res.data.data || []);
      } catch (err) {
        setError('농장 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchFarms();
  }, []);

  const handleSelectFarm = (farmId) => {
    navigate(`/farm/${farmId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <FarmIcon sx={{ fontSize: 32, color: '#27AE60' }} />
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>내 농장</Typography>
        <Chip label={`${farms.length}개`} size="small" color="primary" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {farms.map((farm) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={farm.id}>
            <FarmCard farm={farm} onClick={() => handleSelectFarm(farm.id)} />
          </Grid>
        ))}
        {farms.length === 0 && !error && (
          <Grid size={12}>
            <Typography sx={{ textAlign: 'center', color: '#757575', py: 4 }}>
              접근 가능한 농장이 없습니다.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default FarmSelector;
