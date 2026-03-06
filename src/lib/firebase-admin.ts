import * as admin from 'firebase-admin';

/**
 * Inicializa o Firebase Admin de forma segura.
 * Tenta usar as credenciais padrão do ambiente (necessárias no App Hosting/Google Cloud).
 */
function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  try {
    // Em produção no Google Cloud/Firebase App Hosting, isso funciona automaticamente
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    // Fallback para desenvolvimento local (usa as variáveis de ambiente do Firebase)
    if (process.env.NODE_ENV !== 'production') {
      return admin.initializeApp();
    }
    console.error("Erro crítico ao inicializar Firebase Admin:", error);
    throw error;
  }
}

const adminApp = initializeAdmin();
export const adminDb = adminApp.firestore();
export { admin };
