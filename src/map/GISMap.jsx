import { useEffect, useMemo } from 'react'
import { GeoJSON, MapContainer, ScaleControl, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { BASEMAPS, HARYANA_CENTER, LAYER_CONFIG, getFeatureLabel } from '../config/layers'

function MapEffects({ onMapMove, onZoomChange, toolbarAction }) {
  const map = useMap()

  useMapEvents({
    mousemove(event) {
      onMapMove(event.latlng)
    },
    zoomend() {
      onZoomChange(map.getZoom())
    },
    moveend() {
      const center = map.getCenter()
      onMapMove(center)
    },
  })

  useEffect(() => {
    onZoomChange(map.getZoom())
    const center = map.getCenter()
    onMapMove(center)
  }, [map, onMapMove, onZoomChange])

  useEffect(() => {
    if (!toolbarAction) {
      return
    }

    if (toolbarAction.type === 'zoomIn') {
      map.zoomIn()
    }

    if (toolbarAction.type === 'zoomOut') {
      map.zoomOut()
    }

    if (toolbarAction.type === 'home') {
      map.setView(HARYANA_CENTER, 8, { animate: true })
    }

    if (toolbarAction.type === 'locate') {
      map.locate({ setView: true, maxZoom: 13 })
    }

    if (toolbarAction.type === 'focusFeature' && toolbarAction.payload?.feature) {
      const featureLayer = L.geoJSON(toolbarAction.payload.feature)
      map.fitBounds(featureLayer.getBounds(), { padding: [48, 48] })
    }
  }, [map, toolbarAction])

  return null
}

function FeatureLayer({ featureCollection, isVisible, layerConfig, onFeatureSelect }) {
  const map = useMap()
  const currentZoom = map.getZoom()

  const style = useMemo(
    () => ({
      ...layerConfig.style,
      opacity: isVisible && currentZoom >= layerConfig.minZoom ? layerConfig.style.opacity : 0,
      fillOpacity:
        isVisible && currentZoom >= layerConfig.minZoom ? layerConfig.style.fillOpacity : 0,
    }),
    [currentZoom, isVisible, layerConfig],
  )

  if (!featureCollection?.features?.length) {
    return null
  }

  if (!isVisible || currentZoom < layerConfig.minZoom) {
    return null
  }

  return (
    <GeoJSON
      data={featureCollection}
      key={`${layerConfig.id}-${currentZoom}`}
      style={() => style}
      onEachFeature={(feature, layer) => {
        const label = getFeatureLabel(layerConfig.id, feature)
        layer.bindTooltip(label, { sticky: true })
        const details = Object.entries(feature.properties ?? {})
          .map(([key, value]) => `<div><strong>${key}:</strong> ${String(value)}</div>`)
          .join('')
        layer.bindPopup(
          `<div class="map-popup"><div class="map-popup-title">${label}</div><div class="map-popup-subtitle">${layerConfig.label}</div>${details}</div>`,
        )
        layer.on({
          click() {
            onFeatureSelect({
              layerId: layerConfig.id,
              name: label,
              feature,
            })
          },
          mouseover() {
            layer.setStyle({
              weight: Math.max(layerConfig.style.weight + 1.1, 2.6),
              fillOpacity: Math.min((layerConfig.style.fillOpacity ?? 0.04) + 0.06, 0.18),
            })
          },
          mouseout(event) {
            event.target.setStyle(style)
          },
        })
      }}
    />
  )
}

function GISMap({
  activeBaseMap,
  data,
  layerVisibility,
  onFeatureSelect,
  onMapMove,
  onZoomChange,
  toolbarAction,
}) {
  return (
    <MapContainer
      attributionControl
      center={HARYANA_CENTER}
      className="gis-map"
      scrollWheelZoom
      zoom={8}
      zoomControl={false}
    >
      <TileLayer
        attribution={BASEMAPS[activeBaseMap].attribution}
        url={BASEMAPS[activeBaseMap].url}
      />
      {activeBaseMap === 'satellite' ? (
        <TileLayer
          attribution="Labels © Esri"
          opacity={0.8}
          url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        />
      ) : null}

      {LAYER_CONFIG.map((layer) => (
        <FeatureLayer
          key={layer.id}
          featureCollection={data[layer.id]}
          isVisible={layerVisibility[layer.id]}
          layerConfig={layer}
          onFeatureSelect={onFeatureSelect}
        />
      ))}

      <ScaleControl imperial={false} position="bottomright" />
      <MapEffects
        onMapMove={onMapMove}
        onZoomChange={onZoomChange}
        toolbarAction={toolbarAction}
      />
    </MapContainer>
  )
}

export default GISMap
