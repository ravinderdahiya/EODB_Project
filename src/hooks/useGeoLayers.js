import { useEffect, useState } from 'react'
import { LAYER_CONFIG } from '../config/layers'

const emptyState = Object.fromEntries(
  LAYER_CONFIG.map((layer) => [layer.id, { type: 'FeatureCollection', features: [] }]),
)

export function useGeoLayers() {
  const [data, setData] = useState(emptyState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadLayers() {
      setLoading(true)
      setError('')

      try {
        const responses = await Promise.all(
          LAYER_CONFIG.map(async (layer) => {
            const response = await fetch(layer.url)

            if (!response.ok) {
              throw new Error(`Failed to load ${layer.label}`)
            }

            const json = await response.json()
            return [layer.id, json]
          }),
        )

        if (!cancelled) {
          setData(Object.fromEntries(responses))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Unable to load GIS layers.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLayers()

    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
