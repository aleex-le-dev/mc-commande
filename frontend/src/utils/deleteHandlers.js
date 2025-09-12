// Handlers de suppression (article et commande) avec notifications UI
export function createDeleteHandlers(queryClient) {
  const base = (import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_API_URL || 'https://maisoncleo-commande.onrender.com'))

  const handleDeleteArticle = async (orderId, lineItemId) => {
    const response = await fetch(`${base}/api/orders/${orderId}/items/${lineItemId}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('DELETE article failed')
    // Optimistic cache prune
    const targetOrderId = String(orderId)
    const targetLineId = String(lineItemId)
    queryClient.setQueryData(['unified-orders'], (oldData) => {
      if (!oldData) return oldData
      const updated = oldData.map(order => {
        if (String(order.order_id) === targetOrderId) {
          const newItems = (order.items || []).filter(item => String(item.line_item_id) !== targetLineId)
          return { ...order, items: newItems }
        }
        return order
      }).filter(order => (order.items || []).length > 0)
      return updated
    })
    // Notify + hard refresh
    window.dispatchEvent(new Event('mc-data-updated'))
    window.dispatchEvent(new Event('mc-refresh-data'))
    window.dispatchEvent(new Event('mc-sync-completed'))
    try {
      queryClient.invalidateQueries(['unified-orders'])
      await queryClient.refetchQueries({ queryKey: ['unified-orders'], type: 'active' })
    } catch {}
  }

  const handleDeleteOrder = async (orderId) => {
    const response = await fetch(`${base}/api/orders/${orderId}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('DELETE order failed')
    // Optimistic cache prune
    const targetOrderId = String(orderId)
    queryClient.setQueryData(['unified-orders'], (oldData) => {
      if (!oldData) return oldData
      return oldData.filter(order => String(order.order_id) !== targetOrderId)
    })
    // Notify + hard refresh
    window.dispatchEvent(new Event('mc-data-updated'))
    window.dispatchEvent(new Event('mc-refresh-data'))
    window.dispatchEvent(new Event('mc-sync-completed'))
    try {
      queryClient.invalidateQueries(['unified-orders'])
      await queryClient.refetchQueries({ queryKey: ['unified-orders'], type: 'active' })
    } catch {}
  }

  return { handleDeleteArticle, handleDeleteOrder }
}

export default createDeleteHandlers


