
import * as admin from 'firebase-admin';

/**
 * Inicializa o Firebase Admin de forma segura.
 * No App Hosting ou Google Cloud, utiliza as credenciais padrão do ambiente.
 */
function initializeAdmin() {
  if (admin.apps.length > 0) return admin.app();

  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error: any) {
    // Fallback para desenvolvimento local ou falta de credenciais padrão
    if (process.env.NODE_ENV !== 'production') {
      try {
        return admin.initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
        });
      } catch (innerError) {
        return admin.initializeApp();
      }
    }
    console.error("Erro ao inicializar Firebase Admin com applicationDefault:", error.message);
    // Em produção, se falhar, tentamos inicializar apenas com o ID do projeto
    return admin.initializeApp();
  }
}

const adminApp = initializeAdmin();
export const adminDb = adminApp.firestore();
export { admin };
