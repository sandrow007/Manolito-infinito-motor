# Manolito Infinito — Motor Industrial Térmico-Cuántico

Versión web del motor original en Python (Tkinter). Calcula la conductividad
térmica ponderada (`k_final`) y el presupuesto de una mezcla de materiales,
detecta materiales automáticamente en fotos o vídeo, y simula un circuito
cuántico de 2 qubits para medir la "estabilidad" del mix.

**100% cliente, sin backend, sin API keys, sin conexión a IBM Quantum.**
Todo corre en el navegador.

## Estructura

```
index.html          → estructura de la página
styles.css           → identidad visual (blueprint industrial / espectro térmico)
js/constants.js      → constantes térmicas, costes por m² y rangos de color HSV
js/thermal.js        → cálculo de k_final, budget, flujo térmico y eficiencia
js/detector.js       → detección de materiales por color (HSV) + filtro anti-sol
js/quantum.js        → simulador de circuito cuántico (RY + CNOT) en JS puro
js/manolito.js       → personalidad / chat de Manolito Infinito
js/export.js         → exportación a JSON, CSV y PDF
js/app.js            → orquestador: conecta la UI con los motores
```

## Uso

Abre `index.html` en cualquier navegador (o súbelo a GitHub Pages / Netlify /
Vercel). No requiere `npm install`, ni servidor, ni build.

1. Define el área y el ΔT.
2. Marca materiales manualmente (con % que sumen 100), **o** sube una foto/vídeo
   para que el detector automático estime la mezcla.
3. Pulsa "Calcular".
4. Exporta el resultado en JSON, CSV o PDF.

## Sobre el filtro anti-sol

El detector clasifica materiales comparando el color de cada píxel (en HSV)
contra rangos típicos de cada material. Un problema conocido del algoritmo original
en Python era que el brillo solar o los reflejos (blancos muy quemados, poca
saturación) se parecían demasiado al aluminio brillante. Aquí se filtran antes
de clasificar: si un píxel tiene brillo > 96% y saturación < 6%, se descarta como
reflejo/sobreexposición en vez de contarse como material.

## Sobre el motor cuántico

El circuito original usaba Qiskit + `AerSimulator` (simulador **local**, sin
conexión a hardware real de IBM). Aquí se reproduce el mismo circuito
(`RY(θ)` sobre `q0`, `CNOT(q0,q1)`, medición) con álgebra de vectores de estado
en JavaScript puro — mismo resultado, cero dependencias.

## Créditos

Basado en `MOTOR_INDUSTRIAL_TÉRMICO-CUÁNTICO_v6.0` (Python/Tkinter) de Sandro.
