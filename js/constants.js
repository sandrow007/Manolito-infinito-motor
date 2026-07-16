/* =============================================================================
   MANOLITO INFINITO — BLOQUE 0: CONSTANTES DE INGENIERIA
   Portado 1:1 desde MOTOR_INDUSTRIAL_TÉRMICO-CUÁNTICO_v6_0.py
   Fuentes: ASHRAE, NASA thermal handbook, ingenieria civil/espacial
   ========================================================================== */

// Conductividades termicas k [W/(m·K)]
const THERMAL_CONSTANTS = {
  // Urbanos y construccion civil
  asfalto: 0.75, asfalto_poroso: 0.55,
  hormigon: 1.40, hormigon_armado: 1.75, hormigon_aislante: 0.35,
  ceramica: 1.05, azulejo: 1.05, cemento: 1.40,
  ladrillo: 0.72, ladrillo_refract: 1.20, mortero: 0.93, yeso: 0.40,
  tierra_compacta: 1.50, grava: 0.80, arena: 0.33,
  pizarra: 2.00, granito: 2.90, marmol: 2.80, caliza: 1.60,
  // Metales ingenieria
  acero: 50.00, acero_inox: 16.00, aluminio: 205.00, cobre: 385.00,
  titanio: 21.90, hierro_fundido: 52.00, zinc: 113.00, plomo: 35.30,
  magnesio: 156.00, niquel: 91.00,
  // Vidrios y polimeros
  vidrio: 1.05, vidrio_borosilicato: 1.13, policarbonato: 0.21,
  PVC: 0.19, PTFE_teflon: 0.25, fibra_vidrio: 0.04, fibra_carbono: 70.00,
  // Aeronautica y espacial (NASA)
  aluminio_aeronautico: 160.00, titanio_espacial: 21.90, kevlar: 0.04,
  aerogel_espacial: 0.015, ceramica_espacial: 3.50, inconel: 11.40,
  carbon_carbon: 200.00, silicio_solar: 148.00, fosfuro_indio: 68.00,
  ablativo_espacial: 0.25,
  // Aislantes y eco
  lana_roca: 0.036, poliestireno_exp: 0.038, poliuretano: 0.026,
  corcho: 0.045, madera_pino: 0.12, madera_roble: 0.17, bambu: 0.17,
  paja: 0.067,
  // Suelos naturales
  arcilla: 1.80, limo: 0.90, roca_basalto: 2.20, roca_cuarcita: 6.00,
  // Liquidos (referencia)
  agua: 0.60, hielo: 2.22,
};

// Costo por m2 referencia [EUR/m2]
const COST_PER_M2 = {
  asfalto: 45, asfalto_poroso: 55,
  hormigon: 55, hormigon_armado: 90, hormigon_aislante: 70,
  ceramica: 85, azulejo: 75, cemento: 40,
  ladrillo: 60, ladrillo_refract: 95, mortero: 35, yeso: 30,
  tierra_compacta: 10, grava: 20, arena: 15,
  pizarra: 120, granito: 180, marmol: 200, caliza: 90,
  acero: 220, acero_inox: 350, aluminio: 180, cobre: 600,
  titanio: 900, hierro_fundido: 140, zinc: 200, plomo: 150,
  magnesio: 400, niquel: 500,
  vidrio: 120, vidrio_borosilicato: 180, policarbonato: 250,
  PVC: 60, PTFE_teflon: 800, fibra_vidrio: 300, fibra_carbono: 1200,
  aluminio_aeronautico: 800, titanio_espacial: 2000, kevlar: 600,
  aerogel_espacial: 5000, ceramica_espacial: 800, inconel: 1500,
  carbon_carbon: 3000, silicio_solar: 400, fosfuro_indio: 2000,
  ablativo_espacial: 1000,
  lana_roca: 25, poliestireno_exp: 15, poliuretano: 35, corcho: 40,
  madera_pino: 50, madera_roble: 80, bambu: 45, paja: 20,
  arcilla: 12, limo: 10, roca_basalto: 50, roca_cuarcita: 60,
  agua: 0, hielo: 0,
};

// Categorias para agrupar el selector de materiales en la UI
const MATERIAL_CATEGORIES = {
  "Urbano y construcción": ['asfalto','asfalto_poroso','hormigon','hormigon_armado',
    'hormigon_aislante','ceramica','azulejo','cemento','ladrillo','ladrillo_refract',
    'mortero','yeso','tierra_compacta','grava','arena','pizarra','granito','marmol','caliza'],
  "Metales de ingeniería": ['acero','acero_inox','aluminio','cobre','titanio',
    'hierro_fundido','zinc','plomo','magnesio','niquel'],
  "Vidrios y polímeros": ['vidrio','vidrio_borosilicato','policarbonato','PVC',
    'PTFE_teflon','fibra_vidrio','fibra_carbono'],
  "Aeroespacial (NASA)": ['aluminio_aeronautico','titanio_espacial','kevlar',
    'aerogel_espacial','ceramica_espacial','inconel','carbon_carbon','silicio_solar',
    'fosfuro_indio','ablativo_espacial'],
  "Aislantes y eco": ['lana_roca','poliestireno_exp','poliuretano','corcho',
    'madera_pino','madera_roble','bambu','paja'],
  "Suelos naturales": ['arcilla','limo','roca_basalto','roca_cuarcita'],
  "Líquidos (referencia)": ['agua','hielo'],
};

// Rangos HSV tipicos por material para deteccion automatica
// H: 0-360, S: 0-100, V: 0-100 (normalizado para trabajar directo con
// Canvas/JS sin conversiones de escala tipo OpenCV 0-179/0-255)
const MATERIAL_COLOR_HINTS = {
  asfalto:          { hMin: 0,   hMax: 360, sMin: 0,  sMax: 20, vMin: 0,  vMax: 32 },
  hormigon:         { hMin: 0,   hMax: 360, sMin: 0,  sMax: 24, vMin: 39, vMax: 70 },
  ceramica:         { hMin: 10,  hMax: 40,  sMin: 31, sMax: 78, vMin: 39, vMax: 100 },
  ladrillo:         { hMin: 5,   hMax: 25,  sMin: 39, sMax: 100,vMin: 31, vMax: 78 },
  vidrio:           { hMin: 170, hMax: 260, sMin: 12, sMax: 60, vMin: 59, vMax: 100 },
  acero:            { hMin: 0,   hMax: 360, sMin: 0,  sMax: 24, vMin: 47, vMax: 86 },
  aluminio:         { hMin: 0,   hMax: 360, sMin: 0,  sMax: 20, vMin: 63, vMax: 96 },
  madera_pino:      { hMin: 20,  hMax: 50,  sMin: 20, sMax: 78, vMin: 31, vMax: 71 },
  tierra_compacta:  { hMin: 16,  hMax: 40,  sMin: 24, sMax: 71, vMin: 20, vMax: 51 },
  granito:          { hMin: 0,   hMax: 360, sMin: 0,  sMax: 31, vMin: 31, vMax: 63 },
  pizarra:          { hMin: 200, hMax: 260, sMin: 4,  sMax: 31, vMin: 8,  vMax: 39 },
};

// Umbral de "hotspot / sobreexposicion" (sol, reflejos, brillo quemado).
// Un pixel con saturacion muy baja y brillo muy alto casi nunca es un
// material real fotografiado a exposicion normal — casi siempre es el sol,
// un reflejo especular o una zona quemada de la camara. Este es el filtro
// que evita que el brillo del sol se confunda con aluminio.
const HOTSPOT_FILTER = {
  vMin: 96,   // brillo (V, 0-100) por encima de este valor...
  sMax: 8,    // ...y saturacion (S, 0-100) por debajo de este valor -> se descarta
};

const K_MAX_NORMALIZATION = Math.max(...Object.values(THERMAL_CONSTANTS));

const COLORS = {
  bg: '#0A0E14',
  panel: '#101826',
  blueprint: '#12324D',
  grid: '#1B3A54',
  cold: '#2E9BD6',
  mid: '#FF9A3C',
  hot: '#FF3B1F',
  ok: '#3DDC97',
  warn: '#FFC53D',
  text: '#E8EDF2',
  dim: '#7C8CA3',
};
