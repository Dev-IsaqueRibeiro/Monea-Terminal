// JS/terminal.js

import { supabase } from "./supabase-config.js";

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

// Variáveis de Estado
let selectedAsset = ALL_ASSETS[1]; // Começa no Euro
let currentPrice = 0;
let alerts = [];
let triggeredAlerts = new Set(); // 🔒 trava anti-duplicação

let chart = null;
const audioCompra = new Audio("SOUNDS/compra.mp3");
const audioVenda = new Audio("SOUNDS/venda.mp3");
audioCompra.loop = true;
audioVenda.loop = true;

let deferredPrompt;
let isReady = false; // TRAVA DE SEGURANÇA
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
✔️ Me chamo <strong>${apelido}</strong>!<br>
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
      `https://economia.awesomeapi.com.br/json/last/${selectedAsset.pair}`,
    );
    const json = await res.json();
    const pairKey = selectedAsset.pair.replace("-", "");
    currentPrice = Number(json[pairKey].bid);

    if (priceDisplay) {
      priceDisplay.innerText = `R$ ${currentPrice.toFixed(3)}`;
      // Verifica apenas alertas no loop de 2s. O gráfico fica de fora.
      checkAlerts();

      updateChartData(); // 🔥 SINCRONIZA EM TEMPO REAL
    }
  } catch (e) {
    console.error("Erro ao buscar cotação");
  }
}

// 4. NAVEGAÇÃO ENTRE MOEDAS (Tabs)
function renderTabs() {
  if (!tabsContainer) return;

  // Gera o HTML dos botões
  tabsContainer.innerHTML = ALL_ASSETS.map((asset) => {
    // Define se o botão ganha a classe 'active' baseada na moeda selecionada
    const isActive = selectedAsset.id === asset.id ? "active" : "";

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
      selectedAsset = ALL_ASSETS.find((a) => a.id === id);

      // Atualiza o nome da moeda no card de preço
      if (assetNameDisplay) {
        assetNameDisplay.innerText = `${selectedAsset.name} Agora`;
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
      `https://economia.awesomeapi.com.br/json/daily/${selectedAsset.pair}/${days}`,
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
    if (prices.length > 0 && currentPrice > 0) {
      prices[prices.length - 1] = currentPrice;
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

function checkAlerts() {
  // Se ainda não carregou os dados do banco, NÃO FAZ NADA
  if (!isReady) return;

  alerts.forEach((alert, index) => {
    if (alert.status !== "Ativo") return;

    if (alert.ativo === selectedAsset.id) {
      const price = Number(currentPrice.toFixed(3));
      const target = Number(alert.precoAlvo.toFixed(3));

      if (
        (alert.tipo === "Compra" && price <= target) ||
        (alert.tipo === "Venda" && price >= target)
      ) {
        // 🔒 EVITA DISPARO DUPLICADO
        if (triggeredAlerts.has(alert.id)) return;

        triggeredAlerts.add(alert.id);

        alerts[index].status = "Disparado";
        triggerAlarm(alert);

        // 🚀 DISPARA PUSH
        sendPushNotification(alert);

        updateAlertStatusInDatabase(alert.id);
        renderAlertsTable();
      }
    }
  });
}

// FUNÇÃO NOTIFICAÇÃO NO CELULAR
async function sendPushNotification(alert) {
  try {
    await fetch(
      "https://cpxaywxaiohjnqskhufr.supabase.co/functions/v1/hyper-api",
      {
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
      },
    );
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
  alertsBody.innerHTML = alerts
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
btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// INICIALIZAÇÃO
function init() {
  assetNameDisplay.innerText = `${selectedAsset.name} Agora`;
  renderTabs();
  fetchData();

  // 🔊 LIBERA ÁUDIO NO MOBILE (CORRETO)
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

  // APLICANDO MÁSCARA NOS INPUTS
  applyInputMask(inputCompra);
  applyInputMask(inputVenda);

  const selectDays = document.getElementById("selectDays");
  if (selectDays) {
    selectDays.onchange = () => updateChartData();
  }

  // --- LÓGICA DO CONVERSOR DIRETO (Corrigida) ---
  if (convBRL && convForeign) {
    convBRL.value = "0.000";
    convForeign.value = "0.000";

    const processarConversao = (inputDestino, e, operacao) => {
      // 1. Aplica a Máscara Financeira
      let rawValue = e.target.value.replace(/\D/g, "");
      let numberValue = (parseInt(rawValue) || 0) / 1000;
      e.target.value = numberValue.toFixed(3);

      // 2. Faz o Cálculo
      if (operacao === "brlParaEstrangeira") {
        inputDestino.value =
          currentPrice > 0 ? (numberValue / currentPrice).toFixed(3) : "0.000";
      } else {
        inputDestino.value = (numberValue * currentPrice).toFixed(3);
      }
    };

    // CORREÇÃO AQUI: Removido o argumento extra que causava o erro
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
        if (!e.target.value || e.target.value === "0") e.target.value = "0.000";
      });
    });
  }

  // --- BOTÕES DE ALERTA ---
  document.getElementById("btnAlertCompra").onclick = async () => {
    const val = parseFloat(inputCompra.value);
    if (!val || val === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      alert("Sessão expirada. Por favor, saia e faça login novamente.");
      return;
    }

    const { error } = await supabase.from("price_alerts").insert([
      {
        user_id: user.id,
        asset_id: selectedAsset.id,
        type: "Compra",
        target_price: val,
        status: "Ativo",
      },
    ]);

    if (!error) {
      inputCompra.value = "";
      fetchAlertsFromDatabase();
    } else {
      console.error("Erro Supabase:", error.message);
    }
  };

  document.getElementById("btnAlertVenda").onclick = async () => {
    const val = parseFloat(inputVenda.value);
    if (!val || val === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      alert("Sessão expirada. Por favor, saia e faça login novamente.");
      return;
    }

    const { error } = await supabase.from("price_alerts").insert([
      {
        user_id: user.id,
        asset_id: selectedAsset.id,
        type: "Venda",
        target_price: val,
        status: "Ativo",
      },
    ]);

    if (!error) {
      inputVenda.value = "";
      fetchAlertsFromDatabase();
    } else {
      console.error("Erro Supabase:", error.message);
    }
  };

  document.getElementById("btnStopSiren").onclick = () => {
    // Para o som e volta para o segundo zero
    audioCompra.pause();
    audioCompra.currentTime = 0;

    audioVenda.pause();
    audioVenda.currentTime = 0;

    alertPopup.classList.add("hidden");
    document.body.classList.remove("bg-buy-flash", "bg-sell-flash");
  };

  // LOGICA DE INSTALAÇÃO PWA
  // A. Registrar o Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }

  // B. Escutar o evento do navegador perguntando se pode instalar
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // Impede o navegador de mostrar o prompt padrão chato
    deferredPrompt = e; // Guarda o evento para usar quando o usuário clicar no seu botão
    if (installBtn) installBtn.style.display = "flex"; // Mostra o seu botão de vidro
  });

  // C. Ação do clique no seu botão "Instalar App"
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt(); // Abre a janelinha de instalação
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          console.log("Monea Terminal instalado!");
        }
        deferredPrompt = null;
        installBtn.style.display = "none";
      }
    });
  }

  // D. Esconder o botão se o usuário já instalou por outro caminho
  window.addEventListener("appinstalled", () => {
    if (installBtn) installBtn.style.display = "none";
    deferredPrompt = null;
  });

  // ==========================
  // 🔔 REGISTRO PUSH NOTIFICATION
  // ==========================
  if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker.ready.then(async (registration) => {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.log("Permissão de notificação negada");
        return;
      }

      // 🔐 CHAVE VAPID (SUBSTITUIR DEPOIS)
      const VAPID_PUBLIC_KEY =
        "BKLP4UEF_0ZOxwKeSEBxZpPIx7MgorWqIPK8RlmkoEx4H6XWc6-vH40LWXZ3_Q6lnVZ8EeVPRL41uLhnKCX3BhE";

      function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        const rawData = window.atob(base64);
        return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
      }

      let subscription = await registration.pushManager.getSubscription();

      // 🔥 Só cria se NÃO existir
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // 🔥 SALVA NO SUPABASE
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await supabase.from("push_subscriptions").upsert({
          user_id: session.user.id,
          subscription: subscription,
        });
      }
    });
  }

  setInterval(fetchData, 2000);

  fetchAlertsFromDatabase();
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
    alerts = data.map((item) => ({
      id: item.id, // Guarda o ID para poder atualizar o status depois
      ativo: item.asset_id,
      tipo: item.type,
      precoAlvo: item.target_price,
      status: item.status,
      // Lógica: se já foi disparado, mostra a hora do banco, senão mostra a data de criação
      data: item.triggered_at
        ? new Date(item.triggered_at).toLocaleTimeString()
        : new Date(item.created_at).toLocaleTimeString(),
    }));
    renderAlertsTable();

    // LIBERA A CHECAGEM DE ALARMES APÓS 1 SEGUNDO DO CARREGAMENTO
    setTimeout(() => {
      isReady = true;
    }, 1000);
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
