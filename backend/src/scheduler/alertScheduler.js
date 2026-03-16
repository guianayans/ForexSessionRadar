// Estrutura reservada para scheduler assíncrono futuro (webhooks/eventos de calendario).
// Na V1, o frontend consulta /api/dashboard em polling e dispara as notificacoes locais.
function createAlertScheduler() {
  return {
    start() {
      return null;
    },
    stop() {
      return null;
    }
  };
}

module.exports = {
  createAlertScheduler
};
