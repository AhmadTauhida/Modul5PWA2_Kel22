// ---------------------------------------------------------------------------
// trashStorage.js — client-side soft delete ("Trash") persistence.
//
// Products are not removed from the server when soft-deleted. Instead their
// ids (plus a small snapshot for display) are stored in localStorage so the
// catalog can hide them and the Trash page can restore them. Permanent delete
// removes the product from the API and, for local-only products, records the
// id as purged so it cannot reappear from the bundled catalog.
// ---------------------------------------------------------------------------

const TRASH_KEY = 'bore_barrel_trash_v1'
const PURGED_KEY = 'bore_barrel_purged_guns_v1'

export const TRASH_CHANGE_EVENT = 'bore-barrel-trash-change'

const canUseStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

const readArray = (key) => {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeArray = (key, value) => {
  if (!canUseStorage()) return false
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return false
  }
  window.dispatchEvent(new Event(TRASH_CHANGE_EVENT))
  return true
}

export const getTrash = () =>
  readArray(TRASH_KEY).filter(
    (item) => item && item.id !== undefined && item.id !== null,
  )

export const getPurgedIds = () => new Set(readArray(PURGED_KEY).map(String))

export const isGunTrashed = (id) =>
  getTrash().some((item) => String(item.id) === String(id))

export const isGunPurged = (id) => getPurgedIds().has(String(id))

/**
 * Move a product to Trash. Stores a snapshot so it can still be listed even
 * when the API data source is unavailable.
 * @returns {boolean} whether the product is now in Trash
 */
export const addToTrash = (gun) => {
  if (!gun || gun.id === undefined || gun.id === null) return false

  const id = String(gun.id)
  const items = getTrash()
  if (items.some((item) => String(item.id) === id)) return true

  const snapshot = {
    id: gun.id,
    name: gun.name || 'Hardware Piece',
    type: gun.type || gun.category || 'Hardware',
    caliber: gun.caliber || '',
    price: Number(gun.price ?? gun.cook_time ?? 0),
    description: gun.description || '',
    image_url: gun.image_url || gun.image || '/guns/pistol.svg',
    deletedAt: new Date().toISOString(),
  }

  return writeArray(TRASH_KEY, [snapshot, ...items])
}

export const restoreFromTrash = (id) => {
  const items = getTrash()
  const next = items.filter((item) => String(item.id) !== String(id))
  if (next.length === items.length) return false
  return writeArray(TRASH_KEY, next)
}

export const removeFromTrash = restoreFromTrash

/**
 * Permanently remove a local-only product so it does not reappear after a
 * reload. Server products are deleted through the API by the Trash page.
 */
export const purgeGun = (id) => {
  removeFromTrash(id)

  const purged = getPurgedIds()
  if (purged.has(String(id))) return true

  return writeArray(PURGED_KEY, [...purged, String(id)])
}
