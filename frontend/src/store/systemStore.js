/**
 * 시스템 상태 스토어 (Zustand)
 * 실시간 센서/장비 상태 관리
 */
import { create } from 'zustand';

const useSystemStore = create((set) => ({
  // 연결 상태
  connectionMode: null, // 'local' | 'remote'
  wsConnected: false,
  mqttConnected: false,
  lastUpdated: null,

  // 현재 선택된 농장
  currentFarmId: null,

  // 실시간 데이터
  status: null,
  sensors: null,
  solarTable: [],
  tankLevels: [0, 0, 0, 0, 0, 0, 0],
  valveStates: Array(14).fill(false),
  activeAlarms: [],

  // 액션
  setConnectionMode: (mode) => set({ connectionMode: mode }),
  setCurrentFarm: (farmId) => set({ currentFarmId: farmId }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setMqttConnected: (connected) => set({ mqttConnected: connected }),
  setStatus: (status) => set({ status }),
  setSensors: (sensors) => set({ sensors }),
  setSolarTable: (solarTable) => set({ solarTable }),
  setTankLevels: (tankLevels) => set({ tankLevels }),
  setValveStates: (valveStates) => set({ valveStates }),
  setActiveAlarms: (alarms) => set({ activeAlarms: alarms }),
  // 경보 추가 (같은 타입 중복 방지, 최대 20건 유지)
  addAlarm: (alarm) => set((state) => {
    const getType = (a) => a.alarmType || a.alarm_type || a.type;
    const alarmType = getType(alarm);
    // 같은 타입의 경보가 이미 있으면 최신 값으로 교체
    const filtered = state.activeAlarms.filter(
      (a) => getType(a) !== alarmType
    );
    return { activeAlarms: [...filtered, alarm].slice(-20) };
  }),
  // 특정 타입의 경보 제거 (해소 시)
  removeAlarm: (alarmType) => set((state) => ({
    activeAlarms: state.activeAlarms.filter(
      (a) => (a.alarmType || a.alarm_type || a.type) !== alarmType
    ),
  })),

  // 터치패널 WebSocket 수신 (전체 상태 일괄 업데이트)
  updateFromLocalWs: (data) => set({
    status: data,
    sensors: {
      currentEc: data.current_ec,
      currentPh: data.current_ph,
      outdoorTemp: data.outdoor_temp,
      indoorTemp: data.indoor_temp,
      substrateTemp: data.substrate_temp,
      solarRadiation: data.solar_radiation,
      supplyFlow: data.supply_flow,
      drainFlow: data.drain_flow,
    },
    valveStates: data.latestSensors?.valveStates || Array(14).fill(false),
    tankLevels: data.latestSensors?.tankLevels || [0, 0, 0, 0, 0, 0, 0],
    activeAlarms: data.activeAlarms || [],
    lastUpdated: new Date().toISOString(),
  }),

  // 원격 WebSocket 수신 (텔레메트리 업데이트)
  updateFromCloudTelemetry: (data) => set({
    sensors: data.sensors || data,
    lastUpdated: new Date().toISOString(),
  }),

  // 원격 WebSocket 수신 (상태 업데이트)
  updateFromCloudStatus: (data) => set({
    status: data,
    lastUpdated: new Date().toISOString(),
  }),

  // 전체 초기화
  reset: () => set({
    connectionMode: null,
    wsConnected: false,
    mqttConnected: false,
    lastUpdated: null,
    currentFarmId: null,
    status: null,
    sensors: null,
    solarTable: [],
    tankLevels: [0, 0, 0, 0, 0, 0, 0],
    valveStates: Array(14).fill(false),
    activeAlarms: [],
  }),
}));

export default useSystemStore;
