/**
 * 제어 로그 페이지 (관리자)
 * 농장별 제어 이력 조회 + 페이지네이션
 */
import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { adminApi } from '../../api/admin';
import { farmsApi } from '../../api/farms';
import PageWrapper, { PageHeader, PageContent } from '../../components/layout/PageWrapper';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';

const ControlLogs = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 농장 목록 로드
  useEffect(() => {
    farmsApi.list().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setFarms(list);
      if (list.length > 0) setSelectedFarmId(list[0].id);
    }).catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!selectedFarmId) return;
    try {
      setLoading(true);
      const data = await adminApi.controlLogs(selectedFarmId, { page, limit: 20 });
      if (data?.logs) {
        setLogs(data.logs);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setLogs(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }
    } catch (err) {
      toast.error('제어 로그를 불러올 수 없습니다.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFarmId, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const farmOptions = farms.map((f) => ({ value: f.id, label: f.name }));

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
        title="제어 로그"
        subtitle="원격/자동 제어 이력"
        actions={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchLogs}>
            새로고침
          </Button>
        }
      />
      <PageContent>
        <div className="space-y-4">
          {/* 농장 선택 */}
          <Card>
            <div className="flex items-center gap-3">
              <Select
                label="농장 선택"
                options={farmOptions}
                value={selectedFarmId}
                onChange={(e) => { setSelectedFarmId(e.target.value); setPage(1); }}
                className="w-64"
              />
            </div>
          </Card>

          {loading ? (
            <PageSpinner message="로그 로딩 중..." />
          ) : logs.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <FileText className="w-8 h-8 mb-2" />
                <p className="text-sm">제어 로그가 없습니다</p>
              </div>
            </Card>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>시각</Th>
                      <Th>명령 유형</Th>
                      <Th>상세</Th>
                      <Th>소스</Th>
                      <Th>사용자</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {logs.map((log) => (
                      <Tr key={log.id}>
                        <Td className="text-xs text-gray-600 whitespace-nowrap">
                          {formatTime(log.executed_at)}
                        </Td>
                        <Td className="text-sm font-medium">{log.command_type}</Td>
                        <Td className="text-xs text-gray-600 max-w-xs truncate">
                          {log.command_detail ? JSON.stringify(log.command_detail) : '-'}
                        </Td>
                        <Td className="text-xs">{log.source || '-'}</Td>
                        <Td className="text-sm">{log.User?.username || '-'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </Card>
          )}
        </div>
      </PageContent>
    </PageWrapper>
  );
};

export default ControlLogs;
