/**
 * 통합 WebSocket 훅
 * 모드에 따라 로컬/클라우드 WS 자동 선택
 */
import { useEffect, useRef } from 'react';
import useAuthStore from '../stores/authStore';
import useSystemStore from '../stores/systemStore';
import useConnectionMode from './useConnectionMode';

const LOCAL_WS_URL = import.meta.env.VITE_LOCAL_WS_URL || 'ws://localhost:3001/ws/status';
const CLOUD_WS_URL = import.meta.env.VITE_CLOUD_WS_URL || 'ws://localhost:3000/ws/farm';

const useWebSocket = (farmId) => {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const { isLocal } = useConnectionMode();
  const { token } = useAuthStore();
  const store = useSystemStore();

  useEffect(() => {
    // 원격 모드에서 farmId/token 없으면 연결하지 않음
    if (!isLocal && (!farmId || !token)) return;

    const wsUrl = isLocal ? LOCAL_WS_URL : CLOUD_WS_URL;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`[WS] ${isLocal ? '로컬' : '클라우드'} 연결됨`);
          store.setWsConnected(true);

          // 원격 모드: 농장 구독 요청
          if (!isLocal && farmId) {
            ws.send(JSON.stringify({ type: 'subscribe', farmId, token }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (isLocal) {
              // 로컬: status 타입만 처리
              if (msg.type === 'status' && msg.data) {
                store.updateFromLocalWs(msg.data);
              }
            } else {
              // 원격: 여러 메시지 타입 처리
              switch (msg.type) {
                case 'telemetry':
                  store.updateFromCloudTelemetry(msg.data);
                  break;
                case 'status':
                  store.updateFromCloudStatus(msg.data);
                  break;
                case 'alarm':
                  store.addAlarm(msg.data);
                  break;
                case 'subscribed':
                  console.log('[WS] 구독 성공:', msg.farmId);
                  break;
                case 'error':
                  console.error('[WS] 서버 오류:', msg.message);
                  break;
              }
            }
          } catch (e) {
            console.error('[WS] 메시지 파싱 오류:', e);
          }
        };

        ws.onclose = () => {
          console.log('[WS] 연결 해제');
          store.setWsConnected(false);
          reconnectRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('[WS] 오류:', error);
        };
      } catch (error) {
        console.error('[WS] 연결 실패:', error);
        reconnectRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        if (!isLocal && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
        }
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      store.setWsConnected(false);
    };
  }, [farmId, token, isLocal]);
};

export default useWebSocket;
