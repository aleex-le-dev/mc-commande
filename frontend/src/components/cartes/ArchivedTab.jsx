import React from 'react'
import { getArchivedOrders } from '../../services/mongodbService'
import LoadingSpinner from '../LoadingSpinner'

// Tableau des commandes archivées
const ArchivedTab = () => {
  const [rows, setRows] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [limit] = React.useState(50)

  const load = React.useCallback(async (p) => {
    try {
      setLoading(true)
      const res = await getArchivedOrders(p, limit)
      if (res.success) {
        setRows(res.data || [])
        setTotal(res.pagination?.total || 0)
      } else {
        setRows([])
        setTotal(0)
      }
    } catch (e) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [limit])

  React.useEffect(() => { load(page) }, [page, load])

  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total archivées: <strong>{total}</strong></div>
        <div className="flex items-center gap-2 text-sm">
          <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-2 py-1 rounded border bg-white disabled:opacity-50">Précédent</button>
          <span>Page {page}/{pages}</span>
          <button disabled={page>=pages} onClick={() => setPage(p => Math.min(pages, p+1))} className="px-2 py-1 rounded border bg-white disabled:opacity-50">Suivant</button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white rounded-2xl overflow-hidden border">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="py-2 px-3 border-b">Commande</th>
                <th className="py-2 px-3 border-b">Client</th>
                <th className="py-2 px-3 border-b">Archivée le</th>
                <th className="py-2 px-3 border-b">Articles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="odd:bg-white even:bg-gray-50">
                  <td className="py-2 px-3 border-b">#{r.order?.order_number || r.order_id}</td>
                  <td className="py-2 px-3 border-b">{r.order?.customer_name || '-'}</td>
                  <td className="py-2 px-3 border-b">{new Date(r.archived_at).toLocaleString()}</td>
                  <td className="py-2 px-3 border-b">{Array.isArray(r.items) ? r.items.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ArchivedTab


