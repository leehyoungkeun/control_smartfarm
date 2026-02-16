# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

스마트팜 양액 관수 원격제어 SaaS 시스템 (케이그린텍). 최대 1000개 농장을 관리하는 멀티 테넌트 플랫폼.

## Architecture — 듀얼 서버 구조

- **cloud-server/** — 사무실 Express API (PostgreSQL, 중앙 관리)
- **rpi-server/** — Raspberry Pi Express API (SQLite, 농장 현장 독립 운영)
- **frontend/** — React (Vite) + MUI + Zustand
- **shared/** — 공유 상수, MQTT 토픽 정의
- **node-red/** — Node-RED 플로우
- **scripts/** — 배포 스크립트

## Communication Flow (핵심 원칙)

외부 FE는 절대 AWS에 직접 연결하지 않음:
- 터치패널 → RPi Express (localhost)
- 외부 FE → 사무실 Express REST API + WebSocket
- 사무실 서버 ↔ AWS IoT Core ↔ RPi (MQTT, 서버끼리만)

실시간 센서: FE WebSocket 연결 → 서버가 request/start 발행 → RPi 3초 텔레메트리 → 서버가 FE에 전달 → FE 종료 시 request/stop

## Commands

### Cloud Server (`smart-farm-system/cloud-server/`)
```
npm run dev          # nodemon 개발 서버 (port 3000)
npm start            # 프로덕션 서버
npm run db:create    # smartfarm_cc DB 생성
npm run db:migrate   # Sequelize 마이그레이션
npm run db:setup     # DB 생성 + 마이그레이션
```

### RPi Server (`smart-farm-system/rpi-server/`)
```
npm run dev          # nodemon 개발 서버 (port 3001)
npm start            # 프로덕션 서버
```

### Frontend (`smart-farm-system/frontend/`)
```
npm run dev          # Vite 개발 서버 (port 5173)
npm run build        # 프로덕션 빌드
```

## Database

### PostgreSQL (cloud-server) — 8 테이블
organizations, users, farms, farm_users, alarm_history, control_logs, daily_summary_archive, notification_settings
- UUID 기본키, 멀티테넌트 (organization_id)
- 역할: superadmin, admin, operator, viewer
- DB 이름: smartfarm_cc

### SQLite (rpi-server) — 8 테이블
system_config(1행), irrigation_program(6행), valve_config(84행), sensor_data, daily_summary, daily_valve_flow, alarm_log, local_users
- better-sqlite3 동기 API, WAL 모드
- 기본 계정: admin / admin1234

## Key Constants
- 밸브: 14, 프로그램: 6, 탱크: 7 (A~F + acid)
- shared/constants.js (서버 공유), frontend/src/utils/constants.js (FE)

## MQTT Topics (shared/mqttTopics.js)
- RPi→서버: telemetry, status, alarm, command/ack, daily-summary
- 서버→RPi: command, config/update, request/start, request/stop
- 서버 와일드카드 구독: farm/+/telemetry 등

## Environment
- cloud-server/.env — PostgreSQL + AWS IoT + SMTP
- rpi-server/.env — SQLite + AWS IoT
- frontend/.env — API URL (VITE_CLOUD_API_URL, VITE_LOCAL_API_URL)

## Node-RED (node-red/)
- flows.json: 10개 플로우, 82개 노드
- 센서 수집(2s) → Express /internal/sensor-update로 전달 (MQTT X)
- 관수 스케줄러: 일사량/시간간격/고정시간 3가지 트리거
- 관수 시퀀스: 5단계 상태 머신 (원수펌프→양액혼합→관수펌프→밸브순차→완료)
- 경보: 임계값 초과 시 Express /internal/alarm으로 전달
- Heartbeat(60s) + 일일집계(00:05): 이것만 항상 AWS IoT 발행
- 원격 명령: MQTT farm/+/command 구독 → 실행 → command/ack 발행

## Deployment
### 사무실 서버 (Docker)
- docker/docker-compose.yml: postgres + cloud-server + frontend(nginx)
- `docker compose up -d` (docker/ 디렉토리에서)

### RPi (PM2)
- scripts/setup-rpi.sh → scripts/deploy-rpi.sh 순서
- scripts/ecosystem.config.js: rpi-server + node-red PM2 설정
- 빌드된 frontend → rpi-server/public/ 정적 서빙

## Conventions
- 모든 코드 주석은 한국어로 작성
- 인증: JWT (Cognito 사용 안 함)
- API 응답: { success: boolean, data?, message? }
