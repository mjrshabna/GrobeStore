import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Filter, Search, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import FooterSection from '../components/FooterSection';
import BottomNav from '../components/BottomNav';
import { Product, productService, getAdjustedPrice } from '../services/db';
import { useCart } from '../contexts/CartContext';
import { useSettings } from '../contexts/SettingsContext';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategoryState] = useState(searchParams.get('category') || 'All');
  const [searchQuery, setSearchQueryState] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest' | 'name-asc' | 'name-desc'>('default');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { addToCart } = useCart();
  const { settings } = useSettings();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productData = await productService.getAllProducts();
        setProducts(productData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCategoryState(searchParams.get('category') || 'All');
    const searchParam = searchParams.get('search') || '';
    setSearchQueryState(searchParam);
    setSearchInput(searchParam);
  }, [searchParams]);

  const setCategory = (cat: string) => {
    setCategoryState(cat);
    setSearchParams(prev => {
      if (cat === 'All') prev.delete('category');
      else prev.set('category', cat);
      return prev;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQueryState(searchInput);
    setSearchParams(prev => {
      if (!searchInput) prev.delete('search');
      else prev.set('search', searchInput);
      return prev;
    });
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart(productId);
    } catch (error) {
      // Error handling is done in CartContext
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = category === 'All' || p.category?.toLowerCase() === category.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'newest') {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    }
    return 0;
  });

  const sortOptions = [
    { value: 'default', label: 'Relevance' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
  ];

  // Get unique categories from products
  const availableCategories = ['All', ...Array.from(new Set(products.map(p => p.category))) as string[]];

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#191c1e] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 md:pt-32 pb-32 md:pb-24 px-4 md:px-8 max-w-[1440px] mx-auto w-full">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tighter text-slate-900 mb-2">Component Catalog</h1>
            <p className="text-slate-500 font-sans text-xs md:text-sm tracking-widest uppercase font-semibold">
              {filteredProducts.length} ITEMS AVAILABLE
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full sm:w-auto">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-24 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50 w-full sm:w-72 md:w-80" 
              />
              <button 
                type="submit" 
                className="absolute right-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>
            
            <div className="relative w-full sm:w-auto">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`w-full sm:w-auto flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border transition-colors ${isFilterOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Sort: {sortOptions.find(o => o.value === sortBy)?.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-full sm:w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Sort By</div>
                  {sortOptions.map(option => (
                    <button 
                      key={option.value}
                      onClick={() => { setSortBy(option.value as any); setIsFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors ${sortBy === option.value ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                category === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-3xl p-4 border border-slate-100">
                <div className="w-full aspect-square bg-slate-100 rounded-2xl mb-4"></div>
                <div className="h-6 bg-slate-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-headline font-bold text-slate-900 mb-2">No components found</h2>
            <p className="text-slate-500 mb-8 max-w-md">We couldn't find any components matching your current search or category filters.</p>
            <button 
              onClick={() => {
                setSearchInput('');
                setSearchQueryState('');
                setCategory('All');
                setSearchParams({});
              }}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Clear All Filters
            </button>
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
                  staggerChildren: 0.05
                }
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
          >
            {filteredProducts.map(product => (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
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
                key={product.id}
                className="group bg-white/70 backdrop-blur-md rounded-3xl p-5 border border-white/50 shadow-lg hover:shadow-2xl hover:shadow-blue-900/10 transition-all flex flex-col"
              >
                <Link to={`/product/${product.id}`} className="block aspect-square bg-slate-100/50 rounded-2xl overflow-hidden mb-5 relative">
                  <img src={product.imageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold tracking-widest uppercase text-blue-600 shadow-sm">
                    {product.category}
                  </div>
                </Link>
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-headline font-bold text-lg text-slate-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                    </Link>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">{product.description}</p>
                  </div>
                  <div className="flex flex-col mt-auto">
                    <div className="flex items-baseline gap-2">
                      <span className="font-headline font-black text-xl text-slate-900">₹{getAdjustedPrice(product.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      {product.mrp && product.mrp > product.price && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">₹{product.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] font-bold text-emerald-600">{Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleAddToCart(product.id); }}
                      className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-blue-700 transition-colors active:scale-95 text-sm shadow-md"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                  </div>
                </div>
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
