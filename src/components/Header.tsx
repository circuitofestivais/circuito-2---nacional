type HeaderProps = {
  count?: number;
  admin?: boolean;
  onHome?: () => void;
};

export function Header({ count, admin = false, onHome }: HeaderProps) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href={admin ? "#" : new URL(".", document.baseURI).pathname}
        onClick={onHome}
        aria-label="Circuito de Festivais — início"
      >
        <span className="brand-mark" aria-hidden="true">CF</span>
        <span>Circuito de Festivais</span>
      </a>
      <nav aria-label="Navegação principal">
        <a href={new URL(".", document.baseURI).pathname}>Festivais</a>
        {!admin && <a href="#fonte">Fonte</a>}
        <a href="#admin" aria-current={admin ? "page" : undefined}>Administração</a>
      </nav>
      {typeof count === "number" && (
        <span className="header-count" aria-label={`${count} festivais na base`}>
          {count.toLocaleString("pt-BR")}
        </span>
      )}
    </header>
  );
}
