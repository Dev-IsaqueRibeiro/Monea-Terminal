// JS/perfil.js

import { supabase } from "./supabase-config.js";
import { mostrarMensagem } from "./auth.js";

// ==========================
// 🔄 CARREGAR DADOS
// ==========================
async function carregarDados() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Erro ao buscar usuário:", error);
    return;
  }

  if (!user) return;

  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (erroPerfil) {
    console.error("Erro ao buscar perfil:", erroPerfil);
    return;
  }

  document.getElementById("emailPerfil").value =
    perfil?.email || user.email || "";

  document.getElementById("phonePerfil").value =
    perfil?.phone || user.user_metadata?.phone || "";

  document.getElementById("nomePerfil").value =
    perfil?.full_name || user.user_metadata?.full_name || "";

  document.getElementById("apelidoPerfil").value =
    perfil?.display_name || user.user_metadata?.display_name || "";
}

carregarDados();

// ==========================
// 🔴 LOGOUT (BOTÃO SEPARADO)
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogoutConfig");

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    });
  }
});

// ==========================
// 💾 SALVAR PERFIL
// ==========================
const form = document.getElementById("formPerfil");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const nome = document.getElementById("nomePerfil").value;
    const apelido = document.getElementById("apelidoPerfil").value;
    const telefone = document.getElementById("phonePerfil").value;
    const email = document.getElementById("emailPerfil").value;
    const novaSenha = document.getElementById("novaSenha").value;

    // ========================================
    // 1. ATUALIZA PERFIL (TABELA PROFILES)
    // ========================================
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nome,
        display_name: apelido,
        phone: telefone,
      })
      .eq("id", user.id);

    if (error) {
      mostrarMensagem("Erro", error.message, "erro");
      return;
    }

    // ====================================
    // 2. ATUALIZA METADATA (SE MUDOU)
    // ====================================
    const userData = await supabase.auth.getUser();
    const current = userData.data.user.user_metadata;

    // 🔒 Só atualiza se realmente mudou
    if (
      nome !== current.full_name ||
      apelido !== current.display_name ||
      telefone !== current.phone
    ) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          full_name: nome,
          display_name: apelido,
          phone: telefone,
        },
      });

      if (metaError) {
        console.error("Erro metadata:", metaError);
      }
    }

    // ====================================================
    // 📧 3. ALTERAÇÃO DE EMAIL (se mudou → logout)
    // ====================================================
    if (email && email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email,
      });

      if (emailError) {
        mostrarMensagem("Erro", emailError.message, "erro");
        return;
      }

      // 🔥 DESLOGA (OBRIGATÓRIO POR SEGURANÇA)
      await supabase.auth.signOut();
      window.location.href = "index.html";
      return;
    }

    // ==================================================
    // 🔐 4. SE TEM NOVA SENHA (se mudou → logout)
    // ==================================================
    if (novaSenha && novaSenha.length >= 6) {
      const { error: senhaError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (senhaError) {
        mostrarMensagem("Erro", senhaError.message, "erro");
        return;
      }

      // 🔥 DESLOGA SOMENTE AQUI
      await supabase.auth.signOut();
      window.location.href = "index.html";
      return;
    }

    // ===========================================
    // 🛡️ 4. VERIFICA SE AINDA ESTÁ LOGADO
    // ===========================================
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // ⚠️ Sessão morreu (Supabase bug/refresh)
      window.location.href = "index.html";
      return;
    }

    // ========================================
    // ✅ SUCESSO NORMAL (SEM LOGOUT)
    // ========================================
    mostrarMensagem("Sucesso", "Alterações salvas com sucesso!", "sucesso");

    // 🔥 REDIRECIONA DEPOIS DE 1.5s
    setTimeout(() => {
      window.location.href = "terminal.html";
    }, 1500);
  });
}
