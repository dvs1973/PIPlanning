import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { CapacityPerRole, CapacityOverviewItem, AvailabilityItem } from '../../../shared/types'

export function useCapacityByTeam(teamId: string, sprintIds?: string[]) {
  const params = sprintIds?.length ? `?sprint_ids=${sprintIds.join(',')}` : ''
  return useQuery<CapacityPerRole[]>({
    queryKey: ['capacity', teamId, sprintIds],
    queryFn: () => api.get(`/capacity/${teamId}${params}`).then((r) => r.data),
    enabled: !!teamId,
  })
}

export function useCapacityOverview() {
  return useQuery<{ teams: CapacityOverviewItem[] }>({
    queryKey: ['capacity', 'overview'],
    queryFn: () => api.get('/capacity/overview').then((r) => r.data),
  })
}

export function useAvailability() {
  return useQuery<AvailabilityItem[]>({
    queryKey: ['capacity', 'availability'],
    queryFn: () => api.get('/capacity/availability').then((r) => r.data),
  })
}
