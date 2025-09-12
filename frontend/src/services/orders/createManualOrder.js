/**
 * Création manuelle de commande côté client
 * - Gère les prompts utilisateur et la validation stricte
 * - Construit le payload et appelle l'API via OrdersService
 * - Déclenche les événements UI nécessaires pour rafraîchir l'affichage
 */
import OrdersService from './ordersService.js'

/**
 * Crée une commande via des prompts et validations (UX minimale mais robuste)
 * @returns {Promise<{ success: boolean, orderId?: number }>} Résultat de la création
 */
export async function createManualOrder() {
  // Assistant pas-à-pas avec possibilité de revenir en arrière
  const today = new Date().toISOString().slice(0, 10)
  const values = {
    customer: '',
    dateStr: today,
    customerAddress: '',
    productName: '',
    qty: 1,
    price: 0,
    orderIdentifier: '',
    productionType: ''
  }

  const idRegex = /^[A-Za-z0-9]+$/
  const backInputs = new Set(['<', 'retour', 'precedent', 'précédent'])
  const cancelInputs = new Set(['annuler', 'cancel', 'esc'])

  const steps = [
    {
      key: 'customer',
      ask: () => prompt('Nom client (obligatoire) ?\n(Astuce: tapez "<" pour revenir en arrière)', values.customer || ''),
      validate: (v) => typeof v === 'string' && v.trim().length > 0,
      onInvalid: () => alert('Le nom du client est obligatoire')
    },
    {
      key: 'dateStr',
      ask: () => prompt('Date de commande (YYYY-MM-DD) ?', values.dateStr || today),
      validate: (v) => !!v,
      onInvalid: () => {}
    },
    {
      key: 'customerAddress',
      ask: () => prompt('Adresse client (optionnel)', values.customerAddress || ''),
      validate: () => true,
      onInvalid: () => {}
    },
    {
      key: 'productName',
      ask: () => prompt('Nom produit (obligatoire) ?\n(Astuce: tapez "<" pour revenir en arrière)', values.productName || ''),
      validate: (v) => typeof v === 'string' && v.trim().length > 0,
      onInvalid: () => alert('Le nom du produit est obligatoire')
    },
    {
      key: 'qty',
      ask: () => prompt('Quantité ?', String(values.qty || 1)),
      validate: (v) => !isNaN(parseInt(String(v), 10)) && parseInt(String(v), 10) > 0,
      transform: (v) => Math.max(1, parseInt(String(v), 10)),
      onInvalid: () => alert('Quantité invalide')
    },
    {
      key: 'price',
      ask: () => prompt('Prix unitaire ?', String(values.price || 0)),
      validate: (v) => !isNaN(parseFloat(String(v))),
      transform: (v) => Math.max(0, parseFloat(String(v))),
      onInvalid: () => alert('Prix invalide')
    },
    {
      key: 'orderIdentifier',
      ask: () => prompt('Identifiant de commande (chiffres ou lettres, obligatoire)', values.orderIdentifier || ''),
      validate: (v) => typeof v === 'string' && idRegex.test(v.trim()),
      transform: (v) => v.trim(),
      onInvalid: () => alert('Identifiant invalide. Lettres et chiffres uniquement (A-Z, a-z, 0-9).')
    },
    {
      key: 'productionType',
      ask: () => prompt('Type production (maille/couture) ?', values.productionType || 'Entrez "couture" ou "maille"'),
      validate: (v) => ['maille', 'couture'].includes(String(v || '').toLowerCase().trim()),
      transform: (v) => String(v || '').toLowerCase().trim(),
      onInvalid: () => alert('Veuillez choisir exactement "maille" ou "couture"')
    }
  ]

  let i = 0
  while (i < steps.length) {
    const step = steps[i]
    let input = step.ask()
    if (input === null) {
      // Si l’utilisateur annule, abandonner la création
      alert('Création annulée')
      return { success: false }
    }
    input = String(input)
    const lower = input.toLowerCase().trim()
    if (backInputs.has(lower)) {
      i = Math.max(0, i - 1)
      continue
    }
    if (cancelInputs.has(lower)) {
      alert('Création annulée')
      return { success: false }
    }
    const value = typeof step.transform === 'function' ? step.transform(input) : input.trim()
    if (!step.validate(value)) {
      step.onInvalid && step.onInvalid()
      continue
    }
    values[step.key] = value
    i += 1
  }

  const payload = {
    customer: values.customer,
    order_date: `${values.dateStr}T00:00:00`,
    order_number: values.orderIdentifier,
    customer_address: values.customerAddress || null,
    items: [
      { product_id: 0, product_name: values.productName, quantity: values.qty, price: values.price, production_type: values.productionType }
    ],
    status: 'a_faire'
  }

  const res = await OrdersService.createOrder(payload)
  try {
    window.dispatchEvent(new Event('mc-refresh-data'))
    window.dispatchEvent(new Event('mc-data-updated'))
  } catch {}
  alert(`Commande créée (ID: ${res.orderId || 'N/A'})`)
  return { success: true, orderId: res.orderId }
}

export default { createManualOrder }


