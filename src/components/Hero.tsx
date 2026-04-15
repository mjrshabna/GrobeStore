import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="px-4 lg:px-8 max-w-[1920px] mx-auto mb-12 lg:mb-16 pt-20 lg:pt-24">
      <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-slate-900 h-[500px] lg:h-[600px] flex items-center group">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2070" 
            alt="Robotics Lab"
            className="w-full h-full object-cover opacity-50 scale-105 group-hover:scale-100 transition-transform duration-[5s]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <div className="relative z-10 px-6 lg:px-16 max-w-3xl">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] lg:text-xs uppercase tracking-[0.3em] text-primary-container mb-4 block font-bold"
          >
            Empowering Innovation
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-7xl font-headline font-extrabold text-white tracking-tighter leading-[1.1] mb-6"
          >
            Empowering Innovation with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
              AI & Electronics
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base lg:text-lg text-slate-300 mb-8 lg:mb-10 font-light leading-relaxed max-w-xl"
          >
            Product Development, AI, Robotics Courses, Customized Electronics, and College Projects Help. Founded in 2022.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to="/catalog" className="px-8 lg:px-10 py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary-container transition-all shadow-lg shadow-primary/25 text-center">
              Shop Components
            </Link>
            <Link to="/catalog?category=Robotics" className="px-8 lg:px-10 py-4 rounded-xl bg-white/10 backdrop-blur-md text-white border border-white/20 font-bold hover:bg-white/20 transition-all glass-glow text-center">
              Custom Projects
            </Link>
          </motion.div>
        </div>


      </div>
    </section>
  );
}
