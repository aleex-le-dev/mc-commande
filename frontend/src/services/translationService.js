// Service de traduction intelligent pour les articles de mode
class TranslationService {
  constructor() {
    // Dictionnaire de traductions manuelles précises
    this.manualTranslations = {
      // Termes de statut
      'in-production': 'en production',
      'pending': 'en attente',
      'completed': 'terminé',
      
      // Matériaux textiles
      'silk': 'soie',
      'cotton': 'coton',
      'linen': 'lin',
      'wool': 'laine',
      'cashmere': 'cachemire',
      'velvet': 'velours',
      'satin': 'satin',
      'lace': 'dentelle',
      'denim': 'denim',
      'jersey': 'jersey',
      'chiffon': 'mousseline',
      'crepe': 'crêpe',
      'tulle': 'tulle',
      'organza': 'organza',
      'taffeta': 'taffetas',
      'tweed': 'tweed',
      'flannel': 'flanelle',
      'corduroy': 'velours côtelé',
      'suede': 'daim',
      'leather': 'cuir',
      'faux-leather': 'cuir synthétique',
      'faux leather': 'cuir synthétique',
      
      // Vêtements
      'blouse': 'blouse',
      'shirt': 'chemise',
      'dress': 'robe',
      'pants': 'pantalon',
      'trousers': 'pantalon',
      'skirt': 'jupe',
      'jacket': 'veste',
      'coat': 'manteau',
      'sweater': 'pull',
      'cardigan': 'cardigan',
      'jumper': 'pull',
      'top': 'haut',
      'tunic': 'tunique',
      'tank-top': 'débardeur',
      'tank top': 'débardeur',
      'crop-top': 'crop top',
      'crop top': 'crop top',
      'bodysuit': 'body',
      'romper': 'combinaison',
      'jumpsuit': 'combinaison',
      'overalls': 'salopette',
      'shorts': 'short',
      'leggings': 'leggings',
      'jeans': 'jean',
      'culotte': 'culotte',
      'bermuda': 'bermuda',
      'capri': 'capri',
      'maxi': 'maxi',
      'mini': 'mini',
      'midi': 'midi',
      'long-sleeve': 'manches longues',
      'long sleeve': 'manches longues',
      'short-sleeve': 'manches courtes',
      'short sleeve': 'manches courtes',
      'sleeveless': 'sans manches',
      'off-shoulder': 'décolleté bateau',
      'off shoulder': 'décolleté bateau',
      'one-shoulder': 'décolleté asymétrique',
      'one shoulder': 'décolleté asymétrique',
      'v-neck': 'décolleté en V',
      'v neck': 'décolleté en V',
      'round-neck': 'décolleté rond',
      'round neck': 'décolleté rond',
      'square-neck': 'décolleté carré',
      'square neck': 'décolleté carré',
      
      // Couleurs
      'ecru': 'écru',
      'white': 'blanc',
      'black': 'noir',
      'red': 'rouge',
      'blue': 'bleu',
      'green': 'vert',
      'yellow': 'jaune',
      'pink': 'rose',
      'purple': 'violet',
      'orange': 'orange',
      'brown': 'marron',
      'gray': 'gris',
      'grey': 'gris',
      'beige': 'beige',
      'navy': 'marine',
      'burgundy': 'bordeaux',
      'olive': 'olive',
      'coral': 'corail',
      'teal': 'bleu-vert',
      'mint': 'menthe',
      'lavender': 'lavande',
      'rose-gold': 'rose doré',
      'rose gold': 'rose doré',
      'gold': 'doré',
      'silver': 'argenté',
      'bronze': 'bronze',
      'cream': 'crème',
      'ivory': 'ivoire',
      'tan': 'beige foncé',
      'khaki': 'kaki',
      'maroon': 'bordeaux',
      'indigo': 'indigo',
      'turquoise': 'turquoise',
      'fuchsia': 'fuchsia',
      'magenta': 'magenta',
      'lime': 'citron vert',
      'amber': 'ambre',
      'copper': 'cuivre',
      'plum': 'prune',
      'sage': 'sauge',
      'dusty-rose': 'rose poussière',
      'dusty rose': 'rose poussière',
      'mauve': 'mauve',
      'taupe': 'taupe',
      
      // Motifs et textures
      'flowers': 'fleurs',
      'floral': 'floral',
      'textured': 'texturé',
      'smooth': 'lisse',
      'rough': 'rugueux',
      'soft': 'doux',
      'hard': 'dur',
      'light': 'léger',
      'heavy': 'lourd',
      'thick': 'épais',
      'thin': 'fin',
      'woven': 'tissé',
      'knitted': 'tricoté',
      'crocheted': 'crocheté',
      'embroidered': 'brodé',
      'printed': 'imprimé',
      'dyed': 'teint',
      'bleached': 'blanchi',
      'distressed': 'usé',
      'vintage': 'vintage',
      'retro': 'rétro',
      'modern': 'moderne',
      'classic': 'classique',
      'casual': 'décontracté',
      'formal': 'formel',
      'elegant': 'élégant',
      'sophisticated': 'sophistiqué',
      'striped': 'rayé',
      'polka-dot': 'à pois',
      'polka dot': 'à pois',
      'checkered': 'à carreaux',
      'solid': 'uni',
      'geometric': 'géométrique',
      'abstract': 'abstrait',
      'animal-print': 'imprimé animal',
      'animal print': 'imprimé animal',
      'leopard': 'léopard',
      'zebra': 'zèbre',
      'snake': 'serpent',
      'tie-dye': 'tie and dye',
      'tie dye': 'tie and dye',
      'batik': 'batik',
      'paisley': 'paisley',
      'damask': 'damassé',
      'jacquard': 'jacquard',
      
      // Termes de collection
      'version': 'version',
      'edition': 'édition',
      'limited': 'limité',
      'exclusive': 'exclusif',
      'premium': 'premium',
      'luxury': 'luxe',
      'designer': 'créateur',
      'boutique': 'boutique',
      'collection': 'collection',
      'season': 'saison',
      'spring': 'printemps',
      'summer': 'été',
      'autumn': 'automne',
      'fall': 'automne',
      'winter': 'hiver',
      'resort': 'croisière',
      'pre-fall': 'pré-automne',
      'pre fall': 'pré-automne',
      'holiday': 'fêtes',
      'special': 'spécial',
      'deluxe': 'deluxe',
      'couture': 'couture',
      'ready-to-wear': 'prêt-à-porter',
      'ready to wear': 'prêt-à-porter',
      'haute-couture': 'haute couture',
      'haute couture': 'haute couture',
      
      // Tailles et ajustements
      'petite': 'petite taille',
      'plus-size': 'grande taille',
      'plus size': 'grande taille',
      'oversized': 'oversize',
      'fitted': 'ajusté',
      'loose': 'ample',
      'tight': 'serré',
      'stretchy': 'élastique',
      'non-stretch': 'non extensible',
      'non stretch': 'non extensible',
      'high-waisted': 'haute taille',
      'high waisted': 'haute taille',
      'low-waisted': 'basse taille',
      'low waisted': 'basse taille',
      'mid-rise': 'taille moyenne',
      'mid rise': 'taille moyenne',
      'wide-leg': 'pantalon large',
      'wide leg': 'pantalon large',
      'skinny': 'serré',
      'straight': 'droit',
      'bootcut': 'bootcut',
      'flare': 'évasé',
      'pencil': 'crayon',
      'a-line': 'trapèze',
      'a line': 'trapèze',
      'empire': 'empire',
      'wrap': 'enveloppant',
      'asymmetric': 'asymétrique',
      'pleated': 'plissé',
      'gathered': 'ramassé',
      'ruched': 'ruché',
      'tiered': 'à étages',
      'layered': 'superposé',
      
      // Détails et finitions
      'button-down': 'à boutons',
      'button down': 'à boutons',
      'zipper': 'fermeture éclair',
      'hook-and-eye': 'crochet et œillet',
      'hook and eye': 'crochet et œillet',
      'snap': 'bouton-pression',
      'velcro': 'velcro',
      'elastic': 'élastique',
      'drawstring': 'cordon',
      'belted': 'avec ceinture',
      'pocket': 'avec poche',
      'pockets': 'avec poches',
      'collar': 'avec col',
      'collarless': 'sans col',
      'hooded': 'avec capuche',
      'hood': 'avec capuche',
      'cuffed': 'avec poignet',
      'cuff': 'avec poignet',
      'ankle-length': 'longueur cheville',
      'ankle length': 'longueur cheville',
      'knee-length': 'longueur genou',
      'knee length': 'longueur genou',
      'above-knee': 'au-dessus du genou',
      'above knee': 'au-dessus du genou',
      'below-knee': 'en-dessous du genou',
      'below knee': 'en-dessous du genou',
      'floor-length': 'longueur sol',
      'floor length': 'longueur sol',
      'cropped': 'crop',
      'full-length': 'longueur complète',
      'full length': 'longueur complète'
    }
    // Stockage local des traductions personnalisées (clé → valeur)
    this.customKey = 'mc_custom_translations'
    this.apiBase = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? `${window.location.origin.replace(/:\\d+$/, '')}:3001/api`
      : '/api'
  }

  // Récupérer la liste des traductions personnalisées [{key, value}]
  getCustomTranslations() {
    try {
      const raw = localStorage.getItem(this.customKey)
      const obj = raw ? JSON.parse(raw) : {}
      return Object.entries(obj).map(([key, value]) => ({ key, value }))
    } catch (e) {
      return []
    }
  }

  // Ajouter ou mettre à jour une traduction personnalisée
  upsertCustomTranslation(key, value) {
    const k = String(key || '').trim()
    const v = String(value || '').trim()
    if (!k || !v) return
    // Sauvegarde locale immédiate (optimiste)
    const raw = localStorage.getItem(this.customKey)
    const obj = raw ? JSON.parse(raw) : {}
    obj[k] = v
    localStorage.setItem(this.customKey, JSON.stringify(obj))
    // Sauvegarde serveur
    fetch(`${this.apiBase}/translations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: k, value: v })
    }).catch(() => {})
  }

  // Supprimer une traduction personnalisée
  removeCustomTranslation(key) {
    const raw = localStorage.getItem(this.customKey)
    const obj = raw ? JSON.parse(raw) : {}
    if (key in obj) {
      delete obj[key]
      localStorage.setItem(this.customKey, JSON.stringify(obj))
    }
    fetch(`${this.apiBase}/translations/${encodeURIComponent(key)}`, { method: 'DELETE' }).catch(() => {})
  }

  // Synchroniser depuis la BDD vers le localStorage (à appeler à l'ouverture de l'onglet)
  async syncCustomTranslations() {
    try {
      const res = await fetch(`${this.apiBase}/translations`)
      if (!res.ok) return
      const data = await res.json()
      if (data && Array.isArray(data.items)) {
        const obj = {}
        for (const { key, value } of data.items) obj[key] = value
        localStorage.setItem(this.customKey, JSON.stringify(obj))
      }
    } catch (error) {
      console.warn('Erreur chargement traductions personnalisées:', error)
    }
  }

  // Fonction principale de traduction
  async translateToFrench(text) {
    if (!text || typeof text !== 'string') return text
    
    try {
      
      // Détecter si le texte est déjà en français (plus strict)
      const frenchPattern = /[àáâãäåçèéêëìíîïòóôõöùúûüýÿœæ]/i
      const englishHint = /\b(the|and|or|but|in|on|at|to|for|of|with|by|from|over|under|between|before|after|since|until|while|when|where|why|how|what|which|who|whom|whose|this|that|these|those|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall|black|white|blue|navy|cotton|silk|linen|wool|dress|skirt|blouse|shirt|trousers|pants|buttons?|buttoned|embroidered|polka|dot|long|short|knitted|sunglasses|sequins?)\b/i
      if (frenchPattern.test(text) && !englishHint.test(text)) {
        console.log('✅ Texte majoritairement en français, pas de traduction nécessaire')
        return text
      }
      
      // Traiter le texte en gardant READY-TO-SHIP et certaines marques en l'état
      let processedText = text
      let readyToShipPart = ''
      let laGateePart = ''
      let collectionPrefixPart = ''

      // Préserver tout préfixe avant le premier tiret comme nom de collection
      const collectionMatch = processedText.match(/^\s*(.*?)\s*-\s*(.+)$/)
      if (collectionMatch && collectionMatch[1]) {
        collectionPrefixPart = collectionMatch[1]
        processedText = `COLLECTION_PREFIX_PLACEHOLDER - ${collectionMatch[2]}`
        console.log('🔖 Préfixe collection préservé:', collectionPrefixPart)
      }
      
      // Extraire READY-TO-SHIP si présent (gérer espaces et tirets)
      const readyToShipRegex = /(ready\s*-\s*to\s*-\s*ship|ready\s*to\s*ship)/i
      if (readyToShipRegex.test(text)) {
        console.log('🚫 Terme READY-TO-SHIP détecté, sera conservé en anglais')
        
        // Trouver la partie READY-TO-SHIP (toutes variantes)
        const readyToShipMatch = text.match(readyToShipRegex)
        if (readyToShipMatch) {
          readyToShipPart = readyToShipMatch[0]
          // Remplacer temporairement par un marqueur unique
          processedText = text.replace(readyToShipMatch[0], 'READY_TOTO_SHIP_PLACEHOLDER_SPECIAL')
        }
      }

      // Préserver « LA GÂTÉE » (ou variantes sans accent/espaces) et traduire le reste
      const laGateeRegex = /(la\s*g[aâ]t[ée]e)/i
      if (laGateeRegex.test(processedText)) {
        const match = processedText.match(laGateeRegex)
        if (match) {
          laGateePart = match[0]
          processedText = processedText.replace(match[0], 'BRAND_LA_GATEE_PLACEHOLDER')
        }
      }
      
      // Appliquer les traductions manuelles d'abord
      let translatedText = this.applyManualTranslations(processedText)
      console.log('📝 Après traductions manuelles:', translatedText)
      
      // Si le texte a été entièrement traduit manuellement, le retourner
      if (this.isFullyTranslated(translatedText)) {
        console.log('✅ Traduction manuelle complète')
        let result = this.formatText(translatedText)
        
        // Restaurer READY-TO-SHIP si présent (chercher le marqueur spécial)
        if (readyToShipPart) {
          result = result.replace(/ready_toto_ship_placeholder_special/gi, readyToShipPart)
          console.log('🔄 READY-TO-SHIP restauré:', result)
        }
        // Restaurer LA GÂTÉE si présent
        if (laGateePart) {
          result = result.replace(/brand_la_gatee_placeholder/gi, laGateePart)
        }
        // Restaurer le préfixe collection si présent
        if (collectionPrefixPart) {
          result = result.replace(/collection_prefix_placeholder/gi, collectionPrefixPart)
        }
        
        return result
      }
      
      // Sinon, utiliser Google Translate pour les parties non traduites
      console.log('🌐 Utilisation de Google Translate pour:', translatedText)
      const googleTranslated = await this.translateWithGoogle(translatedText)
      console.log('🌐 Résultat Google Translate:', googleTranslated)
      
      let finalResult = this.formatText(googleTranslated)
      
      // Restaurer READY-TO-SHIP si présent (chercher le marqueur spécial)
      if (readyToShipPart) {
        finalResult = finalResult.replace(/ready_toto_ship_placeholder_special/gi, readyToShipPart)
        console.log('🔄 READY-TO-SHIP restauré (Google):', finalResult)
      }
      // Restaurer LA GÂTÉE si présent
      if (laGateePart) {
        finalResult = finalResult.replace(/brand_la_gatee_placeholder/gi, laGateePart)
      }
      // Restaurer le préfixe collection si présent
      if (collectionPrefixPart) {
        finalResult = finalResult.replace(/collection_prefix_placeholder/gi, collectionPrefixPart)
      }
      
      console.log('✨ Résultat final formaté:', finalResult)
      
      return finalResult
      
    } catch (error) {
      console.error('❌ Erreur lors de la traduction:', error)
      return text // Retourner le texte original en cas d'erreur
    }
  }

  // Appliquer les traductions manuelles
  applyManualTranslations(text) {
    let translatedText = text.toLowerCase()

    // 1) Appliquer d'abord les traductions personnalisées exactes (prioritaires)
    try {
      const raw = localStorage.getItem(this.customKey)
      const custom = raw ? JSON.parse(raw) : {}
      Object.entries(custom).forEach(([k, v]) => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
        translatedText = translatedText.replace(regex, v)
      })
    } catch (error) {
      console.warn('Erreur remplacement termes techniques:', error)
    }
    
    // Remplacer les termes techniques
    Object.entries(this.manualTranslations).forEach(([english, french]) => {
      const regex = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      translatedText = translatedText.replace(regex, french)
    })
    
    // Traductions supplémentaires spécifiques
    const additionalTranslations = {
      'lore': 'lore', // Garder le nom de marque
      'marina': 'marina', // Garder le nom
      'tristana': 'tristana', // Garder le nom
      'marled': 'mélangé',
      'candy': 'bonbon',
      'buttons': 'boutons',
      'button': 'bouton',
      'buttoned': 'à boutons',
      'mermaid': 'sirène',
      'sequin': 'paillettes',
      'sequins': 'paillettes',
      'sunglasses': 'lunettes de soleil',
      'sunglass': 'lunettes de soleil',
      'mother-of-pearl': 'nacre',
      'mother of pearl': 'nacre',
      'mother-of-pearl buttons': 'boutons en nacre',
      'mother of pearl buttons': 'boutons en nacre',
      'organic cotton': 'coton biologique',
      'organic': 'biologique',
      'ruffled': 'à volants',
      'flared': 'évasée',
      'mid-length': 'mi-longue',
      'mid length': 'mi-longue',
      'long dress': 'robe longue',
      'knitted dress': 'robe tricotée',
      'english embroidered': 'broderie anglaise',
      'puffy sleeves': 'manches bouffantes',
      'puffy sleeve': 'manche bouffante',
      'puff sleeves': 'manches bouffantes',
      'puff sleeve': 'manche bouffante',
      'puffy': 'bouffant',
      'laced': 'à lacets',
      'inches': 'pouces',
      'neck': 'cou',
      'bust': 'buste',
      'waist': 'taille',
      'hips': 'hanches',
      'shoulder': 'épaule',
      'ankle': 'cheville',
      'knee': 'genou',
      'arm': 'bras',
      'length': 'longueur',
      'seam': 'couture',
      'over': 'sur',
      'under': 'sous',
      'above': 'au-dessus',
      'to': 'à',
      'are': 'sont',
      'in': 'en',
      'with': 'avec',
      'all': 'toutes',
      'sizes': 'tailles',
      'fw22': 'fw22', // Garder la référence de collection
      'runway': 'défilé',
      'look': 'look',
      'black': 'noir',
      'ice': 'glace'
    }
    
    Object.entries(additionalTranslations).forEach(([english, french]) => {
      const regex = new RegExp(`\\b${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      translatedText = translatedText.replace(regex, french)
    })
    
    return translatedText
  }

  // Vérifier si le texte est entièrement traduit manuellement
  isFullyTranslated(text) {
    // Si le texte contient encore des mots anglais typiques, il n'est pas entièrement traduit
    const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by|from|up|down|out|off|over|under|between|among|through|during|before|after|since|until|while|when|where|why|how|what|which|who|whom|whose|this|that|these|those|a|an|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall|buttoned|runway|look|black|ready|ship|organic|ruffled|flared|mid\s*-?length|english|embroidered|sequins?|puffy|puff|laced|sleeves?)\b/i
    const hasEnglishWords = englishWords.test(text)
    
    if (hasEnglishWords) {
      console.log('⚠️ Mots anglais détectés, utilisation de Google Translate')
    }
    
    return !hasEnglishWords
  }

  // Traduire avec Google Translate
  async translateWithGoogle(text) {
    try {
      // Pour les textes longs, les diviser en parties plus petites
      if (text.length > 500) {
        console.log('📏 Texte long détecté, division en parties...')
        return await this.translateLongText(text)
      }
      
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(text)}`)
      
      if (!response.ok) {
        throw new Error('Erreur de traduction Google')
      }
      
      const data = await response.json()
      const translatedText = data[0]?.[0]?.[0] || text
      
      return translatedText
    } catch (error) {
      console.error('Erreur Google Translate:', error)
      return text
    }
  }

  // Traduire les textes longs en les divisant
  async translateLongText(text) {
    try {
      // Diviser le texte en phrases
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
      const translatedParts = []
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim()
        if (sentence.length > 0) {
          console.log(`🔄 Traduction partie ${i + 1}/${sentences.length}:`, sentence)
          
          try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(sentence)}`)
            
            if (response.ok) {
              const data = await response.json()
              const translatedSentence = data[0]?.[0]?.[0] || sentence
              translatedParts.push(translatedSentence)
            } else {
              translatedParts.push(sentence)
            }
          } catch (error) {
            console.warn(`⚠️ Erreur traduction partie ${i + 1}:`, error)
            translatedParts.push(sentence)
          }
          
          // Pause entre les requêtes pour éviter la limitation
          if (i < sentences.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      }
      
      const result = translatedParts.join('. ')
      console.log('🔗 Texte long traduit:', result)
      return result
      
    } catch (error) {
      console.error('❌ Erreur traduction texte long:', error)
      return text
    }
  }

  // Formater le texte final
  formatText(text) {
    if (!text) return text
    
    // Nettoyer les erreurs de traduction courantes
    let cleanedText = text
      .replace(/REAT/g, 'Taille')
      .replace(/HIPS/g, 'Hanches')
      .replace(/AU - Dessus/g, 'Au-dessus')
      .replace(/»4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4»/g, '4″')
      .replace(/4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″ 4 ″/g, '4″')
      .replace(/\bmarine\s+bleu\b/gi, 'bleu marine')
      .replace(/\bbleu\s+marines\b/gi, 'bleu marine')
      .replace(/\bmarine\b/gi, (m) => (/(bleu|navy)/i.test(text) ? 'marine' : m))
    
    // Capitaliser la première lettre de chaque mot important
    const words = cleanedText.split(' ')
    const capitalizedWords = words.map((word, index) => {
      if (index === 0 || word.length > 2) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    
    let formattedText = capitalizedWords.join(' ')
    
    // Nettoyer et formater
    formattedText = formattedText
      .replace(/\s+/g, ' ') // Supprimer les espaces multiples
      .replace(/^\s+|\s+$/g, '') // Supprimer les espaces en début/fin
      .replace(/\s*-\s*/g, ' - ') // Espacer les tirets
      .replace(/\s*,\s*/g, ', ') // Espacer les virgules
      .replace(/\s*&\s*/g, ' & ') // Espacer les &
    
    return formattedText
  }
}

// Instance singleton
const translationService = new TranslationService()

export default translationService
