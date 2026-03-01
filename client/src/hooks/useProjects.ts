import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { Project } from '../../../shared/types'

export function useProjects() {
  return useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => api.get('/projects').then((r) => r.data) })
}

export function useProject(id: string) {
  return useQuery<Project>({ queryKey: ['projects', id], queryFn: () => api.get(`/projects/${id}`).then((r) => r.data), enabled: !!id })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Project>) => api.post('/projects', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) => api.put(`/projects/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
