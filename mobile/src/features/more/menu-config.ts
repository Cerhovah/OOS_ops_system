export type MoreCapability = 'core' | 'personal-ai';

export interface MoreDestination {
  id: string;
  title: string;
  description: string;
  route: `/${string}`;
  capability: MoreCapability;
}

export interface MoreGroup {
  id: 'features' | 'management' | 'system';
  title: string;
  destinations: readonly MoreDestination[];
}

export const MORE_GROUPS: readonly MoreGroup[] = [
  {
    id: 'features',
    title: '기능',
    destinations: [
      { id: 'metrics', title: '지표', description: '날짜와 주간 기록을 확인합니다.', route: '/week', capability: 'core' },
      { id: 'weekly-allocation', title: '주간 시간 분배', description: '계정별 주간 시간을 배분합니다.', route: '/plan', capability: 'core' },
      { id: 'projects', title: '프로젝트', description: '프로젝트와 KPI를 관리합니다.', route: '/projects', capability: 'core' },
      { id: 'analysis', title: 'AI 분석', description: '분석 결과와 AI 설정을 확인합니다.', route: '/analysis', capability: 'personal-ai' },
      { id: 'time-notifications', title: '시간과 알림', description: '하루 기준과 알림 시간을 설정합니다.', route: '/time-notifications', capability: 'core' },
    ],
  },
  {
    id: 'management',
    title: '관리',
    destinations: [
      { id: 'profiles', title: '프로필', description: '계정과 항목 묶음을 프로필별로 전환합니다.', route: '/profiles', capability: 'core' },
      { id: 'items', title: '항목 관리', description: '계정별 항목과 기본값을 관리합니다.', route: '/items', capability: 'core' },
      { id: 'accounts', title: '계정 관리', description: '상위 계정과 정렬을 관리합니다.', route: '/accounts', capability: 'core' },
      { id: 'records', title: '기록 관리', description: '기록 수정과 삭제된 데이터를 관리합니다.', route: '/record-management', capability: 'core' },
    ],
  },
  {
    id: 'system',
    title: '시스템',
    destinations: [
      { id: 'settings', title: '설정', description: '동기화, 내보내기와 앱 정보를 관리합니다.', route: '/settings', capability: 'core' },
    ],
  },
];

export function visibleMoreGroups(
  capabilities: readonly MoreCapability[],
): readonly MoreGroup[] {
  const allowed = new Set(capabilities);
  return MORE_GROUPS.map((group) => ({
    ...group,
    destinations: group.destinations.filter((destination) => allowed.has(destination.capability)),
  })).filter((group) => group.destinations.length > 0);
}
