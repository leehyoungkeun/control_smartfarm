/**
 * 접속 모드 훅
 * 반환: { mode, isLocal, isRemote } 객체 (기존 문자열 반환 버그 수정)
 */
import { useMemo } from 'react';
import { getConnectionMode } from '../api/client';

const useConnectionMode = () => {
  return useMemo(() => {
    const mode = getConnectionMode();
    return {
      mode,
      isLocal: mode === 'local',
      isRemote: mode === 'remote',
    };
  }, []);
};

export default useConnectionMode;
