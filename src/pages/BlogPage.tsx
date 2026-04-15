import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';
import { Link } from 'react-router-dom';
import { BlogPost, blogService } from '../services/db';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postData = await blogService.getAllPosts();
        setPosts(postData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-slate-900 mb-4">Latest Updates</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">News, product updates, and insights from the Grobe Technologies team.</p>
        </header>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white/40">
                    <div className="w-full h-48 bg-slate-100 rounded-2xl mb-4"></div>
                    <div className="h-6 bg-slate-100 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
                    <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <h2 className="text-2xl font-headline font-bold text-slate-900 mb-2">No posts yet</h2>
                <p className="text-slate-500">Check back later for updates.</p>
              </div>
            ) : (
              <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {posts.map((post) => (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      show: { 
                        opacity: 1, 
                        y: 0,
                        transition: {
                          type: 'spring',
                          stiffness: 100,
                          damping: 15
                        }
                      }
                    }}
                    key={post.id}
                  >
                    <Link
                      to={`/blog/${post.id}`}
                      className="bg-white/95 rounded-3xl overflow-hidden border border-white/40 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-blue-900/10 transition-all flex flex-col h-full group"
                    >
                      {post.imageUrl && (
                        <div className="aspect-video overflow-hidden">
                          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                      )}
                      <div className="p-6 md:p-8 flex flex-col flex-grow">
                        <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">
                          {post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleDateString() : 'Recent'}
                        </div>
                        <h3 className="text-xl font-headline font-bold text-slate-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors">{post.title}</h3>
                        <p className="text-slate-600 mb-6 line-clamp-3 flex-grow">{post.content}</p>
                        <div className="flex items-center gap-3 mt-auto pt-6 border-t border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {post.author.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{post.author}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
      </main>

      <div className="hidden md:block">
        <FooterSection />
      </div>
      <BottomNav />
    </div>
  );
}
