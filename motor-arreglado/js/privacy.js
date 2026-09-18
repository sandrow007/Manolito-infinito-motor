/* =============================================================================
   BLOQUE 7: PRIVACIDAD — banner de cookies + modal de aviso legal/privacidad.
   Manolito Infinito no usa cookies de terceros, no envia datos a ningun
   servidor, no tiene analytics ni trackers. Lo unico que se guarda es una
   preferencia local (aceptacion del aviso) en localStorage de tu propio
   navegador — nunca sale de tu equipo.
   ============================================================================= */

const PrivacyModule = {
  CLAVE_CONSENT: 'manolito_infinito_cookie_consent',
  CONTACTO: 'sandro.a007@gmail.com',

  init() {
    this.montarBanner();
    this.montarModal();
    if (!localStorage.getItem(this.CLAVE_CONSENT)) {
      document.getElementById('cookie-banner').style.display = 'flex';
    }
    const linkFooter = document.getElementById('footer-privacidad');
    if (linkFooter) {
      linkFooter.addEventListener('click', (e) => { e.preventDefault(); this.abrirModal(); });
    }
  },

  montarBanner() {
    const div = document.createElement('div');
    div.id = 'cookie-banner';
    div.className = 'cookie-banner';
    div.innerHTML = `
      <div class="cookie-text">
        Esta web no usa cookies de terceros ni rastreo publicitario. Solo guardamos
        en tu navegador (nunca en un servidor) tu aceptación de este aviso y, si lo activas,
        tu preferencia de modo ciudadano/técnico.
        <a href="#" id="cookie-ver-mas">Ver política completa</a>.
      </div>
      <div class="cookie-actions">
        <button class="btn" id="cookie-aceptar">Entendido</button>
      </div>
    `;
    document.body.appendChild(div);

    document.getElementById('cookie-aceptar').addEventListener('click', () => {
      localStorage.setItem(this.CLAVE_CONSENT, 'aceptado_' + new Date().toISOString());
      div.style.display = 'none';
    });
    document.getElementById('cookie-ver-mas').addEventListener('click', (e) => {
      e.preventDefault();
      this.abrirModal();
    });
  },

  montarModal() {
    const div = document.createElement('div');
    div.id = 'legal-modal-overlay';
    div.className = 'legal-modal-overlay';
    div.innerHTML = `
      <div class="legal-modal">
        <button class="legal-modal-close" id="legal-modal-close">&times;</button>
        <h2>Privacidad, cookies y aviso legal</h2>

        <h3>1. Qué es esta aplicación</h3>
        <p>Manolito Infinito es una herramienta de cálculo térmico, presupuestario y de
        simulación cuántica educativa. Corre enteramente en tu navegador: no hay
        servidor detrás procesando tus datos.</p>

        <h3>2. Cookies y almacenamiento local</h3>
        <p>Esta web <strong>no utiliza cookies de terceros, ni de publicidad, ni de
        analítica de ningún tipo</strong> (nada de Google Analytics, Meta Pixel, etc.).
        Lo único que se guarda es <code>localStorage</code> del propio navegador para
        recordar dos cosas: que aceptaste este aviso, y si prefieres el modo ciudadano
        o el modo técnico. Ese dato nunca sale de tu dispositivo ni se envía a ningún sitio.</p>

        <h3>3. Tus datos (imágenes, vídeos, valores introducidos)</h3>
        <p>Cualquier foto o vídeo que subas para la detección automática de materiales
        se procesa <strong>localmente en tu navegador</strong> (con Canvas/JavaScript) y
        nunca se sube a ningún servidor ni se almacena en ningún sitio. Al cerrar o
        recargar la pestaña, desaparece por completo.</p>

        <h3>4. Exportaciones (JSON, CSV, PDF)</h3>
        <p>Los archivos que exportas se generan y descargan directamente en tu propio
        dispositivo. No pasan por ningún servidor intermedio.</p>

        <h3>5. Responsable / contacto</h3>
        <p>Esta herramienta es un proyecto personal de Sandro. Para dudas, solicitudes
        o incidencias, puedes escribir a:
        <a href="mailto:${this.CONTACTO}">${this.CONTACTO}</a>.</p>

        <h3>6. Aviso legal</h3>
        <p>Los valores de conductividad térmica y costes son de referencia orientativa
        (fuentes técnicas de ingeniería civil, aeroespacial y ASHRAE) y no sustituyen
        un estudio de ingeniería certificado para uso profesional o estructural real.
        El módulo cuántico es una simulación con fines analíticos y educativos, no
        constituye ejecución en hardware cuántico real ni conexión a servicios como
        IBM Quantum.</p>
      </div>
    `;
    document.body.appendChild(div);
    document.getElementById('legal-modal-close').addEventListener('click', () => this.cerrarModal());
    div.addEventListener('click', (e) => { if (e.target === div) this.cerrarModal(); });
  },

  abrirModal() { document.getElementById('legal-modal-overlay').classList.add('open'); },
  cerrarModal() { document.getElementById('legal-modal-overlay').classList.remove('open'); },
};

document.addEventListener('DOMContentLoaded', () => PrivacyModule.init());
