import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { Sprint } from '../../../shared/types'

export function useSprints() {
  return useQuery<Sprint[]>({ queryKey: ['sprints'], queryFn: () => api.get('/sprints').then((r) => r.data) })
}

export function useGenerateSprints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { count: number; start_date: string }) => api.post('/sprints/generate', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}
