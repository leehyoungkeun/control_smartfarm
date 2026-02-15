/**
 * 농장 WebSocket 서비스
 * 외부 FE에 실시간 센서/장비 데이터 중계
 *
 * 흐름:
 * 1. FE가 WebSocket 연결 (/ws/farm)
 * 2. FE가 { type: 'subscribe', farmId, token } 전송
 * 3. JWT 검증 + 농장 접근 권한 확인
 * 4. 첫 구독자면 → MQTT request/start 발행 (RPi에게 텔레메트리 시작 요청)
 * 5. MQTT 텔레메트리 수신 → 해당 농장 구독자에게 브로드캐스트
 * 6. FE 연결 해제 → 구독자 0명이면 MQTT request/stop 발행
 */
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { FarmUser, Farm } = require('../models');
const { sendRequestStart, sendRequestStop, setWsService } = require('./mqttBridgeService');

// farmId → Set<WebSocket> 구독자 맵
const farmSubscribers = new Map();
// ws → { farmId, userId } 클라이언트 정보 맵
const clientInfo = new Map();

// WebSocket 서버 인스턴스
let wss = null;

/**
 * 농장 WebSocket 서비스 초기화
 * HTTP 서버에 WebSocket 서버를 바인딩하고 이벤트 핸들러 등록
 * @param {object} server - HTTP 서버 인스턴스
 */
function initFarmWsService(server) {
  try {
    wss = new WebSocket.Server({ server, path: '/ws/farm' });

    wss.on('connection', (ws) => {
      console.log('WebSocket 클라이언트 연결');

      // 클라이언트 메시지 수신 처리
      ws.on('message', async (message) => {
        try {
          const msg = JSON.parse(message.toString());

          if (msg.type === 'subscribe') {
            await handleSubscribe(ws, msg);
          } else if (msg.type === 'unsubscribe') {
            await handleUnsubscribe(ws);
          }
        } catch (error) {
          console.error('WebSocket 메시지 처리 오류:', error);
          ws.send(JSON.stringify({ type: 'error', message: '메시지 처리 중 오류가 발생했습니다.' }));
        }
      });

      // 클라이언트 연결 종료 처리
      ws.on('close', async () => {
        try {
          await handleUnsubscribe(ws);
          clientInfo.delete(ws);
        } catch (error) {
          console.error('WebSocket 연결 종료 처리 오류:', error);
        }
      });

      // 30초 핑/퐁 헬스체크 설정
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });

    // 핑/퐁 인터벌 — 비활성 클라이언트 정리
    const pingInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    // WebSocket 서버 종료 시 인터벌 정리
    wss.on('close', () => clearInterval(pingInterval));

    // mqttBridgeService에 자기 자신 등록 (브로드캐스트 콜백 제공)
    setWsService({ broadcastToFarm });

    console.log('농장 WebSocket 서비스 초기화 (/ws/farm)');
  } catch (error) {
    console.error('농장 WebSocket 서비스 초기화 오류:', error);
    throw error;
  }
}

/**
 * 구독 처리: JWT 검증 + 농장 접근 권한 확인
 * @param {WebSocket} ws - WebSocket 클라이언트
 * @param {object} msg - { type: 'subscribe', farmId, token }
 */
async function handleSubscribe(ws, msg) {
  try {
    const { farmId, token } = msg;

    // 필수 파라미터 검증
    if (!farmId || !token) {
      return ws.send(JSON.stringify({ type: 'error', message: 'farmId와 token이 필요합니다.' }));
    }

    // JWT 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return ws.send(JSON.stringify({ type: 'error', message: '유효하지 않은 토큰입니다.' }));
    }

    // 농장 접근 권한 확인
    const hasAccess = await checkFarmAccess(decoded, farmId);
    if (!hasAccess) {
      return ws.send(JSON.stringify({ type: 'error', message: '해당 농장에 대한 접근 권한이 없습니다.' }));
    }

    // 기존 구독이 있으면 해제
    await handleUnsubscribe(ws);

    // 새 구독 등록
    if (!farmSubscribers.has(farmId)) {
      farmSubscribers.set(farmId, new Set());
    }
    farmSubscribers.get(farmId).add(ws);
    clientInfo.set(ws, { farmId, userId: decoded.id });

    // 첫 구독자면 RPi에게 텔레메트리 시작 요청
    const subscribers = farmSubscribers.get(farmId);
    if (subscribers.size === 1) {
      const farm = await Farm.findByPk(farmId);
      if (farm) {
        await sendRequestStart(farm.aws_thing_name);
        console.log(`텔레메트리 시작 요청: ${farm.aws_thing_name} (구독자: 1)`);
      }
    }

    ws.send(JSON.stringify({ type: 'subscribed', farmId }));
  } catch (error) {
    console.error('구독 처리 오류:', error);
    ws.send(JSON.stringify({ type: 'error', message: '구독 처리 중 오류가 발생했습니다.' }));
  }
}

/**
 * 구독 해제 처리
 * 구독자가 0명이 되면 RPi에게 텔레메트리 중단 요청
 * @param {WebSocket} ws - WebSocket 클라이언트
 */
async function handleUnsubscribe(ws) {
  try {
    const info = clientInfo.get(ws);
    if (!info) return;

    const { farmId } = info;
    const subscribers = farmSubscribers.get(farmId);
    if (subscribers) {
      subscribers.delete(ws);

      // 구독자가 0명이면 RPi에게 텔레메트리 중단 요청
      if (subscribers.size === 0) {
        farmSubscribers.delete(farmId);
        const farm = await Farm.findByPk(farmId);
        if (farm) {
          await sendRequestStop(farm.aws_thing_name);
          console.log(`텔레메트리 중단 요청: ${farm.aws_thing_name} (구독자: 0)`);
        }
      }
    }

    clientInfo.delete(ws);
  } catch (error) {
    console.error('구독 해제 처리 오류:', error);
  }
}

/**
 * 농장 접근 권한 확인
 * superadmin: 모든 농장 접근 가능
 * admin: 같은 조직의 모든 농장 접근 가능
 * 일반 사용자: farm_users 테이블에 매핑된 농장만 접근 가능
 * @param {object} decoded - JWT 디코딩된 사용자 정보
 * @param {number} farmId - 농장 ID
 * @returns {boolean} 접근 허용 여부
 */
async function checkFarmAccess(decoded, farmId) {
  try {
    // 슈퍼관리자는 모든 농장 접근 가능
    if (decoded.role === 'superadmin') return true;

    // 농장 조회 및 조직 일치 여부 확인
    const farm = await Farm.findByPk(farmId);
    if (!farm || farm.organization_id !== decoded.organization_id) return false;

    // 관리자는 같은 조직 내 모든 농장 접근 가능
    if (decoded.role === 'admin') return true;

    // 일반 사용자는 farm_users 매핑 확인
    const farmUser = await FarmUser.findOne({
      where: { farm_id: farmId, user_id: decoded.id }
    });
    return !!farmUser;
  } catch (error) {
    console.error('농장 접근 권한 확인 오류:', error);
    return false;
  }
}

/**
 * 특정 농장의 구독자들에게 메시지 브로드캐스트
 * mqttBridgeService에서 호출
 * @param {number} farmId - 농장 ID
 * @param {string} type - 메시지 유형 (telemetry, status, alarm 등)
 * @param {object} data - 전송할 데이터
 */
function broadcastToFarm(farmId, type, data) {
  try {
    const subscribers = farmSubscribers.get(farmId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({ type, farmId, data });
    subscribers.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  } catch (error) {
    console.error('브로드캐스트 오류:', error);
  }
}

/**
 * 특정 농장의 현재 구독자 수 조회
 * @param {number} farmId - 농장 ID
 * @returns {number} 구독자 수
 */
function getSubscriberCount(farmId) {
  return farmSubscribers.has(farmId) ? farmSubscribers.get(farmId).size : 0;
}

/**
 * 현재 활성 스트림 목록 조회
 * @returns {Array<{farmId: number, subscriberCount: number}>} 활성 스트림 배열
 */
function getActiveStreams() {
  const streams = [];
  farmSubscribers.forEach((subs, farmId) => {
    streams.push({ farmId, subscriberCount: subs.size });
  });
  return streams;
}

module.exports = { initFarmWsService, broadcastToFarm, getSubscriberCount, getActiveStreams };
