# AWS IoT Core 설정 가이드

> **프로젝트**: smart-farm-system
> **작성일**: 2026-02-15
> **리전**: ap-northeast-2 (서울)

---

## 목차

1. [시스템 구성 개요](#1-시스템-구성-개요)
2. [AWS IoT Core 초기 설정](#2-aws-iot-core-초기-설정)
3. [사물(Thing) 생성](#3-사물thing-생성)
4. [인증서 생성 및 다운로드](#4-인증서-생성-및-다운로드)
5. [IoT 정책(Policy) 생성](#5-iot-정책policy-생성)
6. [엔드포인트 확인](#6-엔드포인트-확인)
7. [연결 테스트](#7-연결-테스트)
8. [새 농장 추가 절차](#8-새-농장-추가-절차)
9. [보안 권장사항](#9-보안-권장사항)
10. [비용 예측](#10-비용-예측)
11. [트러블슈팅](#11-트러블슈팅)

---

## 1. 시스템 구성 개요

### 전체 아키텍처

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   사무실 서버     │◄──MQTT──►│  AWS IoT Core    │◄──MQTT──►│   RPi (농장)     │
│  (Cloud Server)  │         │  (MQTT Broker)   │         │  farm-{farmId}  │
│  Client ID:      │         │  ap-northeast-2  │         │                 │
│  smartfarm-      │         │  (서울 리전)       │         │  예) farm-       │
│  cloud-server    │         │                  │         │  MyFarm01       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### 구성 요소

| 구성 요소 | 설명 | Client ID |
|-----------|------|-----------|
| 사무실 서버 (Cloud Server) | AWS IoT Core에 구독자/발행자로 연결. 모든 농장 데이터를 수집하고 제어 명령을 전송 | `smartfarm-cloud-server` |
| RPi (각 농장) | 각 농장마다 1대의 RPi가 AWS IoT Core에 연결. 센서 데이터를 발행하고 명령을 수신 | `farm-{farmId}` (예: `farm-MyFarm01`) |
| AWS IoT Core | 사무실 서버와 RPi 사이의 MQTT 브로커 역할 | - |

### MQTT 토픽 구조

#### RPi → 사무실 서버 (RPi가 발행, 서버가 구독)

| 토픽 | 설명 | 발행 주기 |
|------|------|-----------|
| `farm/{farmId}/telemetry` | 센서 데이터 | 요청 시에만, 3초 간격 |
| `farm/{farmId}/status` | 장비 상태 | 요청 시에만 |
| `farm/{farmId}/alarm` | 경보 발생 | 항상, 경보 발생 시 즉시 |
| `farm/{farmId}/command/ack` | 명령 실행 결과 | 항상, 명령 수신 후 |
| `farm/{farmId}/daily-summary` | 일일 집계 데이터 | 항상, 매일 00:05에 1회 |
| `farm/{farmId}/heartbeat` | 연결 상태 확인 | 항상, 60초 간격 |

#### 사무실 서버 → RPi (서버가 발행, RPi가 구독)

| 토픽 | 설명 |
|------|------|
| `farm/{farmId}/command` | 원격 제어 명령 |
| `farm/{farmId}/config/update` | 설정 변경 |
| `farm/{farmId}/request/start` | 텔레메트리 발행 시작 요청 |
| `farm/{farmId}/request/stop` | 텔레메트리 발행 중지 요청 |

---

## 2. AWS IoT Core 초기 설정

### 2.1 AWS Console 접속

1. [AWS Management Console](https://console.aws.amazon.com/)에 로그인합니다.
2. 우측 상단의 리전 선택 드롭다운에서 **아시아 태평양 (서울) ap-northeast-2**를 선택합니다.
3. 서비스 검색창에 **IoT Core**를 입력하고 선택합니다.

### 2.2 리전 확인

> **중요**: 모든 IoT 리소스(사물, 인증서, 정책)는 반드시 **ap-northeast-2 (서울)** 리전에서 생성해야 합니다. 다른 리전에서 생성한 리소스는 서로 연결되지 않습니다.

AWS IoT Core 콘솔 좌측 하단에 현재 리전이 `ap-northeast-2`로 표시되어 있는지 확인합니다.

---

## 3. 사물(Thing) 생성

### 3.1 Thing Group 생성

먼저 관리 편의를 위한 Thing Group을 생성합니다.

#### "smartfarm-servers" 그룹 생성

1. AWS IoT 콘솔 → **관리** → **사물 그룹** → **사물 그룹 생성**을 클릭합니다.
2. **정적 사물 그룹 생성**을 선택합니다.
3. 그룹 이름: `smartfarm-servers`
4. 설명: `스마트팜 사무실 서버 그룹`
5. **사물 그룹 생성**을 클릭합니다.

#### "smartfarm-rpis" 그룹 생성

1. 동일한 절차로 **사물 그룹 생성**을 클릭합니다.
2. 그룹 이름: `smartfarm-rpis`
3. 설명: `스마트팜 RPi 디바이스 그룹`
4. **사물 그룹 생성**을 클릭합니다.

#### AWS CLI를 사용한 그룹 생성

```bash
# smartfarm-servers 그룹 생성
aws iot create-thing-group \
  --thing-group-name "smartfarm-servers" \
  --thing-group-properties '{"thingGroupDescription": "스마트팜 사무실 서버 그룹"}' \
  --region ap-northeast-2

# smartfarm-rpis 그룹 생성
aws iot create-thing-group \
  --thing-group-name "smartfarm-rpis" \
  --thing-group-properties '{"thingGroupDescription": "스마트팜 RPi 디바이스 그룹"}' \
  --region ap-northeast-2
```

### 3.2 사무실 서버용 Thing 생성

1. AWS IoT 콘솔 → **관리** → **사물** → **사물 생성**을 클릭합니다.
2. **단일 사물 생성**을 선택합니다.
3. 사물 이름: `smartfarm-cloud-server`
4. 사물 그룹: `smartfarm-servers`를 선택합니다.
5. 사물 유형: 선택 사항 (생략 가능)
6. **다음**을 클릭합니다.
7. 인증서 구성 단계에서 **새 인증서 자동 생성(권장)**을 선택합니다.
8. **사물 생성**을 클릭합니다.

#### AWS CLI를 사용한 생성

```bash
# 사물 생성
aws iot create-thing \
  --thing-name "smartfarm-cloud-server" \
  --region ap-northeast-2

# 그룹에 추가
aws iot add-thing-to-thing-group \
  --thing-group-name "smartfarm-servers" \
  --thing-name "smartfarm-cloud-server" \
  --region ap-northeast-2
```

### 3.3 RPi용 Thing 생성

각 농장의 RPi에 대해 `farm-{farmId}` 패턴으로 Thing을 생성합니다.

**예시: farm-MyFarm01**

1. AWS IoT 콘솔 → **관리** → **사물** → **사물 생성**을 클릭합니다.
2. 사물 이름: `farm-MyFarm01`
3. 사물 그룹: `smartfarm-rpis`를 선택합니다.
4. **다음** → **새 인증서 자동 생성** → **사물 생성**을 클릭합니다.

#### AWS CLI를 사용한 생성

```bash
# 농장 ID 변수 설정
FARM_ID="MyFarm01"

# 사물 생성
aws iot create-thing \
  --thing-name "farm-${FARM_ID}" \
  --region ap-northeast-2

# 그룹에 추가
aws iot add-thing-to-thing-group \
  --thing-group-name "smartfarm-rpis" \
  --thing-name "farm-${FARM_ID}" \
  --region ap-northeast-2
```

### 3.4 Thing 명명 규칙

| 대상 | Thing 이름 패턴 | 예시 |
|------|-----------------|------|
| 사무실 서버 | `smartfarm-cloud-server` | `smartfarm-cloud-server` |
| RPi (농장) | `farm-{farmId}` | `farm-MyFarm01`, `farm-MyFarm02` |

> **주의**: Thing 이름은 AWS 계정 내에서 고유해야 하며, 생성 후 변경할 수 없습니다. farmId에는 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용하십시오.

---

## 4. 인증서 생성 및 다운로드

### 4.1 AWS IoT Console에서 인증서 생성

Thing 생성 과정에서 인증서를 함께 생성하거나, 별도로 생성할 수 있습니다.

#### 별도 인증서 생성 방법

1. AWS IoT 콘솔 → **보안** → **인증서** → **인증서 생성**을 클릭합니다.
2. **원클릭 인증서 생성(권장)** → **인증서 생성**을 클릭합니다.
3. 다음 파일들을 **반드시** 다운로드합니다:

| 파일 | 설명 | 파일명 예시 |
|------|------|-------------|
| 디바이스 인증서 | 디바이스 인증용 공개 인증서 | `xxxxxxxxxx-certificate.pem.crt` |
| 프라이빗 키 | 디바이스 인증용 개인 키 | `xxxxxxxxxx-private.pem.key` |
| 퍼블릭 키 | 참고용 (사용하지 않음) | `xxxxxxxxxx-public.pem.key` |
| 루트 CA 인증서 | Amazon 루트 인증 기관 인증서 | `AmazonRootCA1.pem` |

4. **활성화**를 클릭하여 인증서를 활성화합니다.
5. **정책 연결**에서 해당 정책을 선택합니다 (5장 참고).

> **경고**: 프라이빗 키(`private.pem.key`)는 이 시점에서만 다운로드할 수 있습니다. 페이지를 벗어나면 다시 다운로드할 수 없으므로 반드시 안전한 곳에 저장하십시오.

#### AWS CLI를 사용한 인증서 생성

```bash
# 인증서 생성 및 활성화
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile "certificate.pem.crt" \
  --private-key-outfile "private.pem.key" \
  --public-key-outfile "public.pem.key" \
  --region ap-northeast-2

# 출력에서 certificateArn 값을 기록해 둡니다.
# 예: arn:aws:iot:ap-northeast-2:123456789012:cert/xxxxxxxxxx

# 루트 CA 인증서 다운로드
curl -o AmazonRootCA1.pem https://www.amazontrust.com/repository/AmazonRootCA1.pem
```

### 4.2 인증서와 Thing 연결

```bash
# 인증서를 Thing에 연결
aws iot attach-thing-principal \
  --thing-name "smartfarm-cloud-server" \
  --principal "arn:aws:iot:ap-northeast-2:123456789012:cert/xxxxxxxxxx" \
  --region ap-northeast-2
```

### 4.3 인증서 파일 저장 경로

#### 사무실 서버 (Windows)

인증서 파일을 다음 경로에 저장합니다:

```
C:\control_smartfarm\certs\
├── certificate.pem.crt    # 디바이스 인증서
├── private.pem.key        # 프라이빗 키
└── AmazonRootCA1.pem      # 루트 CA 인증서
```

저장 경로 생성:

```powershell
# PowerShell
New-Item -ItemType Directory -Force -Path "C:\control_smartfarm\certs"
```

> **중요**: `C:\control_smartfarm\certs\` 디렉토리는 `.gitignore`에 반드시 추가하여 인증서가 Git 저장소에 포함되지 않도록 합니다.

#### RPi (Linux)

인증서 파일을 다음 경로에 저장합니다:

```
/home/pi/certs/
├── certificate.pem.crt    # 디바이스 인증서
├── private.pem.key        # 프라이빗 키
└── AmazonRootCA1.pem      # 루트 CA 인증서
```

저장 경로 생성 및 권한 설정:

```bash
# 디렉토리 생성
mkdir -p /home/pi/certs

# 인증서 파일 복사 후 권한 설정
chmod 700 /home/pi/certs
chmod 600 /home/pi/certs/*
```

### 4.4 인증서 활성화 확인

```bash
# 인증서 상태 확인
aws iot describe-certificate \
  --certificate-id "xxxxxxxxxx" \
  --region ap-northeast-2

# 출력에서 "status": "ACTIVE" 확인
```

---

## 5. IoT 정책(Policy) 생성

### 5.1 사무실 서버 정책: `smartfarm-cloud-policy`

사무실 서버는 모든 농장의 데이터를 수신하고, 모든 농장에 명령을 전송할 수 있어야 합니다.

#### 정책 JSON 문서

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowConnect",
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:ap-northeast-2:*:client/smartfarm-cloud-server"
    },
    {
      "Sid": "AllowSubscribe",
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": [
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/telemetry",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/status",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/alarm",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/command/ack",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/daily-summary",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/heartbeat"
      ]
    },
    {
      "Sid": "AllowReceive",
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "arn:aws:iot:ap-northeast-2:*:topic/farm/*/*"
    },
    {
      "Sid": "AllowPublish",
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": [
        "arn:aws:iot:ap-northeast-2:*:topic/farm/*/command",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/*/config/update",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/*/request/start",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/*/request/stop"
      ]
    }
  ]
}
```

#### Console에서 정책 생성

1. AWS IoT 콘솔 → **보안** → **정책** → **정책 생성**을 클릭합니다.
2. 정책 이름: `smartfarm-cloud-policy`
3. **고급 모드**를 선택하고 위의 JSON 문서를 붙여넣습니다.
4. **생성**을 클릭합니다.

#### AWS CLI를 사용한 정책 생성

```bash
aws iot create-policy \
  --policy-name "smartfarm-cloud-policy" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowConnect",
        "Effect": "Allow",
        "Action": "iot:Connect",
        "Resource": "arn:aws:iot:ap-northeast-2:*:client/smartfarm-cloud-server"
      },
      {
        "Sid": "AllowSubscribe",
        "Effect": "Allow",
        "Action": "iot:Subscribe",
        "Resource": [
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/telemetry",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/status",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/alarm",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/command/ack",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/daily-summary",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/+/heartbeat"
        ]
      },
      {
        "Sid": "AllowReceive",
        "Effect": "Allow",
        "Action": "iot:Receive",
        "Resource": "arn:aws:iot:ap-northeast-2:*:topic/farm/*/*"
      },
      {
        "Sid": "AllowPublish",
        "Effect": "Allow",
        "Action": "iot:Publish",
        "Resource": [
          "arn:aws:iot:ap-northeast-2:*:topic/farm/*/command",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/*/config/update",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/*/request/start",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/*/request/stop"
        ]
      }
    ]
  }' \
  --region ap-northeast-2
```

#### 정책을 인증서에 연결

```bash
aws iot attach-policy \
  --policy-name "smartfarm-cloud-policy" \
  --target "arn:aws:iot:ap-northeast-2:123456789012:cert/xxxxxxxxxx" \
  --region ap-northeast-2
```

### 5.2 RPi 정책: `smartfarm-rpi-policy`

RPi 정책은 IoT 정책 변수 `${iot:Connection.Thing.ThingName}`을 사용하여 각 디바이스가 자신의 토픽에만 접근할 수 있도록 제한합니다.

#### 정책 JSON 문서

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowConnect",
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:ap-northeast-2:*:client/farm-${iot:Connection.Thing.ThingName}"
    },
    {
      "Sid": "AllowSubscribe",
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": [
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/command",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/config/update",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/request/start",
        "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/request/stop"
      ]
    },
    {
      "Sid": "AllowReceive",
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/*"
    },
    {
      "Sid": "AllowPublish",
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": [
        "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/telemetry",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/status",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/alarm",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/command/ack",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/daily-summary",
        "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/heartbeat"
      ]
    }
  ]
}
```

> **참고**: `${iot:Connection.Thing.ThingName}`은 AWS IoT 정책 변수로, 연결 시 인증서에 연결된 Thing의 이름으로 자동 치환됩니다. 예를 들어, Thing 이름이 `farm-MyFarm01`인 경우 `farm/${iot:Connection.Thing.ThingName}/telemetry`는 `farm/farm-MyFarm01/telemetry`로 평가됩니다.

#### Console에서 정책 생성

1. AWS IoT 콘솔 → **보안** → **정책** → **정책 생성**을 클릭합니다.
2. 정책 이름: `smartfarm-rpi-policy`
3. **고급 모드**를 선택하고 위의 JSON 문서를 붙여넣습니다.
4. **생성**을 클릭합니다.

#### AWS CLI를 사용한 정책 생성

```bash
aws iot create-policy \
  --policy-name "smartfarm-rpi-policy" \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowConnect",
        "Effect": "Allow",
        "Action": "iot:Connect",
        "Resource": "arn:aws:iot:ap-northeast-2:*:client/farm-${iot:Connection.Thing.ThingName}"
      },
      {
        "Sid": "AllowSubscribe",
        "Effect": "Allow",
        "Action": "iot:Subscribe",
        "Resource": [
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/command",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/config/update",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/request/start",
          "arn:aws:iot:ap-northeast-2:*:topicfilter/farm/${iot:Connection.Thing.ThingName}/request/stop"
        ]
      },
      {
        "Sid": "AllowReceive",
        "Effect": "Allow",
        "Action": "iot:Receive",
        "Resource": "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/*"
      },
      {
        "Sid": "AllowPublish",
        "Effect": "Allow",
        "Action": "iot:Publish",
        "Resource": [
          "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/telemetry",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/status",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/alarm",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/command/ack",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/daily-summary",
          "arn:aws:iot:ap-northeast-2:*:topic/farm/${iot:Connection.Thing.ThingName}/heartbeat"
        ]
      }
    ]
  }' \
  --region ap-northeast-2
```

#### 정책을 인증서에 연결

```bash
# RPi 인증서에 정책 연결
aws iot attach-policy \
  --policy-name "smartfarm-rpi-policy" \
  --target "arn:aws:iot:ap-northeast-2:123456789012:cert/yyyyyyyyyy" \
  --region ap-northeast-2
```

---

## 6. 엔드포인트 확인

### 6.1 AWS IoT 엔드포인트 URL 확인

#### Console에서 확인

1. AWS IoT 콘솔 → 좌측 메뉴 하단의 **설정**을 클릭합니다.
2. **디바이스 데이터 엔드포인트** 섹션에서 엔드포인트 URL을 확인합니다.
3. 형식: `xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com`

#### AWS CLI로 확인

```bash
aws iot describe-endpoint \
  --endpoint-type iot:Data-ATS \
  --region ap-northeast-2

# 출력 예시:
# {
#   "endpointAddress": "xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com"
# }
```

### 6.2 .env 파일 설정

#### 사무실 서버 (.env)

파일 경로: `C:\control_smartfarm\smart-farm-system\backend\.env`

```env
# AWS IoT Core 설정
AWS_IOT_ENDPOINT=xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com
AWS_IOT_PORT=8883
AWS_IOT_CLIENT_ID=smartfarm-cloud-server
AWS_IOT_CERT_PATH=C:\control_smartfarm\certs\certificate.pem.crt
AWS_IOT_KEY_PATH=C:\control_smartfarm\certs\private.pem.key
AWS_IOT_CA_PATH=C:\control_smartfarm\certs\AmazonRootCA1.pem
AWS_IOT_REGION=ap-northeast-2
```

#### RPi (.env)

파일 경로: `/home/pi/smart-farm-rpi/.env`

```env
# AWS IoT Core 설정
AWS_IOT_ENDPOINT=xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com
AWS_IOT_PORT=8883
AWS_IOT_CLIENT_ID=farm-MyFarm01
AWS_IOT_CERT_PATH=/home/pi/certs/certificate.pem.crt
AWS_IOT_KEY_PATH=/home/pi/certs/private.pem.key
AWS_IOT_CA_PATH=/home/pi/certs/AmazonRootCA1.pem
AWS_IOT_REGION=ap-northeast-2
FARM_ID=MyFarm01
```

> **참고**: `AWS_IOT_CLIENT_ID`는 반드시 AWS IoT에 등록한 Thing 이름과 일치시켜야 합니다. RPi의 경우 `farm-{FARM_ID}` 형식입니다.

---

## 7. 연결 테스트

### 7.1 AWS IoT MQTT 테스트 클라이언트

AWS IoT 콘솔에 내장된 MQTT 테스트 클라이언트를 사용하여 토픽의 메시지를 확인할 수 있습니다.

1. AWS IoT 콘솔 → **테스트** → **MQTT 테스트 클라이언트**를 클릭합니다.
2. **토픽 구독** 탭에서 구독할 토픽을 입력합니다:
   - 모든 농장 텔레메트리 확인: `farm/+/telemetry`
   - 모든 농장 heartbeat 확인: `farm/+/heartbeat`
   - 특정 농장 전체 메시지: `farm/MyFarm01/#`
3. **구독**을 클릭합니다.
4. **토픽에 게시** 탭에서 테스트 메시지를 발행할 수 있습니다:
   - 토픽: `farm/MyFarm01/command`
   - 메시지 본문:
     ```json
     {
       "action": "test",
       "timestamp": "2026-02-15T00:00:00Z"
     }
     ```
5. **게시**를 클릭하면 구독 탭에서 메시지가 수신되는지 확인합니다.

### 7.2 mosquitto_pub/sub으로 테스트

먼저 `mosquitto-clients` 패키지를 설치합니다.

```bash
# Ubuntu/Debian (RPi)
sudo apt-get install mosquitto-clients

# macOS
brew install mosquitto
```

#### 구독 테스트

```bash
# 모든 농장의 heartbeat 메시지 구독
mosquitto_sub \
  --cafile /home/pi/certs/AmazonRootCA1.pem \
  --cert /home/pi/certs/certificate.pem.crt \
  --key /home/pi/certs/private.pem.key \
  -h xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com \
  -p 8883 \
  -t "farm/MyFarm01/heartbeat" \
  -v
```

#### 발행 테스트

```bash
# 테스트 heartbeat 메시지 발행
mosquitto_pub \
  --cafile /home/pi/certs/AmazonRootCA1.pem \
  --cert /home/pi/certs/certificate.pem.crt \
  --key /home/pi/certs/private.pem.key \
  -h xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com \
  -p 8883 \
  -t "farm/MyFarm01/heartbeat" \
  -i "farm-MyFarm01" \
  -m '{"farmId":"MyFarm01","timestamp":"2026-02-15T00:00:00Z","status":"online"}'
```

### 7.3 Node.js 테스트 스크립트

아래 스크립트로 간단한 publish/subscribe 연결 테스트를 수행할 수 있습니다.

#### 사전 설치

```bash
npm install aws-iot-device-sdk-v2
```

#### 테스트 스크립트: `test-iot-connection.js`

```javascript
/**
 * AWS IoT Core 연결 테스트 스크립트
 *
 * 사용법:
 *   node test-iot-connection.js
 *
 * 이 스크립트는 다음을 테스트합니다:
 *   1. AWS IoT Core에 MQTT 연결
 *   2. 토픽 구독
 *   3. 메시지 발행
 *   4. 메시지 수신 확인
 */

const { mqtt, iot } = require('aws-iot-device-sdk-v2');
const path = require('path');

// ====== 설정 ======
// 환경에 맞게 아래 값들을 수정하세요
const config = {
  endpoint: process.env.AWS_IOT_ENDPOINT || 'xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com',
  certPath: process.env.AWS_IOT_CERT_PATH || path.join(__dirname, 'certs', 'certificate.pem.crt'),
  keyPath: process.env.AWS_IOT_KEY_PATH || path.join(__dirname, 'certs', 'private.pem.key'),
  caPath: process.env.AWS_IOT_CA_PATH || path.join(__dirname, 'certs', 'AmazonRootCA1.pem'),
  clientId: process.env.AWS_IOT_CLIENT_ID || 'smartfarm-cloud-server',
};

const TEST_TOPIC = 'farm/TestFarm/heartbeat';
const TEST_MESSAGE = JSON.stringify({
  farmId: 'TestFarm',
  timestamp: new Date().toISOString(),
  status: 'online',
  message: '연결 테스트',
});

async function main() {
  console.log('========================================');
  console.log(' AWS IoT Core 연결 테스트');
  console.log('========================================');
  console.log(`엔드포인트: ${config.endpoint}`);
  console.log(`클라이언트 ID: ${config.clientId}`);
  console.log(`인증서: ${config.certPath}`);
  console.log('');

  // MQTT 연결 설정
  const mqttConfig = iot.AwsIotMqttConnectionConfigBuilder
    .new_mtls_builder_from_path(config.certPath, config.keyPath)
    .with_certificate_authority_from_path(undefined, config.caPath)
    .with_clean_session(true)
    .with_client_id(config.clientId)
    .with_endpoint(config.endpoint)
    .build();

  const client = new mqtt.MqttClient();
  const connection = client.new_connection(mqttConfig);

  // 연결 이벤트 핸들러
  connection.on('connect', () => {
    console.log('[성공] AWS IoT Core에 연결되었습니다.');
  });

  connection.on('disconnect', () => {
    console.log('[알림] 연결이 종료되었습니다.');
  });

  connection.on('error', (error) => {
    console.error('[오류] 연결 오류:', error);
  });

  try {
    // 1. 연결
    console.log('[1/4] AWS IoT Core에 연결 중...');
    await connection.connect();
    console.log('[성공] 연결 완료\n');

    // 2. 구독
    console.log(`[2/4] 토픽 구독 중: ${TEST_TOPIC}`);
    let messageReceived = false;

    await connection.subscribe(
      TEST_TOPIC,
      mqtt.QoS.AtLeastOnce,
      (topic, payload) => {
        const message = new TextDecoder('utf-8').decode(payload);
        console.log(`[수신] 토픽: ${topic}`);
        console.log(`[수신] 메시지: ${message}`);
        messageReceived = true;
      }
    );
    console.log('[성공] 구독 완료\n');

    // 3. 발행
    console.log(`[3/4] 메시지 발행 중: ${TEST_TOPIC}`);
    await connection.publish(TEST_TOPIC, TEST_MESSAGE, mqtt.QoS.AtLeastOnce);
    console.log(`[성공] 발행 완료: ${TEST_MESSAGE}\n`);

    // 4. 수신 확인 대기
    console.log('[4/4] 메시지 수신 확인 대기 중 (최대 5초)...');
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!messageReceived) {
          console.log('[경고] 5초 내에 메시지를 수신하지 못했습니다.');
        }
        resolve();
      }, 5000);

      const interval = setInterval(() => {
        if (messageReceived) {
          clearTimeout(timeout);
          clearInterval(interval);
          console.log('[성공] 메시지 수신 확인 완료\n');
          resolve();
        }
      }, 100);
    });

    // 연결 종료
    await connection.disconnect();

    // 결과 출력
    console.log('========================================');
    console.log(' 테스트 결과');
    console.log('========================================');
    console.log(`연결: 성공`);
    console.log(`구독: 성공`);
    console.log(`발행: 성공`);
    console.log(`수신: ${messageReceived ? '성공' : '실패'}`);
    console.log('========================================');

    if (messageReceived) {
      console.log('\n모든 테스트를 통과했습니다. AWS IoT Core 연결이 정상입니다.');
    } else {
      console.log('\n메시지 수신에 실패했습니다. 정책 설정을 확인하세요.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n[오류] 테스트 실패:', error.message);
    console.error('\n확인 사항:');
    console.error('  1. 엔드포인트 URL이 올바른지 확인');
    console.error('  2. 인증서 파일 경로가 올바른지 확인');
    console.error('  3. 인증서가 활성화되어 있는지 확인');
    console.error('  4. IoT 정책이 인증서에 연결되어 있는지 확인');
    console.error('  5. 네트워크에서 포트 8883이 열려있는지 확인');
    process.exit(1);
  }
}

main();
```

#### 실행 방법

```bash
# 환경 변수를 사용하는 경우
AWS_IOT_ENDPOINT=xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com \
AWS_IOT_CLIENT_ID=smartfarm-cloud-server \
node test-iot-connection.js

# 또는 스크립트 내 설정값을 직접 수정 후 실행
node test-iot-connection.js
```

---

## 8. 새 농장 추가 절차

새 농장을 시스템에 추가할 때 아래 절차를 순서대로 진행합니다.

### 단계별 절차

```
┌─────────────────────────────────────────────────────┐
│  1. Thing 생성                                       │
│     └─ farm-{farmId} 이름으로 AWS IoT Thing 생성     │
│                    ▼                                 │
│  2. 인증서 생성                                      │
│     └─ 새 인증서 생성 및 다운로드                      │
│                    ▼                                 │
│  3. 정책 연결                                        │
│     └─ smartfarm-rpi-policy를 인증서에 연결           │
│                    ▼                                 │
│  4. 인증서를 Thing에 연결                             │
│     └─ 인증서를 farm-{farmId} Thing에 연결            │
│                    ▼                                 │
│  5. RPi에 인증서 배포                                 │
│     └─ /home/pi/certs/ 디렉토리에 파일 복사           │
│                    ▼                                 │
│  6. .env 설정                                        │
│     └─ RPi의 .env 파일에 AWS IoT 설정 작성            │
│                    ▼                                 │
│  7. 연결 확인                                        │
│     └─ 테스트 스크립트로 연결 상태 검증                │
└─────────────────────────────────────────────────────┘
```

### 상세 절차

#### Step 1: Thing 생성

```bash
FARM_ID="NewFarm01"

aws iot create-thing \
  --thing-name "farm-${FARM_ID}" \
  --region ap-northeast-2

aws iot add-thing-to-thing-group \
  --thing-group-name "smartfarm-rpis" \
  --thing-name "farm-${FARM_ID}" \
  --region ap-northeast-2
```

#### Step 2: 인증서 생성

```bash
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile "farm-${FARM_ID}-certificate.pem.crt" \
  --private-key-outfile "farm-${FARM_ID}-private.pem.key" \
  --public-key-outfile "farm-${FARM_ID}-public.pem.key" \
  --region ap-northeast-2

# 출력에서 certificateArn 값을 기록합니다.
# 예: arn:aws:iot:ap-northeast-2:123456789012:cert/abcdef1234567890

# 루트 CA 인증서 다운로드 (아직 없는 경우)
curl -o AmazonRootCA1.pem https://www.amazontrust.com/repository/AmazonRootCA1.pem
```

#### Step 3: 정책 연결

```bash
CERT_ARN="arn:aws:iot:ap-northeast-2:123456789012:cert/abcdef1234567890"

aws iot attach-policy \
  --policy-name "smartfarm-rpi-policy" \
  --target "${CERT_ARN}" \
  --region ap-northeast-2
```

#### Step 4: 인증서를 Thing에 연결

```bash
aws iot attach-thing-principal \
  --thing-name "farm-${FARM_ID}" \
  --principal "${CERT_ARN}" \
  --region ap-northeast-2
```

#### Step 5: RPi에 인증서 배포

```bash
# RPi에 SSH로 접속하여 디렉토리 생성
ssh pi@<RPi_IP> "mkdir -p /home/pi/certs && chmod 700 /home/pi/certs"

# 인증서 파일 전송
scp "farm-${FARM_ID}-certificate.pem.crt" pi@<RPi_IP>:/home/pi/certs/certificate.pem.crt
scp "farm-${FARM_ID}-private.pem.key" pi@<RPi_IP>:/home/pi/certs/private.pem.key
scp AmazonRootCA1.pem pi@<RPi_IP>:/home/pi/certs/AmazonRootCA1.pem

# 파일 권한 설정
ssh pi@<RPi_IP> "chmod 600 /home/pi/certs/*"
```

#### Step 6: .env 설정

RPi에 SSH로 접속하여 `.env` 파일을 생성합니다:

```bash
ssh pi@<RPi_IP>

# .env 파일 작성
cat > /home/pi/smart-farm-rpi/.env << EOF
AWS_IOT_ENDPOINT=xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com
AWS_IOT_PORT=8883
AWS_IOT_CLIENT_ID=farm-${FARM_ID}
AWS_IOT_CERT_PATH=/home/pi/certs/certificate.pem.crt
AWS_IOT_KEY_PATH=/home/pi/certs/private.pem.key
AWS_IOT_CA_PATH=/home/pi/certs/AmazonRootCA1.pem
AWS_IOT_REGION=ap-northeast-2
FARM_ID=${FARM_ID}
EOF
```

#### Step 7: 연결 확인

```bash
# RPi에서 연결 테스트 실행
ssh pi@<RPi_IP> "cd /home/pi/smart-farm-rpi && node test-iot-connection.js"

# 또는 AWS IoT 콘솔 MQTT 테스트 클라이언트에서 구독하여 확인
# 토픽: farm/NewFarm01/heartbeat
```

#### 새 농장 추가 체크리스트

- [ ] AWS IoT Thing 생성 완료 (`farm-{farmId}`)
- [ ] Thing을 `smartfarm-rpis` 그룹에 추가 완료
- [ ] 인증서 생성 및 다운로드 완료
- [ ] 인증서 활성화 완료
- [ ] `smartfarm-rpi-policy` 정책 연결 완료
- [ ] 인증서를 Thing에 연결 완료
- [ ] RPi에 인증서 파일 배포 완료
- [ ] RPi 인증서 파일 권한 설정 완료 (`chmod 600`)
- [ ] RPi `.env` 파일 설정 완료
- [ ] 연결 테스트 통과
- [ ] 사무실 서버에서 heartbeat 수신 확인

---

## 9. 보안 권장사항

### 9.1 인증서 파일 권한 설정

인증서 파일은 반드시 최소한의 권한만 부여합니다.

#### RPi (Linux)

```bash
# 디렉토리 권한: 소유자만 접근 가능
chmod 700 /home/pi/certs

# 파일 권한: 소유자만 읽기 가능
chmod 600 /home/pi/certs/certificate.pem.crt
chmod 600 /home/pi/certs/private.pem.key
chmod 600 /home/pi/certs/AmazonRootCA1.pem

# 소유자 확인
ls -la /home/pi/certs/
# 출력 예시:
# -rw------- 1 pi pi 1220 Feb 15 00:00 certificate.pem.crt
# -rw------- 1 pi pi 1679 Feb 15 00:00 private.pem.key
# -rw------- 1 pi pi 1188 Feb 15 00:00 AmazonRootCA1.pem
```

#### 사무실 서버 (Windows)

Windows에서는 파일 속성을 통해 접근 권한을 제한합니다:

```powershell
# PowerShell로 권한 설정
$certPath = "C:\control_smartfarm\certs"

# 상속 권한 제거 후 현재 사용자에게만 읽기 권한 부여
$acl = Get-Acl $certPath
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
  "FullControl",
  "ContainerInherit,ObjectInherit",
  "None",
  "Allow"
)
$acl.SetAccessRule($rule)
Set-Acl $certPath $acl
```

### 9.2 정책 최소 권한 원칙

- **RPi 정책**은 `${iot:Connection.Thing.ThingName}` 정책 변수를 사용하여 각 디바이스가 자신의 토픽에만 접근하도록 제한합니다. 이렇게 하면 하나의 RPi가 다른 농장의 데이터에 접근하는 것을 방지합니다.
- **사무실 서버 정책**은 와일드카드(`+`, `*`)를 사용하지만, 발행 가능한 토픽은 명령 관련 토픽으로만 제한합니다.
- 절대로 `"Resource": "*"` 또는 `"Action": "iot:*"`와 같은 과도한 권한을 부여하지 마십시오.

### 9.3 인증서 교체 주기

- **권장 교체 주기**: 12개월마다
- **교체 절차**:
  1. 새 인증서를 생성합니다.
  2. 새 인증서에 동일한 정책을 연결합니다.
  3. 새 인증서를 Thing에 연결합니다.
  4. 새 인증서를 디바이스에 배포합니다.
  5. 디바이스가 새 인증서로 정상 연결되는지 확인합니다.
  6. 이전 인증서를 비활성화합니다.
  7. 일정 기간(예: 7일) 관찰 후 이전 인증서를 삭제합니다.

```bash
# 인증서 비활성화
aws iot update-certificate \
  --certificate-id "이전인증서ID" \
  --new-status INACTIVE \
  --region ap-northeast-2

# 인증서 삭제 (비활성화 후에만 가능)
# 먼저 Thing과 정책 연결을 해제해야 합니다
aws iot detach-thing-principal \
  --thing-name "farm-MyFarm01" \
  --principal "arn:aws:iot:ap-northeast-2:123456789012:cert/이전인증서ID" \
  --region ap-northeast-2

aws iot detach-policy \
  --policy-name "smartfarm-rpi-policy" \
  --target "arn:aws:iot:ap-northeast-2:123456789012:cert/이전인증서ID" \
  --region ap-northeast-2

aws iot delete-certificate \
  --certificate-id "이전인증서ID" \
  --region ap-northeast-2
```

### 9.4 IoT Core 로깅 활성화

CloudWatch 로그를 활성화하여 연결, 인증, 메시지 전달 관련 이벤트를 기록합니다.

#### Console에서 설정

1. AWS IoT 콘솔 → **설정** → **로그** 섹션으로 이동합니다.
2. **로그 편집**을 클릭합니다.
3. 로그 수준: **INFO** (운영 환경에서는 **ERROR**로 변경 권장)
4. IAM 역할: `AWSIoTLogsRole`을 생성하거나 선택합니다.
5. **업데이트**를 클릭합니다.

#### AWS CLI로 설정

```bash
# IAM 역할 생성 (이미 있는 경우 생략)
aws iam create-role \
  --role-name "AWSIoTLogsRole" \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "iot.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name "AWSIoTLogsRole" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSIoTLogging"

# IoT 로깅 활성화
aws iot set-v2-logging-options \
  --role-arn "arn:aws:iam::123456789012:role/AWSIoTLogsRole" \
  --default-log-level INFO \
  --region ap-northeast-2
```

### 9.5 추가 보안 권장사항

| 항목 | 권장사항 |
|------|----------|
| `.gitignore` | 인증서 디렉토리(`certs/`)를 반드시 `.gitignore`에 추가 |
| `.env` 파일 | `.env` 파일도 `.gitignore`에 추가하여 Git 저장소에 포함되지 않도록 설정 |
| 네트워크 | 방화벽에서 포트 8883(MQTT over TLS)만 허용 |
| 모니터링 | CloudWatch 경보를 설정하여 비정상 연결 시도를 감지 |
| 인증서 보관 | 프라이빗 키는 절대로 이메일, 메신저, 공유 드라이브로 전송하지 않음 |
| 접근 제어 | AWS IAM 사용자/역할에 IoT 관리 권한을 최소한으로 부여 |

---

## 10. 비용 예측

### 10.1 메시지 발생량 산정 (1,000개 농장 기준)

#### 상시 메시지

| 메시지 유형 | 계산 | 일일 메시지 수 |
|------------|------|---------------|
| Heartbeat | 1,000 farms x 1 msg/60s x 86,400s/day | ~1,440,000 |
| Daily Summary | 1,000 farms x 1 msg/day | 1,000 |
| Alarm (추정) | ~100 msg/day (평균) | ~100 |

#### On-demand 메시지 (추정)

| 메시지 유형 | 계산 | 일일 메시지 수 |
|------------|------|---------------|
| Telemetry (요청 시) | 50 farms x 1 msg/3s x 평균 활성 시간 | ~1,440,000 |
| Status (요청 시) | 간헐적 | ~10,000 |
| Command | 간헐적 | ~5,000 |
| Command ACK | 간헐적 | ~5,000 |

> **참고**: Telemetry의 on-demand 메시지는 동시에 약 50개 농장이 모니터링되고 있다고 가정하여 산정했습니다. 실제로는 사무실에서 확인 중인 농장 수에 따라 크게 달라집니다.

#### 총 메시지량

| 항목 | 수치 |
|------|------|
| 일일 총 메시지 | ~3,000,000 (약 300만) |
| 월간 총 메시지 | ~90,000,000 (약 9,000만) |

### 10.2 AWS IoT Core 비용 산정

AWS IoT Core 메시지 요금 (ap-northeast-2 리전, 2026년 기준 참고):

| 구간 | 단가 (100만 메시지당) |
|------|----------------------|
| 최초 2억 5천만 메시지/월 | $1.00 |
| 다음 50억 메시지/월 | $0.80 |
| 50억 초과 | $0.70 |

> **참고**: 메시지 크기는 5KB 단위로 과금됩니다. 5KB를 초과하는 메시지는 추가 메시지로 계산됩니다.

#### 월간 비용 산정

```
월간 메시지: ~90,000,000 (9,000만)
적용 구간: 최초 2억 5천만 메시지 구간 ($1.00 / 100만 메시지)

비용 = 90 x $1.00 = $90/월
```

#### 연간 비용 예측

| 항목 | 비용 |
|------|------|
| 메시지 비용 | ~$90/월 |
| 연결 비용 (항시 연결) | ~$3.07/월 (1,001개 디바이스 x $0.08/백만 연결분) |
| **월간 총 비용** | **~$93/월** |
| **연간 총 비용** | **~$1,116/년** |

### 10.3 비용 절감 팁

- **Heartbeat 간격 조절**: 60초에서 120초로 변경하면 heartbeat 메시지가 절반으로 감소합니다.
- **Telemetry 최적화**: 불필요한 모니터링 요청을 줄여 on-demand 메시지를 절감합니다.
- **메시지 크기 최적화**: 메시지 페이로드를 5KB 이내로 유지하여 추가 메시지 과금을 방지합니다.
- **AWS IoT Core 규칙**: 필요한 경우 IoT Core Rule을 사용하여 데이터를 직접 DynamoDB나 S3에 저장하면 별도의 서버 비용을 절감할 수 있습니다.

---

## 11. 트러블슈팅

### 11.1 연결 실패 시 확인사항

#### 일반적인 연결 오류와 해결 방법

| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| `ECONNREFUSED` | 엔드포인트 URL 또는 포트 오류 | 엔드포인트 URL과 포트(8883)를 확인하세요 |
| `ENOTFOUND` | DNS 해석 실패 | 네트워크 연결 및 엔드포인트 URL을 확인하세요 |
| `ETIMEDOUT` | 네트워크 타임아웃 | 방화벽에서 포트 8883이 열려있는지 확인하세요 |
| `TLS handshake failed` | 인증서 오류 | 인증서 파일 경로, 유효기간, 활성화 상태를 확인하세요 |
| `Connection refused: Not authorized` | 정책 권한 부족 | Client ID가 정책에서 허용하는 값과 일치하는지 확인하세요 |

#### 체크리스트

```
[ ] 엔드포인트 URL이 올바른가?
    → aws iot describe-endpoint --endpoint-type iot:Data-ATS --region ap-northeast-2

[ ] 인증서 파일 경로가 올바른가?
    → 인증서, 프라이빗 키, 루트 CA 파일이 모두 존재하는지 확인

[ ] 인증서가 활성화 상태인가?
    → AWS IoT 콘솔 → 보안 → 인증서에서 "활성" 상태 확인

[ ] 인증서에 정책이 연결되어 있는가?
    → 인증서 상세 페이지 → 정책 탭 확인

[ ] 인증서에 Thing이 연결되어 있는가?
    → 인증서 상세 페이지 → 사물 탭 확인

[ ] Client ID가 정책에서 허용하는 값과 일치하는가?
    → 서버: smartfarm-cloud-server
    → RPi: farm-{farmId} (Thing 이름과 일치)

[ ] 네트워크에서 포트 8883이 열려있는가?
    → telnet 또는 openssl로 확인
```

### 11.2 인증서 만료 확인

```bash
# 인증서 만료일 확인 (openssl 사용)
openssl x509 -in /home/pi/certs/certificate.pem.crt -noout -enddate
# 출력 예시: notAfter=Feb 15 00:00:00 2027 GMT

# AWS CLI로 인증서 상태 확인
aws iot describe-certificate \
  --certificate-id "인증서ID" \
  --region ap-northeast-2 \
  --query 'certificateDescription.{status:status,creationDate:creationDate,validity:validity}'
```

### 11.3 정책 권한 확인

#### 현재 정책 내용 확인

```bash
# 정책 내용 조회
aws iot get-policy \
  --policy-name "smartfarm-rpi-policy" \
  --region ap-northeast-2

# 인증서에 연결된 정책 목록 조회
aws iot list-attached-policies \
  --target "arn:aws:iot:ap-northeast-2:123456789012:cert/인증서ID" \
  --region ap-northeast-2

# Thing에 연결된 인증서(Principal) 목록 조회
aws iot list-thing-principals \
  --thing-name "farm-MyFarm01" \
  --region ap-northeast-2
```

#### 자주 발생하는 정책 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 연결은 되지만 구독이 안됨 | Subscribe 권한 부족 | 정책에 `iot:Subscribe` 액션과 `topicfilter/` 리소스가 있는지 확인 |
| 구독은 되지만 메시지 수신이 안됨 | Receive 권한 부족 | 정책에 `iot:Receive` 액션과 `topic/` 리소스가 있는지 확인 |
| 발행이 안됨 | Publish 권한 부족 | 정책에 `iot:Publish` 액션과 해당 `topic/` 리소스가 있는지 확인 |
| 연결이 즉시 끊어짐 | Connect 권한의 Client ID 불일치 | 정책의 `iot:Connect` 리소스에서 Client ID 패턴을 확인 |

> **참고**: `iot:Subscribe`의 리소스는 `topicfilter/`로 시작하고, `iot:Receive`와 `iot:Publish`의 리소스는 `topic/`으로 시작합니다. 이 차이를 주의하십시오.

### 11.4 CloudWatch 로그 확인

IoT Core 로깅이 활성화되어 있다면 CloudWatch에서 상세 로그를 확인할 수 있습니다.

#### Console에서 확인

1. AWS CloudWatch 콘솔 → **로그 그룹** → `AWSIotLogsV2`를 선택합니다.
2. 로그 스트림에서 시간대별로 로그를 확인합니다.
3. 필터 패턴을 사용하여 특정 디바이스의 로그를 검색합니다:
   - 특정 Client ID: `{ $.clientId = "farm-MyFarm01" }`
   - 오류만 확인: `{ $.logLevel = "ERROR" }`
   - 연결 이벤트: `{ $.eventType = "Connect" }`

#### AWS CLI로 확인

```bash
# 최근 로그 조회
aws logs filter-log-events \
  --log-group-name "AWSIotLogsV2" \
  --filter-pattern '{ $.clientId = "farm-MyFarm01" }' \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region ap-northeast-2

# 연결 실패 로그만 조회
aws logs filter-log-events \
  --log-group-name "AWSIotLogsV2" \
  --filter-pattern '{ $.logLevel = "ERROR" && $.eventType = "Connect" }' \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region ap-northeast-2
```

### 11.5 네트워크 연결 테스트

```bash
# 포트 8883 연결 테스트 (openssl)
openssl s_client -connect xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com:8883 \
  -CAfile /home/pi/certs/AmazonRootCA1.pem \
  -cert /home/pi/certs/certificate.pem.crt \
  -key /home/pi/certs/private.pem.key

# TLS 연결이 성공하면 다음과 같은 출력이 나타납니다:
# SSL-Session:
#     Protocol  : TLSv1.2
#     ...
#     Verify return code: 0 (ok)

# 포트 연결 확인 (curl)
curl -v --tlsv1.2 \
  --cacert /home/pi/certs/AmazonRootCA1.pem \
  --cert /home/pi/certs/certificate.pem.crt \
  --key /home/pi/certs/private.pem.key \
  https://xxxxxxxxxxxxxx-ats.iot.ap-northeast-2.amazonaws.com:8443/mqtt
```

### 11.6 자주 묻는 질문 (FAQ)

**Q: RPi가 재부팅 후 자동으로 다시 연결되나요?**
A: 애플리케이션 코드에서 자동 재연결 로직을 구현해야 합니다. `aws-iot-device-sdk-v2`는 기본적으로 자동 재연결을 지원합니다.

**Q: 하나의 인증서를 여러 RPi에서 사용할 수 있나요?**
A: 기술적으로는 가능하지만 보안상 권장하지 않습니다. 각 RPi마다 별도의 인증서를 생성하십시오. 정책 변수(`${iot:Connection.Thing.ThingName}`)를 사용한 접근 제어를 위해서도 개별 인증서가 필요합니다.

**Q: 인증서를 분실했으면 어떻게 하나요?**
A: 프라이빗 키는 재다운로드할 수 없습니다. 새 인증서를 생성하고, 이전 인증서를 비활성화한 후 삭제해야 합니다.

**Q: 동시에 같은 Client ID로 두 개의 연결을 시도하면 어떻게 되나요?**
A: AWS IoT Core는 동일한 Client ID로 새 연결이 들어오면 기존 연결을 끊습니다. Client ID가 중복되지 않도록 관리하십시오.

**Q: 메시지가 발행되지만 구독자가 수신하지 못하는 경우?**
A: 다음을 순서대로 확인하십시오:
1. 구독자의 토픽 필터가 발행자의 토픽과 일치하는지 확인
2. 구독자의 정책에 `iot:Subscribe`와 `iot:Receive` 권한이 모두 있는지 확인
3. CloudWatch 로그에서 해당 시간대의 오류를 확인

---

## 부록: 주요 AWS CLI 명령어 요약

```bash
# === Thing 관리 ===
aws iot create-thing --thing-name "farm-MyFarm01" --region ap-northeast-2
aws iot describe-thing --thing-name "farm-MyFarm01" --region ap-northeast-2
aws iot list-things --region ap-northeast-2
aws iot delete-thing --thing-name "farm-MyFarm01" --region ap-northeast-2

# === Thing Group 관리 ===
aws iot create-thing-group --thing-group-name "smartfarm-rpis" --region ap-northeast-2
aws iot add-thing-to-thing-group --thing-group-name "smartfarm-rpis" --thing-name "farm-MyFarm01" --region ap-northeast-2
aws iot list-things-in-thing-group --thing-group-name "smartfarm-rpis" --region ap-northeast-2

# === 인증서 관리 ===
aws iot create-keys-and-certificate --set-as-active --region ap-northeast-2
aws iot list-certificates --region ap-northeast-2
aws iot describe-certificate --certificate-id "ID" --region ap-northeast-2
aws iot update-certificate --certificate-id "ID" --new-status INACTIVE --region ap-northeast-2

# === 정책 관리 ===
aws iot create-policy --policy-name "이름" --policy-document file://policy.json --region ap-northeast-2
aws iot get-policy --policy-name "이름" --region ap-northeast-2
aws iot list-policies --region ap-northeast-2

# === 연결 관리 ===
aws iot attach-thing-principal --thing-name "farm-MyFarm01" --principal "인증서ARN" --region ap-northeast-2
aws iot attach-policy --policy-name "smartfarm-rpi-policy" --target "인증서ARN" --region ap-northeast-2

# === 엔드포인트 ===
aws iot describe-endpoint --endpoint-type iot:Data-ATS --region ap-northeast-2
```
