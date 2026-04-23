import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShoppingCart, Timer, ChevronLeft, ChevronRight, Cpu, Zap, Activity, Settings as SettingsIcon, Wrench, Link as LinkIcon } from 'lucide-react';
import { Product, productService, getAdjustedPrice, reviewService, Review } from '../services/db';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MainContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const trendingRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  useEffect(() => {
    if (!isAutoScrolling) return;

    const interval = setInterval(() => {
      if (trendingRef.current) {
        const cardWidth = 300 + 24; // 300px width + 24px gap (approx)
        const maxScroll = trendingRef.current.scrollWidth - trendingRef.current.clientWidth;
        
        if (trendingRef.current.scrollLeft >= maxScroll - 10) {
          trendingRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          trendingRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoScrolling]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAllProducts();
        setProducts(data);
        setLoading(false); // Stop blocking the UI as soon as products are loaded
        
        // Fetch ratings for all products concurrently without blocking
        const ratings: Record<string, number> = {};
        await Promise.all(data.map(async (product) => {
          const reviews = await reviewService.getProductReviews(product.id);
          if (reviews.length > 0) {
            const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            ratings[product.id] = Number(avg.toFixed(1));
          } else {
            ratings[product.id] = 0;
          }
        }));
        setProductRatings(ratings);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    setIsAutoScrolling(false);
    if (trendingRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      trendingRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId);
    } catch (error) {
      // Error handling is done in CartContext
    }
  };

  const trendingProducts = products;
  const flashDeals = products.filter(p => p.isFlashDeal).slice(0, 3);
  const displayFlashDeals = flashDeals.length > 0 ? flashDeals : products.slice(0, 3);

  const [timeLeft, setTimeLeft] = useState('04:12:45');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hours = 23 - now.getHours();
      const minutes = 59 - now.getMinutes();
      const seconds = 59 - now.getSeconds();
      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div className="px-4 lg:px-8 max-w-[1920px] mx-auto mb-16 lg:mb-20 text-center py-20 text-slate-500">Loading components...</div>;
  }

  return (
    <div className="space-y-16 lg:space-y-24 mb-20">
      {/* Main Sections Grid */}
      <section className="px-4 lg:px-8 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Trending Now Carousel */}
          {settings.ui.showTrendingNow && (
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div>
                  <h3 className="text-xl lg:text-2xl font-headline font-bold tracking-tight">Trending Now</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Most popular this week</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => scroll('left')}
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => scroll('right')}
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div 
                ref={trendingRef}
                onMouseEnter={() => setIsAutoScrolling(false)}
                onMouseLeave={() => setIsAutoScrolling(true)}
                onTouchStart={() => setIsAutoScrolling(false)}
                onTouchEnd={() => setIsAutoScrolling(true)}
                className="flex overflow-x-auto gap-4 lg:gap-6 pb-8 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 touch-pan-x touch-pan-y"
              >
                {trendingProducts.map((product) => (
                  <motion.div 
                    key={product.id}
                    className="shrink-0 w-[240px] lg:w-[300px] group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-blue-900/5 transition-all flex flex-col"
                    style={{ borderRadius: `${settings.ui.borderRadius * 1.5}px`, padding: `${settings.ui.cardPadding}px` }}
                  >
                    <Link to={`/product/${product.id}`} className="block aspect-square bg-slate-50 rounded-2xl relative overflow-hidden mb-4">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={(e) => { e.preventDefault(); handleAddToCart(product.id); }}
                        className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-xl shadow-xl translate-y-20 group-hover:translate-y-0 transition-transform duration-300 hover:bg-blue-700"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                    </Link>
                    <div className="flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 px-2 py-1 rounded-lg bg-blue-50">
                          {product.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {productRatings[product.id] || 0.0}
                        </div>
                      </div>
                      <Link to={`/product/${product.id}`}>
                        <h4 className="font-headline font-bold text-base lg:text-lg mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                          {product.name}
                        </h4>
                      </Link>
                      <div className="mt-auto">
                        <p className="text-xl lg:text-2xl font-headline font-black text-slate-900">
                          ₹{getAdjustedPrice(product.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        {product.mrp && product.mrp > product.price && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 line-through">₹{product.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <span className="text-[10px] font-bold text-emerald-600">{Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Flash Deals */}
          {settings.ui.showFlashDeals && (
            <div className="lg:col-span-4">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <h3 className="text-xl lg:text-2xl font-headline font-bold tracking-tight">Flash Deals</h3>
                <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold border border-rose-100">
                  <Timer className="w-4 h-4" />
                  {timeLeft}
                </div>
              </div>

              <div className="space-y-4">
                {displayFlashDeals.map((deal) => (
                  <Link to={`/product/${deal.id}`} key={deal.id} className="block bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 lg:gap-5 group cursor-pointer">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                        <img 
                          src={deal.imageUrl} 
                          alt={deal.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-sm truncate group-hover:text-blue-600 transition-colors">
                          {deal.name}
                        </h5>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg lg:text-xl font-black text-rose-600">₹{getAdjustedPrice(deal.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-xs text-slate-400 line-through opacity-50">₹{(deal.mrp || getAdjustedPrice(deal.price * 1.25, settings.profitMargin)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-slate-500">LIMITED STOCK</span>
                            <span className="text-rose-600">ONLY {deal.stock} LEFT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
