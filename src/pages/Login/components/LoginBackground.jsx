import "./LoginBackground.css";

export default function LoginBackground({ backgrounds, activeIndex }) {
  return (
    <div className="lp-bg-carousel" aria-hidden="true">
      {backgrounds.map((src, index) => (
        <div
          key={src}
          className={`lp-bg-slide${index === activeIndex ? " lp-bg-slide--active" : ""}`}
          style={{ backgroundImage: `url("${src}")` }}
        />
      ))}
    </div>
  );
}
