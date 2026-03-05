import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    // Fallback para quando não houver credenciais padrão (ambiente local sem Service Account configurada)
    admin.initializeApp();
  }
}

export const adminDb = admin.firestore();
export { admin };
