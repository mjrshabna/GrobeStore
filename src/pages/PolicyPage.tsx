import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';
import { Policy, policyService } from '../services/db';

export default function PolicyPage() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await policyService.getPolicy(id);
        setPolicy(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-[1000px] mx-auto w-full">
        <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">Legal</span>
        </nav>

        {!policy ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h1 className="text-3xl font-headline font-bold text-slate-900 mb-4">Policy Not Found</h1>
            <p className="text-slate-500 mb-8">The requested legal document could not be located.</p>
            <Link to="/" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-blue-900/5 border border-slate-100"
          >
            <h1 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tighter text-slate-900 mb-4">
              {policy.title}
            </h1>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-12 pb-8 border-b border-slate-100">
              Last Updated: {policy.updatedAt ? new Date(policy.updatedAt.toMillis()).toLocaleDateString() : 'N/A'}
            </div>
            
            <div className="prose prose-slate max-w-none prose-headings:font-headline prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed whitespace-pre-wrap">
              {policy.content}
            </div>
          </motion.article>
        )}
      </main>

      <div className="hidden md:block">
        <FooterSection />
      </div>
      <BottomNav />
    </div>
  );
}
