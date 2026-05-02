// JS/auth.js

import { supabase, trackEvent } from "./supabase-config.js";

// --- TRADUTOR DE MENSAGENS (INCLUÍDO NO INÍCIO) ---
const mensagensTraduzidas = {
  "New password should be different from the old password.":
    "A nova senha deve ser diferente da senha antiga.",
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "User already registered": "Este e-mail já está cadastrado.",
  "Password should be at least 6 characters":
    "A senha deve ter pelo menos 6 caracteres.",
  "Network HTTP error": "Erro de conexão. Verifique sua internet.",
  "Signup success":
    "Conta criada! Enviamos um e-mail de ativação via Supabase. Verifique sua caixa de entrada e spam.",
  "Email not confirmed": "Por favor, confirme seu e-mail antes de entrar.",
};

function traduzir(mensagemOriginal) {
  return mensagensTraduzidas[mensagemOriginal] || mensagemOriginal;
}

// --- 1. FUNÇÃO UNIVERSAL DE ALERTA (MODAL MONEA) ---
export function mostrarMensagem(
  titulo,
  mensagem,
  tipo = "sucesso",
  acao = null,
) {
  const modal = document.getElementById("moneaAlertModal");
  const tituloEl = document.getElementById("moneaTitle");
  const mensagemEl = document.getElementById("moneaMsg");

  if (modal && tituloEl && mensagemEl) {
    tituloEl.innerText = titulo;
    mensagemEl.innerText = traduzir(mensagem);
    tituloEl.className = `monea-alert-title title-${tipo}`;

    // 🔥 CONTROLE INTELIGENTE
    modal.dataset.acao = acao || "";

    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
}

// Fechar modal
document.addEventListener("click", (e) => {
  if (
    e.target &&
    (e.target.id === "moneaBtnClose" || e.target.id === "moneaAlertModal")
  ) {
    const modal = document.getElementById("moneaAlertModal");

    if (modal) {
      const acao = modal.dataset.acao;

      modal.classList.add("hidden");
      modal.style.display = "none";

      // 🔥 REDIRECIONAMENTO CONTROLADO
      if (acao === "login") {
        window.location.href = "terminal.html";
      }

      if (acao === "cadastro") {
        window.location.href = "index.html";
      }

      if (acao === "reset") {
        window.location.href = "index.html";
      }
    }
  }
});

// --- 2. CONFIGURAÇÃO DE PAÍSES E DDIs (SUA LISTA COMPLETA) ---
const regions = {
  África: [
    { code: "ZA", name: "África do Sul" },
    { code: "AO", name: "Angola" },
    { code: "EG", name: "Egito" },
    { code: "MA", name: "Marrocos" },
    { code: "NG", name: "Nigéria" },
  ],
  América: [
    { code: "AR", name: "Argentina" },
    { code: "BR", name: "Brasil" },
    { code: "CA", name: "Canadá" },
    { code: "CL", name: "Chile" },
    { code: "CO", name: "Colômbia" },
    { code: "US", name: "Estados Unidos" },
    { code: "MX", name: "México" },
    { code: "PY", name: "Paraguai" },
    { code: "UY", name: "Uruguai" },
  ],
  "Ásia e Oceania": [
    { code: "AU", name: "Austrália" },
    { code: "CN", name: "China" },
    { code: "KR", name: "Coreia do Sul" },
    { code: "AE", name: "Emirados Árabes" },
    { code: "HK", name: "Hong Kong" },
    { code: "IN", name: "Índia" },
    { code: "ID", name: "Indonésia" },
    { code: "JP", name: "Japão" },
    { code: "NZ", name: "Nova Zelândia" },
    { code: "SG", name: "Singapura" },
    { code: "VN", name: "Vietnã" },
  ],
  Europa: [
    { code: "DE", name: "Alemanha" },
    { code: "ES", name: "Espanha" },
    { code: "EE", name: "Estônia" },
    { code: "FR", name: "França" },
    { code: "IE", name: "Irlanda" },
    { code: "IT", name: "Itália" },
    { code: "LU", name: "Luxemburgo" },
    { code: "NO", name: "Noruega" },
    { code: "PT", name: "Portugal" },
    { code: "GB", name: "Reino Unido" },
    { code: "CH", name: "Suíça" },
  ],
};

const countryDDIs = {
  "África do Sul": "+27",
  Angola: "+244",
  Egito: "+20",
  Marrocos: "+212",
  Nigéria: "+234",
  Argentina: "+54",
  Brasil: "+55",
  Canadá: "+1",
  Chile: "+56",
  Colômbia: "+57",
  "Estados Unidos": "+1",
  México: "+52",
  Paraguai: "+595",
  Uruguai: "+598",
  Austrália: "+61",
  China: "+86",
  "Coreia do Sul": "+82",
  "Emirados Árabes": "+971",
  "Hong Kong": "+852",
  Índia: "+91",
  Indonésia: "+62",
  Japão: "+81",
  "Nova Zelândia": "+64",
  Singapura: "+65",
  Vietnã: "+84",
  Alemanha: "+49",
  Espanha: "+34",
  Estônia: "+372",
  França: "+33",
  Irlanda: "+353",
  Itália: "+39",
  Luxemburgo: "+352",
  Noruega: "+47",
  Portugal: "+351",
  "Reino Unido": "+44",
  Suíça: "+41",
};

// --- 3. SELETORES E ELEMENTOS ---
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("formCadastro");
const formRedefinir = document.getElementById("formRedefinir");
const countryDisplay = document.getElementById("countryDisplay");
const countryList = document.getElementById("countryList");
const selectedFlag = document.getElementById("selectedFlag");
const selectedCountryName = document.getElementById("selectedCountryName");
const phoneInput = document.getElementById("phone");

// --- 4. FUNÇÕES DE INTERFACE (PAÍSES) ---
function selectCountry(code, name) {
  if (selectedFlag)
    selectedFlag.innerHTML = `<img src="https://flagcdn.com/w40/${code.toLowerCase()}.png" style="width:20px;">`;
  if (selectedCountryName) selectedCountryName.innerText = name;
  if (countryList) countryList.classList.add("hidden");
}

if (countryDisplay) {
  function populateCountryList() {
    if (!countryList) return;
    countryList.innerHTML = "";
    for (const [region, countries] of Object.entries(regions)) {
      const title = document.createElement("div");
      title.className = "region-title";
      title.innerText = `📌 ${region}`;
      countryList.appendChild(title);
      countries.forEach((c) => {
        const item = document.createElement("div");
        item.className = "country-option";
        item.innerHTML = `<img src="https://flagcdn.com/w40/${c.code.toLowerCase()}.png"> <span>${c.name}</span>`;
        item.onclick = () => selectCountry(c.code, c.name);
        countryList.appendChild(item);
      });
    }
  }

  async function autoDetect() {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data.status === "success")
        selectCountry(data.countryCode, data.country);
    } catch (e) {
      console.warn("Erro ao detectar país.");
    }
  }

  countryDisplay.addEventListener("click", () => {
    countryList.classList.toggle("hidden");
  });

  // 🔥 NOVO: fecha ao clicar fora (ESSENCIAL no mobile)
  document.addEventListener("click", (e) => {
    if (
      countryList &&
      !countryDisplay.contains(e.target) &&
      !countryList.contains(e.target)
    ) {
      countryList.classList.add("hidden");
    }
  });

  populateCountryList();
  autoDetect();
}

// Máscara de Telefone
if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    let x = e.target.value
      .replace(/\D/g, "")
      .match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
    e.target.value = !x[2]
      ? x[1]
      : "(" + x[1] + ") " + x[2] + (x[3] ? "-" + x[3] : "");
  });
}

// Revelar Senha (Global)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".icon-btn");

  if (btn) {
    e.preventDefault();

    const container = btn.closest(".field");
    if (!container) return;

    const input = container.querySelector("input");
    if (!input) return;

    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";

    btn.innerText = isPass ? "🔓" : "🔒";
  }
});

// --- 5. LOGIN ---
if (loginForm) {
  const btnForgot = document.getElementById("btnForgot");
  if (btnForgot) {
    btnForgot.addEventListener("click", async (e) => {
      e.preventDefault();
      const emailValue = document.getElementById("email").value.trim();
      if (!emailValue) {
        mostrarMensagem(
          "Atenção",
          "Digite seu e-mail para recuperar a senha.",
          "erro",
        );
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: window.location.origin + "/redefinir.html",
      });
      if (error) mostrarMensagem("Erro", error.message, "erro");
      else
        mostrarMensagem("Sucesso", "E-mail de recuperação enviado!", "sucesso");
    });
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btnSubmit");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = "Entrando...";
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      mostrarMensagem("Erro", error.message, "erro");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Entrar";
      }
    } else {
      await trackEvent("login");

      mostrarMensagem(
        "Sucesso",
        "Login realizado com sucesso!",
        "sucesso",
        "login", // 🔥 DEFINE AÇÃO
      );
    }
  });
}

// --- 6. CADASTRO ---
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById("btnSubmit");
    const paisNome = selectedCountryName
      ? selectedCountryName.innerText
      : "Brasil";
    const ddi = countryDDIs[paisNome] || "+55";
    const telefoneLimpo =
      ddi + document.getElementById("phone").value.replace(/\D/g, "");
    const emailValue = document.getElementById("emailCadastro").value.trim();
    const senhaValue = document.getElementById("senhaCadastro").value;
    const apelidoValue = document
      .getElementById("apelidoCadastro")
      .value.trim();

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerText = "Criando conta...";
    }

    const nomeCompleto = document.getElementById("nomeCadastro").value.trim();

    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password: senhaValue,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: apelidoValue,
          full_name: nomeCompleto, // ✅ ADICIONADO
          phone: telefoneLimpo,
          full_phone: telefoneLimpo,
          whatsapp: telefoneLimpo,
          email_confirm_sent: true,
        },
      },
    });

    if (error) {
      mostrarMensagem("Erro", error.message, "erro");
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Criar Agora";
      }
    } else {
      if (data?.user?.id) {
        await supabase.from("profiles").insert([
          {
            id: data.user.id,
            full_name: nomeCompleto,
            display_name: apelidoValue,
            email: emailValue,
            phone: telefoneLimpo,
          },
        ]);
      }

      await trackEvent("signup");

      mostrarMensagem(
        "Sucesso",
        "Signup success",
        "sucesso",
        "cadastro", // 🔥 DEFINE AÇÃO
      );

      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Criar Agora";
      }
    }
  });
}

// --- 7. REDEFINIR SENHA ---
if (formRedefinir) {
  formRedefinir.addEventListener("submit", async (e) => {
    e.preventDefault();
    const novaSenha = document.getElementById("novaSenha").value;
    const confirmacao = document.getElementById("confirmarNovaSenha").value;

    if (novaSenha !== confirmacao) {
      mostrarMensagem("Atenção", "As senhas não coincidem!", "erro");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) mostrarMensagem("Erro", error.message, "erro");
    else {
      mostrarMensagem(
        "Sucesso",
        "Senha atualizada! Redirecionando...",
        "sucesso",
        "reset", // 🔥 DEFINE AÇÃO
      );
    }
  });
}
