import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  type: 'node' | 'spark' | 'building';
  pulse: number;
  pulseSpeed: number;
  color: string;
  connections: number[];
  label?: string;
}

interface Spark {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  alpha: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
}

export default function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const handleResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ---- NODES (Network property nodes) ----
    const NODE_COUNT = 30;
    const nodes: Particle[] = [];
    const colors = ['#f59e0b', '#d97706', '#b45309', '#fcd34d', '#fbbf24'];
    const labels = ['AGENTE', 'PROPIEDAD', 'CLIENTE', 'INVERSIÓN', 'CONTRATO', 'ARRIENDO', 'VENTA'];

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 3 + 1.5,
        alpha: Math.random() * 0.6 + 0.3,
        type: 'node',
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        connections: [],
        label: Math.random() > 0.6 ? labels[Math.floor(Math.random() * labels.length)] : undefined,
      });
    }

    // ---- SPARKS (travel along connections) ----
    const sparks: Spark[] = [];

    const spawnSpark = (fromIdx: number, toIdx: number) => {
      if (sparks.length > 40) return;
      const from = nodes[fromIdx];
      const to = nodes[toIdx];
      const spark: Spark = {
        x: from.x, y: from.y,
        targetX: to.x, targetY: to.y,
        progress: 0,
        speed: 0.006 + Math.random() * 0.006,
        alpha: 1,
        color: Math.random() > 0.5 ? '#fcd34d' : '#f59e0b',
        trail: [],
      };
      sparks.push(spark);
    };

    // Auto-spawn sparks periodically
    let sparkTimer = 0;

    // ---- BUILDING SILHOUETTES ----
    const drawBuilding = (x: number, bottomY: number, width: number, height: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#f59e0b';

      // Main structure
      ctx.beginPath();
      ctx.moveTo(x, bottomY);
      ctx.lineTo(x, bottomY - height);
      ctx.lineTo(x + width / 3, bottomY - height - height * 0.15); // Tip/tower
      ctx.lineTo(x + width * 0.67, bottomY - height);
      ctx.lineTo(x + width, bottomY - height);
      ctx.lineTo(x + width, bottomY);
      ctx.stroke();

      // Windows grid
      const winCols = 3;
      const winRows = Math.floor(height / 18);
      const winW = (width - 10) / (winCols * 2 + 1);
      const winH = winW * 0.7;
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = x + 5 + c * (winW * 2 + 2);
          const wy = bottomY - 12 - r * (winH + 6);
          if (wy < bottomY - height) break;
          ctx.globalAlpha = alpha * (Math.random() > 0.25 ? 0.75 : 0.15);
          ctx.fillStyle = '#fcd34d';
          ctx.fillRect(wx, wy, winW, winH);
        }
      }

      ctx.restore();
    };

    // Fixed building positions
    const buildings = [
      { x: W * 0.02, w: 50, h: H * 0.2 },
      { x: W * 0.12, w: 70, h: H * 0.3 },
      { x: W * 0.22, w: 40, h: H * 0.18 },
      { x: W * 0.35, w: 60, h: H * 0.25 },
      { x: W * 0.62, w: 55, h: H * 0.22 },
      { x: W * 0.75, w: 80, h: H * 0.32 },
      { x: W * 0.85, w: 45, h: H * 0.19 },
      { x: W * 0.92, w: 65, h: H * 0.27 },
    ];

    // ---- MAIN ANIMATION LOOP ----
    const CONNECT_DIST = 180;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // --- Background ---
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
      bgGrad.addColorStop(0, '#0a0500');
      bgGrad.addColorStop(0.5, '#050300');
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // --- Grid (subtle) ---
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 0.5;
      const gridSize = 60;
      for (let gx = 0; gx < W; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // --- Buildings (silhouettes at bottom) ---
      buildings.forEach(b => {
        drawBuilding(b.x, H, b.w, b.h, 0.45);
      });

      // --- Mouse glow ---
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mouseGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 280);
      mouseGlow.addColorStop(0, 'rgba(245,158,11,0.15)');
      mouseGlow.addColorStop(0.5, 'rgba(180,83,9,0.06)');
      mouseGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mouseGlow;
      ctx.beginPath();
      ctx.arc(mx, my, 280, 0, Math.PI * 2);
      ctx.fill();

      // --- Update nodes ---
      nodes.forEach((n, i) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += n.pulseSpeed;

        // Mouse repel / attract
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          n.vx += (dx / dist) * 0.08;
          n.vy += (dy / dist) * 0.08;
        }

        // Speed cap
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 1.5) { n.vx *= 0.95; n.vy *= 0.95; }
      });

      // --- Draw connections ---
      nodes.forEach((a, i) => {
        nodes.forEach((b, j) => {
          if (j <= i) return;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const lineAlpha = (1 - dist / CONNECT_DIST) * 0.6;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, a.color + Math.floor(lineAlpha * 255).toString(16).padStart(2, '0'));
            grad.addColorStop(1, b.color + Math.floor(lineAlpha * 255).toString(16).padStart(2, '0'));
            ctx.globalAlpha = lineAlpha;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });

      // --- Spawn sparks ---
      sparkTimer++;
      if (sparkTimer % 60 === 0) {
        const i = Math.floor(Math.random() * nodes.length);
        const j = Math.floor(Math.random() * nodes.length);
        if (i !== j) spawnSpark(i, j);
      }

      // --- Update & draw sparks ---
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.progress += s.speed;

        const px = s.x + (s.targetX - s.x) * s.progress;
        const py = s.y + (s.targetY - s.y) * s.progress;
        s.trail.unshift({ x: px, y: py, alpha: 1 });
        if (s.trail.length > 18) s.trail.pop();

        // Draw trail
        s.trail.forEach((pt, ti) => {
          pt.alpha = 1 - ti / s.trail.length;
          ctx.globalAlpha = pt.alpha * 0.9;
          const r = (1 - ti / s.trail.length) * 3;
          ctx.fillStyle = s.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = s.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw spark head
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = s.color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (s.progress >= 1) {
          // Burst explosion on arrival
          for (let b = 0; b < 5; b++) {
            const angle = (Math.PI * 2 * b) / 5;
            const bx = s.targetX + Math.cos(angle) * 12;
            const by = s.targetY + Math.sin(angle) * 12;
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = s.color;
            ctx.beginPath();
            ctx.moveTo(s.targetX, s.targetY);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          sparks.splice(i, 1);
        }
      }

      // --- Draw nodes ---
      nodes.forEach((n) => {
        const pulseFactor = 1 + Math.sin(n.pulse) * 0.3;
        const r = n.radius * pulseFactor;

        // Outer glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 7);
        glow.addColorStop(0, n.color + 'aa');
        glow.addColorStop(0.4, n.color + '33');
        glow.addColorStop(1, n.color + '00');
        ctx.globalAlpha = n.alpha;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 7, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        if (n.label && r > 2.5) {
          ctx.globalAlpha = n.alpha * 0.7;
          ctx.fillStyle = '#fcd34d';
          ctx.font = `bold ${Math.floor(r * 3)}px "Inter", monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y - r * 3 - 4);
        }

        ctx.globalAlpha = 1;
      });

      // --- Mouse cursor ring ---
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(mx, my, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // --- Vignette ---
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
