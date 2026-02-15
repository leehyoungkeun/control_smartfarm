/**
 * 농장 카드
 * 농장 선택 페이지에서 각 농장을 표시
 * 농장명, 위치, 상태, 마지막 접속 시간 포함
 */
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';

/**
 * 농장 상태에 따른 칩 속성 반환
 * @param {string} status - 농장 상태 (active | inactive | maintenance)
 * @returns {{ label: string, color: string, bgColor: string }}
 */
const getStatusChipProps = (status) => {
  switch (status) {
    case 'active':
      return {
        label: '운영 중',
        color: '#FFFFFF',
        bgColor: '#27AE60',
      };
    case 'maintenance':
      return {
        label: '점검 중',
        color: '#FFFFFF',
        bgColor: '#F39C12',
      };
    case 'inactive':
    default:
      return {
        label: '비활성',
        color: '#FFFFFF',
        bgColor: '#95A5A6',
      };
  }
};

/**
 * 마지막 접속 시간 포맷
 * @param {string|null} lastOnlineAt - ISO 형식 날짜 문자열
 * @returns {string} 포맷된 날짜 문자열 또는 "오프라인"
 */
const formatLastOnline = (lastOnlineAt) => {
  if (!lastOnlineAt) {
    return '오프라인';
  }

  try {
    const date = new Date(lastOnlineAt);
    // 유효하지 않은 날짜 확인
    if (isNaN(date.getTime())) {
      return '오프라인';
    }
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '오프라인';
  }
};

/**
 * FarmCard 컴포넌트
 * @param {object} farm - 농장 데이터 객체
 * @param {string} farm.name - 농장 이름
 * @param {string} farm.location - 농장 위치
 * @param {string} farm.status - 농장 상태 (active | inactive | maintenance)
 * @param {string|null} farm.last_online_at - 마지막 접속 시간
 * @param {function} onClick - 카드 클릭 핸들러
 */
const FarmCard = ({ farm, onClick }) => {
  const statusChip = getStatusChipProps(farm?.status);

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        // 호버 시 그림자 및 약간의 상승 효과
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* 농장명과 상태 칩 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          {/* 농장명 */}
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#212121',
            }}
          >
            {farm?.name || '이름 없음'}
          </Typography>

          {/* 상태 칩 */}
          <Chip
            label={statusChip.label}
            size="small"
            sx={{
              backgroundColor: statusChip.bgColor,
              color: statusChip.color,
              fontWeight: 'bold',
              fontSize: 11,
              height: 24,
            }}
          />
        </Box>

        {/* 농장 위치 */}
        <Typography
          sx={{
            fontSize: 13,
            color: '#757575',
            mb: 0.5,
          }}
        >
          {farm?.location || '위치 미설정'}
        </Typography>

        {/* 마지막 접속 시간 */}
        <Typography
          sx={{
            fontSize: 11,
            color: '#9E9E9E',
          }}
        >
          마지막 접속: {formatLastOnline(farm?.last_online_at)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default FarmCard;
