/**
 * 시스템 상태 스토어 (Zustand)
 * 실시간 센서/장비 상태 + 농장 목록 통합 관리
 */
import { create } from 'zustand';

const useSystemStore = create((set) => ({
  // 연결 상태
  wsConnected: false,
  lastUpdated: null,

  // 현재 선택된 농장
  currentFarmId: null,
  currentFarmName: null,

  // 농장 목록 (원격 모드)
  farms: [],

  // 실시간 데이터
  status: null,
  sensors: null,
  solarTable: [],
  tankLevels: [0, 0, 0, 0, 0, 0, 0],
  valveStates: Array(14).fill(false),
  activeAlarms: [],

  // 농장 액션
  setFarms: (farms) => set({ farms }),
  setCurrentFarm: (farmId, farmName) => set({ currentFarmId: farmId, currentFarmName: farmName }),

  // 연결 상태
  setWsConnected: (connected) => set({ wsConnected: connected }),

  // 경보 추가 (같은 타입 중복 방지, 최대 20건)
  addAlarm: (alarm) => set((state) => {
    const getType = (a) => a.alarmType || a.alarm_type || a.type;
    const alarmType = getType(alarm);
    const filtered = state.activeAlarms.filter((a) => getType(a) !== alarmType);
    return { activeAlarms: [...filtered, alarm].slice(-20) };
  }),

  // 경보 제거
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
      drainEc: data.drain_ec,
      drainPh: data.drain_ph,
      humidity: data.humidity,
      waterTemp: data.water_temp,
      dissolvedOxygen: data.dissolved_oxygen,
      co2Level: data.co2_level,
    },
    valveStates: data.latestSensors?.valveStates || Array(14).fill(false),
    tankLevels: data.latestSensors?.tankLevels || [0, 0, 0, 0, 0, 0, 0],
    activeAlarms: data.activeAlarms || [],
    lastUpdated: new Date().toISOString(),
  }),

  // 원격 텔레메트리 업데이트
  updateFromCloudTelemetry: (data) => set({
    sensors: data.sensors || data,
    lastUpdated: new Date().toISOString(),
  }),

  // 원격 상태 업데이트
  updateFromCloudStatus: (data) => set({
    status: data,
    lastUpdated: new Date().toISOString(),
  }),

  // 전체 초기화
  reset: () => set({
    wsConnected: false,
    lastUpdated: null,
    currentFarmId: null,
    currentFarmName: null,
    status: null,
    sensors: null,
    solarTable: [],
    tankLevels: [0, 0, 0, 0, 0, 0, 0],
    valveStates: Array(14).fill(false),
    activeAlarms: [],
  }),
}));

export default useSystemStore;
