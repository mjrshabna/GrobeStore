import { collection, doc, getDocs, getDoc, setDoc as fsSetDoc, addDoc as fsAddDoc, updateDoc as fsUpdateDoc, deleteDoc as fsDeleteDoc, serverTimestamp, query, orderBy, where, runTransaction, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const wrappedLog = async (event: string, details: any) => {
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, details })
    }).catch(() => {});
  } catch (e) {}
};

export const setDoc = async (ref: any, data: any, options?: any) => {
  const res = options ? await fsSetDoc(ref, data, options) : await fsSetDoc(ref, data);
  await wrappedLog(`SET_${ref.path.split('/')[0].toUpperCase()}`, { path: ref.path, data, user: auth.currentUser?.email || 'guest' });
  return res;
};

export const addDoc = async (ref: any, data: any) => {
  const res = await fsAddDoc(ref, data);
  await wrappedLog(`CREATE_${ref.path.split('/')[0].toUpperCase()}`, { path: ref.path, id: res.id, data, user: auth.currentUser?.email || 'guest' });
  return res;
};

export const updateDoc = async (ref: any, data: any) => {
  const res = await fsUpdateDoc(ref, data);
  await wrappedLog(`UPDATE_${ref.path.split('/')[0].toUpperCase()}`, { path: ref.path, data, user: auth.currentUser?.email || 'guest' });
  return res;
};

export const deleteDoc = async (ref: any) => {
  const pathParts = ref.path ? ref.path.split('/') : ['UNKNOWN'];
  const res = await fsDeleteDoc(ref);
  await wrappedLog(`DELETE_${pathParts[0].toUpperCase()}`, { path: ref.path, user: auth.currentUser?.email || 'guest' });
  return res;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  createdAt?: any;
}

export const blogService = {
  async getAllPosts(): Promise<BlogPost[]> {
    try {
      const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
      return [];
    }
  },

  async addPost(post: Omit<BlogPost, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'blogs'), {
        ...post,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'blogs');
      throw error;
    }
  },

  async updatePost(id: string, post: Partial<BlogPost>): Promise<void> {
    try {
      const docRef = doc(db, 'blogs', id);
      await updateDoc(docRef, post);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `blogs/${id}`);
    }
  },

  async deletePost(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'blogs', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `blogs/${id}`);
    }
  }
};

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp?: number;
  category: string;
  imageUrl: string;
  images?: string[];
  specs: Record<string, string>;
  stock: number;
  isFlashDeal?: boolean;
  createdAt?: any;
}

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'products');
      return [];
    }
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Product;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `products/${id}`);
      return null;
    }
  },

  async addProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
      throw error;
    }
  },

  async bulkAddProducts(products: Omit<Product, 'id' | 'createdAt'>[]): Promise<void> {
    try {
      // In a real app, use writeBatch for better performance
      for (const product of products) {
        await addDoc(collection(db, 'products'), {
          ...product,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
      throw error;
    }
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      const docRef = doc(db, 'products', id);
      await updateDoc(docRef, product);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  }
};

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  expiryDate?: any;
  isActive: boolean;
  createdAt?: any;
}

export const couponService = {
  async getAllCoupons(): Promise<Coupon[]> {
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'coupons');
      return [];
    }
  },

  async getCouponByCode(code: string): Promise<Coupon | null> {
    try {
      const q = query(collection(db, 'coupons'));
      const snapshot = await getDocs(q);
      const coupon = snapshot.docs.find(doc => doc.data().code.toUpperCase() === code.toUpperCase());
      if (coupon) {
        return { id: coupon.id, ...coupon.data() } as Coupon;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `coupons?code=${code}`);
      return null;
    }
  },

  async addCoupon(coupon: Omit<Coupon, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'coupons'), {
        ...coupon,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coupons');
      throw error;
    }
  },

  async updateCoupon(id: string, coupon: Partial<Coupon>): Promise<void> {
    try {
      const docRef = doc(db, 'coupons', id);
      await updateDoc(docRef, coupon);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${id}`);
    }
  },

  async deleteCoupon(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'coupons', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
    }
  }
};

export interface Order {
  id: string;
  userId: string;
  items: { productId: string, quantity: number }[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'verified' | 'failed';
  transactionId?: string;
  shippingAddress: any;
  createdAt?: any;
}

export interface UserProfile {
  id?: string;
  email: string;
  displayName?: string;
  phone?: string;
  role: 'admin' | 'user';
  shippingAddress?: any;
  shippingAddresses?: any[];
  createdAt?: any;
}

export const userService = {
  async getAllUsers(): Promise<UserProfile[]> {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
  },
  async getUserProfile(id: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${id}`);
      return null;
    }
  },
  async updateUserProfile(id: string, profile: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = doc(db, 'users', id);
      await setDoc(docRef, profile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  },
  async updateUserRole(id: string, role: 'admin' | 'user'): Promise<void> {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, { role });
  },
  async deleteUser(id: string): Promise<void> {
    const docRef = doc(db, 'users', id);
    await deleteDoc(docRef);
  }
};

export interface UISettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: number;
  cardPadding: number;
  showTrendingNow: boolean;
  showFlashDeals: boolean;
  showCategories: boolean;
  showBlog: boolean;
  pageLayout: string;
  animationSpeed?: 'fast' | 'normal' | 'slow';
  desktopMenuDesign?: 'top' | 'sidebar' | 'minimal';
  mobileMenuDesign?: 'bottom' | 'hamburger' | 'floating';
  containerWidth?: 'narrow' | 'normal' | 'wide' | 'full';
  buttonStyle?: 'solid' | 'outline' | 'ghost' | 'soft';
  shadowIntensity?: 'none' | 'light' | 'medium' | 'heavy';
  heroSection?: {
    enableMultipleImages: boolean;
    images: string[];
    autoChangeInterval: number;
  };
  topBanner?: {
    enabled: boolean;
    imageUrl?: string;
    linkUrl?: string;
    banners?: Array<{ imageUrl: string; linkUrl: string }>;
    autoChangeInterval?: number;
  };
}

export interface Settings {
  shopName: string;
  contactEmail: string;
  maintenanceMode: boolean;
  profitMargin: number;
  upiId?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayTestMode?: boolean;
  geminiApiKey?: string;
  zohoEmail?: string;
  zohoPassword?: string;
  shiprocketEmail?: string;
  shiprocketPassword?: string;
  platformFee?: number;
  shippingCharge?: number;
  googleDriveConfig?: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    folderId: string;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  ui: UISettings;
}

export const DEFAULT_UI_SETTINGS: UISettings = {
  primaryColor: '#2563eb',
  secondaryColor: '#4f46e5',
  backgroundColor: '#f8fafc',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  borderRadius: 12,
  cardPadding: 16,
  showTrendingNow: true,
  showFlashDeals: true,
  showCategories: true,
  showBlog: true,
  pageLayout: '',
  animationSpeed: 'normal',
  desktopMenuDesign: 'top',
  mobileMenuDesign: 'bottom',
  containerWidth: 'normal',
  buttonStyle: 'solid',
  shadowIntensity: 'medium',
  heroSection: {
    enableMultipleImages: false,
    images: ['https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2070'],
    autoChangeInterval: 5000,
  },
  topBanner: {
    enabled: false,
    banners: [],
    autoChangeInterval: 5000,
    imageUrl: '',
    linkUrl: ''
  }
};

export const getSettings = async (): Promise<Settings | null> => {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        shopName: data.shopName || 'GROBE',
        contactEmail: data.contactEmail || '',
        maintenanceMode: data.maintenanceMode || false,
        profitMargin: data.profitMargin || 0,
        upiId: data.upiId || '',
        razorpayKeyId: data.razorpayKeyId || '',
        razorpayKeySecret: data.razorpayKeySecret || '',
        razorpayTestMode: data.razorpayTestMode || false,
        zohoEmail: data.zohoEmail || '',
        zohoPassword: data.zohoPassword || '',
        shiprocketEmail: data.shiprocketEmail || '',
        shiprocketPassword: data.shiprocketPassword || '',
        platformFee: data.platformFee || 0,
        shippingCharge: data.shippingCharge || 0,
        ui: { ...DEFAULT_UI_SETTINGS, ...(data.ui || {}) }
      } as Settings;
    }
    return {
      shopName: 'GROBE',
      contactEmail: '',
      maintenanceMode: false,
      profitMargin: 0,
      upiId: '',
      razorpayKeyId: '',
      razorpayKeySecret: '',
      razorpayTestMode: false,
      zohoEmail: '',
      zohoPassword: '',
      shiprocketEmail: '',
      shiprocketPassword: '',
      platformFee: 0,
      shippingCharge: 0,
      ui: DEFAULT_UI_SETTINGS
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('offline')) {
      console.warn('Firestore is offline, using default settings');
      return {
        shopName: 'GROBE',
        contactEmail: '',
        maintenanceMode: false,
        profitMargin: 0,
        upiId: '',
        razorpayKeyId: '',
        razorpayKeySecret: '',
        razorpayTestMode: false,
        zohoEmail: '',
        zohoPassword: '',
        shiprocketEmail: '',
        shiprocketPassword: '',
        platformFee: 0,
        shippingCharge: 0,
        ui: DEFAULT_UI_SETTINGS
      };
    }
    handleFirestoreError(error, OperationType.GET, 'settings/global');
    return null;
  }
};

export const updateSettings = async (settings: Partial<Settings>): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    throw error;
  }
};

export const orderService = {
  async createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Validate stock for all items
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw new Error(`Product not found`);
          }
          const productData = productDoc.data() as Product;
          const currentStock = typeof productData.stock === 'number' ? productData.stock : Infinity;
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for ${productData.name}`);
          }
        }

        // 2. Clear reservations (stock is already decremented by reservationService)
        for (const item of order.items) {
          const reservationRef = doc(db, 'cart_reservations', `${order.userId}_${item.productId}`);
          transaction.delete(reservationRef);
        }

        // 3. Create order
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          ...order,
          createdAt: serverTimestamp()
        });
        return orderRef.id;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      throw error;
    }
  },
  
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      return [];
    }
  },

  async getAllOrders(): Promise<Order[]> {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  },

  async getOrder(id: string): Promise<Order | null> {
    const docRef = doc(db, 'orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    return null;
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, { status });
  },

  async updatePaymentStatus(id: string, paymentStatus: Order['paymentStatus']): Promise<void> {
    const docRef = doc(db, 'orders', id);
    await updateDoc(docRef, { paymentStatus });
  },

  async deleteOrder(id: string): Promise<void> {
    const docRef = doc(db, 'orders', id);
    await deleteDoc(docRef);
  }
};

export interface Policy {
  id: string;
  title: string;
  content: string;
  updatedAt?: any;
}

export const policyService = {
  async getPolicy(id: string): Promise<Policy | null> {
    try {
      const docRef = doc(db, 'policies', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Policy;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `policies/${id}`);
      return null;
    }
  },

  async addPolicy(policy: Omit<Policy, 'id' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'policies'), {
        ...policy,
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'policies');
      throw error;
    }
  },

  async updatePolicy(id: string, policy: Partial<Policy>): Promise<void> {
    try {
      const docRef = doc(db, 'policies', id);
      await setDoc(docRef, {
        ...policy,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `policies/${id}`);
    }
  },

  async getAllPolicies(): Promise<Policy[]> {
    try {
      const snapshot = await getDocs(collection(db, 'policies'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Policy));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'policies');
      return [];
    }
  },

  async deletePolicy(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'policies', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `policies/${id}`);
    }
  }
};

export const getAdjustedPrice = (basePrice: number, margin: number): number => {
  return basePrice * (1 + margin / 100);
};

export const clearAllData = async (): Promise<void> => {
  const collections = ['products', 'orders', 'blogs', 'coupons', 'policies', 'users', 'ui_history', 'layouts', 'reviews', 'waitlists'];
  
  for (const collName of collections) {
    const snapshot = await getDocs(collection(db, collName));
    for (const document of snapshot.docs) {
      // If it's a user, delete their cart first
      if (collName === 'users') {
        const cartSnapshot = await getDocs(collection(db, 'users', document.id, 'cart'));
        for (const cartDoc of cartSnapshot.docs) {
          await deleteDoc(doc(db, 'users', document.id, 'cart', cartDoc.id));
        }
      }
      // If it's a layout, delete history subcollection
      if (collName === 'layouts') {
        const historySnapshot = await getDocs(collection(db, 'layouts', document.id, 'history'));
        for (const historyDoc of historySnapshot.docs) {
          await deleteDoc(doc(db, 'layouts', document.id, 'history', historyDoc.id));
        }
      }
      await deleteDoc(doc(db, collName, document.id));
    }
  }
  
  // Also reset settings
  const settingsRef = doc(db, 'settings', 'global');
  await setDoc(settingsRef, {
    shopName: 'GROBE',
    contactEmail: '',
    maintenanceMode: false,
    profitMargin: 0,
    upiId: '',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayTestMode: false,
    geminiApiKey: '',
    zohoEmail: '',
    zohoPassword: '',
    shiprocketEmail: '',
    shiprocketPassword: '',
    platformFee: 0,
    shippingCharge: 0,
    ui: DEFAULT_UI_SETTINGS
  });
};

export interface UIHistoryEntry {
  id: string;
  name: string;
  settings: UISettings;
  createdAt: any;
}

export const uiHistoryService = {
  async getHistory(): Promise<UIHistoryEntry[]> {
    try {
      const q = query(collection(db, 'ui_history'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UIHistoryEntry));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ui_history');
      return [];
    }
  },
  async saveSnapshot(name: string, settings: UISettings): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'ui_history'), {
        name,
        settings,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ui_history');
      throw error;
    }
  },
  async deleteSnapshot(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'ui_history', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ui_history/${id}`);
    }
  }
};

export const reviewService = {
  async getProductReviews(productId: string): Promise<Review[]> {
    try {
      const q = query(collection(db, 'reviews'), where('productId', '==', productId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `reviews?productId=${productId}`);
      return [];
    }
  },
  async addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'reviews'), {
        ...review,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
      throw error;
    }
  },
  async bulkAddReviews(reviews: Omit<Review, 'id' | 'createdAt'>[]): Promise<void> {
    try {
      for (const review of reviews) {
        await addDoc(collection(db, 'reviews'), {
          ...review,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
      throw error;
    }
  }
};

export const waitlistService = {
  async addToWaitlist(productId: string, email: string, userId?: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'waitlists'), {
        productId,
        email,
        userId,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'waitlists');
      throw error;
    }
  },
  async getWaitlistForProduct(productId: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'waitlists'), where('productId', '==', productId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `waitlists?productId=${productId}`);
      return [];
    }
  }
};

export const logService = {
  async getLogs(): Promise<any[]> {
    try {
      const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_logs');
      return [];
    }
  }
};

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt?: any;
}

export interface LayoutSnapshot {
  id: string;
  snapshotData: string;
  author: string;
  createdAt: any;
}

export const layoutService = {
  async saveLiveLayout(layoutId: string, serializedTree: string, author: string = 'Admin'): Promise<void> {
    try {
      const layoutRef = doc(db, 'layouts', layoutId);
      
      // 1. Update live version
      await setDoc(layoutRef, {
        liveData: serializedTree,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Push to history sub-collection
      const historyRef = collection(db, 'layouts', layoutId, 'history');
      await addDoc(historyRef, {
        snapshotData: serializedTree,
        author,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `layouts/${layoutId}`);
      throw error;
    }
  },

  async getLiveLayout(layoutId: string): Promise<string | null> {
    try {
      const snap = await getDoc(doc(db, 'layouts', layoutId));
      if (snap.exists()) {
        return snap.data().liveData;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `layouts/${layoutId}`);
      return null;
    }
  },

  async getHistory(layoutId: string): Promise<LayoutSnapshot[]> {
    try {
      const q = query(collection(db, 'layouts', layoutId, 'history'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LayoutSnapshot));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `layouts/${layoutId}/history`);
      return [];
    }
  }
};

export const wishlistService = {
  async getWishlist(userId: string): Promise<string[]> {
    try {
      const snap = await getDoc(doc(db, 'wishlists', userId));
      if (snap.exists()) {
        return snap.data().productIds || [];
      }
      return [];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `wishlists/${userId}`);
      return [];
    }
  },

  async toggleWishlist(userId: string, productId: string): Promise<void> {
    try {
      const docRef = doc(db, 'wishlists', userId);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        await setDoc(docRef, { productIds: [productId], updatedAt: serverTimestamp() });
      } else {
        const productIds = snap.data().productIds as string[];
        if (productIds.includes(productId)) {
          await updateDoc(docRef, {
            productIds: arrayRemove(productId),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(docRef, {
            productIds: arrayUnion(productId),
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wishlists/${userId}`);
      throw error;
    }
  }
};
