import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { Team } from '../../../shared/types'

export function useTeams() {
  return useQuery<Team[]>({ queryKey: ['teams'], queryFn: () => api.get('/teams').then((r) => r.data) })
}

export function useTeam(id: string) {
  return useQuery<Team>({ queryKey: ['teams', id], queryFn: () => api.get(`/teams/${id}`).then((r) => r.data), enabled: !!id })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Team>) => api.post('/teams', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Team> & { id: string }) => api.put(`/teams/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      qc.invalidateQueries({ queryKey: ['capacity'] })
    },
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  })
}
