// ====================== DỮ LIỆU MẶC ĐỊNH ======================
const defaultData = {
  D: 0.087, S: 0.106, E: 14, lamda: 0.27, i: 4,
  xz: 0.99, phiz: 100, mz: 2.3, n: 4600,
  alphasg: 700, alphasj: 1800, alpha: 1.7,
  phi0: -140, phisg: -50, T1: 365, p1: 109000,
  Hu: 44e6, gC: 0.855, gH: 0.145, gO: 0, R: 287.1
};

const paramList = [ /* giữ nguyên như cũ */ ];

function createForm() { /* giữ nguyên */ }

// ====================== CÁC HÀM TÍNH ======================
function deg2rad(deg) { return deg * Math.PI / 180; }

function calc_Volume(phi_deg, data) {
  const R = data.S / 2;
  const L = data.lamda * R;
  const phi = deg2rad(phi_deg);
  const beta = Math.asin(data.lamda * Math.sin(phi));
  const Sh = R * (1 - Math.cos(phi)) + L * (1 - Math.cos(beta));
  return data.Vc + (Math.PI * data.D**2 / 4) * Sh;
}

function calc_dV(phi, data) {
  const A = data.A;
  const omega = data.omega;
  const lamda = data.lamda;
  const R = data.S / 2;
  const phi_rad = deg2rad(phi);
  return A * omega * R * (Math.sin(phi_rad) + (lamda/2) * Math.sin(2*phi_rad));
}

function calc_Wibe(phi, data) {
  if (phi < data.phisg) return 0;
  const betta = phi - data.phisg;
  const c = Math.log(1 - data.xz);
  const m = data.mz;
  const phiz = data.phiz;
  const exp = Math.exp(c * ((betta / phiz) ** (m + 1)));
  return -c * (m + 1) * (betta / phiz)**m * exp / phiz;
}

// ====================== TÍNH TOÁN CHÍNH ======================
function calculate() {
  const data = {};
  paramList.forEach(p => {
    const val = parseFloat(document.getElementById(p.key).value);
    data[p.key] = isNaN(val) ? defaultData[p.key] : val;
  });

  data.A = Math.PI * data.D * data.D / 4;
  data.Vh = data.A * data.S;
  data.Vc = data.Vh / (data.E - 1);
  data.Va = data.Vc + data.Vh;
  data.omega = Math.PI * data.n / 30;
  data.k = 1;
  data.deltat = data.k * Math.PI / (180 * data.omega);

  const a = Math.ceil((360 - 50) / data.k);

  const phi_arr = [], p_arr = [], V_arr = [], T_arr = [];
  const dQx_arr = [], dQw_arr = [], heatInput_arr = [];

  let phi = data.phi0;
  let p = data.p1;
  let T = data.T1;
  let V = calc_Volume(phi, data);

  const m = p * V / (data.R * T);
  const G1 = m / (14.9 * data.alpha);   // l0 ≈ 14.9

  let L = 0;

  for (let i = 0; i < a; i++) {
    phi_arr.push(phi);
    V_arr.push(V);
    p_arr.push(p);
    T_arr.push(T);

    const dQx = G1 * data.Hu * calc_Wibe(phi, data) * data.k;
    const dQw = -data.alphasg * 0.12 * (T - 550);   // xấp xỉ

    dQx_arr.push(dQx);
    dQw_arr.push(dQw);
    heatInput_arr.push(dQx + dQw);

    const dL = calc_dV(phi, data);
    const cv = 0.72 + 0.00035 * (T - 273);
    const dT = (dQx + dQw - dL) / (m * cv);

    T += dT * data.deltat;
    V = calc_Volume(phi + data.k, data);
    p = m * data.R * T / V;

    L += dL * (p + (p_arr[p_arr.length-1] || p)) / 2;
    phi += data.k;
  }

  // ====================== TÍNH CÁC CHỈ TIÊU CHÍNH ======================
  const Li = L;                                      // Индикаторная работа
  const pi = Li / data.Vh / 1e5;                     // bar
  const Ni = pi * data.i * data.Vh * data.n / 120 * 1e5 / 1000; // kW
  const G_fuel = G1 * data.i * data.n / 120;         // kg/s
  const gi = (G_fuel * 3600) / Ni * 1000;            // g/(kW·h)
  const etai = 3600 / (data.Hu / 1e6 * gi);          // ηi

  // Hiển thị kết quả
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("resultValues").innerHTML = `
    <div class="bg-blue-50 p-5 rounded-2xl"><strong>Li</strong><br>${Li.toFixed(2)} Дж</div>
    <div class="bg-emerald-50 p-5 rounded-2xl"><strong>pi</strong><br>${pi.toFixed(4)} бар</div>
    <div class="bg-violet-50 p-5 rounded-2xl"><strong>Ni</strong><br>${Ni.toFixed(2)} кВт</div>
    <div class="bg-amber-50 p-5 rounded-2xl"><strong>gi</strong><br>${gi.toFixed(2)} г/(кВт·ч)</div>
    <div class="bg-rose-50 p-5 rounded-2xl"><strong>ηi</strong><br>${(etai*100).toFixed(2)} %</div>
  `;

  drawAllCharts(phi_arr, p_arr, V_arr, T_arr, dQx_arr, dQw_arr, heatInput_arr);
}

// Phần vẽ đồ thị giữ nguyên như trước
function drawAllCharts(phi, p, V, T, dQx, dQw, heatInput) {
  // ... (giữ nguyên code vẽ 6 đồ thị từ tin nhắn trước)
  if (charts.pv) charts.pv.destroy();
  charts.pv = new Chart(document.getElementById("pvChart"), { /* code p-V */ });
  // ... (các chart khác)
}

window.onload = () => {
  createForm();
  setTimeout(calculate, 500);
};
