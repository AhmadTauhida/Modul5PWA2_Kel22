import { useState } from 'react'
import {
  RotateCcw,
  Trash2,
  PackageOpen,
  ArrowRight,
} from 'lucide-react'
import { useTrash } from '../hooks/useTrash'
import gunService from '../services/gunService'
import ConfirmModal from '../components/modals/ConfirmModal'
import { formatPrice } from '../utils/helpers'

const formatDeletedAt = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

/**
 * TrashPage — lists soft-deleted products with restore and permanent delete.
 */
export default function TrashPage({ onNavigateCatalog }) {
  const { trash, restoreGun, deletePermanently } = useTrash()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    setError('')

    try {
      const isLocalOnly = String(deleteTarget.id).startsWith('local-')
      if (!isLocalOnly) {
        await gunService.deleteGun(deleteTarget.id)
      }
      deletePermanently(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setError(err?.message || 'Failed to delete this product permanently.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="trash-page">
      <section className="masthead">
        <h1 className="display">Trash</h1>
        <p className="lede">
          Soft-deleted products stay here until you restore them or remove them
          permanently. Nothing is lost by accident.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Deleted products</h2>
          <span className="count">
            {trash.length} item{trash.length !== 1 ? 's' : ''}
          </span>
        </div>

        {trash.length === 0 ? (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>Trash is empty. Deleted products will appear here.</p>
            {onNavigateCatalog && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={onNavigateCatalog}
              >
                Browse Catalog <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <ul className="trash-list">
            {trash.map((item) => {
              const deletedAt = formatDeletedAt(item.deletedAt)
              const type = item.type || 'Hardware'
              const caliber = item.caliber ? ` · ${item.caliber}` : ''

              return (
                <li key={item.id} className="trash-item">
                  <img
                    className="trash-item__img"
                    src={item.image_url || '/guns/pistol.svg'}
                    alt={item.name}
                    width="72"
                    height="56"
                    loading="lazy"
                  />

                  <div className="trash-item__body">
                    <span className="name display">{item.name}</span>
                    <span className="type">{type}{caliber}</span>
                    <span className="price">{formatPrice(item.price)}</span>
                    {deletedAt && (
                      <span className="trash-item__date">Deleted {deletedAt}</span>
                    )}
                  </div>

                  <div className="trash-item__actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => restoreGun(item.id)}
                    >
                      <RotateCcw size={15} /> Restore
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => { setDeleteTarget(item); setError('') }}
                    >
                      <Trash2 size={15} /> Delete Permanently
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {error && <div className="toast toast--error">{error}</div>}
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Permanently"
        message={`Permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
        loading={deleting}
        onConfirm={handlePermanentDelete}
        onCancel={() => { setDeleteTarget(null); setError('') }}
      />
    </div>
  )
}
