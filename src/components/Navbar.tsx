import React, { useState } from 'react';
import { ShoppingCart, User, Search, AlignLeft, X, LayoutGrid, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { cartItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: 'Components', path: '/catalog?category=Components' },
    { name: 'Robotics', path: '/catalog?category=Robotics' },
    { name: 'Sensors', path: '/catalog?category=Sensors' },
    { name: 'Power', path: '/catalog?category=Power' },
    { name: 'Tools', path: '/catalog?category=Tools' },
    { name: 'Blog', path: '/blog', bold: true },
  ];

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
            <button 
              onClick={() => {
                if (user) {
                  setIsAuthModalOpen(true);
                } else {
                  navigate('/login');
                }
              }}
              className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[80%] max-w-sm z-50 lg:hidden bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xl font-bold tracking-tighter text-blue-600">GROBE</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Navigation</p>
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
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (user) setIsAuthModalOpen(true);
                    else navigate('/login');
                  }}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm"
                >
                  <User className="w-5 h-5" />
                  {user ? 'My Account' : 'Sign In'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
