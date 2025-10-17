// Hook: planifie une synchro quotidienne et gère un toast simple
import { useEffect, useState } from 'react'

export function useDailySync(ApiService, queryClient, hour = 12) {
  const [toast, setToast] = useState({ visible: false, message: '' })

  // Désactiver temporairement la synchro quotidienne pour éviter les boucles
  // useEffect(() => {
  //   let timeoutId
  //   const scheduleNext = () => {
  //     const now = new Date()
  //     const next = new Date()
  //     next.setHours(hour, 0, 0, 0)
  //     if (now >= next) next.setDate(next.getDate() + 1)
  //     const delay = next.getTime() - now.getTime()
  //     timeoutId = setTimeout(async () => {
  //       try {
  //         setToast({ visible: true, message: 'Synchronisation quotidienne…' })
  //         await ApiService.sync.syncOrders({})
  //         queryClient.invalidateQueries(['db-orders'])
  //         queryClient.invalidateQueries(['production-statuses'])
  //         queryClient.invalidateQueries(['unified-orders'])
  //         await queryClient.refetchQueries({ queryKey: ['unified-orders'], type: 'active' })
  //         setToast({ visible: true, message: 'Synchronisation quotidienne terminée ✅' })
  //       } catch (e) {
  //         setToast({ visible: true, message: 'Erreur de synchronisation quotidienne' })
  //       } finally {
  //         const hideId = setTimeout(() => setToast({ visible: false, message: '' }), 6000)
  //         scheduleNext()
  //         return () => clearTimeout(hideId)
  //       }
  //     }, delay)
  //   }
  //   scheduleNext()
  //   return () => { if (timeoutId) clearTimeout(timeoutId) }
  // }, [ApiService, queryClient, hour])

  return toast
}

export default useDailySync


