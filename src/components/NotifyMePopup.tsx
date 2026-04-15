import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { waitlistService } from '../services/db';
import toast from 'react-hot-toast';

interface NotifyMePopupProps {
  productId: string;
  onClose: () => void;
}

export default function NotifyMePopup({ productId, onClose }: NotifyMePopupProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await waitlistService.addToWaitlist(productId, email);
      toast.success('You will be notified when this product is back in stock!');
      onClose();
    } catch (error) {
      toast.error('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Notify Me</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-slate-500 mb-6 text-sm">Enter your email address and we'll notify you when this product is back in stock.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Notify Me'}
          </button>
        </form>
      </div>
    </div>
  );
}
