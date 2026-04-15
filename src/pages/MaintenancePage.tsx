import React from 'react';
import { Wrench, Clock, Mail } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export default function MaintenancePage() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 p-8 md:p-12 text-center border border-slate-100">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-8 animate-bounce">
          <Wrench className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-headline font-black text-slate-900 mb-4 tracking-tight">
          We'll be back soon!
        </h1>
        
        <p className="text-slate-500 mb-8 leading-relaxed">
          {settings.shopName} is currently undergoing scheduled maintenance to improve your experience. We apologize for the inconvenience.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estimated Time</p>
              <p className="text-sm font-bold text-slate-700">Usually takes 2-4 hours</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Support</p>
              <p className="text-sm font-bold text-slate-700">{settings.contactEmail || 'Contact us via email'}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} {settings.shopName}
          </p>
        </div>
      </div>
    </div>
  );
}
