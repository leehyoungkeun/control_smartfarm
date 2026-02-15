/**
 * 경보 알림 서비스
 * 경보 발생 시 이메일 알림 발송
 */
const nodemailer = require('nodemailer');
const { NotificationSetting, User } = require('../models');
const { setNotifierService } = require('./mqttBridgeService');

// 이메일 전송기 인스턴스
let transporter = null;

/**
 * 이메일 전송 설정 초기화
 * SMTP 환경 변수가 설정되어 있으면 전송기 생성
 */
function initNotifier() {
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('이메일 알림 서비스 초기화 완료');
    } else {
      console.warn('SMTP 설정 없음 — 이메일 알림 비활성화');
    }

    // mqttBridgeService에 알림 서비스 등록
    setNotifierService({ sendAlarmNotification });
  } catch (error) {
    console.error('이메일 알림 서비스 초기화 오류:', error);
  }
}

/**
 * 경보 이메일 발송
 * 해당 농장에 알림 설정이 있는 사용자들에게 이메일 전송
 * @param {object} farm - 농장 객체 (id, name 포함)
 * @param {object} alarmData - { alarmType, alarmValue, thresholdValue, message }
 */
async function sendAlarmNotification(farm, alarmData) {
  // SMTP 전송기가 없으면 종료
  if (!transporter) return;

  try {
    // 해당 농장에 대한 활성 알림 설정이 있는 사용자 조회
    const settings = await NotificationSetting.findAll({
      where: { farm_id: farm.id, is_active: true },
      include: [{ model: User, attributes: ['email', 'username', 'receive_alarm_email'] }],
    });

    for (const setting of settings) {
      // 알림 유형 필터 — 해당 경보 유형이 설정에 포함되어 있는지 확인
      if (!setting.alarm_types.includes(alarmData.alarmType)) continue;
      // 이메일 채널 확인 — 알림 채널에 이메일이 포함되어 있는지 확인
      if (!setting.channels.includes('email')) continue;
      // 사용자의 이메일 수신 설정 확인
      if (!setting.User?.receive_alarm_email) continue;
      // 조용한 시간대 확인 — 설정된 시간대면 이메일 발송 건너뛰기
      if (isQuietHours(setting.quiet_hours_start, setting.quiet_hours_end)) continue;

      // 이메일 발송
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: setting.User.email,
          subject: `[스마트팜 경보] ${farm.name} - ${alarmData.alarmType}`,
          html: buildAlarmEmail(farm, alarmData),
        });
      } catch (mailError) {
        console.error(`이메일 발송 실패 (${setting.User.email}):`, mailError);
      }
    }
  } catch (error) {
    console.error('경보 이메일 발송 오류:', error);
  }
}

/**
 * 조용한 시간 확인
 * 현재 시각이 조용한 시간대에 해당하는지 판단
 * @param {string|null} start - 시작 시각 (HH:MM 형식)
 * @param {string|null} end - 종료 시각 (HH:MM 형식)
 * @returns {boolean} 조용한 시간대 여부
 */
function isQuietHours(start, end) {
  try {
    if (!start || !end) return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentTime >= start && currentTime <= end;
  } catch (error) {
    console.error('조용한 시간 확인 오류:', error);
    return false;
  }
}

/**
 * 경보 이메일 HTML 생성
 * @param {object} farm - 농장 객체
 * @param {object} data - 경보 데이터 { alarmType, alarmValue, thresholdValue, message }
 * @returns {string} HTML 문자열
 */
function buildAlarmEmail(farm, data) {
  return `
    <div style="font-family: 'Noto Sans KR', sans-serif; padding: 20px;">
      <h2 style="color: #E74C3C;">스마트팜 경보 알림</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>농장</b></td><td style="padding: 8px; border: 1px solid #ddd;">${farm.name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>경보 유형</b></td><td style="padding: 8px; border: 1px solid #ddd;">${data.alarmType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>측정값</b></td><td style="padding: 8px; border: 1px solid #ddd;">${data.alarmValue}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>임계값</b></td><td style="padding: 8px; border: 1px solid #ddd;">${data.thresholdValue}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>메시지</b></td><td style="padding: 8px; border: 1px solid #ddd;">${data.message || '-'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>발생 시각</b></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString('ko-KR')}</td></tr>
      </table>
    </div>
  `;
}

// 모듈 로드 시 자동 초기화
initNotifier();

module.exports = { sendAlarmNotification, initNotifier };
