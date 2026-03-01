import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { TeamMember, LeaveEntry, LeaveType } from '../../../shared/types'

export function useMembers(teamId: string) {
  return useQuery<TeamMember[]>({
    queryKey: ['members', teamId],
    queryFn: () => api.get(`/teams/${teamId}/members`).then((r) => r.data),
    enabled: !!teamId,
  })
}

export function useCreateMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; role: string; initials: string }) =>
      api.post(`/teams/${teamId}/members`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', teamId] }),
  })
}

export function useUpdateMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TeamMember> & { id: string }) =>
      api.put(`/members/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', teamId] }),
  })
}

export function useDeleteMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', teamId] }),
  })
}

export function useLeave(filters: { member_id?: string; sprint_id?: string }) {
  const params = new URLSearchParams()
  if (filters.member_id) params.set('member_id', filters.member_id)
  if (filters.sprint_id) params.set('sprint_id', filters.sprint_id)
  return useQuery<LeaveEntry[]>({
    queryKey: ['leave', filters],
    queryFn: () => api.get(`/leave?${params}`).then((r) => r.data),
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { member_id: string; sprint_id: string; date: string; type: LeaveType }) =>
      api.post('/leave', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave'] }),
  })
}

export function useDeleteLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leave/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave'] }),
  })
}
