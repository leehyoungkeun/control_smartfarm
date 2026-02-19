# Node-RED 플로우 상세 문서

스마트팜 양액 관수 제어 시스템의 Node-RED 플로우 구성 및 동작을 설명합니다.

---

## 목차

1. [개요](#개요)
2. [전역 설정 노드](#전역-설정-노드)
3. [f1 — 센서 수집](#f1--센서-수집-활성)
4. [f2 — 장비 상태 수집](#f2--장비-상태-수집-활성)
5. [f3 — 관수 스케줄러](#f3--관수-스케줄러-활성)
6. [f4 — 관수 시퀀스](#f4--관수-시퀀스-활성--핵심-플로우)
7. [f5 — 경보 처리](#f5--경보-처리-비활성)
8. [f6 — 비상정지 / 수동제어](#f6--비상정지--수동제어-활성)
9. [f7 — 일일집계](#f7--일일집계-활성)
10. [f8 — Heartbeat](#f8--heartbeat-비활성)
11. [f9 — 일일집계 전송](#f9--일일집계-전송-비활성)
12. [f10 — 원격 명령 수신](#f10--원격-명령-수신-활성)
13. [플로우 간 데이터 흐름](#플로우-간-데이터-흐름)
14. [Global Context 키 목록](#global-context-키-목록)
15. [RPi Express 내부 API 연동](#rpi-express-내부-api-연동)

---

## 개요

### 플로우 현황 (10개 탭, 84개 노드)

| # | 탭 이름 | 상태 | 주기 | 역할 |
|---|---------|------|------|------|
| f1 | 센서 수집 | **활성** | 2초 | 센서 시뮬레이션 → Express DB 저장 |
| f2 | 장비 상태 수집 | **활성** | 5초 | global context → Express DB 동기화 |
| f3 | 관수 스케줄러 | **활성** | 10초 | 3가지 트리거 조건 확인 |
| f4 | 관수 시퀀스 | **활성** | 이벤트 | 5단계 상태 머신 |
| f5 | 경보 처리 | **비활성** | - | RPi alarmService로 이관됨 |
| f6 | 비상정지 | **활성** | 이벤트 | HTTP: /emergency-stop, /manual-valve |
| f7 | 일일집계 | **활성** | cron 00:00 | 전일 관수 실적 집계 → DB 저장 |
| f8 | Heartbeat | **비활성** | - | RPi heartbeatService로 이관됨 |
| f9 | 일일집계 전송 | **비활성** | - | RPi dailySyncService로 이관됨 |
| f10 | 원격 명령 수신 | **활성** | MQTT | farm/+/command 구독, 4가지 명령 처리 |

### 아키텍처 위치

```
┌─────────────────────────────────────────────────────────┐
│  Raspberry Pi                                           │
│                                                         │
│  ┌─────────────┐   HTTP (localhost)   ┌──────────────┐  │
│  │  Node-RED    │ ◄──────────────────▶ │ RPi Express  │  │
│  │  (포트 1880) │  /internal/* API     │  (포트 3001) │  │
│  └──────┬──────┘                      └──────┬───────┘  │
│         │                                    │          │
│         │ MQTT (TLS 8883)                    │ WebSocket│
│         │                                    │          │
└─────────┼────────────────────────────────────┼──────────┘
          │                                    │
          ▼                                    ▼
   ┌──────────────┐                     ┌────────────┐
   │ AWS IoT Core │                     │ 터치패널 FE │
   │  (클라우드)   │                     │ (브라우저)  │
   └──────────────┘                     └────────────┘
```

---

## 전역 설정 노드

### mqtt_broker_aws — AWS IoT Core MQTT 브로커

| 항목 | 값 |
|------|-----|
| 유형 | mqtt-broker (설정 노드) |
| 브로커 주소 | `a2ybxz5mrpnfww-ats.iot.ap-northeast-2.amazonaws.com` |
| 포트 | 8883 (TLS) |
| 클라이언트 ID | `MyFarmPi_01_nodered` |
| 프로토콜 | MQTT v4 |
| keepalive | 60초 |
| cleanSession | true |
| autoConnect | true |

f8(Heartbeat), f9(일일집계 전송), f10(원격 명령)에서 공유하는 MQTT 연결입니다.

### tls_aws — AWS IoT TLS 인증서

| 항목 | 경로 |
|------|------|
| 디바이스 인증서 | `/home/lhk/certs/certificate.pem.crt` |
| 개인키 | `/home/lhk/certs/private.pem.key` |
| 루트 CA | `/home/lhk/certs/AmazonRootCA1.pem` |

X.509 인증서 기반 양방향 TLS 인증으로 AWS IoT Core에 연결합니다.

---

## f1 — 센서 수집 (활성)

### 플로우 구조

```
[2초 inject] → [센서 읽기 function] → [POST /internal/sensor-update] → [debug]
```

### 목적

2초 간격으로 센서 데이터를 수집하여 RPi Express 서버의 내부 API에 전달합니다.

### 노드별 상세

#### f1_inject — 2초 간격 트리거

| 속성 | 값 |
|------|-----|
| repeat | 2초 |
| once | true (시작 시 1회 즉시 실행) |
| onceDelay | 1초 |
| payloadType | date (현재 타임스탬프) |

#### f1_read_sensor — 센서 읽기 (function)

**현재 시뮬레이션 모드**로 `randomInRange(min, max)` 함수로 14개 센서값을 생성합니다.

| 센서 | 필드명 | 범위 | 단위 |
|------|--------|------|------|
| EC | `ec` | 0.5 ~ 3.0 | mS/cm |
| pH | `ph` | 5.0 ~ 8.0 | - |
| 외부 온도 | `outdoor_temp` | 10 ~ 35 | °C |
| 내부 온도 | `indoor_temp` | 15 ~ 35 | °C |
| 배지 온도 | `substrate_temp` | 10 ~ 25 | °C |
| 일사량 | `solar_radiation` | 0 ~ 1000 | W/m² |
| 급액 유량 | `supply_flow` | 0 ~ 100 | L/min |
| 배액 유량 | `drain_flow` | 0 ~ 50 | L/min |
| CO₂ | `co2_level` | 300 ~ 1000 | ppm |
| 배액 EC | `drain_ec` | 0.3 ~ 3.5 | mS/cm |
| 배액 pH | `drain_ph` | 5.0 ~ 8.0 | - |
| 습도 | `humidity` | 40 ~ 95 | % |
| 수온 | `water_temp` | 10 ~ 30 | °C |
| 용존 산소 | `dissolved_oxygen` | 5.0 ~ 12.0 | mg/L |

**주요 동작**:
- `global.set('latest_sensor_data', sensorData)` — 다른 플로우(f3, f4)에서 참조
- 실배포 시 이 function 노드를 **Modbus RTU/GPIO 노드**로 교체

#### f1_http_req — POST sensor-update

`http://localhost:3001/internal/sensor-update`로 센서 데이터를 전송합니다.

RPi Express 수신 후 처리:
1. `SensorData.insert(sensorData)` — DB 저장
2. `sensorCache.update(sensorData)` — WebSocket 실시간 전송용 캐시 업데이트
3. `SystemConfig.update(configUpdate)` — 시스템 설정에 현재 센서값 반영
4. `alarmService.checkThresholds(sensorData)` — 경보 임계값 확인

#### f1_debug — 센서 업데이트 응답

기본 비활성 (`active: false`). 디버깅 시 Node-RED 에디터에서 활성화합니다.

---

## f2 — 장비 상태 수집 (활성)

### 플로우 구조

```
[5초 inject] → [상태 읽기 function] → [POST /internal/status-update] → [debug]
```

### 목적

5초 간격으로 현재 장비 상태(밸브, 펌프, 믹서)를 global context에서 읽어 RPi Express DB에 동기화합니다.

### 노드별 상세

#### f2_inject — 5초 간격 트리거

| 속성 | 값 |
|------|-----|
| repeat | 5초 |
| once | true |
| onceDelay | 2초 |

#### f2_read_status — 상태 읽기 (function)

global context에서 5개 상태를 읽습니다:

| global context 키 | 기본값 | 설명 |
|---|---|---|
| `operating_state` | `'STOPPED'` | 운영 상태 |
| `active_program` | `null` | 현재 실행 프로그램 번호 |
| `valve_states` | `[false × 14]` | 밸브 개폐 상태 (0-based) |
| `pump_state` | `{ raw_pump: false, nutrient_pump: false }` | 펌프 상태 |
| `mixer_state` | `false` | 믹서 ON/OFF |

이 값들은 f4(관수 시퀀스), f6(비상정지/수동제어), f10(원격 명령)에서 업데이트됩니다.

#### f2_http_req — POST status-update

RPi Express `POST /internal/status-update`로 전송 시 필드 매핑:

| Node-RED 필드 | DB 컬럼 |
|---|---|
| `operating_state` | `operating_state` |
| `active_program` | `current_program` |
| `pump_state.nutrient_pump` | `irrigation_pump` (0/1) |
| `pump_state.raw_pump` | `raw_water_pump` (0/1) |
| `mixer_state` | `mixer_motor` (0/1) |
| `current_valve` | `current_valve` |

---

## f3 — 관수 스케줄러 (활성)

### 플로우 구조

```
[10초 inject] → [GET /internal/programs] → [트리거 확인 function]
                                              ├─ 출력1 (트리거됨) → [link out → f4]
                                              └─ 출력2 (미충족)   → [debug]
```

### 목적

10초마다 관수 프로그램의 트리거 조건을 확인하여, 조건 충족 시 f4(관수 시퀀스)로 프로그램 데이터를 전달합니다.

### 노드별 상세

#### f3_inject — 10초 간격 트리거 확인

| 속성 | 값 |
|------|-----|
| repeat | 10초 |
| once | true |
| onceDelay | 5초 (센서 수집 안정화 대기) |

#### f3_get_programs — GET programs

`http://localhost:3001/internal/programs`에서 전체 관수 프로그램 목록을 조회합니다.

응답 형태:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "program_number": 1,
      "is_active": true,
      "trigger_type": "interval",
      "interval_minutes": 60,
      "solar_threshold": null,
      "schedule_times": null,
      "day_of_week": "1111111",
      "set_ec": 2.0,
      "set_ph": 6.0,
      "valves": [
        { "valve_number": 1, "is_active": true, "duration_seconds": 120 },
        { "valve_number": 2, "is_active": true, "duration_seconds": 90 }
      ]
    }
  ]
}
```

#### f3_check_trigger — 트리거 확인 (function, 출력 2개)

**프로그램 캐시**: 60초 유효. `programs_cache` / `programs_cache_time` global context에 저장하여 매번 DB 조회를 방지합니다.

**전처리 조건 (건너뜀)**:
- `operating_state`가 `'EMERGENCY'` 또는 `'IRRIGATING'`이면 건너뜀
- `is_active = false`인 프로그램 건너뜀
- 요일 확인: `day_of_week` = `'1111111'` (인덱스 0=일, 1=월, ..., 6=토), 해당 요일이 `'1'`이 아니면 건너뜀

**누적 일사량 적산**:
```
accumulated_solar += solar_radiation × (10 / 3600) [Wh]
```
10초 간격이므로 순시 일사량(W/m²)을 시간 단위로 환산하여 누적합니다.

**3가지 트리거 유형**:

| 유형 | 조건 | DB 필드 | 동작 |
|------|------|---------|------|
| **solar** (일사량) | `accumulated_solar >= solar_threshold` | `solar_threshold` | 트리거 시 누적 리셋 |
| **interval** (시간간격) | `경과분 >= interval_minutes` | `interval_minutes` | 마지막 관수 시간 기준 |
| **schedule** (고정시간) | 현재 `HH:MM` ∈ schedule_times | `schedule_times` (JSON) | 오늘+시간 키로 중복 방지 |

**interval 초기값 처리**:
- `last_irrigation_N`이 없으면 (재시작 시) `now.getTime()`을 사용
- 따라서 재시작 후 interval 시간만큼 대기한 후에야 트리거됨 (즉시 관수 방지)

**schedule 중복 방지**:
- `last_schedule_trigger_N` = `'2026-02-17_08:00'` (날짜+시간 키)
- 같은 날 같은 시간에 두 번 트리거되지 않음

**출력**:
- **출력1** (트리거됨): `{ payload: program, topic: 'irrigation_trigger' }` → link out → f4
- **출력2** (미충족): `{ payload: '트리거 조건 미충족' }` → debug

---

## f4 — 관수 시퀀스 (활성) — 핵심 플로우

### 플로우 구조

```
[link in ← f3] → [관수 상태 머신 function] ─→ [POST status-update] → [debug]
                       ↑                    ─→ [delay] → [다음 단계 function] ─┘
                       └────────────────────────────────────────────────────────┘
                                    (자기 순환 루프)
```

### 목적

5단계 관수 시퀀스를 상태 머신 방식으로 실행합니다. 상태 머신이 메시지를 출력하면, delay 노드가 지정된 시간만큼 대기한 후 다시 상태 머신으로 메시지를 돌려보내는 **자기 순환 루프** 구조입니다.

### 초기화 (initialize)

Node-RED 시작 시 실행되는 코드입니다:

1. **file 컨텍스트에서 핵심 상태 복구**: `irrigation_step`, `operating_state`
2. **관수 도중 재시작 감지**: `savedStep`이 1~4이면 안전 정지 실행
   - 모든 장비 OFF (밸브, 펌프, 믹서)
   - `operating_state = 'STOPPED'`
   - 경고 로그: "재시작 감지: 관수 STEP N 진행 중이었음 → 안전 정지"
3. **정상 상태**: step=0, 유량 관련 변수 초기화

### 5단계 관수 시퀀스

```
STEP 1          STEP 2          STEP 3          STEP 4          STEP 5
원수 펌프 ON → 양액 혼합 → 양액 펌프 ON → 밸브 순차 개방 → 완료/정리
  (3초)        (5초 시뮬)     (1초)       (각 duration초)
```

#### STEP 1 — 원수 펌프 ON (3초)

**진입 조건**: `msg.topic === 'irrigation_trigger' && currentStep === 0`

동작:
1. 활성 밸브 필터링: `valves[]`에서 `is_active=true`인 것만 `program._activeValves`로 저장
2. 상태 설정:
   - `pump_state = { raw_pump: true, nutrient_pump: false }`
   - `operating_state = 'IRRIGATING'` (메모리 + file 컨텍스트)
   - `irrigation_step = 1` (메모리 + file 컨텍스트)
3. `msg.delay = 3000` → delay 노드가 3초 대기 후 STEP 2로

#### STEP 2 — 양액 혼합 (시뮬레이션 5초)

동작:
1. `mixer_state = true`
2. 목표 EC/pH: `program.set_ec`, `program.set_ph`
3. `step2_entered` 플래그로 최초 진입 시 `step_start_time`을 현재 시간으로 리셋
4. 경과 시간 확인:
   - **< 5초**: `msg.delay = 2000` → 2초 후 STEP 2 재확인 (반복)
   - **≥ 5초**: `step2_entered = false`, STEP 3으로 전환

> **실배포 시**: 실제 EC/pH 센서값과 목표값을 비교하여 도달 시 진행, 60초 타임아웃 추가

#### STEP 3 — 양액 펌프 ON (1초)

동작:
1. `pump_state = { raw_pump: true, nutrient_pump: true }` (양쪽 펌프 모두 ON)
2. `msg.delay = 1000` → 1초 후 STEP 4로

#### STEP 4 — 밸브 순차 개방

`_activeValves` 배열을 `current_valve_index`로 순차 순회합니다.

각 밸브마다:
1. `valve_states[valveArrayIdx] = true` (해당 밸브만 ON, 나머지 전부 OFF)
2. 유량 계산: `supply_flow(L/min) × duration_seconds(분)` → 누적 저장
3. 밸브별 유량 기록: `{ valve_number, flow_liters, duration_seconds }`
4. `msg.delay = duration_seconds × 1000` → 해당 시간만큼 개방 후 다음 밸브

모든 밸브 완료 시 → STEP 5로

#### STEP 5 — 완료 (정리)

동작:
1. 모든 장비 OFF:
   - `valve_states` = 전체 false
   - `pump_state` = { raw_pump: false, nutrient_pump: false }
   - `mixer_state` = false
2. 상태 변경:
   - `operating_state = 'STOPPED'` (메모리 + file)
   - `irrigation_step = 0` (메모리 + file)
3. 실행 기록 생성 후 `daily_irrigation_records`에 push:
   ```json
   {
     "program_id": 1,
     "program_name": "P1",
     "completed_at": "2026-02-17T10:30:00.000Z",
     "total_flow": 45.2,
     "valve_flows": [
       { "valve_number": 1, "flow_liters": 25.1, "duration_seconds": 120 },
       { "valve_number": 2, "flow_liters": 20.1, "duration_seconds": 90 }
     ]
   }
   ```
4. 누적 유량 초기화

### 에러 처리

전체 로직이 `try/catch`로 감싸져 있습니다. 에러 발생 시 `safeShutdown(reason)` 호출:
- 모든 장비 OFF (밸브, 펌프, 믹서)
- `operating_state = 'STOPPED'`
- `irrigation_step = 0`
- 에러 로그 출력, 상태 노드 빨간색 표시

### 보조 노드

#### f4_delay — 시퀀스 대기
- `pauseType: "delayv"` → `msg.delay` 값(ms)만큼 **동적** 대기
- 각 STEP 간 대기 시간이 다르므로 동적 delay 사용

| STEP 전환 | msg.delay |
|-----------|-----------|
| 1 → 2 | 3000ms |
| 2 반복 | 2000ms |
| 2 → 3 | 1000ms |
| 3 → 4 | 1000ms |
| 4 밸브 | duration_seconds × 1000ms |
| 4 → 5 | 500ms |

#### f4_next_step — 다음 단계 진행
- delay 완료 후 실행
- `msg.nextStep` 값을 `irrigation_step`에 설정
- `irrigation_program`을 payload에 넣어 상태 머신으로 복귀

---

## f5 — 경보 처리 (비활성)

### 플로우 구조

```
[3초 inject] → [GET /internal/config] → [임계값 확인 function] → [POST /internal/alarm] → [debug]
```

### 비활성 이유

f1의 `POST /internal/sensor-update` 핸들러에서 `alarmService.checkThresholds(sensorData)`를 직접 호출하여 경보를 처리합니다. 두 로직 간 임계값 기준이 다릅니다:

| 항목 | f5 (비활성) | alarmService (활성) |
|------|-------------|---------------------|
| EC 상한 | `config.alarm_ec_upper` (절대값) | `config.set_ec + 1.0` (상대 편차) |
| pH 상한 | `config.alarm_ph_upper` (절대값) | `config.set_ph + 0.5` (상대 편차) |
| 중복 방지 | global context `active_alarms` | Map 객체 `activeAlarms` |

### 작동 방식 (참고용)

- 3초마다 `GET /internal/config`로 시스템 설정 조회
- 6가지 확인: EC 상한/하한, pH 상한/하한, 온도 상한/하한
- `global.get('active_alarms')` 객체로 중복 경보 방지
- 정상 복귀 시 해당 키를 `false`로 설정

---

## f6 — 비상정지 / 수동제어 (활성)

### 비상정지 플로우

```
[POST /emergency-stop] → [비상정지 실행 function]
                            ├─ 출력1 → [POST /internal/status-update] → [debug]
                            └─ 출력2 → [HTTP 200 응답]
```

#### f6_http_in_estop — HTTP 엔드포인트

| 속성 | 값 |
|------|-----|
| 메소드 | POST |
| URL | `/emergency-stop` |
| 포트 | 1880 (Node-RED) |

#### f6_emergency_func — 비상정지 실행 (출력 2개)

1. **모든 장비 OFF**:
   - `valve_states` = 14개 전부 `false`
   - `pump_state` = `{ raw_pump: false, nutrient_pump: false }`
   - `mixer_state` = `false`
2. **상태 변경**:
   - `operating_state = 'EMERGENCY'` (메모리 + file 컨텍스트)
   - `active_program = null`
   - `irrigation_step = 0` (메모리 + file) — 진행 중인 관수 강제 중단
3. **출력1**: Express에 상태 업데이트 전송
4. **출력2**: HTTP 200 응답 `{ success: true, message: '비상정지 실행됨' }`

### 수동 밸브 제어 플로우

```
[POST /manual-valve] → [수동 밸브 제어 function]
                          ├─ 출력1 → [POST /internal/status-update] → [debug]
                          └─ 출력2 → [HTTP 200 응답]
```

#### f6_manual_valve_func — 수동 밸브 제어

**요청 body**:
```json
{ "valve_index": 0, "state": true }
```

- `valve_index`: 0~13 (0-based)
- `state`: true(열림) / false(닫힘)

**입력 검증**:
- `valve_index`와 `state` 필수
- `valve_index` 범위: 0 ~ 13

**동작**:
- `valve_states[valveIndex]`만 변경, 나머지 유지
- `operating_state`는 기존값 유지 (또는 `'MANUAL'`)

---

## f7 — 일일집계 (활성)

### 플로우 구조

```
[매일 00:00 cron] → [GET /internal/daily-summary-data] → [집계 계산 function] → [POST /internal/daily-summary] → [debug]
```

### 목적

매일 자정에 전일 관수 실적을 집계하여 RPi DB에 저장합니다.

### 노드별 상세

#### f7_inject — 매일 자정 트리거

| 속성 | 값 |
|------|-----|
| crontab | `00 00 * * *` (매일 00:00) |
| once | false (cron만 사용) |

#### f7_get_summary_data — GET daily-summary-data

`http://localhost:3001/internal/daily-summary-data`

Express가 어제 날짜의 센서 데이터 평균값을 SQL로 계산하여 반환:

```json
{
  "success": true,
  "data": {
    "date": "2026-02-16",
    "sensor_averages": {
      "avg_ec": 1.85,
      "avg_ph": 6.2,
      "avg_outdoor_temp": 22.5,
      "avg_indoor_temp": 25.1,
      "avg_substrate_temp": 18.3,
      "avg_solar_radiation": 450.2,
      "avg_supply_flow": 35.7,
      "avg_drain_flow": 15.2,
      "sample_count": 43200
    }
  }
}
```

#### f7_calc_summary — 집계 계산 (function)

**데이터 소스**: `daily_irrigation_records` global context (f4 STEP 5에서 push)

**프로그램별 집계**:
- `execution_count` — 실행 횟수
- `total_flow` — 총 유량 (L)
- `valve_flows` — 밸브별 유량 및 실행 횟수

**최종 출력**:
```json
{
  "date": "2026-02-16",
  "total_irrigation_count": 5,
  "total_flow": 150.5,
  "program_stats": [
    {
      "program_id": 1,
      "program_name": "P1",
      "execution_count": 3,
      "total_flow": 90.3,
      "valve_flows": [
        { "valve_number": 1, "flow_liters": 50.1, "run_count": 3 }
      ]
    }
  ],
  "sensor_averages": { ... }
}
```

**집계 후 리셋**:
- `daily_irrigation_records = []`
- `accumulated_solar = 0`

#### f7_post_summary — POST daily-summary

Express 수신 후:
- `DailySummary.upsert()` — 프로그램별 일일 요약 저장
- `DailyValveFlow.upsert()` — 밸브별 유량 저장

---

## f8 — Heartbeat (비활성)

### 플로우 구조

```
[60초 inject] → [Heartbeat 생성 function] → [MQTT pub: farm/{farmId}/heartbeat]
```

### 비활성 이유

RPi Express의 `heartbeatService.js`가 동일 기능을 수행합니다. Express 서비스는 `os` 모듈로 실제 CPU 온도, 메모리, 디스크 정보를 수집할 수 있어 더 정확합니다.

### 작동 방식 (참고용)

- farmId: `env.get('FARM_ID')` 또는 `global.get('FARM_ID')` 또는 `'default-farm'`
- uptime: Node-RED 시작 시간 기준 경과 초
- 메시지 형태:
  ```json
  {
    "farmId": "MyFarmPi_01",
    "timestamp": "2026-02-17T10:00:00.000Z",
    "uptime": 3600,
    "cpu_temp": 0,
    "disk_usage": 0,
    "operating_state": "STOPPED",
    "memory_usage": 0
  }
  ```
- 토픽: `farm/{farmId}/heartbeat`, QoS 0

---

## f9 — 일일집계 전송 (비활성)

### 플로우 구조

```
[매일 00:05 cron] → [어제 날짜 계산] → [GET /internal/daily-summary] → [MQTT 전송 준비] → [MQTT pub: farm/{farmId}/daily-summary]
```

### 비활성 이유

RPi Express의 `dailySyncService.js`가 동일 기능을 수행합니다.

### 작동 방식 (참고용)

1. **f9_calc_yesterday**: 어제 날짜 계산 → `msg.url` 설정
2. **f9_get_summary**: GET으로 어제 집계 데이터 조회 (msg.url 사용)
3. **f9_prepare_mqtt**: farmId 추가, `sent_at` 타임스탬프 추가
4. **f9_mqtt_out**: `farm/{farmId}/daily-summary` 토픽으로 MQTT 발행 (QoS 1)

> f7(00:00 집계 저장)과 f9(00:05 클라우드 전송) 사이 5분 간격은 의도적으로 집계 완료를 보장하기 위함입니다.

---

## f10 — 원격 명령 수신 (활성)

### 플로우 구조

```
[MQTT sub: farm/+/command] → [JSON 파싱] → [farmId 검증] → [명령 유형 분기 switch]
    ├─ EMERGENCY_STOP → [원본 보존] → [POST /emergency-stop] → [ACK 생성] → [MQTT pub: ACK]
    ├─ START          → [운영 시작 function] ─→ [POST status-update] + [MQTT pub: ACK]
    ├─ STOP           → [운영 중지 function] ─→ [POST status-update] + [MQTT pub: ACK]
    └─ MANUAL         → [수동 제어 function] ─→ [POST status-update] + [MQTT pub: ACK]
```

### 목적

사무실 클라우드 서버에서 AWS IoT Core를 통해 전송한 원격 명령을 수신, 실행하고 ACK를 응답합니다.

### 노드별 상세

#### f10_mqtt_in — 원격 명령 구독

| 속성 | 값 |
|------|-----|
| 토픽 | `farm/+/command` (와일드카드) |
| QoS | 1 |
| 데이터 형식 | UTF-8 |

#### f10_json_parse — JSON 파싱

문자열 payload를 JSON 객체로 변환합니다.

#### f10_validate_farm — farmId 검증

- `msg.topic`에서 farmId 추출: `farm/{farmId}/command` → `topicParts[1]`
- 자기 `FARM_ID`와 비교
- **불일치 시**: 경고 로그 출력 후 `return null` (메시지 폐기)
- **일치 시**: 다음 노드로 전달

#### f10_switch — 명령 유형 분기

`msg.payload.type` 기준 4가지 분기:

| 출력 | type | 설명 |
|------|------|------|
| 1 | `EMERGENCY_STOP` | 비상정지 |
| 2 | `START` | 운영 시작 |
| 3 | `STOP` | 운영 중지 |
| 4 | `MANUAL` | 수동 밸브 제어 |

#### EMERGENCY_STOP 경로

1. **f10_save_cmd**: `msg.originalPayload`에 원본 명령 보존 (HTTP 호출 시 payload가 덮어씌워지므로)
2. **f10_estop_http**: `POST http://localhost:1880/emergency-stop` → f6의 비상정지 HTTP 엔드포인트 호출
3. **f10_estop_ack**: ACK 메시지 생성
   ```json
   {
     "type": "EMERGENCY_STOP",
     "command_id": "...",
     "success": true,
     "message": "비상정지가 실행되었습니다.",
     "timestamp": "2026-02-17T10:00:00.000Z"
   }
   ```

#### START 경로

- `operating_state = 'RUNNING'` 설정
- 출력1: Express에 status-update
- 출력2: ACK MQTT 발행

#### STOP 경로

- `operating_state = 'STOPPED'` 설정
- 출력1: Express에 status-update
- 출력2: ACK MQTT 발행

#### MANUAL 경로

- `valve_index`, `state` 검증 (누락 또는 범위 초과 시 실패 ACK)
- `valve_states[valveIndex]` 업데이트
- 출력1: Express에 status-update
- 출력2: ACK MQTT 발행

#### f10_mqtt_ack — 명령 ACK 전송

| 속성 | 값 |
|------|-----|
| 토픽 | `farm/{farmId}/command/ack` (msg.topic 사용) |
| QoS | 1 |

클라우드 서버가 이 ACK를 수신하여 명령 실행 결과를 확인합니다.

---

## 플로우 간 데이터 흐름

```
                    ┌─────────────┐
                    │  f1 센서수집  │ 2초 간격
                    │  (시뮬레이션) │
                    └──────┬──────┘
                           │ POST /internal/sensor-update
                           │ + global.set('latest_sensor_data')
                           ▼
                    ┌──────────────┐         ┌──────────────┐
                    │ RPi Express  │ ◄───────│  f2 장비상태  │ 5초 간격
                    │  (DB 저장)   │         │ (global→DB)  │
                    └──────┬───────┘         └──────────────┘
                           │
                    ┌──────┴───────┐
                    │ alarmService │ (경보 처리, f5 대체)
                    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ f3 관수스케줄 │───▶│ f4 관수시퀀스 │───▶│ RPi Express  │
│  (10초)      │    │ (상태 머신)   │    │ status-update│
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │
                    daily_irrigation_records
                           │
                    ┌──────┴───────┐
                    │ f7 일일집계   │ 매일 00:00
                    │ → DB 저장    │
                    └──────────────┘

┌──────────────┐    ┌──────────────┐
│ AWS IoT Core │◄──▶│ f10 원격명령 │ MQTT
│  (클라우드)   │    │  → f6 비상정지│
└──────────────┘    └──────────────┘
```

---

## Global Context 키 목록

### 메모리 컨텍스트 (default)

| 키 | 설정 플로우 | 참조 플로우 | 타입 | 설명 |
|---|---|---|---|---|
| `latest_sensor_data` | f1 | f3, f4 | Object | 최신 센서 데이터 (14개 필드) |
| `operating_state` | f4, f6, f10 | f2, f3 | String | 운영 상태 |
| `active_program` | f4, f6 | f2 | Number/null | 현재 실행 프로그램 번호 |
| `valve_states` | f4, f6, f10 | f2 | Array[14] | 밸브 개폐 상태 (boolean) |
| `pump_state` | f4, f6 | f2 | Object | `{ raw_pump, nutrient_pump }` |
| `mixer_state` | f4, f6 | f2 | Boolean | 믹서 ON/OFF |
| `irrigation_step` | f4 | f4 | Number | 현재 관수 단계 (0~5) |
| `irrigation_program` | f4 | f4 | Object | 현재 실행 프로그램 데이터 |
| `current_valve_index` | f4 | f4 | Number | STEP 4 밸브 순회 인덱스 |
| `current_valve` | f4 | f2 | Number | 현재 개방 중인 밸브 번호 |
| `step_start_time` | f4 | f4 | Number | 현재 STEP 시작 시간 (ms) |
| `step2_entered` | f4 | f4 | Boolean | STEP 2 최초 진입 플래그 |
| `irrigation_total_flow` | f4 | f4 | Number | 관수 총 유량 (L) |
| `irrigation_valve_flows` | f4 | f4 | Array | 밸브별 유량 기록 |
| `accumulated_solar` | f3 | f3, f7 | Number | 누적 일사량 (Wh) |
| `last_irrigation_N` | f3 | f3 | Number | 프로그램N 마지막 관수 시간 (ms) |
| `last_schedule_trigger_N` | f3 | f3 | String | 프로그램N 스케줄 중복방지 키 |
| `daily_irrigation_records` | f4 | f7 | Array | 하루 관수 기록 |
| `programs_cache` | f3 | f3 | Array | 프로그램 목록 캐시 |
| `programs_cache_time` | f3 | f3 | Number | 캐시 갱신 시간 (ms) |
| `active_alarms` | f5 | f5 | Object | 활성 경보 (비활성 탭용) |

### file 컨텍스트 (재시작 후에도 유지)

| 키 | 용도 |
|---|---|
| `irrigation_step` | 관수 도중 재시작 감지용 |
| `operating_state` | 재시작 시 이전 운영 상태 복구용 |

---

## RPi Express 내부 API 연동

Node-RED에서 호출하는 RPi Express 내부 API 목록입니다.

| API | 메소드 | 호출 플로우 | 설명 |
|-----|--------|------------|------|
| `/internal/sensor-update` | POST | f1 (2초) | 센서 데이터 저장 + 경보 확인 |
| `/internal/status-update` | POST | f2 (5초), f4, f6, f10 | 장비 상태 DB 동기화 |
| `/internal/alarm` | POST | f5 (비활성) | 경보 DB 저장 |
| `/internal/programs` | GET | f3 (10초) | 프로그램 목록 + 밸브 설정 조회 |
| `/internal/config` | GET | f5 (비활성) | 시스템 설정 조회 |
| `/internal/daily-summary-data` | GET | f7 (00:00) | 전일 센서 평균 조회 |
| `/internal/daily-summary` | POST | f7 (00:00) | 일일집계 저장 |
| `/emergency-stop` | POST | f6, f10 | Node-RED 비상정지 (포트 1880) |

> **참고**: `/internal/*` API는 `localhost`에서만 접근 가능합니다 (localOnly 미들웨어).
