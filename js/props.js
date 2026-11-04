import { PROP_PX_PER_M } from './config.js';

function createOffscreen(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, w: canvas.width, h: canvas.height };
}

export function createProps() {
  // 1. GATE 改札 (2.4m x 1.0m -> 384 x 160 px)
  const gate = createOffscreen(2.4 * PROP_PX_PER_M, 1.0 * PROP_PX_PER_M);
  {
    const { ctx, w, h } = gate;
    // Tủ máy hai bên
    const cabW = 96;
    // Tủ trái
    ctx.fillStyle = '#cfd6df';
    ctx.fillRect(0, 0, cabW, h);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, cabW, h);

    // Tủ phải
    ctx.fillStyle = '#cfd6df';
    ctx.fillRect(w - cabW, 0, cabW, h);
    ctx.strokeRect(w - cabW, 0, cabW, h);

    // Màn cảm ứng IC trên nóc tủ
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(16, 12, 64, 30);
    ctx.fillRect(w - cabW + 16, 12, 64, 30);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, 20, 48, 14);
    ctx.fillRect(w - cabW + 24, 20, 48, 14);

    // Cửa chắn đỏ ở giữa
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(cabW - 10, h * 0.35, w - cabW * 2 + 20, h * 0.45);
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 3;
    ctx.strokeRect(cabW - 10, h * 0.35, w - cabW * 2 + 20, h * 0.45);

    // Dải xanh đậm phía trên
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('改札', w / 2, 14);

    // Mũi tên xanh lá nhỏ
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('▲', w / 2 - 40, 14);
    ctx.fillText('▲', w / 2 + 40, 14);
  }

  // 2. BARRIER 工事中 (2.4m x 2.2m -> 384 x 352 px)
  const barrier = createOffscreen(2.4 * PROP_PX_PER_M, 2.2 * PROP_PX_PER_M);
  {
    const { ctx, w, h } = barrier;
    const postW = 16;
    const postH = h;
    const postLeftX = 40;
    const postRightX = w - 40 - postW;

    // Chân cột đế
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(postLeftX - 25, h);
    ctx.lineTo(postLeftX + postW / 2, h - 35);
    ctx.lineTo(postLeftX + postW + 25, h);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(postRightX - 25, h);
    ctx.lineTo(postRightX + postW / 2, h - 35);
    ctx.lineTo(postRightX + postW + 25, h);
    ctx.closePath();
    ctx.fill();

    // Hai cột xám
    ctx.fillStyle = '#64748b';
    ctx.fillRect(postLeftX, 10, postW, postH - 10);
    ctx.fillRect(postRightX, 10, postW, postH - 10);

    // Ván chắn sọc vàng - đen (từ y = 1.0 đến 2.2 -> trên canvas là y = 10 đến 190)
    const boardY = 20;
    const boardH = 170;
    const boardX = 20;
    const boardW = w - 40;

    ctx.save();
    ctx.beginPath();
    ctx.rect(boardX, boardY, boardW, boardH);
    ctx.clip();

    ctx.fillStyle = '#facc15';
    ctx.fillRect(boardX, boardY, boardW, boardH);

    // Sọc đen chéo
    ctx.fillStyle = '#0f172a';
    const stripeW = 32;
    for (let x = -boardH; x < boardW + boardH; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(boardX + x, boardY + boardH);
      ctx.lineTo(boardX + x + stripeW, boardY + boardH);
      ctx.lineTo(boardX + x + stripeW + boardH, boardY);
      ctx.lineTo(boardX + x + boardH, boardY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    // Biển trắng nhỏ giữa ván chữ đỏ 工事中
    const signW = 140;
    const signH = 64;
    const signX = (w - signW) / 2;
    const signY = boardY + (boardH - signH) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.strokeRect(signX, signY, signW, signH);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('工事中', w / 2, signY + signH / 2);
  }

  // 3. VENDING 自販機 (1.6m x 2.2m -> 256 x 352 px) theo 3 làn màu
  const vendingColors = ['#dc2626', '#2563eb', '#f1f5f9'];
  const vendings = vendingColors.map(color => {
    const v = createOffscreen(1.6 * PROP_PX_PER_M, 2.2 * PROP_PX_PER_M);
    const { ctx, w, h } = v;

    // Thân máy
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 8, 12);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Dải chữ ドリンク
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 20, w - 40, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ドリンク', w / 2, 38);

    // Ô kính trên sáng
    const glassX = 20;
    const glassY = 66;
    const glassW = w - 40;
    const glassH = 160;

    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(glassX, glassY, glassW, glassH);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(glassX, glassY, glassW, glassH);

    // 3 hàng chai lọ nhiều màu
    const drinkColors = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
    for (let row = 0; row < 3; row++) {
      const rowY = glassY + 12 + row * 48;
      for (let col = 0; col < 5; col++) {
        const canX = glassX + 16 + col * 38;
        ctx.fillStyle = drinkColors[(row * 5 + col) % drinkColors.length];
        ctx.fillRect(canX, rowY, 20, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(canX + 4, rowY + 6, 12, 10);

        // Nút bấm nhỏ
        ctx.fillStyle = '#334155';
        ctx.fillRect(canX + 2, rowY + 34, 16, 6);
      }
    }

    // Khe lấy hàng ở dưới
    const slotX = 36;
    const slotY = 260;
    const slotW = w - 72;
    const slotH = 56;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(slotX, slotY, slotW, slotH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(slotX, slotY, slotW, slotH);

    // Nắp flap đẩy
    ctx.fillStyle = '#334155';
    ctx.fillRect(slotX + 6, slotY + 6, slotW - 12, slotH - 12);

    return v;
  });

  // 4. ĐỒ NHẶT (0.5m x 0.5m -> 80 x 80 px)
  // ONIGIRI
  const onigiri = createOffscreen(80, 80);
  {
    const { ctx, w, h } = onigiri;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    // Cơm trắng tam giác bo góc
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(28, 20, 24, 25);
    ctx.quadraticCurveTo(0, 32, -24, 25);
    ctx.quadraticCurveTo(-28, 20, 0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rong biển đen ở đáy
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.rect(-16, 8, 32, 20);
    ctx.fill();
    ctx.restore();
  }

  // TICKET 切符
  const ticket = createOffscreen(80, 80);
  {
    const { ctx, w, h } = ticket;
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(10, 18, 60, 44);
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 18, 60, 44);

    // Vạch từ
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(10, 52, 60, 6);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('切符', w / 2, 34);
  }

  // SUIKA
  const suika = createOffscreen(80, 80);
  {
    const { ctx, w, h } = suika;
    // Thẻ xanh lá
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.roundRect(8, 16, 64, 48, 6);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Miếng dưa hấu
    ctx.save();
    ctx.translate(26, 40);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    // Vỏ dưa xanh đậm
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hạt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, 3, 2, 2);
    ctx.fillRect(2, 4, 2, 2);
    ctx.restore();

    // Chữ SUIKA
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUIKA', 53, 40);
  }

  // SALARY 給料
  const salary = createOffscreen(80, 80);
  {
    const { ctx, w, h } = salary;
    // Phong bì trắng
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 8, 48, 64);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 8, 48, 64);

    // Dải ruy băng đỏ
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(16, 24, 48, 6);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('給料', w / 2, 46);
  }

  // 5. ĐỒ BÊN ĐƯỜNG (Cột đèn & Đèn lồng 提灯)
  // Cột đèn (1.0m x 4.0m -> 160 x 640 px)
  const lamp = createOffscreen(1.0 * PROP_PX_PER_M, 4.0 * PROP_PX_PER_M);
  {
    const { ctx, w, h } = lamp;
    const postX = w / 2;

    // Cột kim loại
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(postX, h);
    ctx.lineTo(postX, 100);
    // Cần đèn uốn cong
    ctx.quadraticCurveTo(postX, 30, postX + 50, 40);
    ctx.stroke();

    // Chao đèn
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(postX + 50, 50, 18, 0, Math.PI * 2);
    ctx.fill();

    // Ánh sáng tỏa ra
    ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
    ctx.beginPath();
    ctx.arc(postX + 50, 50, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cặp đèn lồng 提灯 (1.6m x 3.0m -> 256 x 480 px)
  const lanterns = createOffscreen(1.6 * PROP_PX_PER_M, 3.0 * PROP_PX_PER_M);
  {
    const { ctx, w, h } = lanterns;
    const postX = 50;

    // Cột đỡ
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(postX, h);
    ctx.lineTo(postX, 80);
    ctx.lineTo(postX + 160, 80);
    ctx.stroke();

    // Hai đèn lồng đỏ
    const lanternPositions = [postX + 60, postX + 130];
    for (const lx of lanternPositions) {
      // Dây treo
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, 80);
      ctx.lineTo(lx, 120);
      ctx.stroke();

      // Quả đèn lồng
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(lx, 160, 24, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Viền đen trên/dưới
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(lx - 16, 120, 32, 6);
      ctx.fillRect(lx - 16, 194, 32, 6);

      // Chữ 提灯
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('提', lx, 150);
      ctx.fillText('灯', lx, 170);
    }
  }

  return {
    gate,
    barrier,
    vendings,
    onigiri,
    ticket,
    suika,
    salary,
    lamp,
    lanterns
  };
}
