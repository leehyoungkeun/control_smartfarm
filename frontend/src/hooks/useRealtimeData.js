/**
 * 실시간 데이터 훅
 * 접속 모드에 따라 자동으로 적절한 WebSocket 훅 선택
 * local → useLocalWebSocket (RPi 직접)
 * remote → useCloudWebSocket (사무실 서버 경유)
 */
import useConnectionMode from './useConnectionMode';
import useLocalWebSocket from './useLocalWebSocket';
import useCloudWebSocket from './useCloudWebSocket';

const useRealtimeData = (farmId) => {
  const mode = useConnectionMode();

  if (mode === 'local') {
    useLocalWebSocket();
  } else {
    useCloudWebSocket(farmId);
  }
};

export default useRealtimeData;
