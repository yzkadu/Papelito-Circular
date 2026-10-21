import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { authMode } from '../auth/supabase';
import { PapelitoWordmark } from '../components/brand/PapelitoLogo';
import './landing.css';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4';

const d = (s: number, extra?: CSSProperties) => ({ '--d': `${s}s`, ...extra }) as CSSProperties;

const NAV = [
  { to: '/app', label: 'Dashboard', anim: 'a-scale', delay: 0.16 },
  { to: '/app/producao/maquinas', label: 'Produção', anim: 'a-soft', delay: 0.28 },
  { to: '/app/coletas', label: 'Coletas', anim: 'a-scale', delay: 0.4 },
  { to: '/app/metodologia', label: 'Metodologia', anim: 'a-soft', delay: 0.52 },
];

export default function Landing() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('is-landing');
    document.title = 'Papelito Circular — Gestão industrial circular';
    return () => {
      document.documentElement.classList.remove('is-landing');
      document.title = 'Papelito Circular';
    };
  }, []);

  // Marca cada elemento como concluído ao fim da animação; se as animações não rodarem, mostra tudo.
  useEffect(() => {
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>('.vl-appear') ?? []);
    els.forEach((el) => el.addEventListener('animationend', () => el.classList.add('is-in'), { once: true }));
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const running = els.some((el) => el.getAnimations?.().some((a) => a.playState === 'running' || a.playState === 'finished'));
        if (!running) els.forEach((el) => el.classList.add('is-in'));
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const mq = window.matchMedia?.('(min-width: 901px)');
    const onMq = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    mq?.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);

  return (
    <div ref={root} className={`vl${open ? ' menu-open' : ''}`}>
      <video className="vl-video" src={HERO_VIDEO} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
      <div className="vl-page">
        <div className="vl-backdrop" onClick={() => setOpen(false)} />
        <header className="vl-header">
          <Link to="/" className="vl-logo vl-appear a-scale" style={d(0.08)} aria-label="Papelito Circular">
            <PapelitoWordmark className="vl-wordmark" />
            <span className="suffix">Circular</span>
          </Link>
          <nav id="vl-nav" className="vl-nav" aria-label="Principal">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={`vl-appear ${n.anim}`} style={d(n.delay)} onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <Link to={authMode ? "/login" : "/app"} className="vl-btn vl-solid vl-header-cta vl-appear a-scale" style={d(0.34)}>
            {authMode ? 'Entrar no sistema' : 'Acessar demonstração'}
          </Link>
          <button
            className="vl-burger vl-appear a-scale"
            style={d(0.34)}
            aria-controls="vl-nav"
            aria-expanded={open}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="bars">
              <span />
              <span />
              <span />
            </span>
          </button>
        </header>

        <main className="vl-hero" id="top">
          <div className="vl-copy">
            <span className="vl-badge vl-appear a-pop" style={d(0.22)}>
              <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Gestão industrial circular · Papelito Brasil
            </span>
            <h1>
              <span className="vl-line">
                <span className="vl-appear a-mask" style={d(0.42, { display: 'inline-block' })}>
                  Do papel produzido à <em>apara reciclada</em>
                </span>
              </span>
              <span className="vl-line">
                <span className="vl-appear a-mask" style={d(0.62, { display: 'inline-block' })}>
                  em um só fluxo rastreável.
                </span>
              </span>
            </h1>
            <p className="vl-lede vl-appear a-soft" style={d(0.82, { animationDuration: '1.25s' })}>
              Registre a produção, classifique aparas e perdas, controle o estoque de resíduos e acompanhe as coletas da Capital Recicláveis — com indicadores calculados a partir dos lançamentos.
            </p>
            <div className="vl-actions">
              <Link to={authMode ? "/login" : "/app"} className="vl-btn vl-solid vl-appear a-btn" style={d(0.96)}>
                Acessar demonstração
              </Link>
              <Link to="/app/metodologia" className="vl-btn vl-ghost vl-appear a-side" style={d(1.1)}>
                Ver como os indicadores são calculados
              </Link>
            </div>
          </div>
        </main>

        <footer className="vl-stats">
          <span className="vl-stat vl-appear a-stat" style={d(1.12)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id="vlg1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity="0.38" /><stop offset="1" stopColor="#3a3a3a" stopOpacity="0.62" /></linearGradient>
                <linearGradient id="vlg2" x1="13" y1="2" x2="24" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#3a3a3a" stopOpacity="0.38" /><stop offset="1" stopColor="#fff" stopOpacity="0.62" /></linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#vlg1)" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#vlg2)" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            7 módulos integrados: produção, aparas, estoque e coletas
          </span>
          <span className="vl-stat vl-appear a-stat" style={d(1.28)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#fff" />
              <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            Indicadores com fórmula e origem documentadas
          </span>
          <span className="vl-stat vl-appear a-stat" style={d(1.44)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#f26b1d" />
              <text x="12" y="16.2" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="12" fill="#fff">!</text>
            </svg>
            Protótipo Fase 1 · dados fictícios · sem autenticação real
          </span>
        </footer>
      </div>
    </div>
  );
}
