import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Search, AlignLeft, X, LayoutGrid, ChevronRight, Package, Settings, LogOut, ShieldCheck, Heart, MapPin, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/db';

export default function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [navLinks, setNavLinks] = useState([
    { name: 'Components', path: '/catalog?category=Components' },
    { name: 'Robotics', path: '/catalog?category=Robotics' },
    { name: 'Sensors', path: '/catalog?category=Sensors' },
    { name: 'Power', path: '/catalog?category=Power' },
    { name: 'Tools', path: '/catalog?category=Tools' },
    { name: 'Blog', path: '/blog' },
  ]);

  const { cartItems } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    productService.getAllProducts().then(products => {
      const categoriesSet = new Set(products.map(p => p.category).filter(Boolean));
      if (categoriesSet.size > 0) {
        const dynamicLinks = Array.from(categoriesSet)
          .slice(0, 5) // ensure it doesn't get too long
          .map(cat => ({
            name: cat,
            path: `/catalog?category=${cat}`
          }));
        setNavLinks([...dynamicLinks, { name: 'Blog', path: '/blog' }]);
      }
    }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen || isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, isAuthModalOpen]);
  
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md shadow-sm px-4 lg:px-8 h-16 lg:h-20 flex justify-between items-center">
        <div className="flex items-center gap-4 lg:gap-12">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-blue-600 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <AlignLeft className="w-6 h-6" />}
          </button>

          <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="text-xl lg:text-2xl font-bold tracking-tighter text-blue-600"
            >
              GROBE
            </motion.span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-8 font-headline font-medium">
            {navLinks.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1 + i * 0.05 
                }}
              >
                <Link
                  to={item.path}
                  className={`text-sm transition-colors duration-300 text-slate-600 hover:text-blue-600 ${item.bold ? 'font-bold' : ''}`}
                >
                  {item.name}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-6">
          <form onSubmit={handleSearch} className="relative group hidden sm:flex items-center">
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-100 border-none rounded-full py-2 pl-10 pr-12 w-40 lg:w-64 focus:ring-2 focus:ring-blue-600/20 transition-all text-sm outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <button 
              type="submit" 
              className="absolute right-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
          
          <div className="flex items-center gap-1 lg:gap-4">
            <button 
              onClick={() => navigate('/catalog')}
              className="relative p-2 text-slate-600 hover:text-blue-600 transition-colors sm:hidden"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link to="/cart" className="relative p-2 text-slate-600 hover:text-blue-600 transition-colors hidden lg:block">
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <div 
              className="relative"
              onMouseLeave={() => setIsAccountDropdownOpen(false)}
            >
              <button 
                onClick={() => {
                  if (user) {
                    setIsAccountDropdownOpen(!isAccountDropdownOpen);
                  } else {
                    navigate('/login');
                  }
                }}
                className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                onMouseEnter={() => user && setIsAccountDropdownOpen(true)}
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full border border-slate-200" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>

              {/* PC Account Dropdown */}
              <AnimatePresence>
                {isAccountDropdownOpen && user && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsAccountDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 py-4 z-50 overflow-hidden before:content-[''] before:absolute before:-top-4 before:left-0 before:right-0 before:h-4"
                    >
                      <div className="px-6 py-4 border-b border-slate-50 mb-2">
                        <p className="font-bold text-slate-900 truncate">{user.displayName || 'Grobe User'}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{user.email}</p>
                      </div>
                      
                      <div className="px-2 space-y-1">
                        <Link 
                          to="/account?tab=overview" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all font-bold text-xs"
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        <Link 
                          to="/account?tab=orders" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all font-bold text-xs"
                        >
                          <Package className="w-4 h-4" />
                          My Orders
                        </Link>
                        <Link 
                          to="/account?tab=wishlist" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all font-bold text-xs"
                        >
                          <Heart className="w-4 h-4" />
                          My Wishlist
                        </Link>
                        <Link 
                          to="/account?tab=addresses" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all font-bold text-xs"
                        >
                          <MapPin className="w-4 h-4" />
                          Addresses
                        </Link>
                        <Link 
                          to="/account?tab=coupons" 
                          onClick={() => setIsAccountDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all font-bold text-xs"
                        >
                          <Ticket className="w-4 h-4" />
                          My Coupons
                        </Link>
                        {user?.email === 'shabnavpm@gmail.com' && (
                          <Link 
                            to="/admin" 
                            onClick={() => setIsAccountDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-all font-bold text-xs"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}
                        <button 
                          onClick={() => {
                            logout();
                            setIsAccountDropdownOpen(false);
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-all font-bold text-xs"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[80%] max-w-sm z-[60] lg:hidden bg-white shadow-2xl flex flex-col pt-safe pb-safe"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xl font-bold tracking-tighter text-blue-600">GROBE</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                <form onSubmit={handleSearch} className="relative">
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-600/20 outline-none"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                </form>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Laboratory Navigation</p>
                  <div className="grid grid-cols-1 gap-2">
                    {navLinks.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                      >
                        <span className={`font-bold ${item.bold ? 'text-blue-600' : 'text-slate-700'}`}>{item.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>

                {user && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">My Account</p>
                    <div className="grid grid-cols-1 gap-2">
                      <Link
                        to="/account?tab=overview"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          <span className="font-bold text-slate-700">My Profile</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                      <Link
                        to="/account?tab=orders"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          <span className="font-bold text-slate-700">My Orders</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                      <Link
                        to="/account?tab=wishlist"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          <span className="font-bold text-slate-700">My Wishlist</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                      <Link
                        to="/account?tab=addresses"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          <span className="font-bold text-slate-700">Saved Addresses</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                      <Link
                        to="/account?tab=coupons"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Ticket className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                          <span className="font-bold text-slate-700">My Coupons</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                      {user?.email === 'shabnavpm@gmail.com' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-blue-700">Admin Dashboard</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-blue-400 transition-colors" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                <Link 
                  to="/cart" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cartItemCount})
                </Link>
                  {user ? (
                    <button 
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-red-600 font-bold shadow-sm"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/login');
                      }}
                      className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm"
                    >
                      <User className="w-5 h-5" />
                      Sign In
                    </button>
                  )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
