import "./LoginFooter.css";

export default function LoginFooter({ t }) {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-bottom">
        <p>{t("login.copyright")}</p>
        <div className="lp-socials" aria-label="Social links" />
      </div>
    </footer>
  );
}
