import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Package, 
  MapPin, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Search,
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  XCircle,
  ExternalLink,
  ChevronLeft,
  Heart,
  Ticket,
  HelpCircle,
  Plus,
  Trash2,
  CreditCard,
  Bell,
  Navigation
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { orderService, Order, UserProfile, userService, Product, productService, wishlistService, Coupon, couponService } from '../services/db';
import OrderDetailsModal from '../components/OrderDetailsModal';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';

type AccountTab = 'overview' | 'orders' | 'profile' | 'addresses' | 'wishlist' | 'coupons' | 'help';

export default function MyAccountPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as AccountTab) || 'overview';
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Profile Form State
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    
    if (user) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [userOrders, userProfile, allProducts, userWishlist, allCoupons] = await Promise.all([
            orderService.getUserOrders(user.uid),
            userService.getUserProfile(user.uid),
            productService.getAllProducts(),
            wishlistService.getWishlist(user.uid),
            couponService.getAllCoupons()
          ]);
          setOrders(userOrders.sort((a, b) => {
             const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
             const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
             return timeB - timeA;
          }));
          setProfile(userProfile);
          setProducts(allProducts);
          setWishlistIds(userWishlist);
          setCoupons(allCoupons.filter(c => c.isActive));
          if (userProfile) {
            setFormData({
              displayName: userProfile.displayName || '',
              phone: userProfile.phone || '',
              email: userProfile.email || user.email || ''
            });
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to load account data');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await userService.updateUserProfile(user.uid, formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error('Please login to manage wishlist');
      return;
    }
    try {
      await wishlistService.toggleWishlist(user.uid, productId);
      setWishlistIds(prev => 
        prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
      );
      toast.success(wishlistIds.includes(productId) ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleDeleteAddress = async (index: number) => {
    if (!user || !profile) return;
    const newAddresses = [...(profile.shippingAddresses || [])];
    newAddresses.splice(index, 1);
    try {
      await userService.updateUserProfile(user.uid, { shippingAddresses: newAddresses });
      setProfile({ ...profile, shippingAddresses: newAddresses });
      toast.success('Address removed');
    } catch (error) {
      toast.error('Failed to remove address');
    }
  };

  const handleSetDefaultAddress = async (index: number) => {
    if (!user || !profile) return;
    const address = profile.shippingAddresses?.[index];
    if (!address) return;
    try {
      await userService.updateUserProfile(user.uid, { shippingAddress: address });
      setProfile({ ...profile, shippingAddress: address });
      toast.success('Default address updated');
    } catch (error) {
      toast.error('Failed to update default address');
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen message="Accessing Account Modules..." />;
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-indigo-100 text-indigo-700';
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'processing': return <PackageCheck className="w-3 h-3" />;
      case 'shipped': return <Truck className="w-3 h-3" />;
      case 'delivered': return <CheckCircle2 className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  const tabItems = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'orders', name: 'My Orders', icon: Package },
    { id: 'wishlist', name: 'Wishlist', icon: Heart },
    { id: 'addresses', name: 'Addresses', icon: MapPin },
    { id: 'coupons', name: 'My Coupons', icon: Ticket },
    { id: 'profile', name: 'Profile Settings', icon: Settings },
    { id: 'help', name: 'Help Center', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 sticky top-32">
              <div className="flex items-center gap-4 mb-8 p-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl overflow-hidden shrink-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user?.email?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{user?.displayName || 'Grobe Engineer'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>

              <nav className="space-y-1">
                {tabItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSearchParams({ tab: item.id })}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                      activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} />
                      <span className="font-bold text-sm tracking-tight">{item.name}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === item.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                  </button>
                ))}
                
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Orders</p>
                      <h3 className="text-3xl font-black text-slate-900">{orders.length}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active Orders</p>
                      <h3 className="text-3xl font-black text-slate-900">
                        {orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status.toLowerCase())).length}
                      </h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Member Since</p>
                      <h3 className="text-xl font-bold text-slate-900">
                        {profile?.createdAt?.toMillis ? new Date(profile.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Recent Orders</h3>
                      <button 
                        onClick={() => setSearchParams({ tab: 'orders' })}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    
                    {orders.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No orders found yet</p>
                        <button 
                          onClick={() => navigate('/catalog')}
                          className="mt-4 text-blue-600 font-bold hover:underline"
                        >
                          Start Shopping
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.slice(0, 3).map((order) => (
                          <div 
                            key={order.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <Package className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">#{order.id.slice(-8).toUpperCase()}</p>
                                <p className="text-xs text-slate-500">
                                  {order.createdAt?.toMillis ? new Date(order.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-6 mt-4 sm:mt-0">
                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">₹{order.total.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{order.items.length} Modules</p>
                              </div>
                              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                 <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm min-h-[600px]">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <h3 className="text-2xl font-bold text-slate-900">My Orders</h3>
                     <div className="relative">
                       <input 
                         type="text" 
                         placeholder="Search orders..." 
                         className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 w-full md:w-64"
                       />
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     </div>
                   </div>

                   {orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Package className="w-20 h-20 text-slate-200 mb-6" />
                        <h4 className="text-xl font-bold text-slate-900 mb-2">No components ordered yet</h4>
                        <p className="text-slate-500 mb-8 max-w-xs">Your order history will appear here once you make your first purchase.</p>
                        <button 
                          onClick={() => navigate('/catalog')}
                          className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                        >
                          Explore Modules
                        </button>
                      </div>
                   ) : (
                     <div className="space-y-4">
                       {orders.map((order) => (
                          <div 
                            key={order.id}
                            className="bg-white border border-slate-100 rounded-3xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-6">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order Placed</p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {order.createdAt?.toMillis ? new Date(order.createdAt.toMillis()).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                                  <p className="text-sm font-bold text-slate-700">₹{order.total.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order ID</p>
                                <p className="text-sm font-bold text-slate-700">#{order.id.slice(-8).toUpperCase()}</p>
                              </div>
                            </div>
                            
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                               <div className="flex-1 space-y-4">
                                 {order.items.slice(0, 2).map((item, idx) => {
                                   const product = products.find(p => p.id === item.productId);
                                   return (
                                     <div key={idx} className="flex items-center gap-4">
                                       <div className="w-12 h-12 bg-slate-50 rounded-lg p-1 shrink-0">
                                         <img src={product?.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=100'} alt="Item" className="w-full h-full object-cover rounded-md" />
                                       </div>
                                       <div className="min-w-0">
                                         <p className="text-sm font-bold text-slate-900 truncate">{product?.name || 'Component'}</p>
                                         <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                                       </div>
                                     </div>
                                   );
                                 })}
                                 {order.items.length > 2 && (
                                   <p className="text-xs font-bold text-blue-600 pl-16">+ {order.items.length - 2} more items</p>
                                 )}
                               </div>
                               
                               <div className="flex flex-col items-end gap-3">
                                  <span className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                    {getStatusIcon(order.status)}
                                    {order.status}
                                  </span>
                                  <button className="text-sm font-bold text-blue-600 flex items-center gap-1 group-hover:underline">
                                    Track Order <ChevronRight className="w-4 h-4" />
                                  </button>
                               </div>
                            </div>
                          </div>
                       ))}
                     </div>
                   )}
                 </div>
              )}

              {activeTab === 'profile' && (
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900 mb-8">Profile Settings</h3>
                  
                  <form onSubmit={handleUpdateProfile} className="max-w-2xl space-y-6">
                    <div className="flex items-center gap-6 mb-10">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-black overflow-hidden border-4 border-white shadow-xl">
                           {user?.photoURL ? (
                             <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                           ) : (
                             user?.email?.charAt(0).toUpperCase()
                           )}
                        </div>
                        <button type="button" className="absolute -bottom-2 -right-2 bg-slate-900 text-white p-2 rounded-xl shadow-lg hover:bg-slate-800 transition-all">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">{user?.displayName || 'Technical Profile'}</h4>
                        <p className="text-slate-500 text-sm">Update your public identity on the Grobe platform.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Name</label>
                        <input 
                          type="text" 
                          value={formData.displayName}
                          onChange={e => setFormData({...formData, displayName: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium" 
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Secure</label>
                        <input 
                          type="email" 
                          readOnly
                          value={formData.email}
                          className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl font-medium text-slate-500 cursor-not-allowed opacity-70" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Phone Identity</label>
                        <input 
                          type="tel" 
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium" 
                          placeholder="+91 12345 67890"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <button 
                        type="submit"
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Update Profile System
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm min-h-[600px]">
                  <h3 className="text-2xl font-bold text-slate-900 mb-8">My Wishlist</h3>
                  
                  {wishlistIds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Heart className="w-20 h-20 text-slate-200 mb-6" />
                      <h4 className="text-xl font-bold text-slate-900 mb-2">Your wishlist is empty</h4>
                      <p className="text-slate-500 mb-8 max-w-xs">Save items you're interested in for quick access later.</p>
                      <button 
                        onClick={() => navigate('/catalog')}
                        className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                      >
                        Explore Products
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {products.filter(p => wishlistIds.includes(p.id)).map(product => (
                        <div key={product.id} className="group relative bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all h-full flex flex-col">
                          <button 
                            onClick={() => handleToggleWishlist(product.id)}
                            className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-xl text-red-500 shadow-sm hover:scale-110 active:scale-95 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center p-4">
                            <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <div className="p-4 flex flex-col flex-grow">
                            <h4 className="text-sm font-bold text-slate-900 mb-1 truncate">{product.name}</h4>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5rem]">{product.description}</p>
                            <div className="mt-auto flex items-center justify-between">
                              <p className="text-lg font-black text-slate-900">₹{product.price.toLocaleString('en-IN')}</p>
                              <button 
                                onClick={() => navigate(`/product/${product.id}`)}
                                className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && (
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm min-h-[600px]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-slate-900">Manage Addresses</h3>
                    <button 
                      onClick={() => toast.error('Address adding functionality coming soon!')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add New
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Default Address */}
                    {profile?.shippingAddress && (
                      <div className="p-6 bg-blue-50/50 border-2 border-blue-600 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-md">
                          Default Shipping
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                            <Navigation className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 mb-1">{profile.shippingAddress.name}</h4>
                            <p className="text-sm text-slate-600 leading-relaxed mb-4">
                              {profile.shippingAddress.street}, {profile.shippingAddress.locality}<br />
                              {profile.shippingAddress.city}, {profile.shippingAddress.state} - {profile.shippingAddress.pincode || profile.shippingAddress.zipCode}
                            </p>
                            <div className="flex items-center gap-4">
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Phone: {profile.shippingAddress.phone}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* All Saved Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {profile?.shippingAddresses?.map((addr, idx) => (
                        <div key={idx} className="p-5 border border-slate-100 rounded-2xl hover:border-blue-200 transition-all group relative">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleDeleteAddress(idx)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mb-1">{addr.name}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                             {addr.street}, {addr.city}
                          </p>
                          <button 
                             onClick={() => handleSetDefaultAddress(idx)}
                             className="w-full py-2 bg-slate-50 text-slate-600 font-bold text-xs rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                             Set as Default
                          </button>
                        </div>
                      ))}
                    </div>

                    {!profile?.shippingAddress && (!profile?.shippingAddresses || profile.shippingAddresses.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <MapPin className="w-20 h-20 text-slate-200 mb-6" />
                        <h4 className="text-xl font-bold text-slate-900 mb-2">No addresses saved yet</h4>
                        <p className="text-sm text-slate-500">Add an address during checkout to see it here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'coupons' && (
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm min-h-[600px]">
                   <h3 className="text-2xl font-bold text-slate-900 mb-8">My Coupons & Offers</h3>
                   
                   {coupons.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Ticket className="w-20 h-20 text-slate-200 mb-6" />
                        <h4 className="text-xl font-bold text-slate-900 mb-2">No coupons available</h4>
                        <p className="text-slate-500 mb-8 max-w-xs">Follow our blog and newsletters to get discount codes for your next build.</p>
                        <button 
                          onClick={() => navigate('/blog')}
                          className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                        >
                          Check Blog for Deals
                        </button>
                      </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {coupons.map(coupon => (
                          <div key={coupon.id} className="relative group overflow-hidden">
                             <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 z-10"></div>
                             <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col items-center text-center">
                                <div className="p-3 bg-white rounded-2xl shadow-md text-blue-600 mb-4 ring-4 ring-blue-100">
                                   <Ticket className="w-8 h-8" />
                                </div>
                                <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-1">{coupon.code}</h4>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">
                                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                </h3>
                                <p className="text-xs text-slate-500 mb-6">Min. Purchase: ₹{coupon.minPurchase?.toLocaleString() || '0'}</p>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(coupon.code);
                                    toast.success('Coupon code copied!');
                                  }}
                                  className="px-6 py-2 bg-white text-blue-600 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                  Copy Code
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'help' && (
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Help Center</h3>
                  <p className="text-slate-500 mb-10">Find answers or get in touch with our technical support team.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { title: 'Track My Order', description: 'Real-time status updates on your shipments.', icon: Truck, link: '/account?tab=orders' },
                      { title: 'Returns & Refunds', description: 'Policies for returns on electronic modules.', icon: Package, link: '/help/returns' },
                      { title: 'Payment Issues', description: 'Assistance with Razorpay or UPI payments.', icon: CreditCard, link: '/help/payments' },
                      { title: 'Technical Support', description: 'Speak with an engineer about component specs.', icon: HelpCircle, link: '/contact' },
                    ].map((item, idx) => (
                      <Link 
                        key={idx} 
                        to={item.link}
                        className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all group"
                      >
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl text-slate-400 group-hover:text-blue-600 shadow-sm border border-slate-100">
                               <item.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                               <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                               <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" />
                         </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                       <HelpCircle className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 max-w-lg">
                      <h4 className="text-2xl font-black mb-4">Still have questions?</h4>
                      <p className="text-slate-400 mb-8 leading-relaxed font-medium">
                        Our technical support team is available from Mon - Sat (10 AM to 7 PM IST) to help you with your inventory and builds.
                      </p>
                      <button 
                        onClick={() => navigate('/contact')}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-3"
                      >
                         <Bell className="w-5 h-5" />
                         Speak with an Engineer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </section>
        </div>
      </main>

      <div className="hidden md:block">
        <FooterSection />
      </div>
      <BottomNav />
      {selectedOrder && (
        <OrderDetailsModal 
          isOpen={!!selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          order={selectedOrder} 
          products={products}
        />
      )}
    </div>
  );
}
