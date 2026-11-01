// ---------------------------------------------------------------------------
// share.js — unique, deep-linkable product URLs.
//
// The product id is stored in a query parameter (?gun=<id>) so links work on
// static hosts such as Vercel without extra rewrite rules.
// ---------------------------------------------------------------------------

const SHARE_PARAM = 'gun'

export const getSharedGunId = () => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(SHARE_PARAM)
}

export const buildGunShareUrl = (gun) => {
  const url = new URL(window.location.href)
  if (gun?.id !== undefined && gun?.id !== null) {
    url.searchParams.set(SHARE_PARAM, String(gun.id))
  }
  url.hash = ''
  return url.toString()
}

export const syncGunShareUrl = (gun) => {
  const url = new URL(window.location.href)
  if (gun?.id !== undefined && gun?.id !== null) {
    url.searchParams.set(SHARE_PARAM, String(gun.id))
  } else {
    url.searchParams.delete(SHARE_PARAM)
  }
  window.history.replaceState({}, '', url.toString())
}

export const clearGunShareUrl = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState({}, '', url.toString())
}
