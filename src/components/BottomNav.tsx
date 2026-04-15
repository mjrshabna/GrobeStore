import { Home, Grid, Beaker, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

export default function BottomNav() {
  const location = useLocation();
  const { cartItems } = useCart();
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pb-8 pt-4 bg-white/90 backdrop-blur-md border-t border-slate-200">
      <Link to="/">
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className={`flex flex-col items-center justify-center group ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'} transition-colors`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5">Home</span>
        </motion.div>
      </Link>
      
      <Link to="/catalog">
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className={`flex flex-col items-center justify-center group ${location.pathname === '/catalog' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'} transition-colors`}
        >
          <Grid className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5">Catalog</span>
        </motion.div>
      </Link>
      
      <Link to="/blog">
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className={`flex flex-col items-center justify-center group ${location.pathname === '/blog' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'} transition-colors`}
        >
          <Beaker className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5">Blog</span>
        </motion.div>
      </Link>
      
      <Link to="/cart">
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className={`flex flex-col items-center justify-center group ${location.pathname === '/cart' ? 'text-blue-600' : 'text-slate-500 hover:text-blue-600'} transition-colors relative`}
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5">Cart</span>
          {cartItemCount > 0 && (
            <span className="absolute top-0 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></span>
          )}
        </motion.div>
      </Link>
    </nav>
  );
}
