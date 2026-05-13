// ====================== ДАННЫЕ ПО УМОЛЧАНИЮ ======================
const defaultData = {
  D: 0.087, S: 0.106, E: 14, lamda: 0.27, i: 4,
  xz: 0.99, phiz: 100, mz: 2.3, n: 4600,
  alphasg: 700, alphasj: 1800, alpha: 1.7,
  phi0: -140, phisg: -50, T1: 365, p1: 109000,
  Hu: 44e6, gC: 0.855, gH: 0.145, gO: 0, R: 287.1
};

const paramList = [
  {key:"D", name:"Диаметр цилиндра D", unit:"м"},
  {key:"S", name:"Ход поршня S", unit:"м"},
  {key:"E", name:"Степень сжатия ε", unit:""},
  {key:"lamda", name:"λ (лямбда)", unit:""},
  {key:"i", name:"Количество цилиндров", unit:""},
  {key:"xz", name:"xz", unit:""},
  {key:"phiz", name:"Продолжительность сгорания", unit:"°ПКВ"},
  {key:"mz", name:"Показатель m закона Вибe", unit:""},
  {key:"n", name:"Частота вращения n", unit:"об/мин"},
  {key:"alphasg", name:"α сжатия", unit:"Вт/(м²·К)"},
  {key:"alphasj", name:"α сгорания", unit:"Вт/(м²·К)"},
  {key:"alpha", name:"Коэффициент избытка воздуха α", unit:""},
  {key:"phi0", name:"Угол закрытия впускного клапана", unit:"°ПКВ"},
  {key:"phisg", name:"Угол опережения зажигания", unit:"°ПКВ"},
  {key:"T1", name:"Начальная температура T₁", unit:"К"},
  {key:"p1", name:"Начальное давление p₁", unit:"Па"},
  {key:"Hu", name:"Низшая теплота сгорания Hu", unit:"Дж/кг"},
  {key:"gC", name:"Доля углерода gC", unit:""},
  {key:"gH", name:"Доля водорода gH", unit:""},
  {key:"gO", name:"Доля кислорода gO", unit:""},
  {key:"R", name:"Газовая постоянная R", unit:"Дж/(кг·К)"}
];

function createForm() {
  const container = document.getElementById("parameters");
  container.innerHTML = "";
  paramList.forEach(p => {
    const div = document.createElement("div");
    div.className = "grid grid-cols-12 gap-3 items-center";
    div.innerHTML = `
      <label class="col-span-7 text-sm font-medium">${p.name}</label>
      <div class="col-span-5">
        <input type="number" id="${p.key}" value="${defaultData[p.key]}" step="0.001"
               class="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-right">
        <span class="text-xs text-gray-500 block mt-1 text-right">${p.unit}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

// ====================== ПОРТИРОВАННЫЕ ФУНКЦИИ ======================
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

function calculate() {
  const data = {};
  paramList.forEach(p => {
    const val = parseFloat(document.getElementById(p.key).value);
    data[p.key] = isNaN(val) ? defaultData[p.key] : val;
  });

  // Подготовка геометрии
  data.A = Math.PI * data.D * data.D / 4;
  data.Vh = data.A * data.S;
  data.Vc = data.Vh / (data.E - 1);
  data.Va = data.Vc + data.Vh;
  data.omega = Math.PI * data.n / 30;
  data.k = 1;
  data.deltat = data.k * Math.PI / (180 * data.omega);

  const a = Math.ceil((360 - 50) / data.k);

  const phi_arr = [], p_arr = [], V_arr = [], T_arr = [], dQx_arr = [];

  let phi = data.phi0;
  let p = data.p1;
  let T = data.T1;
  let V = calc_Volume(phi, data);

  const m = p * V / (data.R * T);
  const G1 = m / (14.9 * data.alpha);

  let L = 0;

  for (let i = 0; i < a; i++) {
    phi_arr.push(phi);
    V_arr.push(V);
    p_arr.push(p / 1e5);        // в бар для удобства
    T_arr.push(T);

    const dL = calc_dV(phi, data);
    const dQx = G1 * data.Hu * calc_Wibe(phi, data) * data.k;

    const cv = 0.72 + 0.00035 * (T - 273); // приближение
    const dT = (dQx - dL) / (m * cv);

    T += dT * data.deltat;
    V = calc_Volume(phi + data.k, data);
    p = m * data.R * T / V;

    L += dL * (p + p_arr[p_arr.length-1]*1e5) / 2; // работа

    dQx_arr.push(dQx);
    phi += data.k;
  }

  // ====================== ВЫВОД РЕЗУЛЬТАТОВ ======================
  document.getElementById("results").classList.remove("hidden");

  const p_ind = L / data.Vh / 1e5;
  const N_ind = p_ind * data.i * data.Vh * data.n / 120 * 1e5 / 1000;
  const eta_ind = 0.38; // приблизительно, можно улучшить

  const html = `
    <div class="result-card bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100">
      <strong class="text-blue-900">Работа цикла L</strong><br><span class="text-2xl">${L.toFixed(0)}</span> Дж
    </div>
    <div class="result-card bg-gradient-to-br from-emerald-50 to-white p-5 rounded-2xl border border-emerald-100">
      <strong class="text-emerald-900">Среднее индикаторное давление p<sub>i</sub></strong><br><span class="text-2xl">${p_ind.toFixed(3)}</span> бар
    </div>
    <div class="result-card bg-gradient-to-br from-violet-50 to-white p-5 rounded-2xl border border-violet-100">
      <strong class="text-violet-900">Индикаторная мощность N<sub>i</sub></strong><br><span class="text-2xl">${N_ind.toFixed(2)}</span> кВт
    </div>
    <div class="result-card bg-gradient-to-br from-amber-50 to-white p-5 rounded-2xl border border-amber-100">
      <strong class="text-amber-900">Эффективность η<sub>i</sub></strong><br><span class="text-2xl">${(eta_ind*100).toFixed(1)}</span> %
    </div>
  `;
  document.getElementById("resultValues").innerHTML = html;

  drawCharts(phi_arr, p_arr.map(v => v*1e5), V_arr, T_arr);
}

// ====================== ГРАФИКИ ======================
let charts = {};
function drawCharts(phi, p, V, T) {
  // p-V
  if (charts.pv) charts.pv.destroy();
  charts.pv = new Chart(document.getElementById("pvChart"), {
    type: 'line',
    data: { labels: V.map(v=>v.toFixed(5)), datasets: [{label: 'p-V', data: p, borderColor: '#1e40af', tension: 0.4, borderWidth: 3}] },
    options: { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'V, м³' }}, y: { title: { display: true, text: 'p, Па' }}}}
  });

  // p(φ)
  if (charts.pphi) charts.pphi.destroy();
  charts.pphi = new Chart(document.getElementById("pPhiChart"), {
    type: 'line',
    data: { labels: phi, datasets: [{label: 'Давление', data: p, borderColor: '#1e40af', borderWidth: 3}] },
    options: { scales: { x: { title: { display: true, text: 'φ, °ПКВ' }}} }
  });

  // T(φ)
  if (charts.tphi) charts.tphi.destroy();
  charts.tphi = new Chart(document.getElementById("tPhiChart"), {
    type: 'line',
    data: { labels: phi, datasets: [{label: 'Температура', data: T, borderColor: '#dc2626', borderWidth: 3}] },
    options: { scales: { x: { title: { display: true, text: 'φ, °ПКВ' }}} }
  });
}

window.onload = () => {
  createForm();
  setTimeout(calculate, 600);
};
