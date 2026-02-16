/**
 * 사용자 관리 페이지 (관리자)
 * 사용자 목록 + 생성/수정/비활성화
 */
import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { adminApi } from '../../api/admin';
import { ROLE_LABELS } from '../../utils/constants';
import PageWrapper, { PageHeader, PageContent } from '../../components/layout/PageWrapper';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table';
import { PageSpinner } from '../../components/ui/Spinner';

const ROLE_OPTIONS = [
  { value: 'admin', label: '관리자' },
  { value: 'operator', label: '운영자' },
  { value: 'viewer', label: '뷰어' },
];

const ROLE_BADGE = {
  superadmin: 'primary',
  admin: 'primary',
  operator: 'success',
  viewer: 'default',
};

const emptyForm = { username: '', email: '', role: 'operator', phone: '', password: '' };

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.users.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('사용자 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'operator',
      phone: user.phone || '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.email) {
      toast.error('이름과 이메일은 필수입니다.');
      return;
    }
    try {
      setSaving(true);
      if (editUser) {
        const payload = { username: form.username, email: form.email, role: form.role, phone: form.phone };
        await adminApi.users.update(editUser.id, payload);
        toast.success('사용자가 수정되었습니다.');
      } else {
        if (!form.password) {
          toast.error('비밀번호를 입력하세요.');
          setSaving(false);
          return;
        }
        await adminApi.users.create(form);
        toast.success('사용자가 생성되었습니다.');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await adminApi.users.delete(deleteConfirm.id);
      toast.success('사용자가 비활성화되었습니다.');
      setDeleteConfirm(null);
      fetchUsers();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="사용자 관리"
        subtitle="조직 내 사용자 관리"
        actions={
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            사용자 추가
          </Button>
        }
      />
      <PageContent>
        {loading ? (
          <PageSpinner message="사용자 로딩 중..." />
        ) : users.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">사용자가 없습니다</p>
            </div>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>이름</Th>
                    <Th>이메일</Th>
                    <Th>역할</Th>
                    <Th>농장 수</Th>
                    <Th>상태</Th>
                    <Th>작업</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((u) => (
                    <Tr key={u.id}>
                      <Td className="font-medium text-sm">{u.username}</Td>
                      <Td className="text-sm text-gray-600">{u.email}</Td>
                      <Td>
                        <Badge variant={ROLE_BADGE[u.role] || 'default'}>
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </Td>
                      <Td className="text-sm">{u.farmCount ?? 0}</Td>
                      <Td>
                        <Badge variant={u.is_active !== false ? 'success' : 'default'}>
                          {u.is_active !== false ? '활성' : '비활성'}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(u)}>
                            <Trash2 className="w-3.5 h-3.5 text-danger-600" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </Card>
        )}

        {/* 생성/수정 모달 */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editUser ? '사용자 수정' : '사용자 추가'}
        >
          <div className="space-y-4">
            <Input
              label="이름"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            <Input
              label="이메일"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Select
              label="역할"
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
            <Input
              label="전화번호"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            {!editUser && (
              <Input
                label="비밀번호"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            )}
          </div>
          <ModalFooter>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>취소</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              {editUser ? '수정' : '생성'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* 삭제 확인 모달 */}
        <Modal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="사용자 비활성화"
          size="sm"
        >
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{deleteConfirm?.username}</span> 사용자를 비활성화하시겠습니까?
          </p>
          <ModalFooter>
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>취소</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>비활성화</Button>
          </ModalFooter>
        </Modal>
      </PageContent>
    </PageWrapper>
  );
};

export default UserManagement;
