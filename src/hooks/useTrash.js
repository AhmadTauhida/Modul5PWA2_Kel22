import { useState, useEffect, useCallback } from 'react'
import {
  TRASH_CHANGE_EVENT,
  getTrash,
  getPurgedIds,
  addToTrash,
  restoreFromTrash,
  purgeGun,
} from '../utils/trashStorage'

const readState = () => {
  const trash = getTrash()
  return {
    trash,
    trashedIds: new Set(trash.map((item) => String(item.id))),
    purgedIds: getPurgedIds(),
  }
}

/**
 * useTrash — reactive access to the client-side soft-delete store.
 *
 * Returns the trashed products, sets of hidden ids, and mutation helpers.
 * Updates automatically when any component changes the store.
 */
export function useTrash() {
  const [state, setState] = useState(readState)

  useEffect(() => {
    const sync = () => setState(readState())

    window.addEventListener(TRASH_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener(TRASH_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const moveToTrash = useCallback((gun) => addToTrash(gun), [])
  const restoreGun = useCallback((id) => restoreFromTrash(id), [])
  const deletePermanently = useCallback((id) => purgeGun(id), [])

  return {
    ...state,
    moveToTrash,
    restoreGun,
    deletePermanently,
  }
}
