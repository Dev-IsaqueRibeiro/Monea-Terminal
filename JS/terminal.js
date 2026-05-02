// JS/terminal.js

import { supabase, trackEvent } from "./supabase-config.js";
import { CONFIG } from "./config.js";

// 1. LISTA DE ATIVOS (Copiada do seu original)
const ALL_ASSETS = [
  // FÍSICAS
  { id: "GBP", name: "Libra Esterlina", pair: "GBP-BRL", type: "Física" },
  { id: "EUR", name: "Euro", pair: "EUR-BRL", type: "Física" },
  { id: "CHF", name: "Franco Suíço", pair: "CHF-BRL", type: "Física" },
  { id: "USD", name: "Dólar Americano", pair: "USD-BRL", type: "Física" },
  { id: "CAD", name: "Dólar Canadense", pair: "CAD-BRL", type: "Física" },
  { id: "AUD", name: "Dólar Australiano", pair: "AUD-BRL", type: "Física" },
  { id: "SGD", name: "Dólar Singapura", pair: "SGD-BRL", type: "Física" },
  { id: "AED", name: "Dirham", pair: "AED-BRL", type: "Física" },
  { id: "CNY", name: "Yuan Chinês", pair: "CNY-BRL", type: "Física" },
  { id: "HKD", name: "Dólar Hong Kong", pair: "HKD-BRL", type: "Física" },
  { id: "NOK", name: "Coroa Norueguesa", pair: "NOK-BRL", type: "Física" },
  { id: "ZAR", name: "Rand Sul-Africano", pair: "ZAR-BRL", type: "Física" },
  { id: "JPY", name: "Iene Japonês", pair: "JPY-BRL", type: "Física" },
  { id: "MXN", name: "Peso Mexicano", pair: "MXN-BRL", type: "Física" },
  { id: "ARS", name: "Peso Argentino", pair: "ARS-BRL", type: "Física" },
  // CRIPTOS
  { id: "BTC", name: "Bitcoin", pair: "BTC-BRL", type: "Cripto" },
  { id: "ETH", name: "Ethereum", pair: "ETH-BRL", type: "Cripto" },
  { id: "BNB", name: "Binance Coin", pair: "BNB-BRL", type: "Cripto" },
  { id: "SOL", name: "Solana", pair: "SOL-BRL", type: "Cripto" },
  { id: "XRP", name: "XRP", pair: "XRP-BRL", type: "Cripto" },
  { id: "ADA", name: "Cardano", pair: "ADA-BRL", type: "Cripto" },
  { id: "DOGE", name: "Dogecoin", pair: "DOGE-BRL", type: "Cripto" },
];

// 🧠 ESTADO CENTRAL
const state = {
  selectedAsset: ALL_ASSETS[1],
  currentPrice: 0,
  alerts: [],
  triggeredAlerts: new Set(), // 🔒 trava anti-duplicação
  isReady: false,
};

window.state = state;

let chart = null;
const audioCompra = new Audio("SOUNDS/compra.mp3");
const audioVenda = new Audio("SOUNDS/venda.mp3");
audioCompra.loop = true;
audioVenda.loop = true;

let deferredPrompt;
let animationFrameId = null;

const installBtn = document.getElementById("installApp");

// Seletores do DOM
const priceDisplay = document.getElementById("currentPriceDisplay");
const assetNameDisplay = document.getElementById("selectedAssetName");
const tabsContainer = document.getElementById("assetTabs");
const btnLogout = document.getElementById("btnLogout");
const inputCompra = document.getElementById("inputCompra");
const inputVenda = document.getElementById("inputVenda");
const alertsBody = document.getElementById("alertsBody");
const alertPopup = document.getElementById("alertPopup");
const convBRL = document.getElementById("convBRL");
const convForeign = document.getElementById("convForeign");

// 2. PROTEÇÃO DE ROTA & SESSÃO
async function checkUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return;
  }

  // 1. Atualiza o Nome no Header Único
  const apelido = session.user.user_metadata.display_name || "Usuário";

  const btnWhatsapp = document.getElementById("btnWhatsapp");

  if (btnWhatsapp) {
    const mensagem = `Olá! 👋🏽
✔️ Me chamo *${apelido}*!<br>
💱 Venho através do Conversor de Moedas, Monea Terminal 🪙.`;

    const url = `https://wa.me/5547991719319?text=${encodeURIComponent(mensagem)}`;

    btnWhatsapp.href = url;
  }

  const nomeDisplay = document.getElementById("userNameDisplay");
  if (nomeDisplay) nomeDisplay.innerText = `| ${apelido}`;

  // 2. Garante que o botão de Logout e Engrenagem estejam visíveis
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.style.display = "flex";

  init();
}

// 3. LÓGICA DO MERCADO (Fetch da AwesomeAPI)
async function fetchData() {
  try {
    const res = await fetch(
      `https://economia.awesomeapi.com.br/json/last/${state.selectedAsset.pair}`,
    );

    const json = await res.json();
    const pairKey = state.selectedAsset.pair.replace("-", "");
    state.currentPrice = Number(json[pairKey].bid);

    if (priceDisplay) {
      priceDisplay.innerText = `R$ ${state.currentPrice.toFixed(3)}`;
      checkAlerts();
      updateChartRealtime();
    }

    return true;
  } catch (e) {
    console.error("Erro ao buscar cotação", e);
    return false;
  }
}

// 4. NAVEGAÇÃO ENTRE MOEDAS (Tabs)
function renderTabs() {
  if (!tabsContainer) return;

  // Gera o HTML dos botões
  tabsContainer.innerHTML = ALL_ASSETS.map((asset) => {
    // Define se o botão ganha a classe 'active' baseada na moeda selecionada
    const isActive = state.selectedAsset.id === asset.id ? "active" : "";

    return `
        <button data-id="${asset.id}" class="${isActive}">
            ${asset.id}
        </button>
    `;
  }).join("");

  // Adiciona evento de clique em cada tab
  tabsContainer.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");

      // Atualiza o estado da moeda selecionada
      state.selectedAsset = ALL_ASSETS.find((a) => a.id === id);

      // Atualiza o nome da moeda no card de preço
      if (assetNameDisplay) {
        assetNameDisplay.innerText = `${state.selectedAsset.name} Agora`;
      }

      // Re-renderiza as abas para aplicar a classe 'active' no novo botão
      renderTabs();

      // Busca os dados da nova moeda selecionada
      fetchData();
      updateChartData(); // Atualiza o histórico da nova moeda imediatamente
    });
  });
}

async function updateChartData() {
  try {
    const days = document.getElementById("selectDays")?.value || "30";

    const res = await fetch(
      `https://economia.awesomeapi.com.br/json/daily/${state.selectedAsset.pair}/${days}`,
    );

    const data = await res.json();
    const history = data.reverse();

    const canvas = document.getElementById("historyChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // 🔥 PREPARA DADOS
    const prices = history.map((item) => Number(item.bid));
    const labels = history.map((item) => {
      const date = new Date(item.timestamp * 1000);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    });

    // 🔥 ÚLTIMO PONTO = PREÇO ATUAL
    if (prices.length > 0 && state.currentPrice > 0) {
      prices[prices.length - 1] = state.currentPrice;
      labels[labels.length - 1] = "Agora";
    }

    // 🔥 SE NÃO EXISTE GRÁFICO → CRIA
    if (!chart) {
      chart = new window.Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              data: prices,
              borderColor: "#0a2540",
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              backgroundColor: "rgba(10, 37, 64, 0.05)",
              pointRadius: 4,
              pointBackgroundColor: "#3d0c7c",
              pointBorderColor: "#ffffff",
              pointHoverRadius: 7,
              pointHoverBackgroundColor: "#2ccc00",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false, // 🔥 remove lag
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: "#f5f5f5",
              titleColor: "#0c377c",
              bodyColor: "#3d0c7c",
              padding: 12,
              cornerRadius: 12,
              displayColors: false,
              borderColor: "#3d0c7c",
              borderWidth: 1.5,
              callbacks: {
                label: (context) => ` Preço: R$ ${context.parsed.y.toFixed(3)}`,
              },
            },
          },
          scales: {
            x: { display: false },
            y: {
              display: true,
              ticks: { font: { size: 10 }, color: "#94a3b8" },
              grid: { color: "#f1f5f9" },
            },
          },
        },
      });

      return;
    }

    // 🔥 ATUALIZA SEM RECRIAR (MUITO MAIS RÁPIDO)
    chart.data.labels = labels;
    chart.data.datasets[0].data = prices;

    chart.update("none"); // 🔥 update leve (sem animação)
  } catch (e) {
    console.error("Erro ao carregar histórico", e);
  }
}

function updateChartRealtime() {
  if (!chart) return;

  const lastIndex = chart.data.datasets[0].data.length - 1;

  if (lastIndex >= 0) {
    chart.data.datasets[0].data[lastIndex] = state.currentPrice;
    chart.update("none"); // ultra leve
  }
}

function checkAlerts() {
  console.log("🔍 CHECKANDO ALERTAS...", state.currentPrice);
  if (!state.isReady) return;

  state.alerts.forEach((alert, index) => {
    // 🔒 Só trabalha com ativos
    console.log("STATUS:", alert.status);

    if (alert.status !== "Ativo") return;

    // 🔒 Só moeda atual
    if (alert.ativo !== state.selectedAsset.id) return;

    const price = Number(state.currentPrice.toFixed(3));
    const target = Number(alert.precoAlvo.toFixed(3));

    const tipo = (alert.tipo || "").toLowerCase();

    const isTriggered =
      (tipo === "compra" && price <= target) ||
      (tipo === "venda" && price >= target);

    if (!isTriggered) return;

    // 🔒 Evita duplicação REAL (único controle necessário)
    if (state.triggeredAlerts.has(alert.id)) return;

    // 🔒 TRAVA IMEDIATA
    state.triggeredAlerts.add(alert.id);

    // 🔥 Atualiza estado local
    state.alerts[index].status = "Disparado";

    // 🔥 UI
    triggerAlarm(alert);

    // 🔥 Banco (assíncrono)
    updateAlertStatusInDatabase(alert.id);

    // 🔥 Push
    sendPushNotification(alert);

    // 🔥 Render
    renderAlertsTable();
  });
}

// FUNÇÃO NOTIFICAÇÃO NO CELULAR
async function sendPushNotification(alert) {
  try {
    await fetch(CONFIG.PUSH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title:
          alert.tipo === "Compra"
            ? "📉 Oportunidade de Compra!"
            : "📈 Hora de Vender!",
        body: `O ${alert.ativo} atingiu R$ ${alert.precoAlvo.toFixed(3)}`,
        url: "./terminal.html",
      }),
    });
  } catch (error) {
    console.error("Erro ao enviar push:", error);
  }
}

// Função para salvar o "Disparado" no Supabase
async function updateAlertStatusInDatabase(alertId) {
  const agora = new Date().toISOString();

  const { error } = await supabase
    .from("price_alerts")
    .update({
      status: "Disparado",
      triggered_at: agora, // Salva o momento exato no banco de dados
    })
    .eq("id", alertId);

  // Tratamento de erro que estava faltando
  if (error) {
    console.error("Erro ao atualizar status no banco:", error.message);
  }
}

function triggerAlarm(alert) {
  const modal = document.getElementById("alertPopup");
  const titulo = document.getElementById("alertTitle");
  const subtitulo = document.getElementById("alertName");

  // Captura o momento do disparo para exibir no modal
  const horaDisparo = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  modal.classList.remove("hidden");

  const valorFormatado = alert.precoAlvo.toFixed(3);
  const moedaNegrito = `<strong style="color: #3d0c7c;">${alert.ativo}</strong>`;

  if (alert.tipo === "Compra") {
    titulo.innerText = "OPORTUNIDADE DE COMPRA!";
    titulo.style.color = "#1ead5a";

    const valorColorido = `<span style="color: #1ead5a; font-weight: bold;">R$ ${valorFormatado}</span>`;

    subtitulo.innerHTML = `O ${moedaNegrito} caiu para ${valorColorido}.<br><span style="font-size: 0.85rem; color: #171717;">⏰ Disparado às: ${horaDisparo}</span>`;

    audioCompra.play().catch(() => {});
    document.body.classList.add("bg-buy-flash");
  } else {
    titulo.innerText = "HORA DE REALIZAR LUCRO!";
    titulo.style.color = "#dc2626";

    const valorColorido = `<span style="color: #dc2626; font-weight: bold;">R$ ${valorFormatado}</span>`;

    subtitulo.innerHTML = `O ${moedaNegrito} subiu para ${valorColorido}.<br><span style="font-size: 0.85rem; color: #171717;">⏰ Disparado às: ${horaDisparo}</span>`;

    audioVenda.play();
    document.body.classList.add("bg-sell-flash");
  }
}

function renderAlertsTable() {
  if (!alertsBody) return;
  alertsBody.innerHTML = state.alerts
    .map((a) => {
      // Define a cor baseada no tipo
      const corTipo = a.tipo === "Compra" ? "#1ead5a" : "#dc2626";

      return `
          <tr>
              <td>${a.ativo}</td>
              <td style="color: ${corTipo}; font-weight: bold;">${a.tipo}</td>
              <td>R$ ${a.precoAlvo.toFixed(3)}</td>
              <td><span class="status-tag ${a.status === "Ativo" ? "status-active" : "status-triggered"}">${a.status}</span></td>
              <td class="text-right">${a.data}</td>
          </tr>
        `;
    })
    .join("");
}

// 5. LOGOUT
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

// INICIALIZAÇÃO
async function init() {
  trackEvent("app_open");

  // 🔥 PWA - INSTALAÇÃO (COLOQUE NO TOPO)
  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("💾 PWA disponível para instalação");

    e.preventDefault();
    deferredPrompt = e;

    if (installBtn) {
      installBtn.style.display = "flex";
    }
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      console.log("📲 Resultado da instalação:", outcome);

      deferredPrompt = null;
      installBtn.style.display = "none";
    });
  }

  window.addEventListener("appinstalled", () => {
    console.log("✅ App instalado");

    if (installBtn) {
      installBtn.style.display = "none";
    }
  });

  // 🔽 RESTO DO SEU CÓDIGO (INALTERADO)
  if (assetNameDisplay) {
    assetNameDisplay.innerText = `${state.selectedAsset.name} Agora`;
  }

  renderTabs();

  // 🔥 CARREGA ALERTAS PRIMEIRO (OBRIGATÓRIO)
  await fetchAlertsFromDatabase();

  fetchData();
  updateChartData();

  // 🚨 LOOP CONTÍNUO (ESSENCIAL)
  setInterval(() => {
    fetchData();
  }, 2000);

  // 🔊 LIBERA ÁUDIO NO MOBILE
  document.addEventListener(
    "click",
    () => {
      audioCompra
        .play()
        .then(() => {
          audioCompra.pause();
          audioCompra.currentTime = 0;
        })
        .catch(() => {});

      audioVenda
        .play()
        .then(() => {
          audioVenda.pause();
          audioVenda.currentTime = 0;
        })
        .catch(() => {});
    },
    { once: true },
  );

  // 🔧 INPUTS
  if (inputCompra) applyInputMask(inputCompra);
  if (inputVenda) applyInputMask(inputVenda);

  const selectDays = document.getElementById("selectDays");
  if (selectDays) {
    selectDays.onchange = () => updateChartData();
  }

  // 💱 CONVERSOR
  if (convBRL && convForeign) {
    convBRL.value = "0.000";
    convForeign.value = "0.000";

    const processarConversao = (inputDestino, e, operacao) => {
      let rawValue = e.target.value.replace(/\D/g, "");
      let numberValue = (parseInt(rawValue) || 0) / 1000;
      e.target.value = numberValue.toFixed(3);

      if (operacao === "brlParaEstrangeira") {
        inputDestino.value =
          state.currentPrice > 0
            ? (numberValue / state.currentPrice).toFixed(3)
            : "0.000";
      } else {
        inputDestino.value = (numberValue * state.currentPrice).toFixed(3);
      }
    };

    convBRL.addEventListener("input", (e) =>
      processarConversao(convForeign, e, "brlParaEstrangeira"),
    );
    convForeign.addEventListener("input", (e) =>
      processarConversao(convBRL, e, "estrangeiraParaBrl"),
    );

    [convBRL, convForeign].forEach((input) => {
      input.addEventListener("focus", (e) => {
        if (e.target.value === "0.000") e.target.value = "";
      });
      input.addEventListener("blur", (e) => {
        if (!e.target.value || e.target.value === "0") {
          e.target.value = "0.000";
        }
      });
    });
  }

  // 🔔 ALERTA COMPRA
  const btnCompra = document.getElementById("btnAlertCompra");
  if (btnCompra) {
    btnCompra.onclick = async () => {
      const val = parseFloat(inputCompra.value);
      if (!val || val === 0) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        alert("Sessão expirada.");
        return;
      }

      const { error } = await supabase.from("price_alerts").insert([
        {
          user_id: session.user.id,
          asset_id: state.selectedAsset.id,
          type: "Compra",
          target_price: val,
          status: "Ativo",
        },
      ]);

      if (!error) {
        inputCompra.value = "";
        fetchAlertsFromDatabase();
      }
    };
  }

  // 🔔 ALERTA VENDA
  const btnVenda = document.getElementById("btnAlertVenda");
  if (btnVenda) {
    btnVenda.onclick = async () => {
      const val = parseFloat(inputVenda.value);
      if (!val || val === 0) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        alert("Sessão expirada.");
        return;
      }

      const { error } = await supabase.from("price_alerts").insert([
        {
          user_id: session.user.id,
          asset_id: state.selectedAsset.id,
          type: "Venda",
          target_price: val,
          status: "Ativo",
        },
      ]);

      if (!error) {
        inputVenda.value = "";
        fetchAlertsFromDatabase();
      }
    };
  }

  // 🔕 PARAR ALARME
  const btnStop = document.getElementById("btnStopSiren");
  if (btnStop) {
    btnStop.onclick = () => {
      audioCompra.pause();
      audioCompra.currentTime = 0;

      audioVenda.pause();
      audioVenda.currentTime = 0;

      alertPopup.classList.add("hidden");
      document.body.classList.remove("bg-buy-flash", "bg-sell-flash");
    };
  }
}

checkUser();

async function fetchAlertsFromDatabase() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("user_id", session.user.id) // FILTRO CRÍTICO: Traz apenas os alertas deste utilizador
    .order("created_at", { ascending: false });

  if (!error && data) {
    state.alerts = data.map((item) => ({
      id: item.id,
      ativo: item.asset_id,
      tipo: item.type,
      precoAlvo: item.target_price,
      status: item.status,
      data: item.triggered_at
        ? new Date(item.triggered_at).toLocaleTimeString()
        : new Date(item.created_at).toLocaleTimeString(),
    }));

    // 🔥 RESETA CONTROLE LOCAL BASEADO NO BANCO
    state.triggeredAlerts.clear();

    // 🔥 REPOPULA COM OS QUE JÁ FORAM DISPARADOS
    state.alerts.forEach((a) => {
      if (a.status === "Disparado") {
        state.triggeredAlerts.add(a.id);
      }
    });

    renderAlertsTable();

    // 🔥 CORRETO
    state.isReady = true;
  }
}

// Máscara Financeira de 3 casas (0.000)
function applyInputMask(input) {
  // Define o valor inicial visual
  if (!input.value) input.value = "0.000";

  input.addEventListener("input", (e) => {
    // 1. Pega apenas os números digitados
    let value = e.target.value.replace(/\D/g, "");

    // 2. Transforma em número e divide por 1000 para ter 3 casas decimais
    let numberValue = (parseInt(value) || 0) / 1000;

    // 3. Formata de volta para string com exatamente 3 casas decimais
    e.target.value = numberValue.toFixed(3);

    // Move o cursor para o final (para melhor UX)
    setTimeout(() => {
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  });

  // Limpa o campo ao focar para facilitar a digitação
  input.addEventListener("focus", (e) => {
    if (e.target.value === "0.000") e.target.value = "";
  });

  // Restaura o padrão se sair e estiver vazio
  input.addEventListener("blur", (e) => {
    if (!e.target.value || e.target.value === "0") e.target.value = "0.000";
  });
}
