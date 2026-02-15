/**
 * 클라우드 WebSocket 훅 (원격 모드)
 * wss://사무실서버/ws/farm 연결
 *
 * 흐름:
 * 1. WebSocket 연결
 * 2. { type: 'subscribe', farmId, token } 전송
 * 3. 서버가 JWT 검증 + 농장 접근 권한 확인
 * 4. 서버가 RPi에게 request/start 발행 (MQTT 경유)
 * 5. 서버가 MQTT로 받은 telemetry/status를 이 WebSocket으로 전달
 * 6. 수신 데이터를 systemStore에 업데이트
 * 7. 연결 종료 시 서버가 자동으로 request/stop 발행
 */
import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import useSystemStore from '../store/systemStore';

const CLOUD_WS_URL = import.meta.env.VITE_CLOUD_WS_URL || 'ws://localhost:3000/ws/farm';

const useCloudWebSocket = (farmId) => {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const { token } = useAuthStore();
  const { updateFromCloudTelemetry, updateFromCloudStatus, setWsConnected, addAlarm } = useSystemStore();

  useEffect(() => {
    if (!farmId || !token) return;

    const connect = () => {
      try {
        const ws = new WebSocket(CLOUD_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[클라우드 WS] 연결됨, 구독 요청:', farmId);
          setWsConnected(true);
          // 농장 구독 요청
          ws.send(JSON.stringify({ type: 'subscribe', farmId, token }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
              case 'telemetry':
                updateFromCloudTelemetry(msg.data);
                break;
              case 'status':
                updateFromCloudStatus(msg.data);
                break;
              case 'alarm':
                // 경보 수신 시 알림
                addAlarm(msg.data);
                break;
              case 'command_ack':
                console.log('[클라우드 WS] 명령 응답:', msg.data);
                break;
              case 'subscribed':
                console.log('[클라우드 WS] 구독 성공:', msg.farmId);
                break;
              case 'error':
                console.error('[클라우드 WS] 서버 오류:', msg.message);
                break;
              default:
                break;
            }
          } catch (e) {
            console.error('[클라우드 WS] 메시지 파싱 오류:', e);
          }
        };

        ws.onclose = () => {
          console.log('[클라우드 WS] 연결 해제됨');
          setWsConnected(false);
          reconnectTimerRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('[클라우드 WS] 오류:', error);
        };
      } catch (error) {
        console.error('[클라우드 WS] 연결 실패:', error);
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        // 구독 해제 메시지 전송
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
        }
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      setWsConnected(false);
    };
  }, [farmId, token]);
};

export default useCloudWebSocket;
