import { db } from '../lib/firebase';
import { doc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';

export const reservationService = {
  async reserveStock(productId: string, quantity: number, userId: string, email?: string) {
    const reservationRef = doc(db, 'cart_reservations', `${userId}_${productId}`);
    const productRef = doc(db, 'products', productId);

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists()) throw new Error('Product not found');
      
      const currentStock = productDoc.data().stock;

      const reservationDoc = await transaction.get(reservationRef);
      const existingQuantity = reservationDoc.exists() ? reservationDoc.data().quantity : 0;
      const quantityDiff = quantity - existingQuantity;

      if (currentStock < quantityDiff) throw new Error('Not enough stock');

      transaction.update(productRef, { stock: currentStock - quantityDiff });
      transaction.set(reservationRef, {
        productId,
        userId,
        email: email || null,
        quantity,
        timestamp: new Date().toISOString()
      }, { merge: true });
    });
  },

  async releaseStock(productId: string, userId: string) {
    const reservationRef = doc(db, 'cart_reservations', `${userId}_${productId}`);
    const productRef = doc(db, 'products', productId);

    await runTransaction(db, async (transaction) => {
      const reservationDoc = await transaction.get(reservationRef);
      if (!reservationDoc.exists()) return;

      const quantity = reservationDoc.data().quantity;
      const productDoc = await transaction.get(productRef);
      
      if (productDoc.exists()) {
        const currentStock = productDoc.data().stock;
        transaction.update(productRef, { stock: currentStock + quantity });
      }
      
      transaction.delete(reservationRef);
    });
  },

  async clearUserReservations(userId: string) {
    const q = query(collection(db, 'cart_reservations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      await this.releaseStock(docSnap.data().productId, userId);
    }
  }
};
