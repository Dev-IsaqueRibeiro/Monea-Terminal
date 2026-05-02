// JS/pwa-manager.js

let deferredPrompt = null;

// 🔥 Captura evento global do navegador
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("💾 PWA disponível (GLOBAL)");

  e.preventDefault();
  deferredPrompt = e;

  // 🔥 Dispara evento customizado pro app inteiro
  window.dispatchEvent(new Event("pwa:available"));
});

// 🔥 Quando instalou
window.addEventListener("appinstalled", () => {
  console.log("✅ PWA instalado");

  deferredPrompt = null;

  window.dispatchEvent(new Event("pwa:installed"));
});

// 🔥 Função global pra chamar instalação
export async function triggerInstall() {
  if (!deferredPrompt) return null;

  deferredPrompt.prompt();

  const choice = await deferredPrompt.userChoice;

  console.log("📲 Resultado:", choice.outcome);

  deferredPrompt = null;

  return choice.outcome;
}
