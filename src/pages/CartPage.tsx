import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Landmark, 
  Nfc, 
  ArrowLeft,
  ShoppingCart
} from 'lucide-react';
import Navbar from '../components/Navbar';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { Product, productService, getAdjustedPrice } from '../services/db';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import CheckoutModal from '../components/CheckoutModal';
import { useAuth } from '../contexts/AuthContext';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  useEffect(() => {
    if (showGuestPrompt || isCheckoutOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showGuestPrompt, isCheckoutOpen]);

  const handleProceedToCheckout = () => {
    if (!user) {
      setShowGuestPrompt(true);
    } else {
      setIsCheckoutOpen(true);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const productData: Record<string, Product> = {};
      for (const item of cartItems) {
        if (!products[item.productId]) {
          const product = await productService.getProduct(item.productId);
          if (product) {
            productData[item.productId] = product;
          }
        }
      }
      setProducts(prev => ({ ...prev, ...productData }));
      setLoading(false);
    };

    if (cartItems.length > 0) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [cartItems]);

  const subtotal = cartItems.reduce((sum, item) => {
    const product = products[item.productId];
    return sum + (product ? getAdjustedPrice(product.price, settings.profitMargin) * item.quantity : 0);
  }, 0);

  const totalMrp = cartItems.reduce((sum, item) => {
    const product = products[item.productId];
    if (product) {
      const mrp = product.mrp && product.mrp > product.price ? product.mrp : getAdjustedPrice(product.price, settings.profitMargin);
      return sum + (mrp * item.quantity);
    }
    return sum;
  }, 0);
  
  const totalDiscount = totalMrp - subtotal;
  
  const platformFee = cartItems.length > 0 ? (settings.platformFee || 0) : 0;
  const shippingCharge = cartItems.length > 0 ? (settings.shippingCharge || 0) : 0;
  const total = subtotal + platformFee + shippingCharge;

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full">
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tighter text-slate-900 mb-2">Shopping Cart</h1>
          <p className="text-slate-500 font-sans text-xs md:text-sm tracking-widest uppercase font-semibold">
            {totalQuantity} {totalQuantity === 1 ? 'ITEM' : 'ITEMS'} READY FOR CHECKOUT
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Cart Items List */}
          <section className="lg:col-span-8 space-y-4 md:space-y-6">
            {cartLoading || loading ? (
              <div className="animate-pulse space-y-4">
                <div className="bg-white rounded-3xl h-64 border border-slate-100"></div>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-100 shadow-sm">
                <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h3>
                <p className="text-slate-500 mb-6">Looks like you haven't added any components to your registry yet.</p>
                <Link to="/catalog" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors">
                  Browse Catalog
                </Link>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
              >
                {/* Desktop Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-5 bg-slate-50/50 border-b border-slate-100">
                  <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item details</div>
                  <div className="col-span-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</div>
                  <div className="col-span-2 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</div>
                  <div className="col-span-2 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {cartItems.map(item => {
                    const product = products[item.productId];
                    if (!product) return null;
                    const itemPrice = getAdjustedPrice(product.price, settings.profitMargin);
                    const itemTotal = itemPrice * item.quantity;

                    return (
                      <motion.div 
                        variants={{
                          hidden: { opacity: 0, x: -20 },
                          show: { 
                            opacity: 1, 
                            x: 0,
                            transition: {
                              type: 'spring',
                              stiffness: 100,
                              damping: 15
                            }
                          }
                        }}
                        exit={{ opacity: 0, x: 20 }}
                        key={item.productId} 
                        className="px-4 md:px-8 py-6 group hover:bg-slate-50/30 transition-colors"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                          {/* Product Info */}
                          <div className="md:col-span-6 flex items-center gap-4 md:gap-6">
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 p-2 border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-grow">
                              <h3 className="text-sm md:text-base font-bold text-slate-900 mb-1 leading-tight">{product.name}</h3>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">{product.category}</p>
                              <button 
                                onClick={() => removeFromCart(item.productId)}
                                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove Item
                              </button>
                            </div>
                          </div>

                          {/* Quantity Selector */}
                          <div className="md:col-span-2 flex justify-center">
                            <div className="flex items-center bg-slate-100/80 rounded-xl p-1 gap-2">
                              <button 
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-sm text-slate-900 w-6 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Price Details */}
                          <div className="md:col-span-2 hidden md:flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900">₹{itemPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            {product.mrp && product.mrp > product.price && (
                              <span className="text-[10px] text-slate-400 line-through">₹{product.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            )}
                          </div>

                          {/* Item Total */}
                          <div className="md:col-span-2 flex md:flex-col items-center md:items-end justify-between md:justify-center border-t border-slate-50 md:border-0 pt-4 md:pt-0">
                            <span className="md:hidden text-xs font-bold text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-base md:text-lg font-black text-blue-600">₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </section>

          {/* Order Summary Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-32">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-blue-900/5 border border-slate-100">
              <h2 className="text-xl md:text-2xl font-bold font-headline mb-6 md:mb-8 tracking-tight text-slate-900">Order Summary</h2>
              
              <div className="space-y-4 mb-6 md:mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Price ({cartItems.length} items)</span>
                  <span className="font-semibold text-slate-900">₹{totalMrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span>-₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Platform Fee</span>
                  <span className="font-semibold text-slate-900">
                    {cartItems.length > 0 ? `₹${platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-semibold text-slate-900">
                    {cartItems.length > 0 ? `₹${shippingCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 mb-6 md:mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="text-base md:text-lg font-bold font-headline text-slate-900">Total Amount</span>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl md:text-3xl font-black font-headline text-blue-600 tracking-tighter">
                      ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    {totalDiscount > 0 && (
                      <span className="text-xs font-bold text-emerald-600 mt-1">
                        You will save ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} on this order
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                disabled={cartItems.length === 0}
                onClick={handleProceedToCheckout}
                className="w-full bg-blue-600 text-white py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <div className="space-y-3 md:space-y-4">
                <div className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-slate-50">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">Precision Engineering Guarantee included on all modular components.</p>
                </div>
                <div className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-slate-50">
                  <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">Fast delivery via Grobe Logistics partners.</p>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-4">
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">ACCEPTED PROTOCOLS</span>
                <div className="flex gap-4 text-slate-300">
                  <CreditCard className="w-6 h-6 md:w-8 md:h-8" />
                  <Landmark className="w-6 h-6 md:w-8 md:h-8" />
                  <Nfc className="w-6 h-6 md:w-8 md:h-8" />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Link to="/catalog" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Component Lab
              </Link>
            </div>
          </aside>
        </div>
      </main>

      {/* Guest Checkout Prompt Modal */}
      {showGuestPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-headline font-bold text-slate-900 mb-2">Returning Customer?</h3>
            <p className="text-slate-500 mb-8">Log in for a faster checkout experience, or continue as a guest.</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowGuestPrompt(false);
                  navigate('/login', { state: { from: { pathname: '/cart' } } });
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setShowGuestPrompt(false);
                  setIsCheckoutOpen(true);
                }}
                className="w-full py-4 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
            <button
              onClick={() => setShowGuestPrompt(false)}
              className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 w-full text-center"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}

      <div className="hidden md:block">
        <FooterSection />
      </div>
      <BottomNav />

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        total={total} 
        totalMrp={totalMrp}
        totalDiscount={totalDiscount}
        cartItemsWithNames={cartItems.map(item => ({
          name: products[item.productId]?.name || 'Product',
          quantity: item.quantity,
          price: products[item.productId] ? getAdjustedPrice(products[item.productId].price, settings.profitMargin) : 0
        }))}
      />
    </div>
  );
}
