/* =============================================================================
   BLOQUE 5: EXPORTACION — CSV, JSON y PDF, todo en el navegador (sin servidor)
   PDF usa jsPDF (CDN, la misma libreria que ya usas en Æter Sevilla)
   ============================================================================= */

const ExportEngine = {

  _descargarBlob(contenido, nombreArchivo, mime) {
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportarJSON(resultado) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const contenido = JSON.stringify(resultado, null, 2);
    this._descargarBlob(contenido, `manolito_infinito_${ts}.json`, 'application/json');
  },

  exportarCSV(resultado) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filas = [
      ['material', 'porcentaje', 'k_material', 'costo_m2'],
      ...Object.entries(resultado.materialesMix).map(([mat, pct]) => [
        mat, pct, THERMAL_CONSTANTS[mat] ?? '', COST_PER_M2[mat] ?? '',
      ]),
      [],
      ['area_m2', resultado.areaM2],
      ['temp_diff', resultado.tempDiff],
      ['k_final', resultado.kFinal],
      ['budget_total_eur', resultado.budgetTotal],
      ['thermal_flux', resultado.thermalFlux],
      ['efficiency', resultado.efficiency ?? ''],
    ];
    if (resultado.quantum) {
      filas.push(
        ['theta_rad', resultado.quantum.theta],
        ['estabilidad_pct', resultado.quantum.estabilidad],
      );
    }
    const csv = filas.map((f) => f.join(',')).join('\n');
    this._descargarBlob(csv, `manolito_infinito_${ts}.csv`, 'text/csv;charset=utf-8');
  },

  /**
   * Genera el PDF SIN ninguna libreria externa: monta un documento HTML
   * en una ventana nueva con estilo de impresion y llama a window.print(),
   * donde el propio navegador ofrece "Guardar como PDF". Cero dependencias,
   * cero llamadas a internet, funciona 100% offline.
   */
  exportarPDF(resultado) {
    const fecha = new Date().toLocaleString('es-ES');
    const filas = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

    const mixRows = Object.entries(resultado.materialesMix).map(([mat, pct]) => `
      <tr>
        <td>${mat}</td>
        <td>${pct.toFixed(1)}%</td>
        <td>${(THERMAL_CONSTANTS[mat] ?? 0).toFixed(3)} W/(m·K)</td>
        <td>${COST_PER_M2[mat] ?? 0} EUR/m²</td>
      </tr>`).join('');

    const detectadosHTML = (resultado.detectados && Object.keys(resultado.detectados).length)
      ? `<h2>Materiales detectados automáticamente</h2>
         <table>${filas(Object.fromEntries(Object.entries(resultado.detectados).map(([m,p]) => [m, p.toFixed(1)+'%'])))}</table>`
      : '';

    const quantumHTML = resultado.quantum ? `
      <h2>Integración cuántica</h2>
      <table>
        <tr><td>theta</td><td>${resultado.quantum.theta.toFixed(4)} rad (${resultado.quantum.thetaDeg.toFixed(2)}°)</td></tr>
        <tr><td>Estabilidad |00&gt;</td><td>${resultado.quantum.estabilidad.toFixed(2)}%</td></tr>
        <tr><td>Nivel</td><td>${QuantumEngine.nivelEstabilidad(resultado.quantum.estabilidad).texto}</td></tr>
        <tr><td>Shots</td><td>${resultado.quantum.totalShots}</td></tr>
        <tr><td>Conteos</td><td>${JSON.stringify(resultado.quantum.counts)}</td></tr>
      </table>` : '';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Manolito Infinito — Reporte</title>
      <style>
        body{font-family:Georgia,'Times New Roman',serif;color:#111;padding:36px;max-width:760px;margin:auto}
        h1{font-family:Arial,sans-serif;border-bottom:3px solid #12324D;padding-bottom:10px}
        h2{font-family:Arial,sans-serif;color:#12324D;margin-top:28px;font-size:16px}
        table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
        td{padding:5px 8px;border-bottom:1px solid #ddd}
        td:first-child{color:#555;width:45%}
        .meta{color:#555;font-size:12px;margin-bottom:20px}
        @media print{ body{padding:0} }
      </style></head><body>
      <h1>MANOLITO INFINITO — Reporte Térmico-Cuántico</h1>
      <div class="meta">Generado: ${fecha}</div>
      <h2>Condiciones del análisis</h2>
      <table>
        <tr><td>Área analizada</td><td>${resultado.areaM2} m²</td></tr>
        <tr><td>ΔT</td><td>${resultado.tempDiff} °C</td></tr>
      </table>
      <h2>Mezcla de materiales</h2>
      <table><tr><td><b>Material</b></td><td><b>%</b></td><td><b>k</b></td><td><b>Coste/m²</b></td></tr>${mixRows}</table>
      <h2>Resultados térmicos</h2>
      <table>
        <tr><td>k_final</td><td>${resultado.kFinal.toFixed(6)} W/(m·K)</td></tr>
        <tr><td>Budget total</td><td>${resultado.budgetTotal.toFixed(2)} EUR</td></tr>
        <tr><td>Flujo térmico</td><td>${resultado.thermalFlux.toFixed(4)} W</td></tr>
        ${resultado.efficiency != null ? `<tr><td>Eficiencia</td><td>${resultado.efficiency.toFixed(4)}</td></tr>` : ''}
      </table>
      ${quantumHTML}
      ${detectadosHTML}
      <script>window.onload = () => window.print();<\/script>
      </body></html>`;

    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('El navegador bloqueó la ventana de impresión. Permite pop-ups para esta página e inténtalo de nuevo.');
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
  },
};
