import { useMemo, useState } from 'react'
import './App.css'
import FooterBar from './components/FooterBar'
import Header from './components/Header'
import LayerPanel from './components/LayerPanel'
import LegendPanel from './components/LegendPanel'
import LoadingOverlay from './components/LoadingOverlay'
import MapToolbar from './components/MapToolbar'
import SearchBar from './components/SearchBar'
import SidebarPanel from './components/SidebarPanel'
import StatusBar from './components/StatusBar'
import { LAYER_CONFIG } from './config/layers'
import { useGeoLayers } from './hooks/useGeoLayers'
import GISMap from './map/GISMap'

function App() {
  const { data, loading, error } = useGeoLayers()
  const [activeBaseMap, setActiveBaseMap] = useState('satellite')
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true)
  const [isLegendOpen, setIsLegendOpen] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [mapZoom, setMapZoom] = useState(8)
  const [coordinates, setCoordinates] = useState({ lat: 29.05, lng: 76.08 })
  const [toolbarAction, setToolbarAction] = useState(null)
  const [layerVisibility, setLayerVisibility] = useState(() =>
    Object.fromEntries(LAYER_CONFIG.map((layer) => [layer.id, layer.defaultVisible])),
  )

  const searchableFeatures = useMemo(
    () =>
      LAYER_CONFIG.flatMap((layer) =>
        (data[layer.id]?.features ?? []).map((feature) => {
          const name =
            feature.properties?.name ||
            feature.properties?.district ||
            feature.properties?.tehsil ||
            feature.properties?.village ||
            'Unnamed feature'

          return {
            id: `${layer.id}-${feature.properties?.id ?? feature.properties?.dt_code ?? name}`,
            name,
            subtitle: layer.label,
            layerId: layer.id,
            feature,
          }
        }),
      ),
    [data],
  )

  const counts = useMemo(
    () =>
      Object.fromEntries(
        LAYER_CONFIG.map((layer) => [layer.id, data[layer.id]?.features?.length ?? 0]),
      ),
    [data],
  )

  const triggerAction = (type, payload = {}) => {
    setToolbarAction({
      id: `${type}-${Date.now()}`,
      type,
      payload,
    })
  }

  const handleLayerToggle = (layerId) => {
    setLayerVisibility((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }))
  }

  const handleSearchSelect = (item) => {
    setSelectedFeature(item)
    setIsSidebarOpen(true)
    triggerAction('focusFeature', { feature: item.feature, layerId: item.layerId })
  }

  const selectedFeatureDetails = selectedFeature?.feature?.properties ?? null

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <Header
        activeBaseMap={activeBaseMap}
        onBaseMapChange={setActiveBaseMap}
        onMenuToggle={() => setIsSidebarOpen((current) => !current)}
      />
      {isSidebarOpen ? (
        <button
          aria-label="Close sidebar"
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <main className="app-main">
        <GISMap
          activeBaseMap={activeBaseMap}
          data={data}
          layerVisibility={layerVisibility}
          onFeatureSelect={(feature) => {
            setSelectedFeature(feature)
            setIsSidebarOpen(true)
          }}
          onMapMove={setCoordinates}
          onZoomChange={setMapZoom}
          toolbarAction={toolbarAction}
        />

        <div className="top-right-stack">
          <SearchBar
            disabled={loading}
            items={searchableFeatures}
            onSelect={handleSearchSelect}
          />
        </div>

        <div className="left-stack">
          <MapToolbar
            onAction={triggerAction}
            onToggleLayers={() => setIsLayerPanelOpen((current) => !current)}
            onToggleLegend={() => setIsLegendOpen((current) => !current)}
          />
        </div>

        <div className="left-bottom-stack">
          <LayerPanel
            counts={counts}
            isOpen={isLayerPanelOpen}
            layerVisibility={layerVisibility}
            mapZoom={mapZoom}
            onHeaderToggle={() => setIsLayerPanelOpen((current) => !current)}
            onToggle={handleLayerToggle}
          />
          <LegendPanel isOpen={isLegendOpen} />
        </div>

        <div className="right-stack">
          <SidebarPanel
            counts={counts}
            error={error}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            selectedFeature={selectedFeatureDetails}
          />
        </div>

        <div className="bottom-stack">
          <StatusBar coordinates={coordinates} mapZoom={mapZoom} selectedFeature={selectedFeature} />
          <FooterBar />
        </div>

        {loading ? <LoadingOverlay /> : null}
        {error ? <div className="error-banner">{error}</div> : null}
      </main>
    </div>
  )
}

export default App
