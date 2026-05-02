// JS/pwa.js

navigator.serviceWorker.getRegistrations().then((regs) => {
  regs.forEach((reg) => {
    reg.update(); // 🔥 força atualização imediata
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => {
      // 🔥 força verificação de atualização
      reg.update();

      // 🔥 detecta nova versão
      reg.onupdatefound = () => {
        const newWorker = reg.installing;

        newWorker.onstatechange = () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              console.log("🔄 Atualizando app...");
              window.location.reload();
            }
          }
        };
      };
    })
    .catch((err) => {
      console.error("Erro ao registrar SW:", err);
    });
}
