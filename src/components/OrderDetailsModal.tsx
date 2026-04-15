import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, MapPin, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { Order, Product } from '../services/db';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
}

export default function OrderDetailsModal({ isOpen, onClose, order, products }: OrderDetailsModalProps) {
  if (!order) return null;

  const getProduct = (id: string) => products.find(p => p.id === id);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-[111] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-headline font-bold text-slate-900">Order Details</h2>
                <p className="text-xs font-mono text-blue-600 font-bold mt-1">ID: {order.id}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-500 shadow-sm border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Status & Date */}
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ordered On</p>
                    <p className="text-sm font-bold text-slate-700">
                      {order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Items Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {order.items.map((item, idx) => {
                    const product = getProduct(item.productId);
                    return (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors group">
                        <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                          {product?.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{product?.name || 'Unknown Product'}</h4>
                          <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity} × ₹{(order.total / order.items.reduce((s, i) => s + i.quantity, 0)).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">₹{((order.total / order.items.reduce((s, i) => s + i.quantity, 0)) * item.quantity).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Shipping Details</h3>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Name</p>
                    <p className="text-sm font-bold text-slate-700">{order.shippingAddress?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-bold text-slate-700">{order.shippingAddress?.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      {order.shippingAddress?.street && <>{order.shippingAddress.street}<br /></>}
                      {order.shippingAddress?.locality && <>{order.shippingAddress.locality}<br /></>}
                      {order.shippingAddress?.city && <>{order.shippingAddress.city}, </>}
                      {order.shippingAddress?.state && <>{order.shippingAddress.state} </>}
                      {order.shippingAddress?.pincode && <>- {order.shippingAddress.pincode}</>}
                      {order.shippingAddress?.zipCode && !order.shippingAddress?.pincode && <>- {order.shippingAddress.zipCode}</>}
                    </p>
                  </div>
                  {order.shippingAddress?.landmark && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Landmark</p>
                      <p className="text-sm font-bold text-slate-700">{order.shippingAddress.landmark}</p>
                    </div>
                  )}
                  {order.shippingAddress?.alternatePhone && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alternate Phone</p>
                      <p className="text-sm font-bold text-slate-700">{order.shippingAddress.alternatePhone}</p>
                    </div>
                  )}
                  {order.shippingAddress?.email && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                      <p className="text-sm font-bold text-slate-700">{order.shippingAddress.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment Information</h3>
                </div>
                <div className="p-5 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CreditCard className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Payment Status</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.paymentStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {order.paymentStatus === 'verified' ? 'Verified via Razorpay' : 'Pending Verification'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Total Paid</p>
                        <p className="text-2xl font-black tracking-tight">₹{order.total.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    
                    {order.transactionId && (
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Razorpay Payment ID</p>
                        <p className="text-xs font-mono font-bold text-blue-400 break-all">{order.transactionId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
