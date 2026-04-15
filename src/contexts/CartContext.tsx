import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { Product } from '../services/db';
import { reservationService } from '../services/reservationService';

const getGuestId = () => {
  let guestId = localStorage.getItem('grobe_guest_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('grobe_guest_id', guestId);
  }
  return guestId;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CartItemData {
  productId: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItemData[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync with Firebase when user is logged in
  useEffect(() => {
    if (!user) {
      // Load from localStorage for guest
      const savedCart = localStorage.getItem('grobe_guest_cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      } else {
        setCartItems([]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const path = `users/${user.uid}/cart`;
    const cartRef = collection(db, path);
    const unsubscribe = onSnapshot(cartRef, (snapshot) => {
      const items: CartItemData[] = [];
      snapshot.forEach((doc) => {
        items.push({ productId: doc.id, quantity: doc.data().quantity });
      });
      setCartItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cart:", error);
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        // Error already logged
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('grobe_guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const addToCart = async (productId: string, quantity = 1) => {
    // Validate stock
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
      toast.error('Product not found');
      return;
    }
    const productData = productDoc.data() as Product;
    
    const existingItem = cartItems.find(item => item.productId === productId);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + quantity;
    
    if (productData.stock < quantity) {
      toast.error(`Only ${productData.stock} units available`);
      return;
    }

    try {
      const userId = user?.uid || getGuestId();
      await reservationService.reserveStock(productId, newQuantity, userId, user?.email || undefined);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reserve stock');
      return;
    }

    if (!user) {
      setCartItems(prev => {
        const existing = prev.find(item => item.productId === productId);
        if (existing) {
          return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item);
        }
        return [...prev, { productId, quantity }];
      });
      toast.success('Added to cart');
      return;
    }

    // Optimistic update
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { productId, quantity }];
    });

    const path = `users/${user.uid}/cart/${productId}`;
    try {
      await setDoc(doc(db, `users/${user.uid}/cart`, productId), {
        productId,
        quantity: newQuantity
      });
      toast.success('Added to cart');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add to cart');
      // Revert optimistic update
      setCartItems(prev => {
        if (currentQuantity === 0) {
          return prev.filter(item => item.productId !== productId);
        }
        return prev.map(item => item.productId === productId ? { ...item, quantity: currentQuantity } : item);
      });
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (e) {}
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    // Validate stock
    const productDoc = await getDoc(doc(db, 'products', productId));
    if (!productDoc.exists()) {
      toast.error('Product not found');
      return;
    }
    const productData = productDoc.data() as Product;
    
    const existingItem = cartItems.find(item => item.productId === productId);
    const currentQuantity = existingItem?.quantity || 0;
    
    if (productData.stock + currentQuantity < quantity) {
      toast.error(`Only ${productData.stock + currentQuantity} units available`);
      return;
    }

    // Optimistic update
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.productId !== productId));
    } else {
      setCartItems(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
    }

    try {
      const userId = user?.uid || getGuestId();
      if (quantity > 0) {
        await reservationService.reserveStock(productId, quantity, userId, user?.email || undefined);
      } else {
        await reservationService.releaseStock(productId, userId);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reservation');
      // Revert optimistic update
      if (currentQuantity <= 0) {
        setCartItems(prev => prev.filter(item => item.productId !== productId));
      } else {
        setCartItems(prev => {
          const exists = prev.find(item => item.productId === productId);
          if (exists) {
            return prev.map(item => item.productId === productId ? { ...item, quantity: currentQuantity } : item);
          }
          return [...prev, { productId, quantity: currentQuantity }];
        });
      }
      return;
    }

    if (!user) {
      if (quantity <= 0) {
        toast.success('Removed from cart');
      }
      return;
    }

    if (quantity <= 0) {
      const path = `users/${user.uid}/cart/${productId}`;
      try {
        await deleteDoc(doc(db, `users/${user.uid}/cart`, productId));
        toast.success('Removed from cart');
      } catch (error) {
        console.error(error);
        toast.error('Failed to remove item');
        // Revert optimistic update
        setCartItems(prev => {
          const exists = prev.find(item => item.productId === productId);
          if (exists) {
            return prev.map(item => item.productId === productId ? { ...item, quantity: currentQuantity } : item);
          }
          return [...prev, { productId, quantity: currentQuantity }];
        });
        try {
          handleFirestoreError(error, OperationType.DELETE, path);
        } catch (e) {}
      }
      return;
    }

    const path = `users/${user.uid}/cart/${productId}`;
    try {
      await setDoc(doc(db, `users/${user.uid}/cart`, productId), {
        productId,
        quantity
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to update quantity');
      // Revert optimistic update on error
      setCartItems(prev => prev.map(item => item.productId === productId ? { ...item, quantity: currentQuantity } : item));
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (e) {}
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      const userId = user?.uid || getGuestId();
      await reservationService.releaseStock(productId, userId);
    } catch (error) {
      console.error('Failed to release stock:', error);
    }

    if (!user) {
      setCartItems(prev => prev.filter(item => item.productId !== productId));
      toast.success('Removed from cart');
      return;
    }

    // Optimistic update
    const existingItem = cartItems.find(item => item.productId === productId);
    setCartItems(prev => prev.filter(item => item.productId !== productId));

    const path = `users/${user.uid}/cart/${productId}`;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/cart`, productId));
      toast.success('Removed from cart');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove item');
      // Revert optimistic update
      if (existingItem) {
        setCartItems(prev => [...prev, existingItem]);
      }
      try {
        handleFirestoreError(error, OperationType.DELETE, path);
      } catch (e) {}
    }
  };

  const clearCart = async () => {
    try {
      const userId = user?.uid || getGuestId();
      await reservationService.clearUserReservations(userId);
    } catch (error) {
      console.error('Failed to clear reservations:', error);
    }

    if (!user) {
      setCartItems([]);
      localStorage.removeItem('grobe_guest_cart');
      return;
    }

    // Optimistic update
    const previousItems = [...cartItems];
    setCartItems([]);

    try {
      const batch = writeBatch(db);
      cartItems.forEach(item => {
        batch.delete(doc(db, `users/${user.uid}/cart`, item.productId));
      });
      await batch.commit();
    } catch (error) {
      console.error(error);
      // Revert optimistic update
      setCartItems(previousItems);
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, loading, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
