/**
 * 로컬 WebSocket 훅 (터치패널)
 * ws://localhost:3001/ws/status 연결
 * RPi 서버가 1초 간격으로 브로드캐스트하는 상태 데이터 수신
 */
import { useEffect, useRef } from 'react';
import useSystemStore from '../store/systemStore';

const LOCAL_WS_URL = import.meta.env.VITE_LOCAL_WS_URL || 'ws://localhost:3001/ws/status';

const useLocalWebSocket = () => {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const { updateFromLocalWs, setWsConnected } = useSystemStore();

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(LOCAL_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[로컬 WS] 연결됨');
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'status' && msg.data) {
              updateFromLocalWs(msg.data);
            }
          } catch (e) {
            console.error('[로컬 WS] 메시지 파싱 오류:', e);
          }
        };

        ws.onclose = () => {
          console.log('[로컬 WS] 연결 해제됨');
          setWsConnected(false);
          // 3초 후 재연결
          reconnectTimerRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('[로컬 WS] 오류:', error);
        };
      } catch (error) {
        console.error('[로컬 WS] 연결 실패:', error);
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // 정리 시 재연결 방지
        wsRef.current.close();
      }
      setWsConnected(false);
    };
  }, []);
};

export default useLocalWebSocket;
