import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react'

interface Toast { id: number; message: string; type: 'success' | 'error' }

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => setToasts((p) => p.filter((t) => t.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 10) }, [])

  return (
    <div
      onClick={onRemove}
      className={`cursor-pointer px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'} ${toast.type === 'success' ? 'bg-cap-green/20 border-cap-green/40 text-cap-green' : 'bg-cap-red/20 border-cap-red/40 text-cap-red'}`}
    >
      {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast moet binnen ToastProvider gebruikt worden')
  return ctx
}
