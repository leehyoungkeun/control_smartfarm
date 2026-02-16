/**
 * 시스템 현황 페이지 (관리자)
 * 통계 카드 + 최근 경보 + 오프라인 농장
 */
import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { adminApi } from '../../api/admin';
import { ALARM_TYPE_LABELS } from '../../utils/constants';
import PageWrapper, { PageHeader, PageContent } from '../../components/layout/PageWrapper';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';

const SystemOverview = () => {
  const [overview, setOverview] = useState(null);
  const [recentAlarms, setRecentAlarms] = useState([]);
  const [offlineFarms, setOfflineFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ov, alarms, offline] = await Promise.all([
        adminApi.overview(),
        adminApi.recentAlarms(),
        adminApi.offlineFarms(),
      ]);
      setOverview(ov);
      setRecentAlarms(Array.isArray(alarms) ? alarms.slice(0, 10) : []);
      setOfflineFarms(Array.isArray(offline) ? offline : []);
    } catch (err) {
      toast.error('시스템 현황을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) return (
    <PageWrapper>
      <PageSpinner message="시스템 현황 로딩 중..." />
    </PageWrapper>
  );

  const stats = [
    { label: '전체 농장', value: overview?.totalFarms ?? 0, icon: Activity, color: 'text-primary-600 bg-primary-50' },
    { label: '온라인', value: overview?.onlineFarms ?? 0, icon: Wifi, color: 'text-success-600 bg-success-50' },
    { label: '오프라인', value: (overview?.totalFarms ?? 0) - (overview?.onlineFarms ?? 0), icon: WifiOff, color: 'text-gray-600 bg-gray-100' },
    { label: '전체 사용자', value: overview?.totalUsers ?? 0, icon: Users, color: 'text-primary-600 bg-primary-50' },
    { label: '미해결 경보', value: overview?.activeAlarms ?? 0, icon: AlertTriangle, color: overview?.activeAlarms > 0 ? 'text-danger-600 bg-danger-50' : 'text-gray-600 bg-gray-100' },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="시스템 현황"
        subtitle="전체 농장 모니터링"
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchData}>
            새로고침
          </Button>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 최근 경보 */}
            <Card>
              <CardHeader title="최근 경보" subtitle="전체 농장 최근 경보 10건" />
              {recentAlarms.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">경보 없음</p>
              ) : (
                <div className="space-y-2">
                  {recentAlarms.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={a.resolved_at ? 'success' : 'danger'} size="sm">
                          {ALARM_TYPE_LABELS[a.alarm_type] || a.alarm_type}
                        </Badge>
                        <span className="text-xs text-gray-500 truncate">
                          {a.Farm?.name || '알 수 없음'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {formatTime(a.occurred_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 오프라인 농장 */}
            <Card>
              <CardHeader title="오프라인 농장" subtitle="5분 이상 응답 없는 농장" />
              {offlineFarms.length === 0 ? (
                <p className="text-sm text-success-600 text-center py-8">모든 농장 온라인</p>
              ) : (
                <div className="space-y-2">
                  {offlineFarms.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <WifiOff className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{f.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        마지막: {formatTime(f.last_online_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContent>
    </PageWrapper>
  );
};

export default SystemOverview;
