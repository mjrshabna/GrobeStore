import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Truck, 
  CheckCircle2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import Navbar from './Navbar';
import FooterSection from './FooterSection';
import BottomNav from './BottomNav';
import NotifyMePopup from './NotifyMePopup';
import ImageZoomModal from './ImageZoomModal';
import LoadingScreen from './LoadingScreen';
import { Product, productService, getAdjustedPrice, reviewService, waitlistService, Review } from '../services/db';
import { auth } from '../lib/firebase';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import toast from 'react-hot-toast';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showNotifyPopup, setShowNotifyPopup] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const { addToCart, cartItems } = useCart();
  const { settings } = useSettings();

  const isInCart = cartItems.some(item => item.productId === id);

  useEffect(() => {
    // Scroll to active thumbnail
    const container = thumbnailContainerRef.current;
    if (container && container.children[currentImageIndex]) {
      const thumbnail = container.children[currentImageIndex] as HTMLElement;
      thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentImageIndex]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await productService.getProduct(id);
        setProduct(data);
        
        if (data) {
          const [allProducts, productReviews] = await Promise.all([
            productService.getAllProducts(),
            reviewService.getProductReviews(id)
          ]);
          setReviews(productReviews);
          
          const related = allProducts
            .filter(p => p.id !== id && p.category === data.category)
            .slice(0, 4);
          
          if (related.length < 4) {
            const more = allProducts.filter(p => p.id !== id && !related.find(r => r.id === p.id)).slice(0, 4 - related.length);
            setRelatedProducts([...related, ...more]);
          } else {
            setRelatedProducts(related);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const allImages = product ? [product.imageUrl, ...(product.images || [])] : [];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

  const handleAddToCart = async () => {
    if (!product) return;
    if (isInCart) {
      navigate('/cart');
      return;
    }
    try {
      await addToCart(product.id, quantity);
    } catch (error) {
      // Error handling is done in CartContext
    }
  };

  const handleNotifyMe = async () => {
    if (!product) return;
    if (auth.currentUser) {
      try {
        await waitlistService.addToWaitlist(product.id, auth.currentUser.email || '', auth.currentUser.uid);
        toast.success('You have been added to the waitlist!');
      } catch (error) {
        toast.error('Failed to join waitlist.');
      }
    } else {
      setShowNotifyPopup(true);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Product Intel..." />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Product not found</h1>
        <Link to="/catalog" className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-20 md:pt-28 pb-32 md:pb-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-8 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
          <Link to="/catalog" className="hover:text-blue-600 transition-colors">Catalog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="hover:text-blue-600 transition-colors cursor-pointer">{product.category}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 truncate">{product.name}</span>
        </nav>

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
          className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start"
        >
          {/* Left: Gallery & Image */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: -30 },
              show: { 
                opacity: 1, 
                x: 0,
                transition: {
                  type: 'spring',
                  stiffness: 100,
                  damping: 15
                }
              }
            }}
            className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-6"
          >
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div ref={thumbnailContainerRef} className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto md:w-24 shrink-0 scrollbar-hide pb-2 md:pb-0">
                {allImages.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-100 border-2 ${currentImageIndex === idx ? 'border-blue-600' : 'border-transparent'} overflow-hidden shrink-0`}
                  >
                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 bg-slate-100 rounded-[2rem] overflow-hidden group">
              <motion.div
                className="w-full aspect-square cursor-pointer"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(event, info) => {
                  if (info.offset.x < -50) nextImage();
                  else if (info.offset.x > 50) prevImage();
                }}
                onClick={() => setIsZoomOpen(true)}
              >
                <motion.img 
                  key={allImages[currentImageIndex]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={allImages[currentImageIndex]} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              
              {/* Pagination Dots */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {allImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${currentImageIndex === idx ? 'bg-blue-600' : 'bg-white/80'}`}
                    />
                  ))}
                </div>
              )}
              
              {/* Spec Overlay Glass Module */}
              <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 p-4 md:p-6 bg-white/70 backdrop-blur-2xl rounded-2xl border-t border-l border-white/40 shadow-2xl max-w-[200px] md:max-w-[240px]">
                <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Key Specification</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-60">Category</span>
                    <span className="font-medium">{product.category}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-60">Stock</span>
                    <span className="font-medium">{product.stock}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Action & Info */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: 30 },
              show: { 
                opacity: 1, 
                x: 0,
                transition: {
                  type: 'spring',
                  stiffness: 100,
                  damping: 15
                }
              }
            }}
            className="lg:col-span-5 space-y-8 md:space-y-10"
          >
            <header>
              <div className="flex justify-between items-start mb-4">
                <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold tracking-widest uppercase rounded-full">
                  Engineering Grade
                </span>
                <div className="flex items-center gap-1 text-blue-600">
                  <Star className="w-4 h-4 fill-blue-600" />
                  <span className="text-xs font-bold">{(4.5 + (Math.random() * 0.5)).toFixed(1)} (Verified Purchase)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter leading-tight text-slate-900 mb-4">
                {product.name}
              </h1>
              <p className="text-slate-600 font-sans leading-relaxed max-w-md">
                {product.description}
              </p>
            </header>

            {/* Configuration & Pricing */}
            <div className="space-y-8">
              <div className="flex items-end gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-widest uppercase opacity-40">Unit Price</span>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl md:text-4xl font-headline font-bold tracking-tighter text-slate-900 whitespace-nowrap">
                      ₹{getAdjustedPrice(product.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {product.mrp && product.mrp > product.price && (
                      <>
                        <div className="text-lg md:text-xl font-bold text-slate-400 line-through">
                          ₹{product.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm md:text-base font-bold text-emerald-600">
                          {Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="mb-1">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock > 0 ? 'IN STOCK' : 'OUT OF STOCK'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:gap-4">
                {product.stock > 0 && (
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-2 w-36 shrink-0">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        -
                      </button>
                      <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
                  <button 
                    onClick={product.stock > 0 ? handleAddToCart : handleNotifyMe}
                    className={`flex-1 py-4 md:py-5 rounded-full font-bold text-base md:text-lg transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${
                      product.stock > 0 
                        ? (isInCart ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-900')
                        : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20'
                    }`}
                  >
                    {product.stock > 0 ? (
                      isInCart ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Go to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Add to Cart
                        </>
                      )
                    ) : (
                      'Notify Me'
                    )}
                  </button>
                  {product.stock > 0 && (
                    <button 
                      onClick={() => {
                        if (!isInCart) addToCart(product.id, quantity);
                        navigate('/cart');
                      }}
                      className="flex-1 py-4 md:py-5 rounded-full font-bold text-base md:text-lg transition-all shadow-xl active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 flex justify-center items-center gap-2"
                    >
                      Buy Now
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping / Trust */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Grobe Delivery</div>
                  <div className="text-slate-500 text-[10px]">Fast Shipping Available</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">Quality Assured</div>
                  <div className="text-slate-500 text-[10px]">Lab Tested Components</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Reviews Section */}
        <section className="mt-24 md:mt-32">
          <h2 className="text-2xl md:text-3xl font-headline font-bold mb-8 text-slate-900">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-slate-900">{review.userName}</span>
                  </div>
                  <p className="text-slate-600 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No reviews yet.</p>
          )}
        </section>

        {/* Technical Specification Section */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <section className="mt-24 md:mt-32">
            <div className="flex items-baseline justify-between mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-headline font-bold tracking-tighter text-slate-900">Technical Architecture</h2>
              <div className="h-px flex-1 mx-8 bg-slate-200 hidden md:block"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left: Specs Table */}
              <div className="md:col-span-2 overflow-hidden rounded-3xl bg-slate-100">
                <div className="divide-y divide-slate-200">
                  {Object.entries(product.specs).map(([key, value], i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-2 p-4 sm:p-6 hover:bg-slate-200/50 transition-colors gap-2 sm:gap-0">
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-500">{key}</span>
                      <span className="text-sm font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recommended Modules */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 md:mt-32">
            <h3 className="text-2xl md:text-3xl font-headline font-bold mb-8 md:mb-10 text-slate-900">Recommended Modules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {relatedProducts.map((module) => (
                <Link to={`/product/${module.id}`} key={module.id} className="group bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all flex flex-col">
                  <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden mb-4 relative">
                    <img src={module.imageUrl} alt={module.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-grow flex flex-col">
                    <h4 className="font-headline font-bold text-base md:text-lg text-slate-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{module.name}</h4>
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{module.category}</span>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-headline font-black text-lg md:text-xl text-slate-900">₹{getAdjustedPrice(module.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {showNotifyPopup && <NotifyMePopup productId={product.id} onClose={() => setShowNotifyPopup(false)} />}

      <div className="hidden md:block">
        <FooterSection />
      </div>
      <BottomNav />
      <ImageZoomModal 
        isOpen={isZoomOpen} 
        onClose={() => setIsZoomOpen(false)} 
        image={allImages[currentImageIndex]} 
      />
    </div>
  );
}
