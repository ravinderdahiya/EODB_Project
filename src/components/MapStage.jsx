const DISCLAIMER =
  "All the revenue information displayed on these maps is based on the data provided by Haryana Revenue Department. HARSAC is not responsible for any discrepancy in the data, if any. This information on the map is not for any dispute in the court of law. It is for viewing purposes only. The map scale is 1:10,000.";

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
      <div className="map-disclaimer" aria-label="Disclaimer">
        <span className="map-disclaimer__track">
          {DISCLAIMER}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{DISCLAIMER}
        </span>
      </div>
    </section>
  );
}
