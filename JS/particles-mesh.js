document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("techContainer");
  const canvas = document.getElementById("particlesCanvas");
  const ctx = canvas.getContext("2d");

  let animationFrame;
  let gridNodes = { x: [], y: [] };
  let flashes = [];

  // Configurações da malha e dos flashes
  const colorCyan = "#00d4ff";
  const colorPurple = "#8b2fc9";
  const gridOpacity = 0.04;
  const flashSpeed = 1.0; // Velocidade cadenciada e elegante
  const maxFlashes = 28; // Quantidade ideal de fluxos simultâneos para não travar a leitura

  function initGrid() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    gridNodes.x = [];
    gridNodes.y = [];

    // 🔥 DENSIDADE DE MICROGRADE: Define aproximadamente 20 colunas, gerando mais de 80 quadrados na área da div
    const columnsCount = 20;
    const spacing = canvas.width / columnsCount;

    for (let i = 0; i <= columnsCount; i++) {
      gridNodes.x.push(i * spacing);
    }

    const rowsCount = Math.ceil(canvas.height / spacing);
    for (let i = 0; i <= rowsCount; i++) {
      gridNodes.y.push(i * spacing);
    }

    // Inicializa os flashes com a nova lógica
    flashes = [];
    for (let i = 0; i < maxFlashes; i++) {
      // Divide 50% para cada cor
      const color = i < maxFlashes / 2 ? colorCyan : colorPurple;
      flashes.push(new NetworkFlash(color, spacing)); // Passa o spacing para calcular a cauda
    }
  }

  class NetworkFlash {
    constructor(color, spacing) {
      this.color = color;
      // 🔥 CALCULO DO COMPRIMENTO: O tamanho do rastro é exatamente a distância de um quadrado dividida pela velocidade
      this.tailLength = Math.ceil(spacing / flashSpeed);
      this.reset();
    }

    reset() {
      // Evita as quinas absolutas na hora de nascer para não quebrar a lógica de desvio instantâneo
      this.currentGridX =
        Math.floor(Math.random() * (gridNodes.x.length - 4)) + 2;
      this.currentGridY =
        Math.floor(Math.random() * (gridNodes.y.length - 4)) + 2;

      this.x = gridNodes.x[this.currentGridX];
      this.y = gridNodes.y[this.currentGridY];

      this.history = [];

      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      this.dir = dirs[Math.floor(Math.random() * dirs.length)];

      this.targetX = this.x;
      this.targetY = this.y;
      this.setNextTarget();
    }

    setNextTarget() {
      this.currentGridX += this.dir.x;
      this.currentGridY += this.dir.y;

      // Se bater nas bordas limítrofes da div, reseta
      if (
        this.currentGridX < 0 ||
        this.currentGridX >= gridNodes.x.length ||
        this.currentGridY < 0 ||
        this.currentGridY >= gridNodes.y.length
      ) {
        this.reset();
        return;
      }

      this.targetX = gridNodes.x[this.currentGridX];
      this.targetY = gridNodes.y[this.currentGridY];
    }

    update() {
      this.history.push({ x: this.x, y: this.y });
      if (this.history.length > this.tailLength) {
        this.history.shift();
      }

      // 🔥 INTELIGÊNCIA ANTICOLISÃO (Previsão de Impacto):
      flashes.forEach((other) => {
        if (other === this) return;

        const distPixels = Math.sqrt(
          Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2),
        );
        if (distPixels < 45) {
          if (
            (this.dir.x !== 0 && this.dir.x === -other.dir.x) ||
            (this.dir.y !== 0 && this.dir.y === -other.dir.y)
          ) {
            this.chooseNewDirection(true);
          }
        }
      });

      // Movimentação Linear contínua até o nó alvo
      if (this.dir.x !== 0) {
        this.x += flashSpeed * this.dir.x;
        if (
          (this.dir.x > 0 && this.x >= this.targetX) ||
          (this.dir.x < 0 && this.x <= this.targetX)
        ) {
          this.x = this.targetX;
          this.chooseNewDirection(false);
        }
      } else if (this.dir.y !== 0) {
        this.y += flashSpeed * this.dir.y;
        if (
          (this.dir.y > 0 && this.y >= this.targetY) ||
          (this.dir.y < 0 && this.y <= this.targetY)
        ) {
          this.y = this.targetY;
          this.chooseNewDirection(false);
        }
      }
    }

    chooseNewDirection(forcedDetour = false) {
      const validDirs = [];

      if (forcedDetour) {
        if (this.dir.x !== 0) {
          if (this.currentGridY > 1) validDirs.push({ x: 0, y: -1 });
          if (this.currentGridY < gridNodes.y.length - 2)
            validDirs.push({ x: 0, y: 1 });
        } else {
          if (this.currentGridX > 1) validDirs.push({ x: -1, y: 0 });
          if (this.currentGridX < gridNodes.x.length - 2)
            validDirs.push({ x: 1, y: 0 });
        }
      } else {
        if (this.dir.x === 0) {
          if (this.currentGridX > 0) validDirs.push({ x: -1, y: 0 });
          if (this.currentGridX < gridNodes.x.length - 1)
            validDirs.push({ x: 1, y: 0 });
          if (Math.random() < 0.65) validDirs.push(this.dir);
        } else {
          if (this.currentGridY > 0) validDirs.push({ x: 0, y: -1 });
          if (this.currentGridY < gridNodes.y.length - 1)
            validDirs.push({ x: 0, y: 1 });
          if (Math.random() < 0.65) validDirs.push(this.dir);
        }
      }

      if (validDirs.length > 0) {
        this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
      } else {
        this.dir = { x: -this.dir.x, y: -this.dir.y };
      }

      this.setNextTarget();
    }

    draw() {
      if (this.history.length < 2) return;

      // ⚡ 1. DESENHAR O RASTRO DE GRADIENTE DO FLASH
      for (let i = 0; i < this.history.length - 1; i++) {
        const p1 = this.history[i];
        const p2 = this.history[i + 1];

        // Opacidade progressiva elegante
        const alpha = (i / this.history.length) * 0.45;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        // Afinamento sutil para dar sensação de movimento fluído
        ctx.lineWidth = (i / this.history.length) * 1.8;
        ctx.strokeStyle =
          this.color === colorCyan
            ? `rgba(0, 212, 255, ${alpha})`
            : `rgba(139, 47, 201, ${alpha})`;
        ctx.stroke();
      }

      // ⚡ 2. BRILHO DE GLOW NA CABEÇA (Mantido idêntico)
      const head = this.history[this.history.length - 1];
      ctx.shadowBlur = 6;
      ctx.shadowColor = this.color;

      ctx.beginPath();
      ctx.arc(head.x, head.y, 1.0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }

  function drawStaticGrid() {
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = `rgba(0, 212, 255, ${gridOpacity})`;

    gridNodes.x.forEach((posX) => {
      ctx.beginPath();
      ctx.moveTo(posX, 0);
      ctx.lineTo(posX, canvas.height);
      ctx.stroke();
    });

    gridNodes.y.forEach((posY) => {
      ctx.beginPath();
      ctx.moveTo(0, posY);
      ctx.lineTo(canvas.width, posY);
      ctx.stroke();
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStaticGrid();

    flashes.forEach((flash) => {
      flash.update();
      flash.draw();
    });

    animationFrame = requestAnimationFrame(animate);
  }

  initGrid();
  animate();

  window.addEventListener("resize", () => {
    initGrid();
  });
});
