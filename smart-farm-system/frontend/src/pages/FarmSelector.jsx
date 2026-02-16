/**
 * 농장 선택 페이지
 * 원격 모드에서 접근 가능한 농장 목록 표시
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Wifi, WifiOff, Building2 } from 'lucide-react';
import { Badge, PageSpinner } from '../components/ui';
import PageWrapper, { PageHeader, PageContent } from '../components/layout/PageWrapper';
import { farmsApi } from '../api/farms';
import { formatDateTime } from '../utils/helpers';

const FarmSelector = () => {
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const data = await farmsApi.list();
        setFarms(data || []);
      } catch (err) {
        setError('농장 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchFarms();
  }, []);

  if (loading) {
    return (
      <PageWrapper>
        <PageSpinner message="농장 목록을 불러오는 중..." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="내 농장"
        subtitle={`총 ${farms.length}개 농장`}
      />
      <PageContent>
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-danger-50 border border-danger-200 text-sm text-danger-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onClick={() => navigate(`/farm/${farm.id}`)}
            />
          ))}
        </div>

        {farms.length === 0 && !error && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">접근 가능한 농장이 없습니다.</p>
          </div>
        )}
      </PageContent>
    </PageWrapper>
  );
};

/** 농장 카드 */
const FarmCard = ({ farm, onClick }) => {
  const isOnline = farm.status === 'active';
  const statusVariant = isOnline ? 'success' : farm.status === 'maintenance' ? 'warning' : 'gray';
  const statusLabel = isOnline ? '온라인' : farm.status === 'maintenance' ? '점검 중' : '오프라인';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-primary-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-success-50 rounded-lg flex items-center justify-center group-hover:bg-primary-50 transition-colors">
            <Building2 className="w-5 h-5 text-success-600 group-hover:text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{farm.name}</h3>
        </div>
        <Badge variant={statusVariant} size="sm" dot>
          {statusLabel}
        </Badge>
      </div>

      {farm.location && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <MapPin className="w-3.5 h-3.5" />
          <span>{farm.location}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        <span>마지막 연결: {formatDateTime(farm.last_connection) || '-'}</span>
      </div>
    </button>
  );
};

export default FarmSelector;
