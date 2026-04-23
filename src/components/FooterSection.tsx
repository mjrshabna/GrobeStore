import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Policy, policyService, productService } from '../services/db';
import toast from 'react-hot-toast';

export default function FooterSection() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const data = await policyService.getAllPolicies();
        setPolicies(data);
      } catch (error) {
        console.error('Failed to fetch policies for footer:', error);
      }
    };
    const fetchCategories = async () => {
      try {
        const products = await productService.getAllProducts();
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        setCategories(Array.from(cats).slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchPolicies();
    fetchCategories();
  }, []);

  return (
    <footer className="bg-white w-full pt-16 pb-12 border-t border-slate-100 mt-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand & Contact */}
          <div className="space-y-6">
            <Link to="/" className="text-2xl font-black text-blue-600 tracking-tighter">GROBE</Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Empowering Innovation with AI & Electronics. Specialized in Robotics, AI, and Custom Electronics.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-slate-500 text-sm">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                <span>GROBE TECHNOLOGIES, Vengara, Malappuram, Kerala - 676304</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <a href="mailto:support@grobe.in" className="hover:text-blue-600 transition-colors">support@grobe.in</a>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-sm">
                <Phone className="w-4 h-4 text-blue-600 shrink-0" />
                <a href="tel:+919074055850" className="hover:text-blue-600 transition-colors">+91 90740 55850</a>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-widest">Shop</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {categories.length > 0 ? categories.map((cat, i) => (
                <li key={i}><Link to={`/catalog?category=${cat}`} className="hover:text-blue-600 transition-colors">{cat}</Link></li>
              )) : (
                <>
                  <li><Link to="/catalog?category=Components" className="hover:text-blue-600 transition-colors">Components</Link></li>
                  <li><Link to="/catalog?category=Robotics" className="hover:text-blue-600 transition-colors">Robotics</Link></li>
                  <li><Link to="/catalog?category=Sensors" className="hover:text-blue-600 transition-colors">Sensors</Link></li>
                  <li><Link to="/catalog?category=Power" className="hover:text-blue-600 transition-colors">Power</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-widest">Policies</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {policies.length > 0 ? (
                policies.map(policy => (
                  <li key={policy.id}>
                    <Link to={`/policy/${policy.id}`} className="hover:text-blue-600 transition-colors">
                      {policy.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/policy/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/policy/terms-and-conditions" className="hover:text-blue-600 transition-colors">Terms & Conditions</Link></li>
                  <li><Link to="/policy/refund-and-cancellation" className="hover:text-blue-600 transition-colors">Refund & Cancellation</Link></li>
                  <li><Link to="/policy/shipping-policy" className="hover:text-blue-600 transition-colors">Shipping Policy</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-widest">Connect</h4>
            <div className="flex gap-4 mb-8">
              {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                <a 
                  key={i}
                  href="#" 
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Newsletter</p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs w-full outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Mail className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400 font-medium">
            © 2026 GROBE TECHNOLOGIES. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Secure Payments</span>
            <span>Fast Shipping</span>
            <span>Expert Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
