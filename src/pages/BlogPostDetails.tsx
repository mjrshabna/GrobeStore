import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Navbar from '../components/Navbar';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';
import { BlogPost, blogService } from '../services/db';

export default function BlogPostDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        const posts = await blogService.getAllPosts();
        const foundPost = posts.find(p => p.id === id);
        if (foundPost) {
          setPost(foundPost);
        } else {
          navigate('/blog');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-4xl mx-auto w-full">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="h-12 bg-slate-200 rounded w-3/4"></div>
            <div className="w-full h-64 md:h-96 bg-slate-200 rounded-3xl"></div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-4xl mx-auto w-full">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Updates
        </Link>

        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 md:p-12 shadow-xl shadow-slate-200/20 border border-slate-100"
        >
          <header className="mb-8 md:mb-12">
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent'}
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-headline font-extrabold tracking-tight text-slate-900 leading-tight">
              {post.title}
            </h1>
          </header>

          {post.imageUrl && (
            <div className="mb-10 md:mb-16 rounded-2xl overflow-hidden shadow-lg">
              <img src={post.imageUrl} alt={post.title} className="w-full h-auto object-cover max-h-[500px]" />
            </div>
          )}

          <div className="prose prose-slate prose-lg max-w-none">
            {post.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-6 text-slate-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </motion.article>
      </main>

      <div className="hidden md:block">
        <FooterSection />
      </div>
      <BottomNav />
    </div>
  );
}
