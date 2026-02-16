/**
 * 경보 센터 (관리자)
 * 전체 농장 최근 경보 목록 + 자동 새로고침
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { adminApi } from '../../api/admin';
import { ALARM_TYPE_LABELS } from '../../utils/constants';
import PageWrapper, { PageHeader, PageContent } from '../../components/layout/PageWrapper';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';

const SEVERITY_MAP = {
  EMERGENCY_STOP: 'danger',
  EC_HIGH: 'warning', EC_LOW: 'warning',
  PH_HIGH: 'warning', PH_LOW: 'warning',
  TEMP_HIGH: 'danger', TEMP_LOW: 'danger',
  FLOW_ERROR: 'danger', OFFLINE: 'default',
};

const AlarmCenter = () => {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.recentAlarms();
      setAlarms(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('경보 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <PageWrapper>
      <PageHeader
        title="경보 센터"
        subtitle="전체 농장 경보 모니터링"
        actions={
          <div className="flex items-center gap-3">
            <Toggle checked={autoRefresh} onChange={setAutoRefresh} label="자동갱신" size="sm" />
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchData}>
              새로고침
            </Button>
          </div>
        }
      />
      <PageContent>
        {loading && alarms.length === 0 ? (
          <PageSpinner message="경보 로딩 중..." />
        ) : alarms.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Bell className="w-10 h-10 mb-3" />
              <p className="text-sm">경보 이력이 없습니다</p>
            </div>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>농장</Th>
                    <Th>유형</Th>
                    <Th>메시지</Th>
                    <Th>값 / 임계</Th>
                    <Th>발생시각</Th>
                    <Th>상태</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {alarms.map((a) => {
                    const isActive = !a.resolved_at;
                    return (
                      <Tr key={a.id} highlight={isActive}>
                        <Td className="font-medium text-sm">{a.Farm?.name || '-'}</Td>
                        <Td>
                          <Badge variant={SEVERITY_MAP[a.alarm_type] || 'default'}>
                            {ALARM_TYPE_LABELS[a.alarm_type] || a.alarm_type}
                          </Badge>
                        </Td>
                        <Td className="text-sm text-gray-700">{a.message || '-'}</Td>
                        <Td className="text-sm">
                          {a.alarm_value != null ? (
                            <>
                              {a.alarm_value}
                              {a.threshold_value != null && (
                                <span className="text-gray-400"> / {a.threshold_value}</span>
                              )}
                            </>
                          ) : '-'}
                        </Td>
                        <Td className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(a.occurred_at)}
                        </Td>
                        <Td>
                          {isActive ? (
                            <Badge variant="danger">미해결</Badge>
                          ) : (
                            <span className="text-xs text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {formatTime(a.resolved_at)}
                            </span>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </Card>
        )}
      </PageContent>
    </PageWrapper>
  );
};

export default AlarmCenter;
