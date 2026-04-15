import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Truck, CheckCircle2, Ticket, Tag, Smartphone, QrCode, Copy, ExternalLink } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { orderService, couponService, Coupon, userService } from '../services/db';
import { useSettings } from '../contexts/SettingsContext';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';

const getGuestId = () => {
  let guestId = localStorage.getItem('grobe_guest_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('grobe_guest_id', guestId);
  }
  return guestId;
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  totalMrp?: number;
  totalDiscount?: number;
  cartItemsWithNames?: any[];
}

export default function CheckoutModal({ isOpen, onClose, total, totalMrp = total, totalDiscount = 0, cartItemsWithNames }: CheckoutModalProps) {
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [discount, setDiscount] = useState(0);
  const [findingAddress, setFindingAddress] = useState(false);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('Razorpay SDK loaded successfully');
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };
  
  const [address, setAddress] = useState({
    name: '',
    email: '',
    phone: '',
    pincode: '',
    locality: '',
    street: '',
    city: '',
    state: '',
    landmark: '',
    alternatePhone: ''
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const profile = await userService.getUserProfile(user.uid);
          if (profile && profile.shippingAddress) {
            setAddress(prev => ({
              ...prev,
              name: profile.shippingAddress.name || user.displayName || '',
              email: profile.shippingAddress.email || user.email || '',
              phone: profile.shippingAddress.phone || '',
              pincode: profile.shippingAddress.pincode || profile.shippingAddress.zip || '',
              locality: profile.shippingAddress.locality || '',
              street: profile.shippingAddress.street || '',
              city: profile.shippingAddress.city || '',
              state: profile.shippingAddress.state || '',
              landmark: profile.shippingAddress.landmark || '',
              alternatePhone: profile.shippingAddress.alternatePhone || ''
            }));
          } else {
            setAddress(prev => ({
              ...prev,
              name: user.displayName || '',
              email: user.email || ''
            }));
          }
        } catch (error) {
          console.error("Failed to fetch user profile", error);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const handleAutoFindAddress = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setFindingAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use a reverse geocoding API (e.g., Nominatim for OpenStreetMap)
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&email=shabnavpm@gmail.com`);
          const data = await response.json();
          
          if (data && data.address) {
            const street = data.address.road || data.address.pedestrian || data.address.suburb || '';
            const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
            const state = data.address.state || '';
            const zip = data.address.postcode || '';
            const locality = data.address.suburb || data.address.neighbourhood || '';
            
            setAddress(prev => ({
              ...prev,
              street: street,
              city: city,
              state: state,
              pincode: zip,
              locality: locality
            }));
            toast.success('Address found!');
          } else {
            toast.error('Could not determine address from location');
          }
        } catch (error) {
          console.error('Error finding address:', error);
          toast.error('Failed to find address');
        } finally {
          setFindingAddress(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get your location. Please ensure location permissions are granted.');
        setFindingAddress(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const coupon = await couponService.getCouponByCode(couponCode);
      if (!coupon || !coupon.isActive) {
        toast.error('Invalid or expired coupon');
        return;
      }
      if (coupon.minPurchase && total < coupon.minPurchase) {
        toast.error(`Minimum purchase of ₹${coupon.minPurchase} required`);
        return;
      }

      let calculatedDiscount = 0;
      if (coupon.discountType === 'percentage') {
        calculatedDiscount = (total * coupon.discountValue) / 100;
        if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
          calculatedDiscount = coupon.maxDiscount;
        }
      } else {
        calculatedDiscount = coupon.discountValue;
      }

      setAppliedCoupon(coupon);
      setDiscount(calculatedDiscount);
      toast.success('Coupon applied!');
    } catch (error) {
      toast.error('Failed to apply coupon');
    }
  };

  const finalTotal = Math.max(0, total - discount);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Basic validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(address.phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    const zipRegex = /^[0-9]{6}$/;
    if (!zipRegex.test(address.pincode.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 6-digit PIN code');
      return;
    }

    // Address validation
    if (address.street.length < 5) {
      toast.error('Please enter a complete street address');
      return;
    }
    if (address.locality.length < 3) {
      toast.error('Please enter a valid locality');
      return;
    }
    if (address.city.length < 3) {
      toast.error('Please enter a valid city name');
      return;
    }
    if (address.state.length < 2) {
      toast.error('Please enter a valid state');
      return;
    }
    if (address.name.length < 3) {
      toast.error('Please enter your full name');
      return;
    }

    if (user) {
      try {
        await userService.updateUserProfile(user.uid, {
          shippingAddress: address
        });
      } catch (e) {
        console.error('Failed to save shipping address to profile:', e);
      }
    }

    const res = await loadRazorpay();
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }

    setLoading(true);
    try {
      if (finalTotal === 0) {
        const orderId = await orderService.createOrder({
          userId: user?.uid || getGuestId(),
          items: cartItems,
          total: 0,
          status: 'processing',
          paymentStatus: 'verified',
          transactionId: 'free_order_' + Date.now(),
          shippingAddress: address
        });

        try {
          await fetch('/api/test-email/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: address.email,
              type: 'order',
              data: {
                userName: address.name,
                orderId: orderId.slice(0, 8),
                items: cartItemsWithNames || cartItems.map(item => ({
                  name: 'Product',
                  quantity: item.quantity,
                  price: 0
                })),
                total: 0,
                totalMrp: totalMrp,
                totalDiscount: totalDiscount + discount,
                platformFee: settings.platformFee || 0,
                shippingCharge: settings.shippingCharge || 0
              }
            })
          });
        } catch (e) {
          console.error('Failed to send confirmation email:', e);
        }

        setSuccess(true);
        clearCart();
        toast.success('Order placed successfully!');
        setLoading(false);
        return;
      }

      const razorpayKeyId = (settings.razorpayKeyId || '').trim();

      const response = await fetch('/api/razorpay/create-order/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalTotal,
          receipt: `receipt_${Date.now()}`,
        }),
      });

      const orderData = await response.json();
      
      if (orderData.error) throw new Error(orderData.error);

      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: settings.shopName,
        description: "Order Payment",
        order_id: orderData.id,
        handler: async function (razorpayResponse: any) {
          try {
            // Verify payment on server
            console.log('Verifying payment with server...');
            const verifyUrl = '/api/razorpay/verify-payment/';
            console.log(`Sending POST request to: ${verifyUrl}`);
            const verifyRes = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              }),
            });

            console.log('Verification response status:', verifyRes.status);
            const verifyData = await verifyRes.json();
            console.log('Verification data:', verifyData);

            if (!verifyData.verified) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            const orderId = await orderService.createOrder({
              userId: user?.uid || getGuestId(),
              items: cartItems,
              total: finalTotal,
              status: 'processing',
              paymentStatus: 'verified',
              transactionId: razorpayResponse.razorpay_payment_id,
              shippingAddress: address
            });

            // Save address to user profile if logged in
            if (user) {
              try {
                await userService.updateUserProfile(user.uid, {
                  shippingAddress: address
                });
              } catch (e) {
                console.error('Failed to save shipping address to profile:', e);
              }
            }
            
            // Send order confirmation email
            try {
              console.log('Sending order confirmation email to:', address.email);
              const emailRes = await fetch('/api/test-email/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: address.email,
                  type: 'order',
                  data: {
                    userName: address.name,
                    orderId: orderId.slice(0, 8),
                    items: cartItemsWithNames || cartItems.map(item => ({
                      name: 'Product',
                      quantity: item.quantity,
                      price: 0
                    })),
                    total: finalTotal,
                    totalMrp: totalMrp,
                    totalDiscount: totalDiscount + discount,
                    platformFee: settings.platformFee || 0,
                    shippingCharge: settings.shippingCharge || 0
                  }
                })
              });
              console.log('Email response status:', emailRes.status);
              const emailData = await emailRes.json();
              console.log('Email response data:', emailData);
            } catch (e) {
              console.error('Failed to send confirmation email:', e);
            }

            setSuccess(true);
            clearCart();
            toast.success('Order placed successfully!');
          } catch (error) {
            console.error('Failed to create order after payment:', error);
            toast.error('Payment successful but failed to save order. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: address.name,
          email: address.email,
          contact: address.phone.replace(/\s/g, '').length === 10 ? '+91' + address.phone.replace(/\s/g, '') : address.phone.replace(/\s/g, ''),
        },
        notes: {
          address: `${address.address}, ${address.city}, ${address.state} - ${address.zipCode}`,
          order_type: "Grobe Store Order"
        },
        readonly: {
          contact: true,
          email: true,
          name: true
        },
        theme: {
          color: settings.ui.primaryColor,
        },
        config: {
          display: {
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        toast.error(response.error.description || 'Payment failed');
        setLoading(false);
      });
      paymentObject.open();
    } catch (error: any) {
      console.error('Razorpay initialization failed:', error);
      toast.error(error.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-lg bg-white md:rounded-3xl shadow-2xl z-[101] overflow-hidden border border-slate-100 max-h-[100dvh] md:max-h-[90vh] flex flex-col"
          >
            {success ? (
              <div className="p-12 text-center flex flex-col items-center justify-center flex-1">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-headline font-bold text-slate-900 mb-4">Order Confirmed</h2>
                <p className="text-sm text-slate-400 mb-8 italic">A confirmation email has been sent to your inbox.</p>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-8 shrink-0">
                  <h2 className="text-2xl font-headline font-bold text-slate-900">Checkout</h2>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCheckout} className="flex flex-col flex-1">
                  <div className="flex-1 space-y-8">
                      <>
                        {/* Shipping Section */}
                        <section>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                              <Truck className="w-4 h-4" /> Shipping Details
                            </h3>
                            <button
                              type="button"
                              onClick={handleAutoFindAddress}
                              disabled={findingAddress}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                            >
                              {findingAddress ? (
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <MapPin className="w-3 h-3" />
                              )}
                              Auto Find Address
                            </button>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input required type="text" placeholder="Full Name" value={address.name} onChange={e => setAddress({...address, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                              <input required type="tel" placeholder="Mobile Number" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                            </div>
                            <input required type="email" placeholder="Email Address (for order updates)" value={address.email} onChange={e => setAddress({...address, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input 
                                required 
                                type="text" 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Pincode" 
                                value={address.pincode} 
                                onChange={e => setAddress({...address, pincode: e.target.value.replace(/\D/g, '').slice(0, 6)})} 
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" 
                              />
                              <input required type="text" placeholder="Locality / Town" value={address.locality} onChange={e => setAddress({...address, locality: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                            </div>
                            
                            <textarea required placeholder="Address (House No, Building, Street, Area)" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50 min-h-[80px] resize-none" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input required type="text" placeholder="City / District" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                              <input required type="text" placeholder="State" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input type="text" placeholder="Landmark (Optional)" value={address.landmark} onChange={e => setAddress({...address, landmark: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                              <input type="tel" placeholder="Alternate Phone (Optional)" value={address.alternatePhone} onChange={e => setAddress({...address, alternatePhone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                            </div>
                          </div>
                        </section>

                        {/* Coupon Section */}
                        <section>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Ticket className="w-4 h-4" /> Coupon Code
                          </h3>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                type="text" 
                                placeholder="Enter code" 
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50 font-mono font-bold text-sm"
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={handleApplyCoupon}
                              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                          {appliedCoupon && (
                            <div className="mt-2 flex items-center justify-between px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                              <span>Applied: {appliedCoupon.code}</span>
                              <button type="button" onClick={() => { setAppliedCoupon(null); setDiscount(0); }} className="hover:text-emerald-900">Remove</button>
                            </div>
                          )}
                        </section>
                      </>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-8 shrink-0 pb-safe">
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Price</span>
                        <span>₹{totalMrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 font-bold">
                          <span>Product Discount</span>
                          <span>-₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 font-bold">
                          <span>Coupon Discount</span>
                          <span>-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Platform Fee</span>
                        <span>₹{(settings.platformFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>Shipping Charge</span>
                        <span>₹{(settings.shippingCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-lg font-bold text-slate-900">Total Amount</span>
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-black text-blue-600">₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          {(totalDiscount > 0 || discount > 0) && (
                            <span className="text-xs font-bold text-emerald-600 mt-1">
                              You will save ₹{(totalDiscount + discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} on this order
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : (
                        <>
                          <span>Continue to Payment</span>
                          <CreditCard className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

