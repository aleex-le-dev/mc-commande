// Hook déprécié - utiliser useSyncManager à la place
import useSyncManager from '../../../hooks/useSyncManager'

export const useSyncProgress = (performSync) => {
  return useSyncManager(performSync)
}
