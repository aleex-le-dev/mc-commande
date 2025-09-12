import React, { useEffect, useMemo, useState } from 'react'
import OrdersService from '../services/orders/ordersService.js'

/**
 * Modal de création manuelle de commande
 * - Valide client, produit et identifiant
 * - Permet de choisir maille/couture
 * - Adresse client optionnelle
 */
export default function CreateOrderModal({ visible, onClose, onCreated }) {
  const [customer, setCustomer] = useState('')
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10))
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerCountry, setCustomerCountry] = useState('FR')
  // Transporteur pour commandes manuelles
  const [shippingCarrier, setShippingCarrier] = useState('DHL Standard (1-3days)')
  const [showClientDetails, setShowClientDetails] = useState(false)
  const [productName, setProductName] = useState('')
  const [productSize, setProductSize] = useState('')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const [orderIdentifier, setOrderIdentifier] = useState('')
  const [productionType, setProductionType] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // Réinitialiser le formulaire à l’ouverture
  useEffect(() => {
    if (visible) {
      setCustomer('')
      setDateStr(new Date().toISOString().slice(0, 10))
      setCustomerAddress('')
      setCustomerEmail('')
      setCustomerPhone('')
      setCustomerCountry('FR')
      // Réinitialiser transporteur
      setShippingCarrier('DHL Standard (1-3days)')
      setShowClientDetails(false)
      setProductName('')
      setProductSize('')
      setQty(1)
      setPrice(0)
      setOrderIdentifier('')
      setProductionType('')
      setErrors({})
    }
  }, [visible])

  // Validation locale des champs
  const validation = useMemo(() => {
    const e = {}
    if (!customer || customer.trim().length === 0) e.customer = 'Nom client obligatoire'
    if (!productName || productName.trim().length === 0) e.productName = 'Nom produit obligatoire'
    if (!orderIdentifier || !/^[A-Za-z0-9]+$/.test(orderIdentifier.trim())) e.orderIdentifier = 'Identifiant alphanumérique requis'
    if (!['maille', 'couture'].includes(String(productionType))) e.productionType = 'Choisir maille ou couture'
    if (isNaN(Number(qty)) || Number(qty) < 1) e.qty = 'Quantité invalide'
    if (isNaN(Number(price)) || Number(price) < 0) e.price = 'Prix invalide'
    if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) e.customerEmail = 'Email invalide'
    if (customerPhone && customerPhone.replace(/\D/g, '').length < 6) e.customerPhone = 'Téléphone invalide'
    if (!customerCountry || customerCountry.trim().length < 2) e.customerCountry = 'Pays invalide'
    return e
  }, [customer, productName, orderIdentifier, productionType, qty, price, customerEmail, customerPhone, customerCountry])

  const isValid = Object.keys(validation).length === 0

  const handleSubmit = async (ev) => {
    ev?.preventDefault?.()
    setErrors(validation)
    if (!isValid || submitting) return
    try {
      setSubmitting(true)
      const payload = {
        customer: customer.trim(),
        order_date: `${dateStr}T00:00:00`,
        order_number: orderIdentifier.trim(),
        customer_address: customerAddress?.trim() || null,
        customer_email: customerEmail?.trim() || null,
        customer_phone: customerPhone?.trim() || null,
        customer_country: customerCountry?.trim() || 'FR',
        // Méthode non fixée côté création manuelle
        shipping_carrier: shippingCarrier || null,
        items: [
          { 
            product_id: 0, 
            product_name: productName.trim(), 
            quantity: Number(qty), 
            price: Number(price), 
            production_type: productionType,
            meta_data: productSize && productSize.trim().length > 0 ? [ { key: 'taille', value: productSize.trim() } ] : []
          }
        ],
        status: 'a_faire'
      }
      const res = await OrdersService.createOrder(payload)
      try {
        window.dispatchEvent(new Event('mc-refresh-data'))
        window.dispatchEvent(new Event('mc-data-updated'))
      } catch {}
      if (typeof onCreated === 'function') onCreated(res?.orderId)
      onClose && onClose()
    } catch (error) {
      alert('Erreur création commande: ' + (error?.message || 'inconnue'))
    } finally {
      setSubmitting(false)
    }
  }

  // Fermeture via ESC
  useEffect(() => {
    if (!visible) return
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
        <form onSubmit={handleSubmit} className="p-4">
          <h2 className="text-lg font-semibold mb-3">Créer une commande</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nom client *</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded border"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.customer ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nom et prénom"
                autoFocus
              />
              {validation.customer && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.customer}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Date de commande</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Numéro de commande (alphanumérique) *</label>
                <input
                  type="text"
                  inputMode="text"
                  pattern="[A-Za-z0-9]+"
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.orderIdentifier ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                  value={orderIdentifier}
                  onChange={(e) => setOrderIdentifier(e.target.value)}
                  placeholder="Ex: MC123A ou 22605443"
                />
                {validation.orderIdentifier && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.orderIdentifier}</p>}
              </div>
            </div>

            {/* Infos client optionnelles (dropdown) */}
            <div className="mt-1 border rounded" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2"
                onClick={() => setShowClientDetails(v => !v)}
                style={{ color: 'var(--text-primary)' }}
                aria-expanded={showClientDetails}
              >
                <span className="text-sm font-medium">Infos client (optionnel)</span>
                <span className="text-xl leading-none" aria-hidden>{showClientDetails ? '▾' : '▸'}</span>
              </button>
              {showClientDetails && (
                <div className="p-3 space-y-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 rounded border"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.customerEmail ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="exemple@mail.com"
                      />
                      {validation.customerEmail && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.customerEmail}</p>}
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Téléphone</label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 rounded border"
                        style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.customerPhone ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                      />
                      {validation.customerPhone && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.customerPhone}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Adresse</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Adresse complète"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Pays</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.customerCountry ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                      value={customerCountry}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase()
                        setCustomerCountry(v)
                        setShippingCarrier(v === 'FR' ? 'UPS' : 'DHL')
                      }}
                      placeholder="FR"
                    />
                    {validation.customerCountry && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.customerCountry}</p>}
                  </div>
                  {/* Transporteur (manuel) */}
                  <div>
                    <label className="block text-sm mb-1">Transporteur (manuel)</label>
                    <select
                      className="w-full px-3 py-2 rounded border"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                      value={shippingCarrier}
                      onChange={(e) => setShippingCarrier(e.target.value)}
                    >
                      <option value="DHL Standard (1-3days)">DHL Standard (1-3days)</option>
                      <option value="EXPRESS 12:00">EXPRESS 12:00</option>
                      <option value="UPS Point Relais">UPS Point Relais</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">Nom produit *</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded border"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.productName ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder='Ex: "Chemise Cléo"'
              />
              {validation.productName && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.productName}</p>}
            </div>

            <div>
              <label className="block text-sm mb-1">Taille (optionnel)</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded border"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                value={productSize}
                onChange={(e) => setProductSize(e.target.value)}
                placeholder="Ex: S, M, L, 36, 38…"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm mb-1">Quantité *</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.qty ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value || '1', 10))}
                />
                {validation.qty && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.qty}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1">Prix unitaire *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.price ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value || '0'))}
                />
                {validation.price && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.price}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1">Type production *</label>
                <select
                  className="w-full px-3 py-2 rounded border"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: validation.productionType ? '#ef4444' : 'var(--border-primary)', color: 'var(--text-primary)' }}
                  value={productionType}
                  onChange={(e) => setProductionType(e.target.value)}
                >
                  <option value="">Choisir…</option>
                  <option value="couture">Couture</option>
                  <option value="maille">Maille</option>
                </select>
                {validation.productionType && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{validation.productionType}</p>}
              </div>
            </div>

            
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="px-3 py-2 rounded border" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }} onClick={onClose} disabled={submitting}>Annuler</button>
            <button type="submit" className="px-4 py-2 rounded text-white" style={{ backgroundColor: isValid ? '#16a34a' : '#9ca3af' }} disabled={!isValid || submitting}>
              {submitting ? 'Création…' : 'Créer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


