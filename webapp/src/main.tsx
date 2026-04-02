import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
/** Altere para a senha real do painel admin */
const ADMIN_PASSWORD = "vidro2024";

/** URL do backend — altere em produção ou defina VITE_API_URL no .env */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";
const TENANT_ID = "afqa";

// ─── Types ────────────────────────────────────────────────────────────────────
type GlassType = "comum" | "temperado" | "laminado" | "espelho";
type Prices = Record<GlassType, number>;

type Slide = {
  id: string; title: string; subtitle: string;
  imageUrl: string; gradient: string; cta: string; ctaLink: string;
};
type Contact = {
  phones: string[]; emails: string[]; whatsapp: string; address: string; hours: string;
};
type PortfolioItem = {
  id: string; title: string; description: string; category: string; imageUrl: string;
};
type GalleryImage = { id: string; imageUrl: string; caption: string };
type VideoItem = { id: string; title: string; youtubeId: string; description: string };
type Social = { instagram: string; facebook: string; youtube: string; tiktok: string; linkedin: string };
type SiteSettings = { siteName: string; tagline: string };
type Testimonial = { id: string; name: string; service: string; text: string; rating: number };
type SiteConfig = {
  slides: Slide[]; contact: Contact; portfolio: PortfolioItem[]; gallery: GalleryImage[];
  videos: VideoItem[]; social: Social; settings: SiteSettings;
  testimonials: Testimonial[]; prices: Prices;
};
type AdminTab =
  | "banners" | "contatos" | "portfolio" | "galeria"
  | "videos" | "redes" | "config" | "precos" | "depoimentos";
type ServiceData = { id: string; icon: string; title: string; description: string; details: string[] };

// ─── Conteúdo padrão ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG: SiteConfig = {
  slides: [
    { id: "s1", title: "Vidros sob medida para sua obra", subtitle: "Box, sacadas, espelhos, portas e janelas. Instalação profissional com garantia de 2 anos.", imageUrl: "", gradient: "linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#2563eb 100%)", cta: "Calcular orçamento", ctaLink: "#calculadora" },
    { id: "s2", title: "Box de Banheiro com instalação inclusa", subtitle: "Vidro temperado 8mm, perfis em alumínio anodizado e garantia total.", imageUrl: "", gradient: "linear-gradient(135deg,#0c4a6e 0%,#075985 50%,#0284c7 100%)", cta: "Ver nosso portfólio", ctaLink: "#portfolio" },
    { id: "s3", title: "Sacadas e varandas fechadas", subtitle: "Vidro laminado com sistema deslizante. Mais conforto e segurança para sua família.", imageUrl: "", gradient: "linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4f46e5 100%)", cta: "Solicitar visita", ctaLink: "#contato" },
  ],
  contact: {
    phones: ["(11) 9999-9999", "(11) 8888-8888"],
    emails: ["contato@afqa.com.br"],
    whatsapp: "5511999999999",
    address: "Rua das Vidraças, 123 — São Paulo, SP",
    hours: "Segunda a Sábado: 8h às 18h",
  },
  portfolio: [
    { id: "p1", title: "Box Banheiro Suite", description: "Box em vidro temperado 8mm com perfil cromado e fixação invisível.", category: "Box de Banheiro", imageUrl: "" },
    { id: "p2", title: "Sacada Residencial", description: "Fechamento em vidro laminado 10mm com sistema deslizante.", category: "Sacadas", imageUrl: "" },
    { id: "p3", title: "Espelho Decorativo", description: "Espelho bisotado 6mm com moldura personalizada para sala.", category: "Espelhos", imageUrl: "" },
    { id: "p4", title: "Porta Pivotante", description: "Porta em vidro temperado 10mm com dobradiças em inox.", category: "Portas", imageUrl: "" },
    { id: "p5", title: "Janela Panorâmica", description: "Janela em vidro laminado com caixilho em alumínio.", category: "Janelas", imageUrl: "" },
    { id: "p6", title: "Fachada Comercial", description: "Fachada em vidro temperado para loja no centro comercial.", category: "Fachadas", imageUrl: "" },
  ],
  gallery: [
    { id: "g1", imageUrl: "", caption: "Box de banheiro instalado" },
    { id: "g2", imageUrl: "", caption: "Fechamento de sacada" },
    { id: "g3", imageUrl: "", caption: "Espelho decorativo" },
    { id: "g4", imageUrl: "", caption: "Porta de vidro" },
    { id: "g5", imageUrl: "", caption: "Janela panorâmica" },
    { id: "g6", imageUrl: "", caption: "Fachada comercial" },
  ],
  videos: [
    { id: "v1", title: "Como instalamos Box de Banheiro", youtubeId: "", description: "Veja o passo a passo completo da nossa instalação profissional." },
  ],
  social: { instagram: "", facebook: "", youtube: "", tiktok: "", linkedin: "" },
  settings: { siteName: "AFQA Vidraçaria", tagline: "Qualidade e transparência em vidros" },
  testimonials: [
    { id: "t1", name: "Maria S.", service: "Box de Banheiro", text: "Instalaram o box do meu banheiro e ficou perfeito! Equipe pontual, cuidadosa e o resultado superou as expectativas.", rating: 5 },
    { id: "t2", name: "João P.", service: "Fechamento de Sacada", text: "Fechamento da sacada ficou incrível. Serviço de alta qualidade, prazo cumprido e preço justo. Super indico!", rating: 5 },
    { id: "t3", name: "Ana C.", service: "Espelho Decorativo", text: "Fiz o espelho do quarto sob medida e adorei. Atendimento excelente desde o orçamento até a entrega.", rating: 5 },
    { id: "t4", name: "Carlos M.", service: "Porta de Vidro", text: "Porta de vidro temperado instalada com perfeição. Material top e mão de obra impecável. Muito satisfeito!", rating: 5 },
  ],
  prices: { comum: 80, temperado: 200, laminado: 350, espelho: 150 },
};

const GLASS_LABELS: Record<GlassType, string> = {
  comum: "Vidro Comum", temperado: "Vidro Temperado", laminado: "Vidro Laminado", espelho: "Espelho",
};

const SERVICES: ServiceData[] = [
  { id: "box", icon: "🚿", title: "Box de Banheiro", description: "Box em vidro temperado com perfis de alumínio. Modelos retos, quinas e redondos.", details: ["Vidro 8mm temperado", "Perfis em alumínio anodizado", "Garantia de 2 anos", "Instalação inclusa"] },
  { id: "sacadas", icon: "🏗️", title: "Fechamento de Sacadas", description: "Fechamento em vidro laminado ou temperado para sacadas e varandas.", details: ["Vidro laminado 10mm", "Sistema deslizante", "Proteção UV", "Alta segurança"] },
  { id: "espelhos", icon: "🪞", title: "Espelhos", description: "Espelhos bisotados, decorativos e de corpo inteiro para residências e comércio.", details: ["Espelho bronze ou prata", "Bisotado sob medida", "Molduras personalizadas", "Entrega e instalação"] },
  { id: "portas", icon: "🚪", title: "Portas de Vidro", description: "Portas pivotantes e de correr em vidro temperado para ambientes internos e externos.", details: ["Vidro temperado 10mm", "Dobradiças em inox", "Com ou sem moldura", "Alta durabilidade"] },
  { id: "janelas", icon: "🪟", title: "Janelas", description: "Janelas em vidro com caixilhos em alumínio, ideais para qualquer ambiente.", details: ["Vidro comum ou laminado", "Caixilho em alumínio", "Vedação anti-umidade", "Medidas especiais"] },
  { id: "fachadas", icon: "🏢", title: "Fachadas Comerciais", description: "Fachadas em vidro para lojas e escritórios. Elegância e modernidade.", details: ["Vidro temperado ou laminado", "Película de controle solar", "Design personalizado", "Projetos comerciais"] },
];

const ADMIN_TABS: { id: AdminTab; icon: string; label: string }[] = [
  { id: "banners",    icon: "🎨", label: "Banners"       },
  { id: "contatos",   icon: "📞", label: "Contatos"      },
  { id: "portfolio",  icon: "🏗️", label: "Portfólio"     },
  { id: "galeria",    icon: "📸", label: "Galeria"       },
  { id: "videos",     icon: "🎥", label: "Vídeos"        },
  { id: "redes",      icon: "🌐", label: "Redes Sociais" },
  { id: "config",     icon: "⚙️", label: "Configurações" },
  { id: "precos",     icon: "💰", label: "Preços"        },
  { id: "depoimentos",icon: "💬", label: "Depoimentos"   },
];

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadConfig(): SiteConfig {
  try {
    const saved = localStorage.getItem("afqa-site-config");
    if (saved) {
      const p = JSON.parse(saved);
      return {
        ...DEFAULT_CONFIG, ...p,
        contact:     { ...DEFAULT_CONFIG.contact,  ...p.contact  },
        social:      { ...DEFAULT_CONFIG.social,   ...p.social   },
        settings:    { ...DEFAULT_CONFIG.settings, ...p.settings },
        prices:      { ...DEFAULT_CONFIG.prices,   ...p.prices   },
        slides:      Array.isArray(p.slides)       ? p.slides       : DEFAULT_CONFIG.slides,
        portfolio:   Array.isArray(p.portfolio)    ? p.portfolio    : DEFAULT_CONFIG.portfolio,
        gallery:     Array.isArray(p.gallery)      ? p.gallery      : DEFAULT_CONFIG.gallery,
        videos:      Array.isArray(p.videos)       ? p.videos       : DEFAULT_CONFIG.videos,
        testimonials:Array.isArray(p.testimonials) ? p.testimonials : DEFAULT_CONFIG.testimonials,
      };
    }
  } catch (_) {}
  return { ...DEFAULT_CONFIG };
}
function saveConfig(c: SiteConfig) { localStorage.setItem("afqa-site-config", JSON.stringify(c)); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function money(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  return <span className="stars" aria-label={`${count} estrelas`}>{"★".repeat(count)}{"☆".repeat(5 - count)}</span>;
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
function Carousel({ slides, whatsapp }: { slides: Slide[]; whatsapp: string }) {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const next = useCallback(() => setCur((c) => (c + 1) % slides.length), [slides.length]);
  const prev = () => setCur((c) => (c - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    timer.current = setInterval(next, 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused, next, slides.length]);

  if (!slides.length) return null;
  const s = slides[cur];

  return (
    <section
      className="hero"
      style={s.imageUrl ? undefined : { background: s.gradient }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {s.imageUrl && <div className="hero-img-bg" style={{ backgroundImage: `url(${s.imageUrl})` }} />}
      {s.imageUrl && <div className="hero-overlay" />}
      <div className="container hero-content">
        <h1 className="hero-title" key={`t${cur}`}>{s.title}</h1>
        <p className="hero-sub" key={`d${cur}`}>{s.subtitle}</p>
        <div className="hero-ctas">
          <a href={s.ctaLink || "#"} className="btn btn-primary btn-lg">{s.cta}</a>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-lg">💬 WhatsApp</a>
        </div>
      </div>
      {slides.length > 1 && (
        <>
          <button className="carousel-btn carousel-prev" onClick={prev} aria-label="Anterior">‹</button>
          <button className="carousel-btn carousel-next" onClick={next} aria-label="Próximo">›</button>
          <div className="carousel-dots">
            {slides.map((_, i) => (
              <button key={i} className={`carousel-dot${i === cur ? " active" : ""}`} onClick={() => setCur(i)} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Service Modal ────────────────────────────────────────────────────────────
function ServiceModal({ service, whatsapp, onClose }: { service: ServiceData; whatsapp: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", fn);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", fn); };
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-icon">{service.icon}</div>
        <h2 className="modal-title">{service.title}</h2>
        <p className="modal-desc">{service.description}</p>
        <ul className="modal-list">{service.details.map((d) => <li key={d}>✓ {d}</li>)}</ul>
        <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Gostaria de um orçamento para ${service.title}.`)}`} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-block">💬 Solicitar Orçamento no WhatsApp</a>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ image, onClose }: { image: GalleryImage; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", fn);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", fn); };
  }, [onClose]);
  return (
    <div className="modal-overlay lightbox-overlay" onClick={onClose}>
      <div className="lightbox-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close lightbox-close" onClick={onClose}>✕</button>
        <img src={image.imageUrl} alt={image.caption} className="lightbox-img" />
        {image.caption && <p className="lightbox-caption">{image.caption}</p>}
      </div>
    </div>
  );
}

// ─── Admin components ─────────────────────────────────────────────────────────
function AField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="adm-field">
      <label className="adm-label">{label}</label>
      <input className="adm-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function AdminPanel({ config, onSave, onClose }: {
  config: SiteConfig; onSave: (c: SiteConfig) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("banners");
  const [d, setD] = useState<SiteConfig>(() => JSON.parse(JSON.stringify(config)));
  const upd = (key: keyof SiteConfig, val: unknown) => setD((prev) => ({ ...prev, [key]: val }));

  // Slides
  const addSlide = () => upd("slides", [...d.slides, { id: uid(), title: "Novo slide", subtitle: "", imageUrl: "", gradient: "linear-gradient(135deg,#1e40af,#2563eb)", cta: "Saiba mais", ctaLink: "#servicos" }]);
  const setSlide = (id: string, f: keyof Slide, v: string) => upd("slides", d.slides.map((s) => s.id === id ? { ...s, [f]: v } : s));
  const delSlide = (id: string) => upd("slides", d.slides.filter((s) => s.id !== id));

  // Portfolio
  const addPortfolio = () => upd("portfolio", [...d.portfolio, { id: uid(), title: "Nova obra", description: "", category: "Box de Banheiro", imageUrl: "" }]);
  const setPortfolio = (id: string, f: keyof PortfolioItem, v: string) => upd("portfolio", d.portfolio.map((p) => p.id === id ? { ...p, [f]: v } : p));
  const delPortfolio = (id: string) => upd("portfolio", d.portfolio.filter((p) => p.id !== id));

  // Gallery
  const addGallery = () => upd("gallery", [...d.gallery, { id: uid(), imageUrl: "", caption: "" }]);
  const setGallery = (id: string, f: keyof GalleryImage, v: string) => upd("gallery", d.gallery.map((g) => g.id === id ? { ...g, [f]: v } : g));
  const delGallery = (id: string) => upd("gallery", d.gallery.filter((g) => g.id !== id));

  // Videos
  const addVideo = () => upd("videos", [...d.videos, { id: uid(), title: "Novo vídeo", youtubeId: "", description: "" }]);
  const setVideo = (id: string, f: keyof VideoItem, v: string) => upd("videos", d.videos.map((v) => v.id === id ? { ...v, [f]: v } : v));
  // Hack to avoid shadowed variable name in map
  const setVideoField = (id: string, f: keyof VideoItem, v: string) => upd("videos", d.videos.map((item) => item.id === id ? { ...item, [f]: v } : item));
  const delVideo = (id: string) => upd("videos", d.videos.filter((v) => v.id !== id));

  // Testimonials
  const addTestimonial = () => upd("testimonials", [...d.testimonials, { id: uid(), name: "Novo cliente", service: "", text: "", rating: 5 }]);
  const setTestimonial = (id: string, f: keyof Testimonial, v: string | number) => upd("testimonials", d.testimonials.map((t) => t.id === id ? { ...t, [f]: v } : t));
  const delTestimonial = (id: string) => upd("testimonials", d.testimonials.filter((t) => t.id !== id));

  // Contact helpers
  const setPhone = (i: number, v: string) => { const ph = [...d.contact.phones]; ph[i] = v; upd("contact", { ...d.contact, phones: ph }); };
  const addPhone = () => upd("contact", { ...d.contact, phones: [...d.contact.phones, ""] });
  const delPhone = (i: number) => upd("contact", { ...d.contact, phones: d.contact.phones.filter((_, idx) => idx !== i) });
  const setEmail = (i: number, v: string) => { const em = [...d.contact.emails]; em[i] = v; upd("contact", { ...d.contact, emails: em }); };
  const addEmail = () => upd("contact", { ...d.contact, emails: [...d.contact.emails, ""] });
  const delEmail = (i: number) => upd("contact", { ...d.contact, emails: d.contact.emails.filter((_, idx) => idx !== i) });

  const renderContent = () => {
    switch (tab) {
      case "banners": return (
        <div className="adm-section">
          <div className="adm-section-header"><h3>Banners / Slides</h3><button className="btn btn-sm btn-primary" onClick={addSlide}>+ Adicionar slide</button></div>
          {d.slides.map((s, i) => (
            <div key={s.id} className="adm-card">
              <div className="adm-card-header"><span className="adm-card-num">Slide {i + 1}</span><button className="adm-del-btn" onClick={() => delSlide(s.id)}>✕ Remover</button></div>
              <AField label="Título" value={s.title} onChange={(v) => setSlide(s.id, "title", v)} />
              <AField label="Subtítulo" value={s.subtitle} onChange={(v) => setSlide(s.id, "subtitle", v)} />
              <AField label="URL da imagem de fundo" value={s.imageUrl} onChange={(v) => setSlide(s.id, "imageUrl", v)} placeholder="https://... (vazio = usar cor de fundo)" />
              <AField label="Cor de fundo (CSS)" value={s.gradient} onChange={(v) => setSlide(s.id, "gradient", v)} placeholder="linear-gradient(135deg,#1e40af,#2563eb)" />
              <div className="adm-row">
                <AField label="Texto do botão" value={s.cta} onChange={(v) => setSlide(s.id, "cta", v)} />
                <AField label="Link do botão" value={s.ctaLink} onChange={(v) => setSlide(s.id, "ctaLink", v)} placeholder="#servicos" />
              </div>
            </div>
          ))}
        </div>
      );

      case "contatos": return (
        <div className="adm-section">
          <h3>Informações de Contato</h3>
          <div className="adm-card">
            <h4 className="adm-card-title">📞 Telefones</h4>
            {d.contact.phones.map((ph, i) => (
              <div key={i} className="adm-list-row">
                <input className="adm-input" value={ph} onChange={(e) => setPhone(i, e.target.value)} placeholder="(11) 9999-9999" />
                <button className="adm-del-sm" onClick={() => delPhone(i)}>✕</button>
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" onClick={addPhone}>+ Adicionar telefone</button>
          </div>
          <div className="adm-card">
            <h4 className="adm-card-title">📧 E-mails</h4>
            {d.contact.emails.map((em, i) => (
              <div key={i} className="adm-list-row">
                <input className="adm-input" value={em} onChange={(e) => setEmail(i, e.target.value)} placeholder="contato@empresa.com" />
                <button className="adm-del-sm" onClick={() => delEmail(i)}>✕</button>
              </div>
            ))}
            <button className="btn btn-sm btn-ghost" onClick={addEmail}>+ Adicionar e-mail</button>
          </div>
          <div className="adm-card">
            <AField label="WhatsApp (com DDI, só números)" value={d.contact.whatsapp} onChange={(v) => upd("contact", { ...d.contact, whatsapp: v })} placeholder="5511999999999" />
            <AField label="Endereço" value={d.contact.address} onChange={(v) => upd("contact", { ...d.contact, address: v })} />
            <AField label="Horário de atendimento" value={d.contact.hours} onChange={(v) => upd("contact", { ...d.contact, hours: v })} placeholder="Seg-Sáb: 8h às 18h" />
          </div>
        </div>
      );

      case "portfolio": return (
        <div className="adm-section">
          <div className="adm-section-header"><h3>Portfólio / Obras concluídas</h3><button className="btn btn-sm btn-primary" onClick={addPortfolio}>+ Adicionar obra</button></div>
          {d.portfolio.map((p) => (
            <div key={p.id} className="adm-card">
              <div className="adm-card-header"><span className="adm-card-num">{p.title}</span><button className="adm-del-btn" onClick={() => delPortfolio(p.id)}>✕ Remover</button></div>
              <AField label="Título" value={p.title} onChange={(v) => setPortfolio(p.id, "title", v)} />
              <AField label="Descrição" value={p.description} onChange={(v) => setPortfolio(p.id, "description", v)} />
              <AField label="Categoria" value={p.category} onChange={(v) => setPortfolio(p.id, "category", v)} placeholder="Box, Sacadas, Espelhos..." />
              <AField label="URL da imagem" value={p.imageUrl} onChange={(v) => setPortfolio(p.id, "imageUrl", v)} placeholder="https://..." />
              {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="adm-img-preview" />}
            </div>
          ))}
        </div>
      );

      case "galeria": return (
        <div className="adm-section">
          <div className="adm-section-header"><h3>Galeria de Imagens</h3><button className="btn btn-sm btn-primary" onClick={addGallery}>+ Adicionar imagem</button></div>
          <div className="adm-gallery-grid">
            {d.gallery.map((g) => (
              <div key={g.id} className="adm-gallery-item">
                {g.imageUrl ? <img src={g.imageUrl} alt={g.caption} className="adm-gallery-thumb" /> : <div className="adm-gallery-ph">📷</div>}
                <input className="adm-input" value={g.imageUrl} onChange={(e) => setGallery(g.id, "imageUrl", e.target.value)} placeholder="URL da imagem" style={{ marginTop: 6 }} />
                <input className="adm-input" value={g.caption} onChange={(e) => setGallery(g.id, "caption", e.target.value)} placeholder="Legenda" style={{ marginTop: 4 }} />
                <button className="adm-del-full" onClick={() => delGallery(g.id)}>✕ Remover</button>
              </div>
            ))}
          </div>
        </div>
      );

      case "videos": return (
        <div className="adm-section">
          <div className="adm-section-header"><h3>Vídeos (YouTube)</h3><button className="btn btn-sm btn-primary" onClick={addVideo}>+ Adicionar vídeo</button></div>
          {d.videos.map((v) => (
            <div key={v.id} className="adm-card">
              <div className="adm-card-header"><span className="adm-card-num">{v.title}</span><button className="adm-del-btn" onClick={() => delVideo(v.id)}>✕ Remover</button></div>
              <AField label="Título" value={v.title} onChange={(val) => setVideoField(v.id, "title", val)} />
              <AField label="ID do YouTube" value={v.youtubeId} onChange={(val) => setVideoField(v.id, "youtubeId", val)} placeholder="Ex: dQw4w9WgXcQ (parte final da URL)" />
              <AField label="Descrição" value={v.description} onChange={(val) => setVideoField(v.id, "description", val)} />
              {v.youtubeId && (
                <div className="adm-video-preview">
                  <iframe src={`https://www.youtube.com/embed/${v.youtubeId}`} title={v.title} allowFullScreen className="adm-iframe" />
                </div>
              )}
            </div>
          ))}
        </div>
      );

      case "redes": return (
        <div className="adm-section">
          <h3>Links das Redes Sociais</h3>
          <div className="adm-card">
            <AField label="🟣 Instagram (URL completa)" value={d.social.instagram} onChange={(v) => upd("social", { ...d.social, instagram: v })} placeholder="https://instagram.com/sua_pagina" />
            <AField label="🔵 Facebook (URL completa)" value={d.social.facebook} onChange={(v) => upd("social", { ...d.social, facebook: v })} placeholder="https://facebook.com/sua_pagina" />
            <AField label="🔴 YouTube (URL completa)" value={d.social.youtube} onChange={(v) => upd("social", { ...d.social, youtube: v })} placeholder="https://youtube.com/@seu_canal" />
            <AField label="⚫ TikTok (URL completa)" value={d.social.tiktok} onChange={(v) => upd("social", { ...d.social, tiktok: v })} placeholder="https://tiktok.com/@seu_perfil" />
            <AField label="🔷 LinkedIn (URL completa)" value={d.social.linkedin} onChange={(v) => upd("social", { ...d.social, linkedin: v })} placeholder="https://linkedin.com/company/empresa" />
          </div>
        </div>
      );

      case "config": return (
        <div className="adm-section">
          <h3>Configurações Gerais</h3>
          <div className="adm-card">
            <AField label="Nome do site" value={d.settings.siteName} onChange={(v) => upd("settings", { ...d.settings, siteName: v })} />
            <AField label="Slogan / tagline" value={d.settings.tagline} onChange={(v) => upd("settings", { ...d.settings, tagline: v })} />
          </div>
          <div className="adm-note">
            💡 <strong>SEO:</strong> Para otimizar a indexação no Google, edite a tag <code>&lt;title&gt;</code> e <code>&lt;meta name="description"&gt;</code> diretamente no arquivo <code>index.html</code>.
          </div>
          <div className="adm-note adm-note-info">
            🔒 <strong>Permissões de usuários:</strong> Este painel usa senha única configurada no código (<code>ADMIN_PASSWORD</code>). Para múltiplos usuários com diferentes níveis de acesso, integre a autenticação com o backend da API.
          </div>
        </div>
      );

      case "precos": return (
        <div className="adm-section">
          <h3>Preços por m²</h3>
          <div className="adm-card">
            {(Object.keys(d.prices) as GlassType[]).map((type) => (
              <div key={type} className="adm-field">
                <label className="adm-label">{GLASS_LABELS[type]} (R$/m²)</label>
                <input className="adm-input" type="number" min="1" step="0.01" value={d.prices[type]} onChange={(e) => upd("prices", { ...d.prices, [type]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
        </div>
      );

      case "depoimentos": return (
        <div className="adm-section">
          <div className="adm-section-header"><h3>Depoimentos de Clientes</h3><button className="btn btn-sm btn-primary" onClick={addTestimonial}>+ Adicionar</button></div>
          {d.testimonials.map((t) => (
            <div key={t.id} className="adm-card">
              <div className="adm-card-header"><span className="adm-card-num">{t.name}</span><button className="adm-del-btn" onClick={() => delTestimonial(t.id)}>✕ Remover</button></div>
              <AField label="Nome do cliente" value={t.name} onChange={(v) => setTestimonial(t.id, "name", v)} />
              <AField label="Serviço contratado" value={t.service} onChange={(v) => setTestimonial(t.id, "service", v)} />
              <div className="adm-field">
                <label className="adm-label">Depoimento</label>
                <textarea className="adm-input adm-textarea" value={t.text} onChange={(e) => setTestimonial(t.id, "text", e.target.value)} placeholder="O que o cliente disse..." />
              </div>
              <div className="adm-field">
                <label className="adm-label">Avaliação (1–5 estrelas)</label>
                <input className="adm-input" type="number" min="1" max="5" value={t.rating} onChange={(e) => setTestimonial(t.id, "rating", Math.min(5, Math.max(1, Number(e.target.value))))} />
              </div>
            </div>
          ))}
        </div>
      );

      default: return null;
    }
  };

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <aside className="admin-sidebar">
          <div className="admin-brand">⚙️ Painel Admin</div>
          <nav className="admin-nav">
            {ADMIN_TABS.map((t) => (
              <button key={t.id} className={`admin-nav-item${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                <span className="admin-nav-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <button className="btn btn-primary btn-block" onClick={() => onSave(d)}>💾 Salvar alterações</button>
            <button className="btn btn-ghost btn-block" onClick={onClose} style={{ marginTop: 8 }}>Fechar painel</button>
          </div>
        </aside>
        <main className="admin-content">{renderContent()}</main>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState<SiteConfig>(loadConfig);

  // Admin
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Calculator
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [glassType, setGlassType] = useState<GlassType>("temperado");
  const [calcTouched, setCalcTouched] = useState(false);
  const [calcError, setCalcError] = useState("");

  // Modals
  const [activeService, setActiveService] = useState<ServiceData | null>(null);
  const [lightboxImg, setLightboxImg] = useState<GalleryImage | null>(null);

  // Sincroniza contato/redes/config com o backend ao carregar
  useEffect(() => {
    fetch(`${API_URL}/site-config`, { headers: { "X-Tenant-ID": TENANT_ID } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setConfig((prev) => {
          const phones = [d.phone1, d.phone2].filter(Boolean) as string[];
          return {
            ...prev,
            contact: {
              ...prev.contact,
              ...(phones.length > 0 ? { phones } : {}),
              ...(d.email ? { emails: [d.email] } : {}),
              ...(d.whatsapp ? { whatsapp: d.whatsapp } : {}),
              ...(d.address ? { address: d.address } : {}),
              ...(d.hours ? { hours: d.hours } : {}),
            },
            social: {
              ...prev.social,
              ...(d.instagram ? { instagram: d.instagram } : {}),
              ...(d.facebook ? { facebook: d.facebook } : {}),
              ...(d.youtube ? { youtube: d.youtube } : {}),
              ...(d.tiktok ? { tiktok: d.tiktok } : {}),
            },
            settings: {
              siteName: d.site_name || prev.settings.siteName,
              tagline: d.tagline || prev.settings.tagline,
            },
          };
        });
      })
      .catch(() => { /* backend offline: usa localStorage */ });
  }, []);

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const estimate = useMemo(() => {
    const h = parseFloat(height.replace(",", "."));
    const w = parseFloat(width.replace(",", "."));
    if (!h || !w || h <= 0 || w <= 0) return null;
    return Math.max(h * w, 0.5) * config.prices[glassType];
  }, [height, width, glassType, config.prices]);

  const handleCalc = () => {
    const h = parseFloat(height.replace(",", "."));
    const w = parseFloat(width.replace(",", "."));
    if (!h || !w || h <= 0 || w <= 0) { setCalcError("Informe altura e largura válidas (ex: 2.10)."); return; }
    setCalcError(""); setCalcTouched(true);
  };

  const sendWA = () => {
    if (estimate === null) return;
    const h = parseFloat(height.replace(",", "."));
    const w = parseFloat(width.replace(",", "."));
    const msg = `Olá! Calculei pelo site:\n\n*Tipo:* ${GLASS_LABELS[glassType]}\n*Medidas:* ${h}m × ${w}m\n*Área:* ${(h * w).toFixed(2)}m²\n*Estimativa:* ${money(estimate)}\n\nPoderia confirmar o valor?`;
    window.open(`https://wa.me/${config.contact.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const openAdmin = () => { setShowAdmin(true); setAdminAuthed(false); setAdminPwd(""); setAdminError(""); };
  const closeAdmin = () => { setShowAdmin(false); setAdminAuthed(false); setAdminPwd(""); };
  const adminLogin = () => { if (adminPwd === ADMIN_PASSWORD) { setAdminAuthed(true); setAdminError(""); } else { setAdminError("Senha incorreta."); } };

  const handleSave = (newConfig: SiteConfig) => {
    setConfig(newConfig); saveConfig(newConfig);
    alert("✅ Alterações salvas com sucesso!");
    closeAdmin();
  };

  const { contact, social, settings } = config;
  const showResult = calcTouched && estimate !== null && !calcError;

  return (
    <>
      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <header className="header">
        <div className="container header-inner">
          <a href="#" className="logo">
            <span className="logo-gem">◆</span>
            <span className="logo-name">{settings.siteName.split(" ")[0]} <span className="logo-thin">{settings.siteName.split(" ").slice(1).join(" ")}</span></span>
          </a>
          <nav className="nav">
            <a href="#calculadora" className="nav-link">Calculadora</a>
            <a href="#servicos"    className="nav-link">Serviços</a>
            <a href="#portfolio"   className="nav-link">Portfólio</a>
            <a href="#galeria"     className="nav-link">Galeria</a>
            <a href="#contato"     className="nav-link">Contato</a>
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-sm">💬 WhatsApp</a>
          </nav>
          {deferredPrompt && <button className="btn btn-install btn-sm" onClick={async () => { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === "accepted") setDeferredPrompt(null); }}>📲 Instalar App</button>}
        </div>
      </header>

      {/* ── CAROUSEL ─────────────────────────────────────────────────── */}
      <Carousel slides={config.slides} whatsapp={contact.whatsapp} />

      {/* ── CALCULATOR ───────────────────────────────────────────────── */}
      <section id="calculadora" className="section bg-light">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Calculadora de Orçamento</h2>
            <p className="section-sub">Informe as medidas e veja uma estimativa instantânea de preço</p>
          </div>
          <div className="calc-card">
            <div className="calc-fields">
              <div className="field-group">
                <label className="field-label" htmlFor="ch">Altura (m)</label>
                <input id="ch" className="field-input" type="number" min="0.1" step="0.01" placeholder="Ex: 2.10" value={height} onChange={(e) => { setHeight(e.target.value); setCalcError(""); setCalcTouched(false); }} />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="cw">Largura (m)</label>
                <input id="cw" className="field-input" type="number" min="0.1" step="0.01" placeholder="Ex: 0.90" value={width} onChange={(e) => { setWidth(e.target.value); setCalcError(""); setCalcTouched(false); }} />
              </div>
              <div className="field-group field-group-full">
                <label className="field-label" htmlFor="ct">Tipo de vidro</label>
                <select id="ct" className="field-input" value={glassType} onChange={(e) => { setGlassType(e.target.value as GlassType); setCalcTouched(false); }}>
                  <option value="comum">Vidro Comum — R$ {config.prices.comum}/m²</option>
                  <option value="temperado">Vidro Temperado — R$ {config.prices.temperado}/m²</option>
                  <option value="laminado">Vidro Laminado — R$ {config.prices.laminado}/m²</option>
                  <option value="espelho">Espelho — R$ {config.prices.espelho}/m²</option>
                </select>
              </div>
            </div>
            {calcError && <p className="calc-error">{calcError}</p>}
            <button className="btn btn-primary btn-block" onClick={handleCalc}>Calcular estimativa</button>
            {showResult && estimate !== null && (
              <div className="calc-result">
                <p className="calc-result-label">Estimativa de valor</p>
                <p className="calc-result-value">A partir de {money(estimate)}</p>
                <p className="calc-result-area">{(parseFloat(height) * parseFloat(width)).toFixed(2)} m² · {GLASS_LABELS[glassType]}</p>
                <p className="calc-result-note">* Valor estimado com base em R$ {config.prices[glassType]}/m². O preço final pode variar após visita técnica.</p>
                <button className="btn btn-whatsapp btn-block" onClick={sendWA}>💬 Enviar este orçamento para o WhatsApp</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────────── */}
      <section id="servicos" className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Nossos Serviços</h2>
            <p className="section-sub">Clique em um serviço para ver detalhes e solicitar orçamento</p>
          </div>
          <div className="services-grid">
            {SERVICES.map((svc) => (
              <button key={svc.id} className="service-card" onClick={() => setActiveService(svc)}>
                <span className="service-icon">{svc.icon}</span>
                <h3 className="service-title">{svc.title}</h3>
                <p className="service-desc">{svc.description}</p>
                <span className="service-cta">Ver detalhes →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── PORTFOLIO ────────────────────────────────────────────────── */}
      {config.portfolio.length > 0 && (
        <section id="portfolio" className="section bg-light">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Portfólio</h2>
              <p className="section-sub">Obras concluídas com qualidade e dedicação</p>
            </div>
            <div className="portfolio-grid">
              {config.portfolio.map((item) => (
                <article key={item.id} className="portfolio-card">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.title} className="portfolio-img" loading="lazy" />
                    : <div className="portfolio-img-ph">🏗️</div>}
                  <div className="portfolio-info">
                    <span className="portfolio-cat">{item.category}</span>
                    <h3 className="portfolio-title">{item.title}</h3>
                    <p className="portfolio-desc">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ──────────────────────────────────────────────────── */}
      {config.gallery.filter((g) => g.imageUrl).length > 0 && (
        <section id="galeria" className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Galeria de Imagens</h2>
              <p className="section-sub">Clique para ampliar</p>
            </div>
            <div className="gallery-grid">
              {config.gallery.filter((g) => g.imageUrl).map((g) => (
                <button key={g.id} className="gallery-item" onClick={() => setLightboxImg(g)} aria-label={g.caption || "Ver imagem"}>
                  <img src={g.imageUrl} alt={g.caption} loading="lazy" className="gallery-img" />
                  {g.caption && <span className="gallery-caption">{g.caption}</span>}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── VIDEOS ───────────────────────────────────────────────────── */}
      {config.videos.filter((v) => v.youtubeId).length > 0 && (
        <section className="section bg-light">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Nossos Vídeos</h2>
              <p className="section-sub">Veja o nosso trabalho em ação</p>
            </div>
            <div className="videos-grid">
              {config.videos.filter((v) => v.youtubeId).map((v) => (
                <div key={v.id} className="video-card">
                  <div className="video-embed">
                    <iframe src={`https://www.youtube.com/embed/${v.youtubeId}`} title={v.title} allowFullScreen loading="lazy" />
                  </div>
                  <h3 className="video-title">{v.title}</h3>
                  {v.description && <p className="video-desc">{v.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      {config.testimonials.length > 0 && (
        <section id="depoimentos" className="section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">O que nossos clientes dizem</h2>
              <p className="section-sub">Mais de 500 clientes satisfeitos em toda a região</p>
            </div>
            <div className="testimonials-grid">
              {config.testimonials.map((t) => (
                <article key={t.id} className="testimonial-card">
                  <Stars count={t.rating} />
                  <p className="testimonial-text">"{t.text}"</p>
                  <div className="testimonial-footer">
                    <strong className="testimonial-name">{t.name}</strong>
                    <span className="testimonial-service">{t.service}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ──────────────────────────────────────────────────── */}
      <section id="contato" className="section bg-light">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Entre em Contato</h2>
            <p className="section-sub">Estamos prontos para atender você</p>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">📞</div>
              <h3 className="contact-label">Telefones</h3>
              {contact.phones.map((p, i) => <a key={i} href={`tel:${p.replace(/\D/g, "")}`} className="contact-value">{p}</a>)}
            </div>
            <div className="contact-card">
              <div className="contact-icon">💬</div>
              <h3 className="contact-label">WhatsApp</h3>
              <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="contact-value contact-wa">Clique para abrir</a>
            </div>
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h3 className="contact-label">E-mail</h3>
              {contact.emails.map((e, i) => <a key={i} href={`mailto:${e}`} className="contact-value">{e}</a>)}
            </div>
            <div className="contact-card">
              <div className="contact-icon">📍</div>
              <h3 className="contact-label">Endereço</h3>
              <p className="contact-value">{contact.address}</p>
              <p className="contact-hours">{contact.hours}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="container cta-inner">
          <h2 className="cta-title">Pronto para transformar seu espaço?</h2>
          <p className="cta-sub">Solicite um orçamento gratuito e sem compromisso agora mesmo</p>
          <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-lg">💬 Falar com um especialista</a>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <p className="footer-logo">◆ {settings.siteName}</p>
              <p className="footer-tagline">{settings.tagline}</p>
            </div>
            <div className="footer-social">
              {social.instagram && <a href={social.instagram} target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram">📸</a>}
              {social.facebook  && <a href={social.facebook}  target="_blank" rel="noreferrer" className="social-link" aria-label="Facebook">👥</a>}
              {social.youtube   && <a href={social.youtube}   target="_blank" rel="noreferrer" className="social-link" aria-label="YouTube">▶️</a>}
              {social.tiktok    && <a href={social.tiktok}    target="_blank" rel="noreferrer" className="social-link" aria-label="TikTok">🎵</a>}
              {social.linkedin  && <a href={social.linkedin}  target="_blank" rel="noreferrer" className="social-link" aria-label="LinkedIn">💼</a>}
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} {settings.siteName}. Todos os direitos reservados.</p>
            <button className="footer-admin-link" onClick={openAdmin}>Acesso Admin</button>
          </div>
        </div>
      </footer>

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="whatsapp-fab" title="WhatsApp" aria-label="WhatsApp">💬</a>

      {/* ── MODALS ───────────────────────────────────────────────────── */}
      {activeService && <ServiceModal service={activeService} whatsapp={contact.whatsapp} onClose={() => setActiveService(null)} />}
      {lightboxImg   && <Lightbox image={lightboxImg} onClose={() => setLightboxImg(null)} />}

      {/* ── ADMIN LOGIN ──────────────────────────────────────────────── */}
      {showAdmin && !adminAuthed && (
        <div className="modal-overlay" onClick={closeAdmin}>
          <div className="modal-box" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeAdmin}>✕</button>
            <h2 className="modal-title">⚙️ Painel Administrativo</h2>
            <p className="modal-desc">Digite a senha para acessar as configurações do site.</p>
            <div className="field-group">
              <label className="field-label" htmlFor="apwd">Senha</label>
              <input id="apwd" className="field-input" type="password" value={adminPwd} onChange={(e) => { setAdminPwd(e.target.value); setAdminError(""); }} onKeyDown={(e) => e.key === "Enter" && adminLogin()} autoFocus />
            </div>
            {adminError && <p className="calc-error">{adminError}</p>}
            <button className="btn btn-primary btn-block" onClick={adminLogin}>Entrar</button>
          </div>
        </div>
      )}

      {/* ── ADMIN PANEL ──────────────────────────────────────────────── */}
      {showAdmin && adminAuthed && <AdminPanel config={config} onSave={handleSave} onClose={closeAdmin} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
