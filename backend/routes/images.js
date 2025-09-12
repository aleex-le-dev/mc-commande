const express = require('express')
const db = require('../services/database')
const router = express.Router()

// GET /api/images/:productId - Récupérer l'image d'un produit
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const { w = 256, q = 75, f = 'webp' } = req.query

    if (!productId) {
      return res.status(400).json({ error: 'Product ID requis' })
    }

    // Récupérer l'image depuis la base de données
    const orderItemsCollection = db.getCollection('order_items')
    const product = await orderItemsCollection.findOne({ 
      product_id: parseInt(productId) 
    })

    if (!product || !product.image_url) {
      return res.status(404).json({ error: 'Image non trouvée' })
    }

    // Rediriger vers l'image WooCommerce avec les paramètres de redimensionnement
    const imageUrl = new URL(product.image_url)
    
    // Ajouter les paramètres de redimensionnement si l'image vient de WooCommerce
    if (imageUrl.hostname.includes('woocommerce') || imageUrl.pathname.includes('wp-content')) {
      imageUrl.searchParams.set('w', w)
      imageUrl.searchParams.set('q', q)
      if (f === 'webp') {
        imageUrl.searchParams.set('f', 'webp')
      }
    }

    // Rediriger vers l'image optimisée
    res.redirect(302, imageUrl.toString())

  } catch (error) {
    console.error('Erreur récupération image:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/images/:productId/info - Récupérer les informations de l'image
router.get('/:productId/info', async (req, res) => {
  try {
    const { productId } = req.params

    if (!productId) {
      return res.status(400).json({ error: 'Product ID requis' })
    }

    // Récupérer les informations du produit depuis la base de données
    const orderItemsCollection = db.getCollection('order_items')
    const product = await orderItemsCollection.findOne({ 
      product_id: parseInt(productId) 
    })

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' })
    }

    res.json({
      success: true,
      product: {
        product_id: product.product_id,
        product_name: product.product_name,
        image_url: product.image_url,
        permalink: product.permalink,
        has_image: Boolean(product.image_url)
      }
    })

  } catch (error) {
    console.error('Erreur récupération info image:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

module.exports = router
