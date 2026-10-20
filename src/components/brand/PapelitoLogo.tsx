/** Logotipo Papelito (wordmark oficial, cor = currentColor). Uso interno da Papelito Brasil. */
export function PapelitoWordmark({ className, title = 'Papelito' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 1194 182" className={className} role="img" aria-label={title} fill="currentColor">
      <path d="M316.952 181.335H343.641L360.25 127.313L440.234 115.541L452.812 0.0806339H309.857L316.952 181.335Z" />
      <path d="M195.445 0.0806339L122.798 181.335H146.342L197.38 124.652H204.314L257.771 181.335H305.019L229.954 0.0806339H195.445Z" />
      <path d="M136.666 0.0806339H0V181.335H26.6882L48.3774 120.137L136.666 94.0133V0.0806339Z" />
      <path d="M519.815 113.203L572.385 100.141V77.1619L519.573 67.4058V46.281L601.492 34.7511V0.0806339H474.743V181.335H603.75V146.745L519.815 132.473V113.203Z" />
      <path d="M863.052 59.101L915.3 55.1502L921.347 181.335H971.74L974.562 50.7156L1021.97 46.9261L1022.29 0.0806339H863.133L863.052 59.101Z" />
      <path d="M1148.64 0.0806339H1046.97L1033.82 129.168L1060.51 181.335H1168.88L1193.07 91.272C1192.74 87.6437 1148.96 0.0806339 1148.56 0.0806339H1148.64Z" />
      <path d="M790.002 0L781.294 181.335H845.233L836.525 0H790.002Z" />
      <path d="M693.086 0.0806339H624.391V181.335H759.525V118.525L662.044 142.31L693.086 0.0806339Z" />
    </svg>
  );
}

/** Assinatura do sistema: PAPELITO + selo "Circular". */
export function CircularLogo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${dark ? 'text-white' : 'text-ink'} ${className ?? ''}`}>
      <PapelitoWordmark className="h-[15px] w-auto" title="Papelito" />
      <span className="bg-brand-500 px-1.5 py-[3px] font-display text-[10px] uppercase leading-none tracking-[0.04em] text-ink">Circular</span>
    </span>
  );
}
