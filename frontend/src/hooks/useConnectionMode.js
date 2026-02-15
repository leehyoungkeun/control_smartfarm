/**
 * 접속 모드 감지 훅
 * localhost → 'local' (터치패널), 그 외 → 'remote' (원격)
 */
import { useMemo } from 'react';

const useConnectionMode = () => {
  return useMemo(() => {
    // 환경변수로 접속 모드 강제 지정 (개발용)
    const envMode = import.meta.env.VITE_CONNECTION_MODE;
    if (envMode === 'local' || envMode === 'remote') {
      return envMode;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local';
    }
    return 'remote';
  }, []);
};

export default useConnectionMode;
