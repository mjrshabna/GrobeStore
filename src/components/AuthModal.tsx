import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, user, logout, isAdmin } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl z-[101] overflow-hidden border border-white/40"
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline font-bold text-slate-900">
                  {user ? 'Account' : 'Welcome to Grobe Store'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {user ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Profile" className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-bold text-slate-900">{user.displayName || 'User'}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={onClose}
                      className="w-full py-4 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Admin Dashboard
                    </Link>
                  )}

                  <button
                    onClick={() => { logout(); onClose(); }}
                    className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Sign in to access your cart, track orders, and manage your laboratory components.
                  </p>
                  <button
                    onClick={async () => {
                      await login();
                      onClose();
                    }}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
                  >
                    <LogIn className="w-5 h-5" />
                    Continue with Google
                  </button>
                  <div className="text-center">
                    <Link 
                      to="/login?mode=signup" 
                      onClick={onClose}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Or sign up with email
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
