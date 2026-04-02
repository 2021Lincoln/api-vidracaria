
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  bg: "#eef3f9",
  surface: "#ffffff",
  border: "#d6e2f0",
  text: "#102038",
  muted: "#5d6f89",
  primary: "#0b57d0",
  primaryDark: "#003a9a",
  success: "#0f8a63",
  danger: "#c73745",
  warning: "#b46907",
};

// ─── Calculadora ─────────────────────────────────────────────────────────────
/** Altere WHATSAPP_CALC para o número real com DDI (ex: 5511999999999) */
const WHATSAPP_CALC = "5511999999999";

// ─── Config do Site (sincronizado com o backend) ─────────────────────────────
const SITE_DEFAULT = {
  phone1: "", phone2: "", whatsapp: "",
  email: "", address: "", hours: "",
  instagram: "", facebook: "", youtube: "", tiktok: "",
  site_name: "", tagline: "",
};

const GLASS_PRICES = {
  comum:     80,
  temperado: 200,
  laminado:  350,
  espelho:   150,
};

const GLASS_LABELS = {
  comum:     "Vidro Comum",
  temperado: "Vidro Temperado",
  laminado:  "Vidro Laminado",
  espelho:   "Espelho",
};

const SITE_TABS = [
  { id: "contato", label: "📞 Contato" },
  { id: "redes",   label: "🌐 Redes"   },
  { id: "config",  label: "⚙️ Config"  },
];

const TAB_ICONS  = { dashboard: "📊", clients: "👥", quotes: "📄", orders: "📦", calc: "🧮", site: "🌐", funcionarios: "👷" };
const TAB_LABELS = { dashboard: "Painel", clients: "Clientes", quotes: "Orçam.", orders: "Pedidos", calc: "Calc.", site: "Site", funcionarios: "Equipe" };

const STATUS_OPTIONS = [
  { value: "disponivel",     label: "Disponível" },
  { value: "em_deslocamento", label: "Em deslocamento" },
  { value: "instalando",     label: "Instalando" },
  { value: "medicao",        label: "Medição" },
  { value: "parado",         label: "Parado" },
];

const STATUS_COLORS = {
  disponivel:      ["#d1e7dd", "#0f5132"],
  em_deslocamento: ["#fff3cd", "#856404"],
  instalando:      ["#cfe2ff", "#084298"],
  medicao:         ["#e2d9f3", "#5a3291"],
  parado:          ["#f8d7da", "#842029"],
};

function normalizeUrl(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function guessLanApiUrl() {
  // Expo 54+: expoGoConfig.debuggerHost tem o formato "192.168.x.x:8081"
  const hostUri =
    Constants?.expoGoConfig?.debuggerHost ||
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    Constants?.manifest?.hostUri ||
    "";
  const host = String(hostUri).split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return "";
  return `http://${host}:8000`;
}

async function isApiReachable(baseUrl) {
  const url = normalizeUrl(baseUrl);
  if (!url) return false;
  try {
    const res = await fetchWithTimeout(`${url}/health`, { method: "GET" }, 2500);
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function resolveApiUrl(currentValue) {
  const current = normalizeUrl(currentValue);
  const guessed = guessLanApiUrl();
  const candidates = [current, guessed, "http://10.0.2.2:8000", "http://127.0.0.1:8000"].filter(Boolean);

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await isApiReachable(candidate);
    if (ok) return normalizeUrl(candidate);
  }

  return normalizeUrl(current || guessed || "http://10.0.2.2:8000");
}

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(v) {
  const raw = String(v ?? "").replace(",", ".").trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "none",
  multiline,
  secureTextEntry,
  maxLength,
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
      />
    </View>
  );
}

function Button({ label, onPress, variant = "primary", disabled, loading, small }) {
  const map = {
    primary: C.primary,
    success: C.success,
    danger: C.danger,
    warning: C.warning,
    ghost: C.surface,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        {
          backgroundColor: map[variant],
          borderWidth: variant === "ghost" ? 1.5 : 0,
          borderColor: C.border,
          opacity: disabled || loading || pressed ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? C.text : "#fff"} size="small" />
      ) : (
        <Text style={[s.btnText, small && s.btnSmallText, variant === "ghost" && { color: C.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    draft:        ["#fff3cd", "#856404", "Rascunho"],
    approved:     ["#d1e7dd", "#0f5132", "Aprovado"],
    open:            ["#fef9c3", "#92400e", "Aberto"],
    em_deslocamento: ["#ede9fe", "#5b21b6", "Em deslocamento"],
    em_andamento:    ["#fff0d6", "#a05a00", "Em andamento"],
    installed:    ["#dbeafe", "#1e3a8a", "Instalado"],
    cancelado:    ["#fde8ea", "#9b1c2e", "Cancelado"],
  };
  const [bg, color, label] = MAP[status] || ["#f0f0f0", "#555", status];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function StatCard({ title, value, tone = "primary" }) {
  const toneMap = {
    primary: ["#e8f1ff", C.primary],
    success: ["#e8f8f2", C.success],
    warning: ["#fff5e6", C.warning],
    danger: ["#fdecef", C.danger],
  };
  const [bg, color] = toneMap[tone] || toneMap.primary;

  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <Text style={s.statTitle}>{title}</Text>
      <Text style={[s.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>{value}</Text>
    </View>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [apiUrl, setApiUrl] = useState("");
  const [tenantId, setTenantId] = useState("afqa");
  const [email, setEmail] = useState("admin@afqa.com");
  const [password, setPassword] = useState("Admin@123");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connStatus, setConnStatus] = useState(null); // null | "ok" | "fail"
  const [booting, setBooting] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [token, setToken] = useState("");
  const [userRole, setUserRole] = useState("vendedor"); // "admin" | "vendedor" | "instalador"
  const [userName, setUserName] = useState("");

  const [tab, setTab] = useState("dashboard");
  const scrollRef = useRef(null);
  const switchTab = useCallback((t) => {
    setTab(t);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myStatus, setMyStatus] = useState("disponivel");
  const [myEmployeeId, setMyEmployeeId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [quoteStatusFilter, setQuoteStatusFilter] = useState("");

  // Config do site
  const [siteConfig, setSiteConfig] = useState(SITE_DEFAULT);
  const [siteTab, setSiteTab] = useState("contato");
  const [savingSite, setSavingSite] = useState(false);

  // Edição inline de orçamento
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [quoteEditForm, setQuoteEditForm] = useState({ measurement_date: "", validity_date: "", discount: "0", description: "" });
  const [savingQuoteEdit, setSavingQuoteEdit] = useState(false);

  // Pagamento inline
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [savingPayment, setSavingPayment] = useState(false);

  // Atribuição de instalador
  const [installerPickerOrderId, setInstallerPickerOrderId] = useState(null);
  const [savingInstaller, setSavingInstaller] = useState(false);

  // Agendamento de instalação
  const [schedulingOrderId, setSchedulingOrderId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // CRUD de funcionários
  const [savingEmp, setSavingEmp] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empForm, setEmpForm] = useState({ name: "", email: "", password: "", role: "instalador" });

  // Calculadora
  const [calcAltura, setCalcAltura] = useState("");
  const [calcLargura, setCalcLargura] = useState("");
  const [calcTipo, setCalcTipo] = useState("temperado");
  const [calcResult, setCalcResult] = useState(null);

  const [savingClient, setSavingClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    document: "",
    notes: "",
  });

  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    clientId: "",
    title: "",
    width: "",
    height: "",
    qty: "1",
    unitPrice: "",
    discount: "0",
    measurementDate: todayIso(),
    validityDate: "",
    notes: "",
  });
  const selectedQuoteClient = useMemo(
    () => clients.find((c) => c.id === Number(quoteForm.clientId)) || null,
    [clients, quoteForm.clientId],
  );
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (c) =>
        String(c.name || "").toLowerCase().includes(query) ||
        String(c.phone || "").includes(query) ||
        String(c.email || "").toLowerCase().includes(query),
    );
  }, [clients, clientSearch]);
  const quotePreview = useMemo(() => {
    const width = toNumber(quoteForm.width);
    const height = toNumber(quoteForm.height);
    const pieces = toNumber(quoteForm.qty || 1);
    const unitPrice = toNumber(quoteForm.unitPrice);
    const discount = toNumber(quoteForm.discount || 0);
    const areaPerPiece = width * height;
    const totalM2 = areaPerPiece * pieces;
    const gross = totalM2 * unitPrice;
    const total = Math.max(gross - discount, 0);
    return { width, height, pieces, areaPerPiece, totalM2, unitPrice, discount, gross, total };
  }, [quoteForm.discount, quoteForm.height, quoteForm.qty, quoteForm.unitPrice, quoteForm.width]);
  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet(["token", "apiUrl", "tenantId", "email", "role", "userName"]);
        const map = Object.fromEntries(entries);
        if (map.token) setToken(map.token);
        if (map.tenantId) setTenantId(map.tenantId);
        if (map.email) setEmail(map.email);
        if (map.role) setUserRole(map.role);
        if (map.userName) setUserName(map.userName);
        const resolved = await resolveApiUrl(map.apiUrl || "");
        setApiUrl(resolved);
        await AsyncStorage.setItem("apiUrl", resolved);
      } catch (_) {
        const fallback = await resolveApiUrl("");
        setApiUrl(fallback);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const api = useCallback(
    async (path, method = "GET", body, explicitToken) => {
      const url = normalizeUrl(apiUrl);
      if (!url) throw new Error("URL da API nao configurada");
      const tk = explicitToken ?? token;

      const headers = {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId,
      };
      if (tk) headers.Authorization = `Bearer ${tk}`;

      const res = await fetchWithTimeout(`${url}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        let detail = `Erro ${res.status}`;
        try {
          const json = await res.json();
          detail = json?.detail || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      if (res.status === 204) return null;
      return res.json();
    },
    [apiUrl, tenantId, token],
  );

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const [d, c, q, o, me, sc] = await Promise.all([
        api("/dashboard/summary"),
        api("/clients"),
        api("/quotes"),
        api("/orders"),
        api("/employees/me"),
        api("/site-config"),
      ]);
      setDashboard(d || null);
      setClients(Array.isArray(c) ? c : []);
      setQuotes(Array.isArray(q) ? q : []);
      setOrders(Array.isArray(o) ? o : []);
      if (me?.current_status) setMyStatus(me.current_status);
      if (me?.id) setMyEmployeeId(me.id);
      if (sc) setSiteConfig({ ...SITE_DEFAULT, ...sc });

      // Load employee list only for admins
      if (userRole === "admin") {
        try {
          const emps = await api("/employees");
          setEmployees(Array.isArray(emps) ? emps : []);
        } catch { /* ignore */ }
      }
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("401") || msg.includes("Unauthorized")) {
        await AsyncStorage.multiRemove(["token", "role", "userName"]);
        setToken("");
        setUserRole("vendedor");
        setUserName("");
        Alert.alert("Sessão expirada", "Faça login novamente.");
      } else {
        Alert.alert("Erro", msg || "Falha ao carregar dados");
      }
    } finally {
      setLoadingData(false);
    }
  }, [api, token, userRole]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token, loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const testConnection = async () => {
    setTesting(true);
    setConnStatus(null);
    const candidate = normalizeUrl(apiUrl) || guessLanApiUrl();
    const ok = await isApiReachable(candidate);
    setConnStatus(ok ? "ok" : "fail");
    if (ok && candidate && !apiUrl) setApiUrl(candidate);
    setTesting(false);
  };

  const login = async () => {
    if (loggingIn) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert("Atencao", "Preencha e-mail e senha.");
      return;
    }

    setLoggingIn(true);
    try {
      const resolvedUrl = await resolveApiUrl(apiUrl);
      setApiUrl(resolvedUrl);
      const url = normalizeUrl(resolvedUrl);
      if (!url) throw new Error("URL_VAZIA");

      const res = await fetchWithTimeout(`${url}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        let detail = `Erro ${res.status}`;
        try {
          const errBody = await res.json();
          detail = errBody?.detail || JSON.stringify(errBody) || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      let data;
      try {
        data = await res.json();
      } catch (_) {
        throw new Error("Resposta invalida do servidor (nao e JSON)");
      }
      const tk = data?.access_token;
      if (!tk) throw new Error(`HTTP ${res.status} | URL: ${url}/auth/login | Body: ${JSON.stringify(data)}`);

      const role = data?.role || "vendedor";
      const name = data?.name || "";
      setToken(tk);
      setUserRole(role);
      setUserName(name);
      await AsyncStorage.multiSet([
        ["token", tk],
        ["apiUrl", url],
        ["tenantId", tenantId],
        ["email", email],
        ["role", role],
        ["userName", name],
      ]);
    } catch (e) {
      const msg = e.message || "";
      const isNetworkError = msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg === "URL_VAZIA" ||
        msg.toLowerCase().includes("aborted") ||
        msg.toLowerCase().includes("timeout");
      if (isNetworkError) {
        setShowAdvanced(true);
        Alert.alert(
          "Servidor nao encontrado",
          "O app nao conseguiu conectar ao backend.\n\n" +
          "Verifique:\n" +
          "• Backend rodando com --host 0.0.0.0\n" +
          "• Celular e PC na mesma rede Wi-Fi\n" +
          "• URL API configurada corretamente\n\n" +
          "Use o botao Testar para verificar a conexao.",
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Falha no login", msg || "E-mail ou senha invalidos.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    setToken("");
    setUserRole("vendedor");
    setUserName("");
    await AsyncStorage.multiRemove(["token", "role", "userName"]);
  };

  const saveClient = async () => {
    if (savingClient) return;
    const payload = {
      name: clientForm.name.trim(),
      phone: clientForm.phone.trim(),
      email: clientForm.email.trim() || null,
      address: clientForm.address.trim() || null,
      document: clientForm.document.trim() || null,
      notes: clientForm.notes.trim() || null,
    };

    if (payload.name.length < 2 || payload.phone.length < 8) {
      Alert.alert("Validacao", "Informe nome (min 2) e telefone (min 8). ");
      return;
    }

    setSavingClient(true);
    try {
      if (editingClientId) {
        await api(`/clients/${editingClientId}`, "PUT", payload);
        Alert.alert("Sucesso", "Cliente atualizado.");
      } else {
        await api("/clients", "POST", payload);
        Alert.alert("Sucesso", "Cliente cadastrado.");
      }

      setClientForm({ name: "", phone: "", email: "", address: "", document: "", notes: "" });
      setEditingClientId(null);
      setClientSearch("");
      await loadAll();
      switchTab("clients");
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao salvar cliente");
    } finally {
      setSavingClient(false);
    }
  };

  const editClient = (item) => {
    setEditingClientId(item.id);
    setClientForm({
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
      document: item.document || "",
      notes: item.notes || "",
    });
    switchTab("clients");
  };

  const deleteClient = (id) => {
    Alert.alert("Excluir cliente", "Deseja realmente excluir este cliente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/clients/${id}`, "DELETE");
            await loadAll();
            Alert.alert("Sucesso", "Cliente removido.");
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao excluir cliente");
          }
        },
      },
    ]);
  };
  const createQuote = async () => {
    if (savingQuote) return;

    const clientId = Number(quoteForm.clientId);
    const { width, height, pieces, areaPerPiece, totalM2, unitPrice, discount } = quotePreview;

    if (!clientId || !clients.find((c) => c.id === clientId)) {
      Alert.alert("Validacao", "Selecione um cliente valido.");
      return;
    }

    if (!(width > 0) || !(height > 0) || !(pieces > 0) || !(unitPrice > 0)) {
      Alert.alert("Validacao", "Informe medidas, quantidade e valor unitario validos.");
      return;
    }

    if (totalM2 <= 0) {
      Alert.alert("Validacao", "A area total calculada precisa ser maior que zero.");
      return;
    }

    const title = quoteForm.title.trim() || "Orcamento de vidro";
    const itemDesc = `${title} | ${pieces} peca(s) | ${width}m x ${height}m | ${totalM2.toFixed(2)} m2`;
    const desc = [
      `Servico: ${title}`,
      `Medidas: ${width}m x ${height}m`,
      `Area por peca: ${areaPerPiece.toFixed(2)} m2`,
      `Pecas: ${pieces}`,
      `Area total: ${totalM2.toFixed(2)} m2`,
      quoteForm.notes.trim() ? `Obs: ${quoteForm.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    setSavingQuote(true);
    try {
      await api("/quotes", "POST", {
        client_id: clientId,
        description: desc,
        measurement_date: quoteForm.measurementDate || null,
        validity_date: quoteForm.validityDate || null,
        status: "draft",
        discount,
        items: [
          {
            description: itemDesc,
            quantity: totalM2,
            unit: "m2",
            unit_price: unitPrice,
          },
        ],
      });

      setQuoteForm({
        clientId: "",
        title: "",
        width: "",
        height: "",
        qty: "1",
        unitPrice: "",
        discount: "0",
        measurementDate: todayIso(),
        validityDate: "",
        notes: "",
      });

      await loadAll();
      Alert.alert("Sucesso", "Orcamento criado.");
      switchTab("quotes");
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao criar orcamento");
    } finally {
      setSavingQuote(false);
    }
  };

  const createOrderFromQuote = async (quoteId) => {
    Alert.alert("Gerar pedido", "Deseja converter este orcamento em pedido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            await api(`/orders/from-quote/${quoteId}`, "POST");
            await loadAll();
            Alert.alert("Sucesso", "Pedido criado a partir do orcamento.");
            switchTab("orders");
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao criar pedido");
          }
        },
      },
    ]);
  };

  const deleteQuote = (quoteId) => {
    Alert.alert("Excluir orçamento", "Deseja realmente excluir este orçamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/quotes/${quoteId}`, "DELETE");
            await loadAll();
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao excluir orçamento");
          }
        },
      },
    ]);
  };

  const markInTransit = async (orderId) => {
    Alert.alert("Em deslocamento", "Confirmar que o instalador está a caminho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            await api(`/orders/${orderId}`, "PUT", { status: "em_deslocamento" });
            await api("/employees/me/status", "PATCH", { current_status: "em_deslocamento" });
            await loadAll();
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao atualizar pedido");
          }
        },
      },
    ]);
  };

  const markInProgress = async (orderId) => {
    Alert.alert("Iniciar serviço", "Confirmar início da instalação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Iniciar",
        onPress: async () => {
          try {
            await api(`/orders/${orderId}`, "PUT", { status: "em_andamento" });
            await api("/employees/me/status", "PATCH", { current_status: "instalando" });
            await loadAll();
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao atualizar pedido");
          }
        },
      },
    ]);
  };

  const markInstalled = async (orderId) => {
    Alert.alert("Concluir instalação", "Confirmar pedido como instalado?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: async () => {
          try {
            await api(`/orders/${orderId}`, "PUT", {
              status: "installed",
              installed_at: todayIso(),
            });
            await api("/employees/me/status", "PATCH", { current_status: "disponivel" });
            await loadAll();
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao atualizar pedido");
          }
        },
      },
    ]);
  };

  const cancelOrder = async (orderId) => {
    Alert.alert("Cancelar pedido", "Tem certeza que deseja cancelar este pedido?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar pedido",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/orders/${orderId}`, "PUT", { status: "cancelado" });
            await loadAll();
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao cancelar pedido");
          }
        },
      },
    ]);
  };

  const updateQuote = async (quoteId) => {
    if (savingQuoteEdit) return;
    setSavingQuoteEdit(true);
    try {
      const payload = {};
      if (quoteEditForm.measurement_date.trim()) payload.measurement_date = quoteEditForm.measurement_date.trim();
      else payload.measurement_date = null;
      if (quoteEditForm.validity_date.trim()) payload.validity_date = quoteEditForm.validity_date.trim();
      else payload.validity_date = null;
      if (quoteEditForm.description.trim()) payload.description = quoteEditForm.description.trim();
      const disc = toNumber(quoteEditForm.discount);
      payload.discount = disc >= 0 ? disc : 0;
      await api(`/quotes/${quoteId}`, "PUT", payload);
      await loadAll();
      setEditingQuoteId(null);
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao salvar orçamento");
    } finally {
      setSavingQuoteEdit(false);
    }
  };

  const approveQuote = (quoteId) => {
    Alert.alert("Aprovar orçamento", "Deseja aprovar este orçamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Aprovar",
        onPress: async () => {
          try {
            await api(`/quotes/${quoteId}`, "PUT", { status: "approved" });
            await loadAll();
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao aprovar orçamento");
          }
        },
      },
    ]);
  };

  const assignInstaller = async (orderId, installerId) => {
    setSavingInstaller(true);
    try {
      await api(`/orders/${orderId}`, "PUT", { installer_id: installerId });
      await loadAll();
      setInstallerPickerOrderId(null);
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao atribuir instalador");
    } finally {
      setSavingInstaller(false);
    }
  };

  const removeInstaller = (orderId) => {
    Alert.alert("Remover instalador", "Deseja remover o instalador deste pedido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/orders/${orderId}`, "PUT", { installer_id: null });
            await loadAll();
            setInstallerPickerOrderId(null);
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao remover instalador");
          }
        },
      },
    ]);
  };

  const saveScheduleDate = async (orderId, date) => {
    setSavingSchedule(true);
    try {
      await api(`/orders/${orderId}`, "PUT", { scheduled_installation: date.trim() || null });
      await loadAll();
      setSchedulingOrderId(null);
      setScheduleDate("");
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao salvar data");
    } finally {
      setSavingSchedule(false);
    }
  };

  const registerPayment = async (orderId, amount, method) => {
    if (!amount || toNumber(amount) <= 0) {
      Alert.alert("Validação", "Informe um valor válido.");
      return;
    }
    setSavingPayment(true);
    try {
      await api(`/orders/${orderId}/payments`, "POST", {
        amount: toNumber(amount),
        method,
        status: "paid",
        paid_at: todayIso(),
        notes: `Pagamento via ${method} registrado no app mobile`,
      });
      await loadAll();
      setPayingOrderId(null);
      setPaymentAmount("");
      setPaymentMethod("pix");
      Alert.alert("Sucesso", `Pagamento de ${money(toNumber(amount))} registrado.`);
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao registrar pagamento");
    } finally {
      setSavingPayment(false);
    }
  };

  const sendWhatsAppOrder = (order) => {
    const oQuote = quotes.find((q) => q.id === order.quote_id);
    const oClient = clients.find((c) => c.id === oQuote?.client_id);
    if (!oClient?.phone) {
      Alert.alert("Atenção", "Este cliente não tem telefone cadastrado.");
      return;
    }
    const phone = (oClient.phone || "").replace(/\D/g, "");
    const paid = Array.isArray(order.payments)
      ? order.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0)
      : 0;
    const pending = Math.max(Number(order.total || 0) - paid, 0);
    const statusLabels = {
      open: "Aberto",
      em_deslocamento: "Instalador a caminho",
      em_andamento: "Em instalação",
      installed: "Instalado",
      cancelado: "Cancelado",
    };
    const msg = [
      `Olá${oClient.name ? `, ${oClient.name}` : ""}!`,
      `Aqui é a AFQA Vidraçaria.`,
      ``,
      `*Pedido #${order.id}*`,
      `Status: ${statusLabels[order.status] || order.status}`,
      oQuote ? `Serviço: ${(oQuote.description || "").slice(0, 80)}` : null,
      `Total: ${money(order.total)}`,
      pending > 0 ? `Pendente: ${money(pending)}` : `Pagamento: quitado ✓`,
      order.scheduled_installation ? `Agendado para: ${order.scheduled_installation}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`);
  };

  const openPdf = (type, id) => {
    const base = normalizeUrl(apiUrl);
    const url = `${base}/${type}s/${id}/pdf?token=${encodeURIComponent(token)}&tenant_id=${encodeURIComponent(tenantId)}`;
    Linking.openURL(url);
  };

  const saveEmployee = async () => {
    if (savingEmp) return;
    if (!empForm.name.trim() || !empForm.email.trim()) {
      Alert.alert("Validação", "Nome e e-mail são obrigatórios.");
      return;
    }
    if (!editingEmpId && !empForm.password.trim()) {
      Alert.alert("Validação", "Senha é obrigatória para novo funcionário.");
      return;
    }
    setSavingEmp(true);
    try {
      if (editingEmpId) {
        const payload = { name: empForm.name.trim(), email: empForm.email.trim(), role: empForm.role };
        if (empForm.password.trim()) payload.password = empForm.password.trim();
        await api(`/employees/${editingEmpId}`, "PATCH", payload);
        Alert.alert("Sucesso", "Funcionário atualizado.");
      } else {
        await api("/employees", "POST", {
          name: empForm.name.trim(),
          email: empForm.email.trim(),
          password: empForm.password.trim(),
          role: empForm.role,
        });
        Alert.alert("Sucesso", "Funcionário cadastrado.");
      }
      setEditingEmpId(null);
      setEmpForm({ name: "", email: "", password: "", role: "instalador" });
      const emps = await api("/employees");
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao salvar funcionário");
    } finally {
      setSavingEmp(false);
    }
  };

  const deleteEmployee = (emp) => {
    Alert.alert("Excluir funcionário", `Deseja excluir ${emp.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/employees/${emp.id}`, "DELETE");
            const emps = await api("/employees");
            setEmployees(Array.isArray(emps) ? emps : []);
          } catch (e) {
            Alert.alert("Erro", e.message || "Falha ao excluir funcionário");
          }
        },
      },
    ]);
  };

  const updateMyStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api("/employees/me/status", "PATCH", { current_status: newStatus });
      setMyStatus(newStatus);
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao atualizar status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const calcular = useCallback(() => {
    const h = parseFloat(String(calcAltura).replace(",", "."));
    const w = parseFloat(String(calcLargura).replace(",", "."));
    if (!h || !w || h <= 0 || w <= 0) {
      Alert.alert("Atenção", "Informe altura e largura válidas (ex: 2.10).");
      return;
    }
    const area = h * w;
    const total = area * GLASS_PRICES[calcTipo];
    setCalcResult({ h, w, area, total, tipo: calcTipo });
  }, [calcAltura, calcLargura, calcTipo]);

  const enviarWhatsAppCalc = useCallback(() => {
    if (!calcResult) return;
    const msg =
      `Olá! Calculei pelo app:\n\n` +
      `*Tipo:* ${GLASS_LABELS[calcResult.tipo]}\n` +
      `*Medidas:* ${calcResult.h}m × ${calcResult.w}m\n` +
      `*Área:* ${calcResult.area.toFixed(2)}m²\n` +
      `*Estimativa:* ${money(calcResult.total)}\n\n` +
      `Poderia confirmar o valor?`;
    Linking.openURL(`https://wa.me/${WHATSAPP_CALC}?text=${encodeURIComponent(msg)}`);
  }, [calcResult]);

  const renderCalc = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Calculadora de Orçamento</Text>
      <View style={s.card}>
        <Text style={s.helperTitle}>Tipo de vidro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          {Object.entries(GLASS_LABELS).map(([key, label]) => (
            <Pressable
              key={key}
              style={[s.chip, calcTipo === key && s.chipActive]}
              onPress={() => { setCalcTipo(key); setCalcResult(null); }}
            >
              <Text style={s.chipText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.priceHint}>
          <Text style={s.priceHintText}>
            {GLASS_LABELS[calcTipo]}: R$ {GLASS_PRICES[calcTipo]}/m²
          </Text>
        </View>

        <View style={s.row2}>
          <View style={s.col}>
            <Input
              label="Altura (m)"
              value={calcAltura}
              onChangeText={(v) => { setCalcAltura(v); setCalcResult(null); }}
              placeholder="Ex: 2.10"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.col}>
            <Input
              label="Largura (m)"
              value={calcLargura}
              onChangeText={(v) => { setCalcLargura(v); setCalcResult(null); }}
              placeholder="Ex: 0.90"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Button label="Calcular estimativa" onPress={calcular} />

        {calcResult && (
          <View style={s.calcResultBox}>
            <Text style={s.calcResultLabel}>ESTIMATIVA DE VALOR</Text>
            <Text style={s.calcResultValue}>A partir de {money(calcResult.total)}</Text>
            <Text style={s.calcResultArea}>
              Área: {calcResult.area.toFixed(2)} m² · {GLASS_LABELS[calcResult.tipo]}
            </Text>
            <Text style={s.calcResultNote}>
              * O valor final pode variar após visita técnica.
            </Text>
            <Button
              label="💬 Enviar para WhatsApp"
              variant="success"
              onPress={enviarWhatsAppCalc}
            />
          </View>
        )}
      </View>
    </View>
  );

  const saveSiteConfig = async (cfg) => {
    setSavingSite(true);
    try {
      const saved = await api("/site-config", "PUT", cfg);
      setSiteConfig({ ...SITE_DEFAULT, ...saved });
      Alert.alert("Sucesso", "Configurações do site salvas com sucesso.");
    } catch (e) {
      Alert.alert("Erro", e.message || "Falha ao salvar configurações.");
    } finally {
      setSavingSite(false);
    }
  };

  const renderEmployees = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{editingEmpId ? "Editar funcionário" : "Cadastrar funcionário"}</Text>
      <View style={s.card}>
        <Input label="Nome" value={empForm.name} onChangeText={(v) => setEmpForm((p) => ({ ...p, name: v }))} placeholder="Nome completo" autoCapitalize="words" />
        <Input label="E-mail" value={empForm.email} onChangeText={(v) => setEmpForm((p) => ({ ...p, email: v }))} placeholder="email@empresa.com" />
        <Input label={editingEmpId ? "Nova senha (deixe em branco para manter)" : "Senha"} value={empForm.password} onChangeText={(v) => setEmpForm((p) => ({ ...p, password: v }))} placeholder="Mínimo 6 caracteres" secureTextEntry />

        <Text style={[s.label, { marginBottom: 6, marginTop: 4 }]}>FUNÇÃO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          {[
            { value: "instalador", label: "Instalador" },
            { value: "vendedor", label: "Vendedor" },
            { value: "admin", label: "Admin" },
          ].map((r) => (
            <Pressable
              key={r.value}
              style={[s.chip, empForm.role === r.value && s.chipActive]}
              onPress={() => setEmpForm((p) => ({ ...p, role: r.value }))}
            >
              <Text style={s.chipText}>{r.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.row}>
          <Button label={editingEmpId ? "Atualizar" : "Cadastrar"} onPress={saveEmployee} loading={savingEmp} />
          {editingEmpId ? (
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={() => { setEditingEmpId(null); setEmpForm({ name: "", email: "", password: "", role: "instalador" }); }}
            />
          ) : null}
        </View>
      </View>

      <Text style={s.listTitle}>Equipe</Text>
      {employees.length === 0 ? (
        <Text style={s.empty}>Nenhum funcionário cadastrado.</Text>
      ) : employees.map((emp) => {
        const [bg, color] = STATUS_COLORS[emp.current_status] || ["#f0f0f0", "#555"];
        const ordersCount = orders.filter((o) => o.installer_id === emp.id).length;
        return (
          <View key={emp.id} style={s.listCard}>
            <View style={s.cardRow}>
              <Text style={[s.itemTitle, { flex: 1 }]} numberOfLines={1}>{emp.name}</Text>
              <View style={[s.badge, { backgroundColor: bg }]}>
                <Text style={[s.badgeText, { color }]}>
                  {STATUS_OPTIONS.find((o) => o.value === emp.current_status)?.label || emp.current_status || "Disponível"}
                </Text>
              </View>
            </View>
            <View style={s.cardRow}>
              <View style={[s.badge, {
                backgroundColor: emp.role === "admin" ? "#d1e7dd" : emp.role === "instalador" ? "#cfe2ff" : "#fff3cd",
              }]}>
                <Text style={[s.badgeText, {
                  color: emp.role === "admin" ? "#0f5132" : emp.role === "instalador" ? "#084298" : "#856404",
                }]}>{emp.role}</Text>
              </View>
              <Text style={s.itemText}>{emp.email}</Text>
            </View>
            {ordersCount > 0 ? (
              <Text style={[s.itemText, { marginTop: 2 }]}>{ordersCount} pedido(s) atribuído(s)</Text>
            ) : null}
            {!emp.is_active ? (
              <Text style={[s.itemText, { color: "#842029" }]}>Inativo</Text>
            ) : null}
            <View style={s.row}>
              <Button
                label="Editar"
                small
                variant="ghost"
                onPress={() => {
                  setEditingEmpId(emp.id);
                  setEmpForm({ name: emp.name || "", email: emp.email || "", password: "", role: emp.role || "instalador" });
                }}
              />
              <Button label="Excluir" small variant="danger" onPress={() => deleteEmployee(emp)} />
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderSite = () => {
    const sc = siteConfig;
    const upd = (field, value) => setSiteConfig((prev) => ({ ...prev, [field]: value }));

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Configurações do Site</Text>

        {/* Sub-tabs */}
        <View style={s.siteTabBar}>
          {SITE_TABS.map((t) => (
            <Pressable
              key={t.id}
              style={[s.siteTabBtn, siteTab === t.id && s.siteTabBtnActive]}
              onPress={() => setSiteTab(t.id)}
            >
              <Text style={[s.siteTabText, siteTab === t.id && s.siteTabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Contato */}
        {siteTab === "contato" && (
          <View style={s.card}>
            <Text style={s.helperTitle}>Informações de Contato</Text>
            <Input label="Telefone principal" value={sc.phone1} onChangeText={(v) => upd("phone1", v)} placeholder="(11) 9999-9999" keyboardType="phone-pad" />
            <Input label="Telefone secundário" value={sc.phone2} onChangeText={(v) => upd("phone2", v)} placeholder="(11) 8888-8888" keyboardType="phone-pad" />
            <Input label="WhatsApp (com DDI, só números)" value={sc.whatsapp} onChangeText={(v) => upd("whatsapp", v)} placeholder="5511999999999" keyboardType="phone-pad" />
            <Input label="E-mail" value={sc.email} onChangeText={(v) => upd("email", v)} placeholder="contato@empresa.com.br" />
            <Input label="Endereço" value={sc.address} onChangeText={(v) => upd("address", v)} placeholder="Rua, número, cidade, estado" autoCapitalize="words" />
            <Input label="Horário de atendimento" value={sc.hours} onChangeText={(v) => upd("hours", v)} placeholder="Seg–Sáb: 8h às 18h" />
          </View>
        )}

        {/* Redes Sociais */}
        {siteTab === "redes" && (
          <View style={s.card}>
            <Text style={s.helperTitle}>Links das Redes Sociais</Text>
            <Text style={s.itemText}>Cole a URL completa de cada rede.</Text>
            <Input label="🟣 Instagram" value={sc.instagram} onChangeText={(v) => upd("instagram", v)} placeholder="https://instagram.com/..." />
            <Input label="🔵 Facebook" value={sc.facebook} onChangeText={(v) => upd("facebook", v)} placeholder="https://facebook.com/..." />
            <Input label="🔴 YouTube" value={sc.youtube} onChangeText={(v) => upd("youtube", v)} placeholder="https://youtube.com/@..." />
            <Input label="⚫ TikTok" value={sc.tiktok} onChangeText={(v) => upd("tiktok", v)} placeholder="https://tiktok.com/@..." />
          </View>
        )}

        {/* Configurações gerais */}
        {siteTab === "config" && (
          <View style={s.card}>
            <Text style={s.helperTitle}>Configurações Gerais</Text>
            <Input label="Nome do site" value={sc.site_name} onChangeText={(v) => upd("site_name", v)} placeholder="AFQA Vidraçaria" autoCapitalize="words" />
            <Input label="Slogan / tagline" value={sc.tagline} onChangeText={(v) => upd("tagline", v)} placeholder="Qualidade e transparência em vidros" />
            <View style={s.siteInfoBox}>
              <Text style={s.siteInfoText}>
                💡 As configurações são sincronizadas com o servidor e ficam disponíveis no painel admin e no app.
              </Text>
            </View>
          </View>
        )}

        <Button label="💾 Salvar configurações" onPress={() => saveSiteConfig(siteConfig)} loading={savingSite} />
      </View>
    );
  };

  const quotesWithOrder = useMemo(() => {
    const set = new Set(orders.map((o) => o.quote_id));
    return { set };
  }, [orders]);

  const filteredQuotes = useMemo(() => {
    if (!quoteStatusFilter) return quotes;
    return quotes.filter((q) => q.status === quoteStatusFilter);
  }, [quotes, quoteStatusFilter]);

  const myOrders = useMemo(() => {
    if (userRole !== "instalador" || !myEmployeeId) return orders;
    return orders.filter((o) => o.installer_id === myEmployeeId);
  }, [orders, userRole, myEmployeeId]);

  if (booting) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.bootText}>Preparando ambiente AFQA...</Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    const guessedUrl = guessLanApiUrl();
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={s.loginWrap}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.loginCard}>
              <Text style={s.logo}>AFQA Vidracaria</Text>
              <Text style={s.subtitle}>App de gestao comercial e operacional</Text>

              {/* URL API */}
              <View style={s.field}>
                <Text style={s.label}>URL do Servidor *</Text>
                <View style={s.urlRow}>
                  <TextInput
                    style={[
                      s.input,
                      s.urlInput,
                      connStatus === "ok" && { borderColor: C.success },
                      connStatus === "fail" && { borderColor: C.danger },
                    ]}
                    value={apiUrl}
                    onChangeText={(v) => { setApiUrl(v); setConnStatus(null); }}
                    placeholder={guessedUrl || "http://192.168.x.x:8000"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <Pressable
                    onPress={testConnection}
                    disabled={testing}
                    style={[s.testBtn, connStatus === "ok" && { borderColor: C.success }, connStatus === "fail" && { borderColor: C.danger }, testing && { opacity: 0.5 }]}
                  >
                    {testing
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : <Text style={[s.testBtnText, connStatus === "ok" && { color: C.success }, connStatus === "fail" && { color: C.danger }]}>
                          {connStatus === "ok" ? "✓ OK" : connStatus === "fail" ? "✗" : "Testar"}
                        </Text>
                    }
                  </Pressable>
                </View>
                {connStatus === "ok"
                  ? <Text style={[s.hint, { color: C.success }]}>Servidor conectado!</Text>
                  : connStatus === "fail"
                    ? <Text style={[s.hint, { color: C.danger }]}>Nao encontrado. Verifique IP e se o backend esta rodando com --host 0.0.0.0</Text>
                    : guessedUrl
                      ? <Text style={s.hint}>IP detectado: {guessedUrl} — toque em Testar</Text>
                      : <Text style={s.hint}>Ex: http://192.168.1.100:8000 (IP do PC na Wi-Fi)</Text>
                }
              </View>

              <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="admin@afqa.com" autoCapitalize="none" />
              <Input
                label="Senha"
                value={password}
                onChangeText={setPassword}
                placeholder="Sua senha"
                autoCapitalize="none"
                secureTextEntry
              />

              <Button
                label={showAdvanced ? "▲ Ocultar" : "▼ Tenant / configuracoes"}
                variant="ghost"
                small
                onPress={() => setShowAdvanced((v) => !v)}
              />
              {showAdvanced ? (
                <Input label="Tenant ID" value={tenantId} onChangeText={setTenantId} placeholder="afqa" autoCapitalize="none" />
              ) : null}

              <Button label="Entrar" loading={loggingIn} onPress={login} />
              <Text style={s.hint}>
                Celular e PC precisam estar na mesma rede Wi-Fi.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const renderStatusSelector = () => (
    <View style={s.card}>
      <Text style={[s.sectionTitle, { fontSize: 15, marginBottom: 8 }]}>Meu Status</Text>
      {STATUS_OPTIONS.map((opt) => {
        const [bg, color] = STATUS_COLORS[opt.value] || ["#f0f0f0", "#555"];
        const active = myStatus === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => updateMyStatus(opt.value)}
            disabled={updatingStatus}
            style={[s.statusOption, active && { backgroundColor: bg, borderColor: color }]}
          >
            <View style={[s.statusDot, { backgroundColor: active ? color : "#ccc" }]} />
            <Text style={[s.statusOptionText, active && { color, fontWeight: "700" }]}>{opt.label}</Text>
            {active ? <Text style={[s.statusCheck, { color }]}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );

  const renderDashboard = () => {
    if (userRole === "instalador") {
      return (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Meu painel</Text>
          {renderStatusSelector()}
        </View>
      );
    }

    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Visao geral</Text>
        <View style={s.grid}>
          <StatCard title="Clientes" value={String(dashboard?.clients ?? 0)} />
          <StatCard title="Orcamentos" value={String(dashboard?.quotes ?? 0)} tone="success" />
          <StatCard title="Pedidos" value={String(dashboard?.orders ?? 0)} tone="warning" />
          <StatCard title="Abertos" value={String(dashboard?.open_orders ?? 0)} tone="danger" />
          {userRole === "admin" ? (
            <StatCard title="Pendencias" value={money(dashboard?.pending_amount ?? 0)} tone="danger" />
          ) : null}
          {userRole === "admin" ? (
            <StatCard title="Faturamento" value={money(dashboard?.monthly_revenue ?? 0)} tone="success" />
          ) : null}
        </View>
        {userRole === "vendedor" ? (
          <View style={s.siteInfoBox}>
            <Text style={s.siteInfoText}>Dados financeiros disponiveis apenas para administradores.</Text>
          </View>
        ) : null}
      </View>
    );
  };
  const renderClients = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{editingClientId ? "Editar cliente" : "Cadastro de clientes"}</Text>
      <View style={s.card}>
        <Input label="Nome" value={clientForm.name} onChangeText={(v) => setClientForm((p) => ({ ...p, name: v }))} placeholder="Nome do cliente" autoCapitalize="words" maxLength={150} />
        <Input label="Telefone" value={clientForm.phone} onChangeText={(v) => setClientForm((p) => ({ ...p, phone: v }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" maxLength={30} />
        <Input label="E-mail" value={clientForm.email} onChangeText={(v) => setClientForm((p) => ({ ...p, email: v }))} placeholder="cliente@email.com" maxLength={180} />
        <Input label="Endereco" value={clientForm.address} onChangeText={(v) => setClientForm((p) => ({ ...p, address: v }))} placeholder="Rua, numero, bairro, cidade" autoCapitalize="words" maxLength={255} />
        <Input label="CPF/CNPJ" value={clientForm.document} onChangeText={(v) => setClientForm((p) => ({ ...p, document: v }))} placeholder="Documento" maxLength={30} />
        <Input label="Observacoes" value={clientForm.notes} onChangeText={(v) => setClientForm((p) => ({ ...p, notes: v }))} placeholder="Preferencias, detalhes..." multiline />

        <View style={s.row}>
          <Button label={editingClientId ? "Atualizar" : "Cadastrar"} onPress={saveClient} loading={savingClient} />
          {editingClientId ? (
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setEditingClientId(null);
                setClientForm({ name: "", phone: "", email: "", address: "", document: "", notes: "" });
              }}
            />
          ) : null}
        </View>
      </View>

      <Text style={s.listTitle}>Clientes cadastrados</Text>
      <Input
        label="Buscar cliente"
        value={clientSearch}
        onChangeText={setClientSearch}
        placeholder="Nome, telefone ou e-mail"
      />
      {filteredClients.map((item) => (
        <View key={item.id} style={s.listCard}>
          <Text style={s.itemTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={s.itemText} numberOfLines={1}>{item.phone}{item.email ? ` · ${item.email}` : ""}</Text>
          {item.document ? <Text style={s.itemText}>Doc: {item.document}</Text> : null}
          {item.address ? <Text style={s.itemText} numberOfLines={1}>{item.address}</Text> : null}
          {item.notes ? <Text style={s.itemText} numberOfLines={2}>Obs: {item.notes}</Text> : null}
          <View style={s.row}>
            <Button label="Editar" small variant="ghost" onPress={() => editClient(item)} />
            {userRole === "admin" ? (
              <Button label="Excluir" small variant="danger" onPress={() => deleteClient(item.id)} />
            ) : null}
          </View>
        </View>
      ))}
      {!filteredClients.length ? <Text style={s.empty}>Nenhum cliente encontrado.</Text> : null}
    </View>
  );

  const renderQuotes = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Criar orcamento</Text>
      <View style={s.card}>
        <Text style={s.helperTitle}>Selecione o cliente</Text>
        {!clients.length ? <Text style={s.empty}>Cadastre pelo menos um cliente para criar orcamento.</Text> : null}
        {selectedQuoteClient ? (
          <View style={s.selectedClientBox}>
            <Text style={s.selectedClientText}>Cliente: {selectedQuoteClient.name}</Text>
            <Text style={s.selectedClientSub}>{selectedQuoteClient.phone}</Text>
          </View>
        ) : (
          <Text style={s.empty}>Nenhum cliente selecionado.</Text>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          {clients.map((c) => (
            <Pressable
              key={c.id}
              style={[s.chip, Number(quoteForm.clientId) === c.id && s.chipActive]}
              onPress={() => setQuoteForm((p) => ({ ...p, clientId: String(c.id) }))}
            >
              <Text style={s.chipText}>{c.id} - {c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Input label="Titulo" value={quoteForm.title} onChangeText={(v) => setQuoteForm((p) => ({ ...p, title: v }))} placeholder="Box de banheiro, fachada..." autoCapitalize="words" />

        <View style={s.row2}>
          <View style={s.col}><Input label="Largura (m)" value={quoteForm.width} onChangeText={(v) => setQuoteForm((p) => ({ ...p, width: v }))} placeholder="1.20" keyboardType="decimal-pad" /></View>
          <View style={s.col}><Input label="Altura (m)" value={quoteForm.height} onChangeText={(v) => setQuoteForm((p) => ({ ...p, height: v }))} placeholder="2.10" keyboardType="decimal-pad" /></View>
        </View>

        <View style={s.row2}>
          <View style={s.col}><Input label="Quantidade" value={quoteForm.qty} onChangeText={(v) => setQuoteForm((p) => ({ ...p, qty: v }))} placeholder="1" keyboardType="decimal-pad" /></View>
          <View style={s.col}><Input label="Valor Unit. (R$)" value={quoteForm.unitPrice} onChangeText={(v) => setQuoteForm((p) => ({ ...p, unitPrice: v }))} placeholder="850" keyboardType="decimal-pad" /></View>
        </View>

        <View style={s.row2}>
          <View style={s.col}><Input label="Desconto (R$)" value={quoteForm.discount} onChangeText={(v) => setQuoteForm((p) => ({ ...p, discount: v }))} placeholder="0" keyboardType="decimal-pad" /></View>
          <View style={s.col}><Input label="Data medicao" value={quoteForm.measurementDate} onChangeText={(v) => setQuoteForm((p) => ({ ...p, measurementDate: v }))} placeholder="YYYY-MM-DD" /></View>
        </View>

        <Input label="Validade" value={quoteForm.validityDate} onChangeText={(v) => setQuoteForm((p) => ({ ...p, validityDate: v }))} placeholder="YYYY-MM-DD" />
        <Input label="Observacoes" value={quoteForm.notes} onChangeText={(v) => setQuoteForm((p) => ({ ...p, notes: v }))} placeholder="Detalhes do servico" multiline />

        <View style={s.previewBox}>
          <Text style={s.previewTitle}>Resumo comercial</Text>
          <Text style={s.previewText}>Area por peca: {quotePreview.areaPerPiece.toFixed(2)} m2</Text>
          <Text style={s.previewText}>Area total: {quotePreview.totalM2.toFixed(2)} m2</Text>
          <Text style={s.previewText}>Bruto: {money(quotePreview.gross)}</Text>
          <Text style={s.previewStrong}>Total com desconto: {money(quotePreview.total)}</Text>
        </View>

        <Button label="Criar orcamento" onPress={createQuote} loading={savingQuote} disabled={!clients.length} />
      </View>

      <Text style={s.listTitle}>Orcamentos</Text>

      {/* Filtro de status */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.chipScroll, { marginBottom: 8 }]}>
        {[
          { value: "", label: "Todos" },
          { value: "draft", label: "Rascunho" },
          { value: "approved", label: "Aprovado" },
        ].map((f) => (
          <Pressable
            key={f.value}
            style={[s.chip, quoteStatusFilter === f.value && s.chipActive]}
            onPress={() => setQuoteStatusFilter(f.value)}
          >
            <Text style={s.chipText}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredQuotes.map((q) => {
        const qClient = clients.find((c) => c.id === q.client_id);
        const firstItem = Array.isArray(q.items) && q.items.length > 0 ? q.items[0] : null;
        const hasOrder = quotesWithOrder.set.has(q.id);
        const isEditingThis = editingQuoteId === q.id;
        return (
          <View key={q.id} style={s.listCard}>
            <View style={s.cardRow}>
              <Text style={[s.itemTitle, { flex: 1 }]} numberOfLines={1}>
                {qClient?.name ?? `Cliente #${q.client_id}`}
              </Text>
              <StatusBadge status={q.status} />
            </View>
            <Text style={s.itemText} numberOfLines={2}>{q.description}</Text>
            {firstItem ? (
              <Text style={s.itemText}>
                {firstItem.quantity.toFixed(2)} {firstItem.unit} × {money(firstItem.unit_price)}/un = {money(firstItem.line_total)}
              </Text>
            ) : null}
            <Text style={s.itemText}>
              Total: {money(q.total)}{q.discount > 0 ? ` (desc. ${money(q.discount)})` : ""}
            </Text>
            {q.measurement_date ? <Text style={s.itemText}>Medição: {q.measurement_date}</Text> : null}
            {q.validity_date ? <Text style={s.itemText}>Validade: {q.validity_date}</Text> : null}

            {/* Formulário de edição inline */}
            {isEditingThis ? (
              <View style={s.inlinePanel}>
                <Text style={s.helperTitle}>Editar orçamento</Text>
                <Input
                  label="Data de medição (AAAA-MM-DD)"
                  value={quoteEditForm.measurement_date}
                  onChangeText={(v) => setQuoteEditForm((p) => ({ ...p, measurement_date: v }))}
                  placeholder="2025-12-31"
                />
                <Input
                  label="Validade (AAAA-MM-DD)"
                  value={quoteEditForm.validity_date}
                  onChangeText={(v) => setQuoteEditForm((p) => ({ ...p, validity_date: v }))}
                  placeholder="2025-12-31"
                />
                <Input
                  label="Desconto (R$)"
                  value={quoteEditForm.discount}
                  onChangeText={(v) => setQuoteEditForm((p) => ({ ...p, discount: v }))}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Descrição / Observações"
                  value={quoteEditForm.description}
                  onChangeText={(v) => setQuoteEditForm((p) => ({ ...p, description: v }))}
                  placeholder="Detalhes do serviço"
                  multiline
                />
                <View style={s.row}>
                  <Button label="Salvar" small variant="primary" loading={savingQuoteEdit} onPress={() => updateQuote(q.id)} />
                  <Button label="Cancelar" small variant="ghost" onPress={() => setEditingQuoteId(null)} />
                </View>
              </View>
            ) : null}

            <View style={s.row}>
              <Button
                label={hasOrder ? "Pedido criado" : "Gerar pedido"}
                small
                variant={hasOrder ? "ghost" : "success"}
                disabled={hasOrder}
                onPress={() => createOrderFromQuote(q.id)}
              />
              {(userRole === "admin" || userRole === "vendedor") && !isEditingThis ? (
                <Button
                  label="Editar"
                  small
                  variant="ghost"
                  onPress={() => {
                    setEditingQuoteId(q.id);
                    setQuoteEditForm({
                      measurement_date: q.measurement_date || "",
                      validity_date: q.validity_date || "",
                      discount: String(q.discount ?? 0),
                      description: q.description || "",
                    });
                  }}
                />
              ) : null}
              {(userRole === "admin" || userRole === "vendedor") && q.status === "draft" ? (
                <Button
                  label="Aprovar"
                  small
                  variant="primary"
                  onPress={() => approveQuote(q.id)}
                />
              ) : null}
              {userRole === "admin" && !hasOrder && q.status === "draft" ? (
                <Button
                  label="Excluir"
                  small
                  variant="danger"
                  onPress={() => deleteQuote(q.id)}
                />
              ) : null}
              <Button
                label="PDF"
                small
                variant="ghost"
                onPress={() => openPdf("quote", q.id)}
              />
            </View>
          </View>
        );
      })}
      {!filteredQuotes.length ? <Text style={s.empty}>Nenhum orcamento encontrado.</Text> : null}
    </View>
  );

  const renderOrders = () => {
    const isInstalador = userRole === "instalador";
    const isAdmin = userRole === "admin";
    const displayOrders = myOrders;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>
          {isInstalador && myEmployeeId ? "Meus Pedidos" : "Pedidos"}
        </Text>
        {isInstalador && orders.length > 0 && myOrders.length === 0 ? (
          <View style={s.siteInfoBox}>
            <Text style={s.siteInfoText}>Nenhum pedido atribuido a voce ainda.</Text>
          </View>
        ) : null}
        {displayOrders.map((o) => {
          const paid = Array.isArray(o.payments)
            ? o.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0)
            : 0;
          const pending = Math.max(Number(o.total || 0) - paid, 0);
          const oQuote = quotes.find((q) => q.id === o.quote_id);
          const oClient = clients.find((c) => c.id === oQuote?.client_id);
          const isPayingThis = payingOrderId === o.id;
          const isPickingInstaller = installerPickerOrderId === o.id;
          const isScheduling = schedulingOrderId === o.id;

          return (
            <View key={o.id} style={[s.listCard, o.status === "cancelado" && { opacity: 0.55 }]}>
              {/* Cabeçalho */}
              <View style={s.cardRow}>
                <Text style={[s.itemTitle, { flex: 1 }]} numberOfLines={1}>
                  Pedido #{o.id}{oClient ? ` — ${oClient.name}` : ""}
                </Text>
                <StatusBadge status={o.status} />
              </View>
              {oQuote ? <Text style={s.itemText} numberOfLines={1}>{oQuote.description}</Text> : null}

              {/* Instalador */}
              {!isInstalador ? (
                <View>
                  <Text style={s.itemText}>
                    Instalador: {o.installer ? o.installer.name : "Não atribuído"}
                  </Text>
                  {userRole === "admin" && o.status !== "cancelado" && o.status !== "installed" ? (
                    isPickingInstaller ? (
                      <View style={s.inlinePanel}>
                        <Text style={s.helperTitle}>Selecionar instalador:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                          {employees.filter((e) => e.role === "instalador" && e.is_active !== false).map((emp) => (
                            <Pressable
                              key={emp.id}
                              style={[s.chip, o.installer_id === emp.id && s.chipActive]}
                              onPress={() => assignInstaller(o.id, emp.id)}
                              disabled={savingInstaller}
                            >
                              <Text style={s.chipText}>{emp.name}</Text>
                            </Pressable>
                          ))}
                          {o.installer_id ? (
                            <Pressable
                              style={[s.chip, { borderColor: C.danger }]}
                              onPress={() => removeInstaller(o.id)}
                            >
                              <Text style={[s.chipText, { color: C.danger }]}>Remover</Text>
                            </Pressable>
                          ) : null}
                        </ScrollView>
                        <Button label="Fechar" small variant="ghost" onPress={() => setInstallerPickerOrderId(null)} />
                      </View>
                    ) : (
                      <Button
                        label={o.installer ? "Trocar instalador" : "Atribuir instalador"}
                        small
                        variant="ghost"
                        onPress={() => setInstallerPickerOrderId(o.id)}
                      />
                    )
                  ) : null}
                </View>
              ) : null}

              {/* Data de instalação */}
              {o.scheduled_installation && !isScheduling ? (
                <Text style={s.itemText}>Agendado: {o.scheduled_installation}</Text>
              ) : null}
              {o.installed_at ? (
                <Text style={[s.itemText, { color: C.success }]}>Instalado em: {o.installed_at}</Text>
              ) : null}
              {userRole === "admin" && o.status !== "cancelado" && o.status !== "installed" ? (
                isScheduling ? (
                  <View style={s.inlinePanel}>
                    <Input
                      label="Data de instalação (AAAA-MM-DD)"
                      value={scheduleDate}
                      onChangeText={setScheduleDate}
                      placeholder="2025-12-31"
                    />
                    <View style={s.row}>
                      <Button label="Salvar" small variant="primary" loading={savingSchedule} onPress={() => saveScheduleDate(o.id, scheduleDate)} />
                      <Button label="Cancelar" small variant="ghost" onPress={() => { setSchedulingOrderId(null); setScheduleDate(""); }} />
                    </View>
                  </View>
                ) : (
                  <Button
                    label={o.scheduled_installation ? "Alterar data" : "Agendar instalação"}
                    small
                    variant="ghost"
                    onPress={() => { setSchedulingOrderId(o.id); setScheduleDate(o.scheduled_installation || ""); }}
                  />
                )
              ) : null}

              {/* Pagamento */}
              <Text style={s.itemText}>Total: {money(o.total)} · Pago: {money(paid)} · Pendente: {money(pending)}</Text>
              {isPayingThis ? (
                <View style={s.inlinePanel}>
                  <Text style={s.helperTitle}>Registrar pagamento</Text>
                  <Input
                    label="Valor (R$)"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder={pending.toFixed(2)}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[s.label, { marginBottom: 6, marginTop: 4 }]}>MÉTODO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
                    {[
                      { value: "pix", label: "PIX" },
                      { value: "dinheiro", label: "Dinheiro" },
                      { value: "cartao", label: "Cartão" },
                      { value: "transferencia", label: "Transferência" },
                      { value: "boleto", label: "Boleto" },
                    ].map((m) => (
                      <Pressable
                        key={m.value}
                        style={[s.chip, paymentMethod === m.value && s.chipActive]}
                        onPress={() => setPaymentMethod(m.value)}
                      >
                        <Text style={s.chipText}>{m.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={s.row}>
                    <Button label="Confirmar" small variant="success" loading={savingPayment} onPress={() => registerPayment(o.id, paymentAmount, paymentMethod)} />
                    <Button label="Cancelar" small variant="ghost" onPress={() => { setPayingOrderId(null); setPaymentAmount(""); setPaymentMethod("pix"); }} />
                  </View>
                </View>
              ) : null}

              {/* Botões de ação */}
              <View style={s.row}>
                {o.status === "open" && (
                  <Button label="Em deslocamento" small variant="warning" onPress={() => markInTransit(o.id)} />
                )}
                {o.status === "em_deslocamento" && (
                  <Button label="Iniciar serviço" small variant="warning" onPress={() => markInProgress(o.id)} />
                )}
                {o.status === "em_andamento" && (
                  <Button
                    label="Marcar instalado"
                    small
                    variant="success"
                    onPress={() => {
                      if (isAdmin) {
                        if (!o.installer_id) {
                          Alert.alert("Atenção", "Atribua um instalador antes de concluir o pedido.");
                          return;
                        }
                        if (pending > 0) {
                          Alert.alert("Atenção", `Pedido possui saldo pendente de R$ ${pending.toFixed(2)}. Registre o pagamento antes de concluir.`);
                          return;
                        }
                      }
                      markInstalled(o.id);
                    }}
                  />
                )}
                {o.status === "installed" && (
                  <Button label="Instalado" small variant="ghost" disabled />
                )}
                {o.status === "cancelado" && (
                  <Button label="Cancelado" small variant="ghost" disabled />
                )}
                {!isInstalador && o.status !== "cancelado" && o.status !== "installed" && !isPayingThis ? (
                  <Button
                    label="Pgto."
                    small
                    variant="primary"
                    onPress={() => { setPayingOrderId(o.id); setPaymentAmount(String(pending.toFixed(2))); }}
                  />
                ) : null}
                {!isInstalador ? (
                  <Button label="WhatsApp" small variant="success" onPress={() => sendWhatsAppOrder(o)} />
                ) : null}
                <Button label="PDF" small variant="ghost" onPress={() => openPdf("order", o.id)} />
                {userRole === "admin" && o.status !== "cancelado" && o.status !== "installed" ? (
                  <Button label="Cancelar" small variant="danger" onPress={() => cancelOrder(o.id)} />
                ) : null}
              </View>
            </View>
          );
        })}
        {!displayOrders.length && !(isInstalador && orders.length > 0) ? (
          <Text style={s.empty}>Nenhum pedido encontrado.</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>AFQA Vidracaria</Text>
          <View style={s.row}>
            {userName ? <Text style={s.headerSub}>{userName} · </Text> : null}
            <View style={[s.roleBadge, userRole === "admin" ? s.roleBadgeAdmin : userRole === "instalador" ? s.roleBadgeInstalador : s.roleBadgeVendedor]}>
              <Text style={s.roleBadgeText}>{userRole === "admin" ? "Admin" : userRole === "instalador" ? "Instalador" : "Vendedor"}</Text>
            </View>
          </View>
        </View>
        <Button label="Sair" variant="ghost" small onPress={logout} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing || loadingData} onRefresh={onRefresh} />}
        >
          {tab === "dashboard"     ? renderDashboard()     : null}
          {tab === "clients"       ? renderClients()       : null}
          {tab === "quotes"        ? renderQuotes()        : null}
          {tab === "orders"        ? renderOrders()        : null}
          {tab === "calc"          ? renderCalc()          : null}
          {tab === "site"          ? renderSite()          : null}
          {tab === "funcionarios"  ? renderEmployees()     : null}
        </ScrollView>

        <View style={[s.tabBarWrap, { paddingBottom: (insets.bottom || 0) + 8 }]}>
          <View style={s.tabBar}>
          {(userRole === "admin"
            ? ["dashboard", "clients", "quotes", "orders", "funcionarios", "calc", "site"]
            : userRole === "instalador"
            ? ["dashboard", "orders", "calc"]
            : ["dashboard", "clients", "quotes", "orders", "calc"]
          ).map((t) => (
            <Pressable key={t} onPress={() => switchTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
              <Text style={[s.tabIcon, tab === t && s.tabTextActive]}>{TAB_ICONS[t]}</Text>
              <Text style={[s.tabText, s.tabTextSm, tab === t && s.tabTextActive]}>{TAB_LABELS[t]}</Text>
            </Pressable>
          ))}
        </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center" },
  bootText: { marginTop: 12, color: C.muted, fontSize: 15 },

  loginWrap: { flexGrow: 1, justifyContent: "center", padding: 20 },
  urlRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  urlInput: { flex: 1, marginRight: 8 },
  loginCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#13243f",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  logo: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.muted, marginBottom: 14 },
  hint: { marginTop: 10, color: C.muted, fontSize: 12 },
  testBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  testBtnText: { fontSize: 13, fontWeight: "600", color: C.primary },

  header: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  headerSub: { marginTop: 2, fontSize: 12, color: C.muted },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, marginTop: 3 },
  roleBadgeAdmin: { backgroundColor: "#1e40af" },
  roleBadgeVendedor: { backgroundColor: "#0f8a63" },
  roleBadgeInstalador: { backgroundColor: "#b46907" },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 20 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 2 },
  card: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dbe7f4",
  },
  statTitle: { fontSize: 12, color: C.muted, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800" },

  field: { marginBottom: 8 },
  label: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: C.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },

  btn: {
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 6,
    flex: 1,
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  btnSmall: { minHeight: 36, paddingHorizontal: 10, flex: 0 },
  btnSmallText: { fontSize: 12 },

  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  row2: { flexDirection: "row", gap: 8 },
  col: { flex: 1 },

  listTitle: { marginTop: 10, marginBottom: 2, fontSize: 16, fontWeight: "800", color: C.text },
  helperTitle: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 8 },
  listCard: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: { fontSize: 15, fontWeight: "800", color: C.text, marginBottom: 3 },
  itemText: { color: C.muted, fontSize: 13, marginBottom: 2 },
  empty: { color: C.muted, marginTop: 8, fontSize: 13 },
  selectedClientBox: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#f7fbff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  selectedClientText: { color: C.text, fontWeight: "700", fontSize: 13 },
  selectedClientSub: { color: C.muted, marginTop: 2, fontSize: 12 },

  chipScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#f7faff",
    borderRadius: 16,
    marginRight: 6,
  },
  chipActive: {
    borderColor: C.primary,
    backgroundColor: "#e8f1ff",
  },
  chipText: { fontSize: 12, color: C.primaryDark, fontWeight: "700" },
  previewBox: {
    marginTop: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fbff",
  },
  previewTitle: { fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 6 },
  previewText: { fontSize: 12, color: C.muted, marginBottom: 3 },
  previewStrong: { fontSize: 13, color: C.success, fontWeight: "800", marginTop: 2 },

  tabBarWrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: C.bg,
  },
  tabBar: {
    minHeight: 58,
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#13243f",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 8, paddingVertical: 4, flexDirection: "column", gap: 1 },
  tabBtnActive: { backgroundColor: C.primary },
  tabIcon: { fontSize: 16 },
  tabText: { fontSize: 12, fontWeight: "700", color: C.muted },
  tabTextSm: { fontSize: 9 },
  tabTextActive: { color: "#fff" },

  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },

  // Aba Site
  siteTabBar: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
    marginBottom: 8,
  },
  siteTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
  },
  siteTabBtnActive: { backgroundColor: C.primary },
  siteTabText: { fontSize: 12, fontWeight: "700", color: C.muted },
  siteTabTextActive: { color: "#fff" },
  inlinePanel: {
    backgroundColor: "#f4f8ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginTop: 8,
    gap: 2,
  },

  siteInfoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginTop: 4,
  },
  siteInfoText: { fontSize: 12, color: "#1e3a8a", lineHeight: 18 },

  // Calculadora
  priceHint: {
    backgroundColor: "#eef3ff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#c7d9f7",
  },
  priceHintText: { fontSize: 13, color: C.primary, fontWeight: "700" },

  calcResultBox: {
    marginTop: 14,
    backgroundColor: "#e8f8f2",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#a7e9cc",
  },
  calcResultLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  calcResultValue: {
    fontSize: 28,
    fontWeight: "800",
    color: C.success,
    marginBottom: 6,
  },
  calcResultArea: { fontSize: 13, color: C.text, fontWeight: "600", marginBottom: 4 },
  calcResultNote: {
    fontSize: 11,
    color: C.muted,
    fontStyle: "italic",
    marginBottom: 10,
  },

  // Employee status selector
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 6,
    backgroundColor: C.surface,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  statusCheck: {
    fontSize: 16,
    fontWeight: "800",
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
