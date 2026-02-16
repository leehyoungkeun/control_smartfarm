/**
 * 농장 관리 페이지 (관리자)
 * 농장 목록 + 상태 관리
 */
import { useState, useEffect } from 'react';
import { Tractor, Plus, Pencil, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

import { farmsApi } from '../../api/farms';
import { FARM_STATUS_LABELS } from '../../utils/constants';
import PageWrapper, { PageHeader, PageContent } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';

const STATUS_OPTIONS = [
  { value: 'active', label: '운영 중' },
  { value: 'inactive', label: '비활성' },
  { value: 'maintenance', label: '점검 중' },
];

const STATUS_BADGE = {
  active: 'success',
  inactive: 'default',
  maintenance: 'warning',
};

const emptyForm = { name: '', location: '', aws_thing_name: '', mqtt_topic_prefix: '', status: 'active' };

const FarmManagement = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFarm, setEditFarm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      const data = await farmsApi.list();
      setFarms(Array.isArray(data) ? data : []);
    } catch {
      toast.error('농장 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFarms(); }, []);

  const openCreate = () => {
    setEditFarm(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (farm) => {
    setEditFarm(farm);
    setForm({
      name: farm.name || '',
      location: farm.location || '',
      aws_thing_name: farm.aws_thing_name || '',
      mqtt_topic_prefix: farm.mqtt_topic_prefix || '',
      status: farm.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('농장 이름은 필수입니다.');
      return;
    }
    try {
      setSaving(true);
      if (editFarm) {
        await farmsApi.update(editFarm.id, form);
        toast.success('농장이 수정되었습니다.');
      } else {
        if (!form.aws_thing_name || !form.mqtt_topic_prefix) {
          toast.error('AWS Thing Name과 MQTT 토픽 프리픽스는 필수입니다.');
          setSaving(false);
          return;
        }
        await farmsApi.create(form);
        toast.success('농장이 등록되었습니다.');
      }
      setModalOpen(false);
      fetchFarms();
    } catch (err) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isOnline = (farm) => {
    if (!farm.last_online_at) return false;
    return (Date.now() - new Date(farm.last_online_at).getTime()) < 5 * 60 * 1000;
  };

  return (
    <PageWrapper>
      <PageHeader
        title="농장 관리"
        subtitle="농장 등록/수정"
        actions={
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            농장 등록
          </Button>
        }
      />
      <PageContent>
        {loading ? (
          <PageSpinner message="농장 로딩 중..." />
        ) : farms.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Tractor className="w-8 h-8 mb-2" />
              <p className="text-sm">등록된 농장이 없습니다</p>
            </div>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>연결</Th>
                    <Th>이름</Th>
                    <Th>위치</Th>
                    <Th>상태</Th>
                    <Th>Thing Name</Th>
                    <Th>마지막 접속</Th>
                    <Th>작업</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {farms.map((f) => {
                    const online = isOnline(f);
                    return (
                      <Tr key={f.id}>
                        <Td>
                          {online ? (
                            <Wifi className="w-4 h-4 text-success-600" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Td>
                        <Td className="font-medium text-sm">{f.name}</Td>
                        <Td className="text-sm text-gray-600">{f.location || '-'}</Td>
                        <Td>
                          <Badge variant={STATUS_BADGE[f.status] || 'default'}>
                            {FARM_STATUS_LABELS[f.status] || f.status}
                          </Badge>
                        </Td>
                        <Td className="text-xs text-gray-500 font-mono">{f.aws_thing_name}</Td>
                        <Td className="text-xs text-gray-500">{formatTime(f.last_online_at)}</Td>
                        <Td>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </Card>
        )}

        {/* 생성/수정 모달 */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editFarm ? '농장 수정' : '농장 등록'}
        >
          <div className="space-y-4">
            <Input
              label="농장 이름"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="위치"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <Input
              label="AWS Thing Name"
              value={form.aws_thing_name}
              onChange={(e) => setForm((f) => ({ ...f, aws_thing_name: e.target.value }))}
              disabled={!!editFarm}
              hint={editFarm ? 'Thing Name은 변경할 수 없습니다' : ''}
            />
            <Input
              label="MQTT 토픽 프리픽스"
              value={form.mqtt_topic_prefix}
              onChange={(e) => setForm((f) => ({ ...f, mqtt_topic_prefix: e.target.value }))}
              disabled={!!editFarm}
            />
            <Select
              label="상태"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            />
          </div>
          <ModalFooter>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>취소</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              {editFarm ? '수정' : '등록'}
            </Button>
          </ModalFooter>
        </Modal>
      </PageContent>
    </PageWrapper>
  );
};

export default FarmManagement;
