export {
  clearMyCitizen as clearStoredMyCitizenId,
  getOrCreateDeviceToken,
  getStoredMyCitizenId,
  setMyCitizen as setStoredMyCitizenId,
} from '@/lib/deviceAuth'

export {
  deleteOwnedCitizen,
  fetchOwnedCitizen,
  linkCitizenToDevice,
  registerOwnership,
  resolveOwnership,
} from '@/lib/ownership'
