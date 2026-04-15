import { motion } from 'framer-motion';
import { 
  Cpu, 
  Zap, 
  Activity, 
  Wrench, 
  Link as LinkIcon,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';

const categories = [
  { name: 'Sensors', icon: Activity, color: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-600', path: '/catalog?category=Sensors' },
  { name: 'Motors', icon: Zap, color: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-600', path: '/catalog?category=Motors' },
  { name: 'Controllers', icon: Cpu, color: 'from-purple-500/20 to-indigo-500/20', iconColor: 'text-purple-600', path: '/catalog?category=Controllers' },
  { name: 'Power', icon: Zap, color: 'from-rose-500/20 to-pink-500/20', iconColor: 'text-rose-600', path: '/catalog?category=Power' },
  { name: 'Tools', icon: Wrench, color: 'from-emerald-500/20 to-teal-500/20', iconColor: 'text-emerald-600', path: '/catalog?category=Tools' },
  { name: 'Connectors', icon: LinkIcon, color: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-600', path: '/catalog?category=Connectors' },
];

export default function Categories() {
  const { settings } = useSettings();

  return (
    <section className="px-4 lg:px-8 max-w-[1440px] mx-auto mb-16 lg:mb-24">
      <div className="mb-10 lg:mb-16 text-center lg:text-left">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-3xl lg:text-4xl font-headline font-black tracking-tight text-slate-900 mb-3">Browse by Category</h3>
          <p className="text-slate-500 text-base lg:text-lg max-w-2xl">Find the perfect components for your next project with our curated collections.</p>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Link 
              to={cat.path}
              className="group relative flex flex-col items-center justify-center p-6 lg:p-8 rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white/60 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-600/10 transition-all duration-500 overflow-hidden h-full min-h-[180px] lg:min-h-[220px] hover:-translate-y-2 active:scale-95"
              style={{ borderRadius: `${settings.ui.borderRadius * 2.5}px` }}
            >
              {/* Glass Background Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-[1.75rem] bg-white shadow-lg shadow-slate-200/80 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <cat.icon className={`w-8 h-8 lg:w-10 lg:h-10 ${cat.iconColor}`} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm lg:text-base tracking-tight group-hover:text-blue-600 transition-colors">{cat.name}</h4>
                <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Explore</span>
                  <LinkIcon className="w-3 h-3 text-blue-600" />
                </div>
              </div>

              {/* Subtle Border Glow */}
              <div className="absolute inset-0 border border-white/20 rounded-[inherit] pointer-events-none" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
