/**
 * MQTT 브릿지 서비스
 * 사무실 서버 ↔ AWS IoT Core 연결
 * 모든 농장의 MQTT 메시지를 수신하여 DB 저장 + WebSocket 중계
 */
const { mqtt, iot } = require('aws-iot-device-sdk-v2');
const { serverSubscriptions, extractFarmId } = require('../../../shared/mqttTopics');
const { Farm, AlarmHistory, DailySummaryArchive, ControlLog } = require('../models');

// MQTT 연결 인스턴스
let mqttConnection = null;
// 연결 상태 플래그
let isConnected = false;

// 외부에서 farmWsService를 주입받기 위한 참조 (순환 의존 방지)
let wsService = null;
// 외부에서 alarmNotifier를 주입받기 위한 참조
let notifierService = null;

/**
 * farmWsService 참조 설정 (순환 의존 방지)
 * @param {object} service - WebSocket 서비스 인스턴스
 */
const setWsService = (service) => { wsService = service; };

/**
 * alarmNotifier 참조 설정 (순환 의존 방지)
 * @param {object} service - 알림 서비스 인스턴스
 */
const setNotifierService = (service) => { notifierService = service; };

/**
 * MQTT 브릿지 초기화
 * AWS IoT Core에 인증서 기반 MQTT 연결 수립
 */
async function initMqttBridge() {
  try {
    const certPath = process.env.AWS_IOT_CERT_PATH;
    const keyPath = process.env.AWS_IOT_KEY_PATH;
    const caPath = process.env.AWS_IOT_CA_PATH;
    const endpoint = process.env.AWS_IOT_ENDPOINT;
    const clientId = process.env.AWS_IOT_CLIENT_ID || 'smartfarm-cloud-server';

    // 인증서 파일 존재 여부 확인
    const fs = require('fs');
    if (!certPath || !fs.existsSync(certPath)) {
      throw new Error('AWS IoT 인증서 파일을 찾을 수 없습니다: ' + certPath);
    }

    // MQTT 연결 설정 빌더 생성
    const configBuilder = iot.AwsIotMqttConnectionConfigBuilder
      .new_mtls_builder_from_path(certPath, keyPath);

    configBuilder.with_certificate_authority_from_path(undefined, caPath);
    configBuilder.with_clean_session(true);
    configBuilder.with_client_id(clientId);
    configBuilder.with_endpoint(endpoint);

    const config = configBuilder.build();
    const client = new mqtt.MqttClient();
    mqttConnection = client.new_connection(config);

    // 연결 성공 이벤트 핸들러
    mqttConnection.on('connect', async () => {
      try {
        isConnected = true;
        console.log('AWS IoT Core MQTT 연결 성공');

        // 서버 구독 토픽 와일드카드 구독
        for (const topic of serverSubscriptions) {
          await mqttConnection.subscribe(topic, mqtt.QoS.AtLeastOnce);
          console.log(`  구독: ${topic}`);
        }
        // 하트비트 토픽 구독
        await mqttConnection.subscribe('farm/+/heartbeat', mqtt.QoS.AtLeastOnce);
      } catch (error) {
        console.error('MQTT 토픽 구독 오류:', error);
      }
    });

    // 연결 해제 이벤트 핸들러
    mqttConnection.on('disconnect', () => {
      isConnected = false;
      console.warn('AWS IoT Core MQTT 연결 해제됨');
    });

    // 연결 오류 이벤트 핸들러
    mqttConnection.on('error', (error) => {
      console.error('MQTT 연결 오류:', error);
    });

    // 메시지 수신 이벤트 핸들러
    mqttConnection.on('message', async (topic, payload) => {
      try {
        const farmId = extractFarmId(topic);
        if (!farmId) return;

        const data = JSON.parse(new TextDecoder().decode(payload));
        await handleMessage(topic, farmId, data);
      } catch (error) {
        console.error('MQTT 메시지 처리 오류:', error);
      }
    });

    // MQTT 연결 수립
    await mqttConnection.connect();
  } catch (error) {
    console.error('MQTT 브릿지 초기화 오류:', error);
    throw error;
  }
}

/**
 * 수신 메시지 분기 처리
 * 토픽 접미사에 따라 적절한 핸들러로 라우팅
 * @param {string} topic - MQTT 토픽
 * @param {string} farmThingName - 농장 AWS Thing 이름
 * @param {object} data - 파싱된 메시지 데이터
 */
async function handleMessage(topic, farmThingName, data) {
  try {
    // aws_thing_name으로 농장 조회
    const farm = await Farm.findOne({ where: { aws_thing_name: farmThingName } });
    if (!farm) return;

    if (topic.endsWith('/telemetry')) {
      // 텔레메트리 → WebSocket으로 실시간 중계 (DB 저장하지 않음)
      if (wsService) wsService.broadcastToFarm(farm.id, 'telemetry', data);

    } else if (topic.endsWith('/status')) {
      // 상태 → WebSocket으로 중계
      if (wsService) wsService.broadcastToFarm(farm.id, 'status', data);

    } else if (topic.endsWith('/alarm')) {
      // 경보 → DB 저장 + WebSocket 중계 + 이메일 알림 발송
      await AlarmHistory.create({
        farm_id: farm.id,
        alarm_type: data.alarmType,
        alarm_value: data.alarmValue,
        threshold_value: data.thresholdValue,
        message: data.message,
      });
      if (wsService) wsService.broadcastToFarm(farm.id, 'alarm', data);
      if (notifierService) notifierService.sendAlarmNotification(farm, data);

    } else if (topic.endsWith('/command/ack')) {
      // 제어 명령 응답 → control_logs 결과 업데이트 + WebSocket 전달
      if (data.logId) {
        await ControlLog.update(
          { result: data.result || 'success', result_detail: data.detail },
          { where: { id: data.logId } }
        );
      }
      if (wsService) wsService.broadcastToFarm(farm.id, 'command_ack', data);

    } else if (topic.endsWith('/daily-summary')) {
      // 일간 요약 → DB 저장 (upsert로 중복 방지)
      if (Array.isArray(data.summaries)) {
        for (const s of data.summaries) {
          await DailySummaryArchive.upsert({
            farm_id: farm.id,
            summary_date: s.summaryDate,
            program_number: s.programNumber,
            run_count: s.runCount,
            set_ec: s.setEc,
            set_ph: s.setPh,
            avg_ec: s.avgEc,
            avg_ph: s.avgPh,
            total_supply_liters: s.totalSupplyLiters,
            total_drain_liters: s.totalDrainLiters,
            valve_flows: s.valveFlows,
          });
        }
      }

    } else if (topic.endsWith('/heartbeat')) {
      // 하트비트 → 최종 온라인 시각 업데이트
      await Farm.update(
        { last_online_at: new Date() },
        { where: { id: farm.id } }
      );
    }
  } catch (error) {
    console.error('메시지 핸들링 오류:', error);
  }
}

/**
 * MQTT 메시지 발행
 * @param {string} topic - 발행할 MQTT 토픽
 * @param {object} payload - 발행할 데이터 객체
 * @returns {boolean} 발행 성공 여부
 */
async function publishMessage(topic, payload) {
  try {
    if (!mqttConnection || !isConnected) {
      console.warn('MQTT 미연결 상태에서 발행 시도:', topic);
      return false;
    }
    await mqttConnection.publish(topic, JSON.stringify(payload), mqtt.QoS.AtLeastOnce);
    return true;
  } catch (error) {
    console.error('MQTT 메시지 발행 오류:', error);
    return false;
  }
}

/**
 * 농장에 제어 명령 발행
 * @param {string} farmThingName - 농장 AWS Thing 이름
 * @param {object} command - 제어 명령 데이터
 */
const sendCommand = async (farmThingName, command) => {
  return publishMessage(`farm/${farmThingName}/command`, command);
};

/**
 * 농장에 설정 업데이트 발행
 * @param {string} farmThingName - 농장 AWS Thing 이름
 * @param {object} config - 업데이트할 설정 데이터
 */
const sendConfigUpdate = async (farmThingName, config) => {
  return publishMessage(`farm/${farmThingName}/config/update`, config);
};

/**
 * 농장에 텔레메트리 시작 요청 발행
 * @param {string} farmThingName - 농장 AWS Thing 이름
 */
const sendRequestStart = async (farmThingName) => {
  return publishMessage(`farm/${farmThingName}/request/start`, { timestamp: Date.now() });
};

/**
 * 농장에 텔레메트리 중단 요청 발행
 * @param {string} farmThingName - 농장 AWS Thing 이름
 */
const sendRequestStop = async (farmThingName) => {
  return publishMessage(`farm/${farmThingName}/request/stop`, { timestamp: Date.now() });
};

/**
 * 현재 MQTT 연결 상태 반환
 * @returns {boolean} 연결 여부
 */
const getConnectionStatus = () => isConnected;

module.exports = {
  initMqttBridge,
  setWsService,
  setNotifierService,
  sendCommand,
  sendConfigUpdate,
  sendRequestStart,
  sendRequestStop,
  getConnectionStatus,
};
