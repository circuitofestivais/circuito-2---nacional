const URL_RE = /(https?:\/\/[^\s)\]}>,;]+)/gi;

export function splitLinks(text: string) {
  return text.split(URL_RE).filter(Boolean).map((part) => ({
    text: part,
    href: /^https?:\/\//i.test(part) ? part : null,
  }));
}

export function cleanDisplay(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || "Não disponível";
}
