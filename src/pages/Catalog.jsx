import { useState, useMemo } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import { useTrash } from '../hooks/useTrash'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

const PAGE_SIZE = 6

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API via useGuns()
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable
 *
 * Features: search, category filter, sort, CRUD actions, detail modal.
 */
export default function Catalog({ onNavigate }) {
  // ---- API data ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 50 })
  const { trashedIds, purgedIds, moveToTrash } = useTrash()
  const [useLocal, setUseLocal] = useState(false)

  // Decide data source
  const rawGuns = useMemo(() => {
    if (useLocal || (error && apiGuns.length === 0)) {
      // Enrich local data with synthetic ids so FavoriteButton and detail work
      return GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    }
    return apiGuns
  }, [apiGuns, error, useLocal])

  // Hide soft-deleted and permanently deleted products.
  const activeGuns = useMemo(
    () =>
      rawGuns.filter((g) => {
        const id = String(g.id ?? g.name)
        return !trashedIds.has(id) && !purgedIds.has(id)
      }),
    [rawGuns, trashedIds, purgedIds],
  )

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const categories = useMemo(() => extractCategories(activeGuns), [activeGuns])

  const filteredGuns = useMemo(() => {
    let result = activeGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [activeGuns, search, activeCategory, sortKey, sortOrder])

  // ---- pagination ----
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(filteredGuns.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paginatedGuns = filteredGuns.slice(pageStart, pageStart + PAGE_SIZE)

  const goToPage = (nextPage) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- delete (soft) ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = () => {
    if (!deleteTarget) return
    setDeleteError('')

    if (!moveToTrash(deleteTarget)) {
      setDeleteError('Could not move this product to Trash.')
      return
    }

    setDeleteTarget(null)
    setPage(1)
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onDelete={(g) => { setSelectedGun(null); setDeleteTarget(g) }}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={(value) => { setSearch(value); setPage(1) }}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={(value) => { setActiveCategory(value); setPage(1) }}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
            setPage(1)
          }}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => { setUseLocal(true); setPage(1) }}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {/* Product grid */}
        {filteredGuns.length > 0 && (
          <ul className="stock">
            {paginatedGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Catalog pagination">
            <button
              type="button"
              className="pagination__arrow"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`pagination__page${p === currentPage ? ' pagination__page--active' : ''}`}
                onClick={() => goToPage(p)}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              className="pagination__arrow"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>

            <span className="pagination__info">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredGuns.length)} of{' '}
              {filteredGuns.length}
            </span>
          </nav>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); setPage(1); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Soft delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Move Product to Trash"
        message={`Move "${deleteTarget?.name}" to Trash? You can restore it or delete it permanently from the Trash page.`}
        confirmLabel="Move to Trash"
        danger
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}
