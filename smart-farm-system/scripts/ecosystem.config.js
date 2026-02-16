/**
 * PM2 프로세스 관리 설정 파일
 * 스마트팜 RPi 서버 및 Node-RED 프로세스를 관리합니다.
 *
 * 사용법:
 *   pm2 start ecosystem.config.js        - 모든 앱 시작
 *   pm2 restart ecosystem.config.js      - 모든 앱 재시작
 *   pm2 stop ecosystem.config.js         - 모든 앱 중지
 *   pm2 delete ecosystem.config.js       - 모든 앱 삭제
 */

module.exports = {
  apps: [
    // ──────────────────────────────────────────
    // RPi 서버 (Express API + WebSocket + MQTT)
    // ──────────────────────────────────────────
    {
      name: 'smartfarm-rpi',
      script: 'src/server.js',
      cwd: '/home/lhk/smartfarm/rpi-server',

      // 환경변수 설정
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: 'smartfarm-rpi-secret-change-me',
        DB_PATH: '/home/lhk/smartfarm/rpi-server/data/smartfarm.db',
        AWS_IOT_CERT_PATH: '/home/lhk/certs/certificate.pem.crt',
        AWS_IOT_KEY_PATH: '/home/lhk/certs/private.pem.key',
        AWS_IOT_CA_PATH: '/home/lhk/certs/AmazonRootCA1.pem',
        AWS_IOT_ENDPOINT: 'a2ybxz5mrpnfww-ats.iot.ap-northeast-2.amazonaws.com',
        AWS_IOT_CLIENT_ID: 'MyFarmPi_01',
      },

      // 프로세스 관리 옵션
      instances: 1,                    // 단일 인스턴스 (RPi 리소스 고려)
      exec_mode: 'fork',              // fork 모드
      max_restarts: 10,               // 최대 재시작 횟수
      min_uptime: '10s',              // 최소 실행 시간 (이 시간 내 종료 시 불안정 판단)
      restart_delay: 5000,            // 재시작 대기 시간 (ms)
      autorestart: true,              // 자동 재시작 활성화

      // 파일 감시 (개발 시에만 활성화 권장)
      watch: false,
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'data',
        'public',
        'logs',
        '*.log',
      ],

      // 로그 설정
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/lhk/smartfarm/logs/rpi-server-error.log',
      out_file: '/home/lhk/smartfarm/logs/rpi-server-out.log',
      merge_logs: true,
      log_type: 'json',

      // 메모리 제한 (RPi 4 기준, 초과 시 자동 재시작)
      max_memory_restart: '300M',
    },

    // ──────────────────────────────────────────
    // Node-RED (비주얼 플로우 기반 IoT 연동)
    // ──────────────────────────────────────────
    {
      name: 'node-red',
      script: 'node-red',
      args: '-u /home/lhk/.node-red -s /home/lhk/smartfarm/node-red/settings.js',

      // 환경변수 설정
      env: {
        NODE_ENV: 'production',
        NODE_RED_CREDENTIAL_SECRET: 'smartfarm-nodered-secret-change-me',
        FARM_ID: 'MyFarmPi_01',
        MQTT_BROKER_HOST: 'localhost',
        MQTT_BROKER_PORT: 1883,
        AWS_IOT_ENDPOINT: 'a2ybxz5mrpnfww-ats.iot.ap-northeast-2.amazonaws.com',
        AWS_IOT_CERT_PATH: '/home/lhk/certs/certificate.pem.crt',
        AWS_IOT_KEY_PATH: '/home/lhk/certs/private.pem.key',
        AWS_IOT_CA_PATH: '/home/lhk/certs/AmazonRootCA1.pem',
      },

      // 프로세스 관리 옵션
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 5,
      min_uptime: '15s',
      restart_delay: 10000,           // Node-RED는 시작이 느리므로 대기 시간 길게
      autorestart: true,

      // 파일 감시 비활성화 (Node-RED는 자체 에디터로 관리)
      watch: false,

      // 로그 설정
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/lhk/smartfarm/logs/node-red-error.log',
      out_file: '/home/lhk/smartfarm/logs/node-red-out.log',
      merge_logs: true,

      // 메모리 제한
      max_memory_restart: '256M',
    },
  ],
};
