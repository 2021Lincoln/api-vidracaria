import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { API_URL, apiFetch } from "./api";
import "./styles.css";

// ─── Types ───────────────────────────────────────────────────────────
type Client = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  document?: string;
  notes?: string;
};

type QuoteItem = {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

type Quote = {
  id: number;
  client_id: number;
  description: string;
  measurement_date?: string;
  validity_date?: string;
  status: string;
  total: number;
  discount: number;
  items: QuoteItem[];
};

type Order = {
  id: number;
  quote_id: number;
  installer_id?: number;
  installer?: { id: number; name: string; current_status?: string };
  status: string;
  total: number;
  scheduled_installation?: string;
  installed_at?: string;
  notes?: string;
  payments?: { amount: number; status: string }[];
};

type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  current_status?: string;
  created_at?: string;
};

type Dashboard = {
  clients: number;
  quotes: number;
  orders: number;
  open_orders: number;
  monthly_revenue: number;
  pending_amount: number;
};

type ClientForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  document: string;
  notes: string;
};

type QuoteForm = {
  clientId: string;
  title: string;
  width: string;
  height: string;
  qty: string;
  unitPrice: string;
  discount: string;
  measurementDate: string;
  validityDate: string;
  notes: string;
};

type Toast = { id: number; type: "success" | "error" | "info"; msg: string };

type Tab = "dashboard" | "clients" | "quotes" | "orders" | "employees" | "site";

type SiteConfig = {
  phone1: string; phone2: string; whatsapp: string;
  email: string; address: string; hours: string;
  instagram: string; facebook: string; youtube: string; tiktok: string;
  site_name: string; tagline: string;
};

const emptySiteConfig: SiteConfig = {
  phone1: "", phone2: "", whatsapp: "", email: "", address: "", hours: "",
  instagram: "", facebook: "", youtube: "", tiktok: "", site_name: "", tagline: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────
const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyClientForm: ClientForm = {
  name: "", phone: "", email: "", address: "", document: "", notes: "",
};

const emptyQuoteForm: QuoteForm = {
  clientId: "", title: "", width: "", height: "", qty: "1",
  unitPrice: "", discount: "0", measurementDate: "", validityDate: "", notes: "",
};

// ─── Toast hook ───────────────────────────────────────────────────────
let toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((type: Toast["type"], msg: string) => {
    const id = ++toastId;
    setToasts((p) => [...p, { id, type, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  return { toasts, push, dismiss };
}

// ─── Status Tag ───────────────────────────────────────────────────────
function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "Rascunho",
    approved: "Aprovado",
    open: "Em aberto",
    em_deslocamento: "Em deslocamento",
    em_andamento: "Em andamento",
    installed: "Instalado",
    cancelado: "Cancelado",
  };
  return (
    <span className={`tag ${status}`}>
      <span className="tag-dot" />
      {map[status] ?? status}
    </span>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────
function MetricCard({
  label, value, icon, color,
}: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-card-label">{label}</span>
        <span className={`metric-icon ${color}`}>{icon}</span>
      </div>
      <div className="metric-card-value">{value}</div>
    </div>
  );
}

// ─── Toast Container ─────────────────────────────────────────────────
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => dismiss(t.id)}>
          <span className="toast-icon">{icons[t.type]}</span>
          <span className="toast-msg">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PDF helper ───────────────────────────────────────────────────────
async function openPdf(path: string, token: string) {
  const tenantId = localStorage.getItem("tenant_id") || "afqa";
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-ID": tenantId },
  });
  if (!res.ok) throw new Error("Falha ao gerar PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

// ─── App ──────────────────────────────────────────────────────────────
function App() {
  // Auth
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("tenant_id") || "afqa");
  const [email, setEmail] = useState("admin@afqa.com");
  const [password, setPassword] = useState("Admin@123");
  const [loggingIn, setLoggingIn] = useState(false);

  // Navigation
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Loading
  const [loadingAll, setLoadingAll] = useState(false);

  // Forms
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);

  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [savingQuote, setSavingQuote] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [quoteEditForm, setQuoteEditForm] = useState({ measurement_date: "", validity_date: "", discount: "0", description: "" });
  const [savingQuoteEdit, setSavingQuoteEdit] = useState(false);

  // Employee form
  const [empForm, setEmpForm] = useState({ name: "", email: "", password: "", role: "instalador" });
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [savingEmp, setSavingEmp] = useState(false);
  const [deletingEmpId, setDeletingEmpId] = useState<number | null>(null);

  // Site config
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(emptySiteConfig);
  const [savingSite, setSavingSite] = useState(false);

  // Filters
  const [clientSearch, setClientSearch] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");

  // Toasts
  const { toasts, push, dismiss } = useToasts();

  const logged = token.length > 0;

  // ── Derived ──────────────────────────────────────────────────────
  const clientMap = useMemo(() => {
    const m: Record<number, Client> = {};
    clients.forEach((c) => { m[c.id] = c; });
    return m;
  }, [clients]);

  const filteredClients = useMemo(() =>
    clientSearch.trim()
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            c.phone.includes(clientSearch),
        )
      : clients,
    [clients, clientSearch],
  );

  const filteredQuotes = useMemo(() =>
    quoteStatusFilter ? quotes.filter((q) => q.status === quoteStatusFilter) : quotes,
    [quotes, quoteStatusFilter],
  );

  const filteredOrders = useMemo(() =>
    orderStatusFilter ? orders.filter((o) => o.status === orderStatusFilter) : orders,
    [orders, orderStatusFilter],
  );

  const clientFormValid = useMemo(
    () => clientForm.name.trim().length >= 2 && clientForm.phone.trim().length >= 8,
    [clientForm],
  );

  const quoteFormValid = useMemo(() => {
    const clientId = Number(quoteForm.clientId);
    const width = Number(quoteForm.width);
    const height = Number(quoteForm.height);
    const qty = Number(quoteForm.qty);
    const unitPrice = Number(quoteForm.unitPrice);
    const discount = Number(quoteForm.discount || "0");
    return (
      Number.isFinite(clientId) && clientId > 0 &&
      quoteForm.title.trim().length >= 3 &&
      Number.isFinite(width) && width > 0 &&
      Number.isFinite(height) && height > 0 &&
      Number.isFinite(qty) && qty > 0 &&
      Number.isFinite(unitPrice) && unitPrice > 0 &&
      Number.isFinite(discount) && discount >= 0
    );
  }, [quoteForm]);

  // ── Data loaders ─────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    const d = await apiFetch("/dashboard/summary", token);
    setDashboard(d);
  }, [token]);

  const loadClients = useCallback(async () => {
    const d = await apiFetch("/clients", token);
    setClients(Array.isArray(d) ? d : []);
  }, [token]);

  const loadQuotes = useCallback(async () => {
    const d = await apiFetch("/quotes", token);
    setQuotes(Array.isArray(d) ? d : []);
  }, [token]);

  const loadOrders = useCallback(async () => {
    const d = await apiFetch("/orders", token);
    setOrders(Array.isArray(d) ? d : []);
  }, [token]);

  const loadEmployees = useCallback(async () => {
    const d = await apiFetch("/employees", token);
    setEmployees(Array.isArray(d) ? d : []);
  }, [token]);

  const loadSiteConfig = useCallback(async () => {
    const d = await apiFetch("/site-config", token);
    setSiteConfig({
      phone1: d.phone1 ?? "", phone2: d.phone2 ?? "", whatsapp: d.whatsapp ?? "",
      email: d.email ?? "", address: d.address ?? "", hours: d.hours ?? "",
      instagram: d.instagram ?? "", facebook: d.facebook ?? "",
      youtube: d.youtube ?? "", tiktok: d.tiktok ?? "",
      site_name: d.site_name ?? "", tagline: d.tagline ?? "",
    });
  }, [token]);

  const saveSiteConfig = async () => {
    if (savingSite) return;
    setSavingSite(true);
    try {
      await apiFetch("/site-config", token, "PUT", siteConfig);
      await loadSiteConfig();
      push("success", "Configurações do site salvas.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao salvar configurações.");
    } finally {
      setSavingSite(false);
    }
  };

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      await Promise.all([loadDashboard(), loadClients(), loadQuotes(), loadOrders(), loadEmployees(), loadSiteConfig()]);
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg.includes("401") || msg.toLowerCase().includes("não autorizado") || msg.toLowerCase().includes("unauthorized")) {
        localStorage.removeItem("token");
        setToken("");
        push("error", "Sessão expirada. Faça login novamente.");
      } else {
        push("error", "Falha ao atualizar dados.");
      }
    } finally {
      setLoadingAll(false);
    }
  }, [loadDashboard, loadClients, loadQuotes, loadOrders, loadEmployees, loadSiteConfig, push]);

  useEffect(() => {
    if (logged) void loadAll();
  }, [logged]);

  useEffect(() => {
    if (logged && tab === "site") void loadSiteConfig();
  }, [tab, logged, loadSiteConfig]);

  // ── Auth ─────────────────────────────────────────────────────────
  const login = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let detail = "Falha no login";
        try { detail = (await res.json()).detail || detail; } catch { /* empty */ }
        throw new Error(detail);
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("tenant_id", tenantId);
      setToken(data.access_token);
      push("success", "Login realizado com sucesso.");
    } catch (e) {
      push("error", (e as Error).message);
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setDashboard(null);
    setClients([]);
    setQuotes([]);
    setOrders([]);
    setEmployees([]);
  };

  // ── Clients ──────────────────────────────────────────────────────
  const resetClientForm = () => {
    setClientForm(emptyClientForm);
    setEditingClientId(null);
  };

  const createOrUpdateClient = async () => {
    if (!clientFormValid || savingClient) return;
    setSavingClient(true);
    try {
      const payload = {
        name: clientForm.name.trim(),
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim() || null,
        address: clientForm.address.trim() || null,
        document: clientForm.document.trim() || null,
        notes: clientForm.notes.trim() || null,
      };
      if (editingClientId) {
        await apiFetch(`/clients/${editingClientId}`, token, "PUT", payload);
        push("success", "Cliente atualizado com sucesso.");
      } else {
        await apiFetch("/clients", token, "POST", payload);
        push("success", "Cliente cadastrado com sucesso.");
      }
      resetClientForm();
      await Promise.all([loadClients(), loadDashboard()]);
    } catch (e) {
      push("error", (e as Error).message || "Falha ao salvar cliente.");
    } finally {
      setSavingClient(false);
    }
  };

  const startEditClient = (c: Client) => {
    setEditingClientId(c.id);
    setClientForm({
      name: c.name ?? "", phone: c.phone ?? "", email: c.email ?? "",
      address: c.address ?? "", document: c.document ?? "", notes: c.notes ?? "",
    });
    setDeletingClientId(null);
  };

  const confirmDeleteClient = async (clientId: number) => {
    try {
      await apiFetch(`/clients/${clientId}`, token, "DELETE");
      if (editingClientId === clientId) resetClientForm();
      setDeletingClientId(null);
      await Promise.all([loadClients(), loadDashboard()]);
      push("success", "Cliente excluído.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao excluir cliente.");
    }
  };

  // ── Quotes ───────────────────────────────────────────────────────
  const createQuote = async () => {
    if (!quoteFormValid || savingQuote) return;
    setSavingQuote(true);
    try {
      const clientId = Number(quoteForm.clientId);
      const width = Number(quoteForm.width);
      const height = Number(quoteForm.height);
      const qty = Number(quoteForm.qty);
      const unitPrice = Number(quoteForm.unitPrice);
      const discount = Number(quoteForm.discount || "0");
      const totalArea = width * height * qty;

      const details = [
        quoteForm.title.trim(),
        `Medidas: ${width.toFixed(2)}m x ${height.toFixed(2)}m`,
        `Qtd: ${qty} peca(s)`,
        `Area total: ${totalArea.toFixed(2)} m2`,
        quoteForm.notes.trim() ? `Obs: ${quoteForm.notes.trim()}` : "",
      ].filter(Boolean).join(" | ");

      await apiFetch("/quotes", token, "POST", {
        client_id: clientId,
        description: details,
        measurement_date: quoteForm.measurementDate || null,
        validity_date: quoteForm.validityDate || null,
        discount,
        items: [
          {
            description: quoteForm.title.trim(),
            quantity: totalArea,
            unit: "m2",
            unit_price: unitPrice,
          },
        ],
      });

      setQuoteForm(emptyQuoteForm);
      await Promise.all([loadQuotes(), loadDashboard()]);
      push("success", "Orcamento criado com sucesso.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao criar orcamento.");
    } finally {
      setSavingQuote(false);
    }
  };

  const createOrderFromQuote = async (quoteId: number) => {
    try {
      await apiFetch(`/orders/from-quote/${quoteId}`, token, "POST");
      await Promise.all([loadOrders(), loadDashboard(), loadQuotes()]);
      push("success", "Orcamento convertido em pedido.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao converter orcamento.");
    }
  };

  const handleOpenPdf = async (path: string) => {
    try {
      await openPdf(path, token);
    } catch (e) {
      push("error", (e as Error).message || "Falha ao abrir PDF.");
    }
  };

  const deleteQuote = async (quoteId: number) => {
    if (!window.confirm("Excluir este orçamento permanentemente?")) return;
    try {
      await apiFetch(`/quotes/${quoteId}`, token, "DELETE");
      setQuotes((p) => p.filter((q) => q.id !== quoteId));
      push("success", "Orçamento excluído.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao excluir orçamento.");
    }
  };

  const startEditQuote = (q: { id: number; measurement_date?: string; validity_date?: string; discount: number; description: string }) => {
    setEditingQuoteId(q.id);
    setQuoteEditForm({
      measurement_date: q.measurement_date ?? "",
      validity_date: q.validity_date ?? "",
      discount: String(q.discount ?? 0),
      description: q.description ?? "",
    });
  };

  const saveQuoteEdit = async () => {
    if (!editingQuoteId || savingQuoteEdit) return;
    setSavingQuoteEdit(true);
    try {
      const disc = parseFloat(quoteEditForm.discount.replace(",", ".")) || 0;
      await apiFetch(`/quotes/${editingQuoteId}`, token, "PUT", {
        measurement_date: quoteEditForm.measurement_date.trim() || null,
        validity_date: quoteEditForm.validity_date.trim() || null,
        discount: disc >= 0 ? disc : 0,
        description: quoteEditForm.description.trim() || undefined,
      });
      await loadQuotes();
      setEditingQuoteId(null);
      push("success", "Orçamento atualizado.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao salvar orçamento.");
    } finally {
      setSavingQuoteEdit(false);
    }
  };

  // ── Orders ───────────────────────────────────────────────────────
  const receivePayment = async (order: Order) => {
    const paid = (order.payments ?? [])
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pending = Math.max(Number(order.total || 0) - paid, 0);

    if (pending <= 0) {
      push("info", "Esse pedido já está quitado.");
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      await apiFetch(`/orders/${order.id}/payments`, token, "POST", {
        amount: pending, method: "pix", status: "paid", paid_at: today,
      });
      await Promise.all([loadOrders(), loadDashboard()]);
      push("success", `Pagamento de R$ ${pending.toFixed(2).replace(".", ",")} registrado.`);
    } catch (e) {
      push("error", (e as Error).message || "Falha ao registrar pagamento.");
    }
  };

  const openWhatsApp = (orderId: number, total: number) => {
    const order = orders.find((o) => o.id === orderId);
    const client = order ? clientMap[order.quote_id] : null;
    const phone = client?.phone?.replace(/\D/g, "") || "";
    const msg = encodeURIComponent(
      `Ola! Seu pedido #${orderId} esta com status: ${order?.status ?? ""}. Total: ${currency(total)}.`,
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const markInstalled = async (orderId: number) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await apiFetch(`/orders/${orderId}`, token, "PUT", {
        status: "installed", installed_at: today,
      });
      await Promise.all([loadOrders(), loadDashboard()]);
      push("success", "Pedido marcado como instalado.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao atualizar pedido.");
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!window.confirm("Cancelar este pedido?")) return;
    try {
      await apiFetch(`/orders/${orderId}`, token, "PUT", { status: "cancelado" });
      await Promise.all([loadOrders(), loadDashboard()]);
      push("success", "Pedido cancelado.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao cancelar pedido.");
    }
  };

  const updateScheduledDate = async (orderId: number, date: string) => {
    try {
      await apiFetch(`/orders/${orderId}`, token, "PUT", { scheduled_installation: date || null });
      await loadOrders();
      push("success", date ? "Data de instalação agendada." : "Agendamento removido.");
    } catch (e) {
      push("error", (e as Error).message || "Falha ao agendar instalação.");
    }
  };

  // ── Employees ────────────────────────────────────────────────────
  const resetEmpForm = () => {
    setEmpForm({ name: "", email: "", password: "", role: "instalador" });
    setEditingEmpId(null);
  };

  const createOrUpdateEmployee = async () => {
    if (savingEmp) return;
    if (!empForm.name.trim() || !empForm.email.trim()) return;
    if (!editingEmpId && !empForm.password.trim()) return;
    setSavingEmp(true);
    try {
      if (editingEmpId) {
        const payload: Record<string, string> = { name: empForm.name.trim(), email: empForm.email.trim(), role: empForm.role };
        if (empForm.password.trim()) payload.password = empForm.password.trim();
        await apiFetch(`/employees/${editingEmpId}`, token, "PATCH", payload);
        push("success", "Funcionário atualizado.");
      } else {
        await apiFetch("/employees", token, "POST", {
          name: empForm.name.trim(),
          email: empForm.email.trim(),
          password: empForm.password.trim(),
          role: empForm.role,
        });
        push("success", "Funcionário cadastrado.");
      }
      resetEmpForm();
      await loadEmployees();
    } catch (e) {
      push("error", (e as Error).message || "Falha ao salvar funcionário.");
    } finally {
      setSavingEmp(false);
    }
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpForm({ name: emp.name, email: emp.email, password: "", role: emp.role });
  };

  const deleteEmployee = async (id: number) => {
    if (!confirm("Excluir este funcionário?")) return;
    setDeletingEmpId(id);
    try {
      await apiFetch(`/employees/${id}`, token, "DELETE");
      push("success", "Funcionário excluído.");
      await loadEmployees();
    } catch (e) {
      push("error", (e as Error).message || "Falha ao excluir.");
    } finally {
      setDeletingEmpId(null);
    }
  };

  const updateEmployeeStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/employees/${id}/status`, token, "PATCH", { current_status: status });
      push("success", "Status atualizado.");
      await loadEmployees();
    } catch (e) {
      push("error", (e as Error).message || "Falha ao atualizar status.");
    }
  };

  const assignInstaller = async (orderId: number, installerId: number | null) => {
    try {
      await apiFetch(`/orders/${orderId}`, token, "PUT", { installer_id: installerId });
      push("success", installerId ? "Instalador atribuído." : "Instalador removido.");
      await loadOrders();
    } catch (e) {
      push("error", (e as Error).message || "Falha ao atribuir instalador.");
    }
  };

  // ── Nav helper ───────────────────────────────────────────────────
  const navTo = (t: Tab) => {
    setTab(t);
    setSidebarOpen(false);
  };

  // ─── LOGIN PAGE ─────────────────────────────────────────────────
  if (!logged) {
    return (
      <>
        <div className="login-page">
          <div className="login-card">
            <div className="login-logo">
              <div className="login-logo-icon">🪟</div>
              <div>
                <h1>AFQA Vidracaria</h1>
              </div>
            </div>
            <p className="login-sub">Painel de gestao comercial e operacional</p>

            <div className="field">
              <label>Empresa (Tenant)</label>
              <input
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="afqa"
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
              />
            </div>
            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={login}
              disabled={loggingIn}
              style={{ marginTop: 8 }}
            >
              {loggingIn ? <><span className="spinner" /> Entrando...</> : "Entrar no painel"}
            </button>
          </div>
        </div>
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </>
    );
  }

  // ─── MAIN APP ────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "clients", label: "Clientes", icon: "👥" },
    { id: "quotes", label: "Orcamentos", icon: "📋" },
    { id: "orders", label: "Pedidos", icon: "📦" },
    { id: "employees", label: "Funcionarios", icon: "👷" },
    { id: "site", label: "Configuracoes", icon: "🌐" },
  ];

  const tabTitles: Record<Tab, string> = {
    dashboard: "Dashboard",
    clients: "Clientes",
    quotes: "Orcamentos",
    orders: "Pedidos",
    employees: "Funcionarios",
    site: "Configurações do Site",
  };

  return (
    <div className="app-shell">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🪟</div>
          <div className="sidebar-logo-text">
            AFQA
            <div className="sidebar-logo-sub">Gestao Comercial</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-label">Menu</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => navTo(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">AD</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">Admin</div>
              <div className="sidebar-user-role">{tenantId}</div>
            </div>
          </div>
          <button className="nav-item" onClick={logout} style={{ width: "100%" }}>
            <span className="nav-icon">🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen((p) => !p)}>☰</button>
            <span className="topbar-title">{tabTitles[tab]}</span>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadAll}
              disabled={loadingAll}
            >
              {loadingAll ? <><span className="spinner dark" /> Atualizando...</> : "↻ Atualizar"}
            </button>
          </div>
        </header>

        <div className="page-content">
          {/* ── DASHBOARD ─────────────────────────────────────── */}
          {tab === "dashboard" && (
            <>
              {dashboard ? (
                <div className="cards-grid">
                  <MetricCard label="Clientes" value={String(dashboard.clients)} icon="👥" color="blue" />
                  <MetricCard label="Orcamentos" value={String(dashboard.quotes)} icon="📋" color="blue" />
                  <MetricCard label="Pedidos" value={String(dashboard.orders)} icon="📦" color="blue" />
                  <MetricCard label="Em aberto" value={String(dashboard.open_orders)} icon="⏳" color="amber" />
                  <MetricCard label="Receita do mes" value={currency(dashboard.monthly_revenue)} icon="💰" color="green" />
                  <MetricCard label="A receber" value={currency(dashboard.pending_amount)} icon="📈" color="amber" />
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-text">Carregando dados do dashboard...</div>
                </div>
              )}
            </>
          )}

          {/* ── CLIENTS ───────────────────────────────────────── */}
          {tab === "clients" && (
            <div className="panel">
              <div className="section-header">
                <h2 className="section-title">
                  {editingClientId ? "Editando Cliente" : "Cadastrar Cliente"}
                </h2>
              </div>

              <div className="toolbar">
                <div className="field">
                  <label>Nome *</label>
                  <input
                    value={clientForm.name}
                    onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="field">
                  <label>Telefone *</label>
                  <input
                    value={clientForm.phone}
                    onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="field">
                  <label>Endereco</label>
                  <input
                    value={clientForm.address}
                    onChange={(e) => setClientForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Rua, numero, bairro"
                  />
                </div>
                <div className="field">
                  <label>CPF / CNPJ</label>
                  <input
                    value={clientForm.document}
                    onChange={(e) => setClientForm((p) => ({ ...p, document: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="field">
                  <label>Observacoes</label>
                  <input
                    value={clientForm.notes}
                    onChange={(e) => setClientForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Informacoes adicionais"
                  />
                </div>
              </div>

              <div className="toolbar-actions">
                <button
                  className="btn btn-success"
                  onClick={createOrUpdateClient}
                  disabled={!clientFormValid || savingClient}
                >
                  {savingClient
                    ? <><span className="spinner" /> Salvando...</>
                    : editingClientId ? "💾 Salvar edicao" : "➕ Cadastrar cliente"}
                </button>
                <button className="btn btn-ghost" onClick={() => { resetClientForm(); }}>
                  Limpar
                </button>
                <button className="btn btn-ghost" onClick={loadClients}>↻ Atualizar lista</button>
              </div>

              <div className="search-bar" style={{ marginTop: 8 }}>
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="🔍 Buscar por nome ou telefone..."
                  style={{ maxWidth: 320 }}
                />
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {filteredClients.length} cliente(s)
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Telefone</th>
                      <th>E-mail</th>
                      <th>Endereco</th>
                      <th>Observacoes</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                    ) : filteredClients.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>#{c.id}</td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.phone}</td>
                        <td>{c.email || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.address || <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                        <td style={{ maxWidth: 220, color: "var(--muted)", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                          {c.notes || <span style={{ color: "var(--muted)" }}>—</span>}
                        </td>
                        <td className="actions-cell">
                          {deletingClientId === c.id ? (
                            <div className="confirm-row">
                              <span className="confirm-label">Excluir?</span>
                              <button className="btn btn-danger btn-sm" onClick={() => confirmDeleteClient(c.id)}>Sim</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeletingClientId(null)}>Nao</button>
                            </div>
                          ) : (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEditClient(c)}>✏️ Editar</button>
                              <button className="btn btn-danger btn-sm" onClick={() => setDeletingClientId(c.id)}>🗑 Excluir</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── QUOTES ────────────────────────────────────────── */}
          {tab === "quotes" && (
            <div className="panel">
              <div className="section-header">
                <h2 className="section-title">Novo Orcamento</h2>
              </div>

              <div className="toolbar">
                <div className="field">
                  <label>Cliente *</label>
                  <select
                    value={quoteForm.clientId}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, clientId: e.target.value }))}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Descricao do servico *</label>
                  <input
                    value={quoteForm.title}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Janela em vidro temperado"
                  />
                </div>
                <div className="field">
                  <label>Largura (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteForm.width}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, width: e.target.value }))}
                    placeholder="1.20"
                  />
                </div>
                <div className="field">
                  <label>Altura (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteForm.height}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, height: e.target.value }))}
                    placeholder="0.90"
                  />
                </div>
                <div className="field">
                  <label>Qtd. pecas *</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteForm.qty}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, qty: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div className="field">
                  <label>Preco por m² (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteForm.unitPrice}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, unitPrice: e.target.value }))}
                    placeholder="250.00"
                  />
                </div>
                <div className="field">
                  <label>Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteForm.discount}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, discount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Data medicao</label>
                  <input
                    type="date"
                    value={quoteForm.measurementDate}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, measurementDate: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Validade</label>
                  <input
                    type="date"
                    value={quoteForm.validityDate}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, validityDate: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Observacoes tecnicas</label>
                  <input
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Detalhes adicionais"
                  />
                </div>
              </div>

              {/* Preview do calculo */}
              {quoteFormValid && (
                <div
                  className="notice success"
                  style={{ marginBottom: 14 }}
                >
                  Area total: {(Number(quoteForm.width) * Number(quoteForm.height) * Number(quoteForm.qty)).toFixed(2)} m²
                  {" — "}
                  Total estimado:{" "}
                  {currency(
                    Number(quoteForm.width) * Number(quoteForm.height) * Number(quoteForm.qty) *
                    Number(quoteForm.unitPrice) - Number(quoteForm.discount || 0)
                  )}
                </div>
              )}

              <div className="toolbar-actions">
                <button
                  className="btn btn-success"
                  onClick={createQuote}
                  disabled={!quoteFormValid || savingQuote}
                >
                  {savingQuote ? <><span className="spinner" /> Criando...</> : "➕ Criar orcamento"}
                </button>
                <button className="btn btn-ghost" onClick={() => setQuoteForm(emptyQuoteForm)}>
                  Limpar
                </button>
                <button className="btn btn-ghost" onClick={loadQuotes}>↻ Atualizar lista</button>
              </div>

              {/* Formulário de edição de orçamento */}
              {editingQuoteId && (
                <div className="card" style={{ marginTop: 12, padding: 16, border: "1.5px solid var(--primary)", borderRadius: 10 }}>
                  <h3 style={{ marginBottom: 12, fontSize: "0.95rem" }}>✏️ Editar Orçamento #{editingQuoteId}</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label>Data de Medição (AAAA-MM-DD)</label>
                      <input
                        value={quoteEditForm.measurement_date}
                        onChange={(e) => setQuoteEditForm((p) => ({ ...p, measurement_date: e.target.value }))}
                        placeholder="2025-12-31"
                      />
                    </div>
                    <div className="field">
                      <label>Validade (AAAA-MM-DD)</label>
                      <input
                        value={quoteEditForm.validity_date}
                        onChange={(e) => setQuoteEditForm((p) => ({ ...p, validity_date: e.target.value }))}
                        placeholder="2025-12-31"
                      />
                    </div>
                    <div className="field">
                      <label>Desconto (R$)</label>
                      <input
                        type="number"
                        min="0"
                        value={quoteEditForm.discount}
                        onChange={(e) => setQuoteEditForm((p) => ({ ...p, discount: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                      <label>Descrição / Observações</label>
                      <input
                        value={quoteEditForm.description}
                        onChange={(e) => setQuoteEditForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Detalhes do serviço"
                      />
                    </div>
                  </div>
                  <div className="toolbar-actions" style={{ marginTop: 8 }}>
                    <button className="btn btn-success" onClick={saveQuoteEdit} disabled={savingQuoteEdit}>
                      {savingQuoteEdit ? <><span className="spinner" /> Salvando...</> : "💾 Salvar"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditingQuoteId(null)}>Cancelar</button>
                  </div>
                </div>
              )}

              <div className="search-bar" style={{ marginTop: 8 }}>
                <select
                  value={quoteStatusFilter}
                  onChange={(e) => setQuoteStatusFilter(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="">Todos os status</option>
                  <option value="draft">Rascunho</option>
                  <option value="approved">Aprovado</option>
                </select>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {filteredQuotes.length} orcamento(s)
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Descricao</th>
                      <th>Medicao</th>
                      <th>Validade</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                          Nenhum orcamento encontrado.
                        </td>
                      </tr>
                    ) : filteredQuotes.map((q) => (
                      <tr key={q.id}>
                        <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>#{q.id}</td>
                        <td style={{ fontWeight: 600 }}>{clientMap[q.client_id]?.name ?? `ID ${q.client_id}`}</td>
                        <td
                          title={q.description}
                          style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {q.description.slice(0, 60)}{q.description.length > 60 ? "..." : ""}
                        </td>
                        <td>{q.measurement_date || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td>{q.validity_date || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                        <td><StatusTag status={q.status} /></td>
                        <td style={{ fontWeight: 700 }}>{currency(q.total)}</td>
                        <td className="actions-cell">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => startEditQuote(q)}
                            title="Editar orçamento"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenPdf(`/quotes/${q.id}/pdf`)}
                            title="Ver PDF"
                          >
                            📄 PDF
                          </button>
                          {q.status === "draft" && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => createOrderFromQuote(q.id)}
                              >
                                Converter
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => deleteQuote(q.id)}
                                title="Excluir orçamento"
                              >
                                🗑
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ORDERS ────────────────────────────────────────── */}
          {tab === "orders" && (
            <div className="panel">
              <div className="section-header">
                <h2 className="section-title">Pedidos</h2>
              </div>

              <div className="search-bar">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="">Todos os status</option>
                  <option value="open">Em aberto</option>
                  <option value="em_deslocamento">Em deslocamento</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="installed">Instalado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {filteredOrders.length} pedido(s)
                </span>
                <button className="btn btn-ghost btn-sm" onClick={loadOrders} style={{ marginLeft: "auto" }}>
                  ↻ Atualizar
                </button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Pago</th>
                      <th>Pendente</th>
                      <th>Instalador</th>
                      <th>Agendar</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                          Nenhum pedido encontrado.
                        </td>
                      </tr>
                    ) : filteredOrders.map((o) => {
                      const relatedQuote = quotes.find((q) => q.id === o.quote_id);
                      const clientName = relatedQuote
                        ? (clientMap[relatedQuote.client_id]?.name ?? `ID ${relatedQuote.client_id}`)
                        : `Orc. #${o.quote_id}`;
                      const clientPhone = relatedQuote
                        ? (clientMap[relatedQuote.client_id]?.phone ?? "")
                        : "";
                      const paidAmt = (o.payments ?? [])
                        .filter((p) => p.status === "paid")
                        .reduce((s, p) => s + Number(p.amount || 0), 0);
                      const pendingAmt = Math.max(Number(o.total || 0) - paidAmt, 0);
                      const active = o.status !== "installed" && o.status !== "cancelado";
                      return (
                        <tr key={o.id} style={{ opacity: o.status === "cancelado" ? 0.55 : 1 }}>
                          <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>#{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{clientName}</td>
                          <td><StatusTag status={o.status} /></td>
                          <td style={{ fontWeight: 700 }}>{currency(o.total)}</td>
                          <td style={{ color: "var(--success)", fontWeight: 600 }}>{currency(paidAmt)}</td>
                          <td style={{ color: pendingAmt > 0 ? "var(--danger)" : "var(--muted)", fontWeight: pendingAmt > 0 ? 700 : 400 }}>
                            {currency(pendingAmt)}
                          </td>
                          <td>
                            <select
                              value={o.installer_id ?? ""}
                              onChange={(e) => assignInstaller(o.id, e.target.value ? Number(e.target.value) : null)}
                              disabled={!active}
                              style={{ fontSize: "0.78rem", padding: "2px 4px", borderRadius: 4 }}
                            >
                              <option value="">— nenhum —</option>
                              {employees.filter(emp => emp.role === "instalador" && emp.is_active).map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {o.installed_at
                              ? <span style={{ color: "var(--success)", fontWeight: 600 }}>{o.installed_at}</span>
                              : (
                                <input
                                  type="date"
                                  defaultValue={o.scheduled_installation ?? ""}
                                  disabled={!active}
                                  onBlur={(e) => {
                                    if (e.target.value !== (o.scheduled_installation ?? "")) {
                                      updateScheduledDate(o.id, e.target.value);
                                    }
                                  }}
                                  style={{ fontSize: "0.78rem", padding: "2px 4px", borderRadius: 4, border: "1px solid var(--border)" }}
                                />
                              )
                            }
                          </td>
                          <td className="actions-cell">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleOpenPdf(`/orders/${o.id}/pdf`)}
                              title="Ver PDF"
                            >
                              📄
                            </button>
                            {clientPhone && (
                              <button
                                className="btn btn-success btn-sm"
                                title="Enviar WhatsApp"
                                onClick={() => {
                                  const msg = encodeURIComponent(
                                    `Ola! Seu pedido #${o.id} esta com status: ${o.status}. Total: ${currency(o.total)}.`,
                                  );
                                  window.open(`https://wa.me/55${clientPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                                }}
                              >
                                📱
                              </button>
                            )}
                            {active && pendingAmt > 0 && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => receivePayment(o)}
                                title={`Registrar pagamento de ${currency(pendingAmt)}`}
                              >
                                💳 Pagar
                              </button>
                            )}
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => openWhatsApp(o.id, o.total)}
                              title="Enviar WhatsApp ao cliente"
                            >
                              💬
                            </button>
                            {active && (
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => markInstalled(o.id)}
                                title="Marcar como instalado"
                              >
                                ✅
                              </button>
                            )}
                            {active && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => cancelOrder(o.id)}
                                title="Cancelar pedido"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── EMPLOYEES ─────────────────────────────────────── */}
          {tab === "employees" && (
            <div className="panel">
              <div className="section-header">
                <h2 className="section-title">Funcionários</h2>
                <button className="btn btn-ghost btn-sm" onClick={loadEmployees}>↻ Atualizar</button>
              </div>

              {/* Form */}
              <div className="panel" style={{ background: "var(--surface-alt, #f8f9fa)", marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem" }}>
                  {editingEmpId ? "Editar Funcionário" : "Novo Funcionário"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div className="field">
                    <label>Nome</label>
                    <input value={empForm.name} onChange={(e) => setEmpForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" maxLength={120} />
                  </div>
                  <div className="field">
                    <label>E-mail</label>
                    <input type="email" value={empForm.email} onChange={(e) => setEmpForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" maxLength={180} />
                  </div>
                  <div className="field">
                    <label>{editingEmpId ? "Nova senha (deixe vazio para manter)" : "Senha"}</label>
                    <input type="password" value={empForm.password} onChange={(e) => setEmpForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" />
                  </div>
                  <div className="field">
                    <label>Perfil</label>
                    <select value={empForm.role} onChange={(e) => setEmpForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="instalador">Instalador</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={createOrUpdateEmployee} disabled={savingEmp}>
                    {savingEmp ? <><span className="spinner" /> Salvando...</> : (editingEmpId ? "Salvar alterações" : "Cadastrar funcionário")}
                  </button>
                  {editingEmpId && <button className="btn btn-ghost" onClick={resetEmpForm}>Cancelar</button>}
                </div>
              </div>

              {/* Table */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Perfil</th>
                      <th>Status</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                          Nenhum funcionário cadastrado.
                        </td>
                      </tr>
                    ) : employees.map((emp) => (
                      <tr key={emp.id} style={{ opacity: emp.is_active ? 1 : 0.5 }}>
                        <td style={{ fontWeight: 600 }}>{emp.name}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{emp.email}</td>
                        <td>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: "0.78rem", fontWeight: 600,
                            background: emp.role === "admin" ? "#d1e7dd" : emp.role === "instalador" ? "#cfe2ff" : "#fff3cd",
                            color: emp.role === "admin" ? "#0f5132" : emp.role === "instalador" ? "#084298" : "#856404",
                          }}>
                            {emp.role}
                          </span>
                        </td>
                        <td>
                          <select
                            value={emp.current_status ?? "disponivel"}
                            onChange={(e) => updateEmployeeStatus(emp.id, e.target.value)}
                            style={{ fontSize: "0.8rem", padding: "2px 6px", borderRadius: 4 }}
                          >
                            <option value="disponivel">Disponível</option>
                            <option value="em_deslocamento">Em deslocamento</option>
                            <option value="instalando">Instalando</option>
                            <option value="medicao">Medição</option>
                            <option value="parado">Parado</option>
                          </select>
                        </td>
                        <td>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: "0.78rem",
                            background: emp.is_active ? "#d1e7dd" : "#f8d7da",
                            color: emp.is_active ? "#0f5132" : "#842029",
                          }}>
                            {emp.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button className="btn btn-ghost btn-sm" onClick={() => startEditEmployee(emp)}>✏️ Editar</button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteEmployee(emp.id)}
                            disabled={deletingEmpId === emp.id}
                          >
                            {deletingEmpId === emp.id ? "..." : "🗑️"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SITE CONFIG ───────────────────────────────────────── */}
          {tab === "site" && (
            <div className="panel">
              <div className="section-header">
                <h2 className="section-title">Configurações do Site</h2>
              </div>

              <div className="section-header" style={{ marginTop: 24 }}>
                <h3 className="section-title" style={{ fontSize: "1rem" }}>📞 Contato</h3>
              </div>
              <div className="toolbar">
                <div className="field">
                  <label>Telefone 1</label>
                  <input
                    value={siteConfig.phone1}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, phone1: e.target.value }))}
                    placeholder="(11) 3333-3333"
                    maxLength={30}
                  />
                </div>
                <div className="field">
                  <label>Telefone 2</label>
                  <input
                    value={siteConfig.phone2}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, phone2: e.target.value }))}
                    placeholder="(11) 3333-4444"
                    maxLength={30}
                  />
                </div>
                <div className="field">
                  <label>WhatsApp</label>
                  <input
                    value={siteConfig.whatsapp}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    maxLength={30}
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={siteConfig.email}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                    maxLength={180}
                  />
                </div>
                <div className="field" style={{ flex: "1 1 100%" }}>
                  <label>Endereço</label>
                  <input
                    value={siteConfig.address}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Rua, número, bairro, cidade"
                    maxLength={255}
                  />
                </div>
                <div className="field">
                  <label>Horário de funcionamento</label>
                  <input
                    value={siteConfig.hours}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, hours: e.target.value }))}
                    placeholder="Seg–Sex 08h–18h"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="section-header" style={{ marginTop: 24 }}>
                <h3 className="section-title" style={{ fontSize: "1rem" }}>🌐 Redes Sociais</h3>
              </div>
              <div className="toolbar">
                <div className="field">
                  <label>Instagram</label>
                  <input
                    value={siteConfig.instagram}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, instagram: e.target.value }))}
                    placeholder="https://instagram.com/perfil"
                    maxLength={255}
                  />
                </div>
                <div className="field">
                  <label>Facebook</label>
                  <input
                    value={siteConfig.facebook}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, facebook: e.target.value }))}
                    placeholder="https://facebook.com/perfil"
                    maxLength={255}
                  />
                </div>
                <div className="field">
                  <label>YouTube</label>
                  <input
                    value={siteConfig.youtube}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, youtube: e.target.value }))}
                    placeholder="https://youtube.com/@canal"
                    maxLength={255}
                  />
                </div>
                <div className="field">
                  <label>TikTok</label>
                  <input
                    value={siteConfig.tiktok}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, tiktok: e.target.value }))}
                    placeholder="https://tiktok.com/@perfil"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="section-header" style={{ marginTop: 24 }}>
                <h3 className="section-title" style={{ fontSize: "1rem" }}>⚙️ Geral</h3>
              </div>
              <div className="toolbar">
                <div className="field">
                  <label>Nome do site</label>
                  <input
                    value={siteConfig.site_name}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, site_name: e.target.value }))}
                    placeholder="AFQA Vidraçaria"
                    maxLength={120}
                  />
                </div>
                <div className="field" style={{ flex: "1 1 100%" }}>
                  <label>Slogan / Tagline</label>
                  <input
                    value={siteConfig.tagline}
                    onChange={(e) => setSiteConfig((p) => ({ ...p, tagline: e.target.value }))}
                    placeholder="Qualidade e transparência em cada projeto"
                    maxLength={255}
                  />
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button
                  className="btn btn-primary"
                  onClick={saveSiteConfig}
                  disabled={savingSite}
                >
                  {savingSite ? <><span className="spinner" /> Salvando...</> : "💾 Salvar configurações"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
