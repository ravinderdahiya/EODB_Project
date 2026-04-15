export default function MapStage({
  mapStatus,
  children,
  mapRef,
}) {
  return (
    <section className="map-stage">
      <div className="map-stage__viewport">
        <div className="map-stage__canvas" ref={mapRef} />
        <div className="map-stage__status">{mapStatus}</div>
        {children}
      </div>
    </section>
  );
}
