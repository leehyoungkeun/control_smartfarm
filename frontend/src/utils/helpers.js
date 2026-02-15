/**
 * 유틸리티 함수
 */

/** 날짜 포맷 (YYYY-MM-DD HH:mm:ss) */
export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
};

/** 날짜만 포맷 (YYYY-MM-DD) */
export const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '');
};

/** 숫자 소수점 고정 */
export const toFixed = (value, digits = 1) => {
  if (value == null || isNaN(value)) return '-';
  return Number(value).toFixed(digits);
};

/** 리터 포맷 */
export const formatLiters = (value) => {
  if (value == null) return '0.0 L';
  return `${Number(value).toFixed(1)} L`;
};

/** 연결 모드 감지 (로컬 vs 클라우드) */
export const detectConnectionMode = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'local';
  }
  return 'cloud';
};
