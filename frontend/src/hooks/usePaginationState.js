/**
 * Hook spécialisé pour la gestion de la pagination
 * Responsabilité unique: état de pagination et chargement progressif
 */
import { useState, useCallback } from 'react'

export const usePaginationState = (initialBatchSize = 15) => {
  const [visibleArticles, setVisibleArticles] = useState([])
  const [currentBatch, setCurrentBatch] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [visibleCount, setVisibleCount] = useState(280)

  // Charger plus d'articles
  const loadMore = useCallback((allArticles, batchSize = initialBatchSize) => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    
    const startIndex = currentBatch * batchSize
    const endIndex = startIndex + batchSize
    const newArticles = allArticles.slice(startIndex, endIndex)
    
    if (newArticles.length === 0) {
      setHasMore(false)
      setIsLoadingMore(false)
      return
    }

    setVisibleArticles(prev => [...prev, ...newArticles])
    setCurrentBatch(prev => prev + 1)
    setIsLoadingMore(false)
  }, [currentBatch, isLoadingMore, hasMore, initialBatchSize])

  // Réinitialiser la pagination
  const resetPagination = useCallback(() => {
    setVisibleArticles([])
    setCurrentBatch(0)
    setIsLoadingMore(false)
    setHasMore(true)
  }, [])

  // Définir les articles visibles
  const setVisibleArticlesDirect = useCallback((articles) => {
    setVisibleArticles(articles)
    setCurrentBatch(0)
    setHasMore(articles.length > initialBatchSize)
  }, [initialBatchSize])

  return {
    visibleArticles,
    currentBatch,
    isLoadingMore,
    hasMore,
    visibleCount,
    setVisibleCount,
    loadMore,
    resetPagination,
    setVisibleArticles: setVisibleArticlesDirect
  }
}

export default usePaginationState
