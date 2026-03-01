interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({ title, message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-surface border border-border rounded-xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
          <h2 className="font-semibold text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-sm mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-border text-gray-300 hover:bg-surface-2 transition-colors">
              Annuleren
            </button>
            <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-cap-red hover:bg-cap-red/80 text-white transition-colors disabled:opacity-50">
              {loading ? 'Bezig...' : 'Verwijderen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
