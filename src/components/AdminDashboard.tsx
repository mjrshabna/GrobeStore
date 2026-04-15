import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  LineChart, 
  Users, 
  Settings,
  Search,
  Bell,
  DollarSign,
  UserPlus,
  TrendingUp,
  MoreVertical,
  Plus,
  Menu,
  X,
  Edit,
  Trash2,
  Box,
  FileText,
  Save,
  Ticket,
  Shield,
  Star,
  Download,
  Upload,
  Database,
  LogOut,
  AlertTriangle,
  Eye,
  Palette,
  Smartphone,
  Truck,
  Mail,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Send
} from 'lucide-react';
import { Product, Order, BlogPost, UserProfile, Settings as AppSettings, Coupon, Policy, UIHistoryEntry, productService, orderService, blogService, userService, couponService, policyService, getSettings, updateSettings, clearAllData, getAdjustedPrice, uiHistoryService, logService } from '../services/db';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ProductModal from './ProductModal';
import BlogModal from './BlogModal';
import CouponModal from './CouponModal';
import PolicyModal from './PolicyModal';
import OrderDetailsModal from './OrderDetailsModal';
import ReviewsManagement from './ReviewsManagement';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const logClientEvent = async (event: string, details: any) => {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, details })
      });
    } catch (e) {
      console.error("Client logging failed", e);
    }
  };
  const [activeTab, setActiveTab] = useState('dashboard');
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [uiHistory, setUiHistory] = useState<UIHistoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    shopName: 'GROBE',
    contactEmail: 'support@grobe.com',
    maintenanceMode: false,
    profitMargin: 0,
    zohoEmail: '',
    zohoPassword: '',
    upiId: '',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayTestMode: false,
    ui: {
      primaryColor: '#2563eb',
      secondaryColor: '#4f46e5',
      backgroundColor: '#f8fafc',
      headingFont: 'Inter',
      bodyFont: 'Inter',
      borderRadius: 12,
      cardPadding: 16,
      showTrendingNow: true,
      showFlashDeals: true,
      showCategories: true,
      showBlog: true,
      pageLayout: '',
      animationSpeed: 'normal'
    }
  });
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [deleteVerification, setDeleteVerification] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
  } | null>(null);

  const [promptDialog, setPromptDialog] = useState<{
    title: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'product' | 'blog' | 'coupon' } | null>(null);

  const handleUpdateUISettings = async (newUI: Partial<AppSettings['ui']>) => {
    const updatedSettings = {
      ...settings,
      ui: { ...settings.ui, ...newUI }
    };
    setSettings(updatedSettings);
    try {
      await updateSettings(updatedSettings);
      toast.success('UI settings updated');
    } catch (error) {
      toast.error('Failed to update UI settings');
    }
  };

  const handleSaveUIHistory = async () => {
    setPromptDialog({
      title: 'Save UI Snapshot',
      message: 'Enter a name for this UI snapshot (e.g., "Summer Sale Theme"):',
      placeholder: 'Snapshot name...',
      onConfirm: async (name) => {
        try {
          await uiHistoryService.saveSnapshot(name, settings.ui);
          toast.success('UI snapshot saved');
          fetchData();
        } catch (error) {
          toast.error('Failed to save UI snapshot');
        }
      }
    });
  };

  const handleRestoreUIHistory = async (historyEntry: UIHistoryEntry) => {
    setConfirmDialog({
      title: 'Restore Theme',
      message: `Are you sure you want to restore the "${historyEntry.name}" theme?`,
      onConfirm: async () => {
        try {
          await handleUpdateUISettings(historyEntry.settings);
          toast.success('Theme restored successfully');
        } catch (error) {
          toast.error('Failed to restore theme');
        }
      }
    });
  };

  const handleDeleteUIHistory = async (id: string) => {
    setConfirmDialog({
      title: 'Delete Snapshot',
      message: 'Are you sure you want to delete this snapshot?',
      isDanger: true,
      onConfirm: async () => {
        try {
          await uiHistoryService.deleteSnapshot(id);
          toast.success('Snapshot deleted');
          fetchData();
        } catch (error) {
          toast.error('Failed to delete snapshot');
        }
      }
    });
  };

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        productService.getAllProducts(),
        orderService.getAllOrders(),
        blogService.getAllPosts(),
        userService.getAllUsers(),
        couponService.getAllCoupons(),
        getSettings(),
        policyService.getAllPolicies(),
        uiHistoryService.getHistory(),
        logService.getLogs()
      ]);

      if (results[0].status === 'fulfilled') setProducts(results[0].value);
      if (results[1].status === 'fulfilled') setOrders(results[1].value);
      if (results[2].status === 'fulfilled') setBlogs(results[2].value);
      if (results[3].status === 'fulfilled') setUsers(results[3].value);
      if (results[4].status === 'fulfilled') setCoupons(results[4].value);
      if (results[5].status === 'fulfilled' && results[5].value) setSettings(results[5].value);
      if (results[6].status === 'fulfilled') setPolicies(results[6].value);
      if (results[7].status === 'fulfilled') setUiHistory(results[7].value);
      if (results[8].status === 'fulfilled') setLogs(results[8].value);

      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.error('Some dashboard data failed to load:', results.filter(r => r.status === 'rejected'));
        toast.error(`Failed to load some dashboard data (${failedCount} items)`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
      setLoading(false);
    });

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
      setLoading(false);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  const handleDeleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      await logClientEvent('DELETE_PRODUCT', { productId: id });
      toast.success('Product deleted');
      setDeleteConfirm(null);
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleDeleteBlog = async (id: string) => {
    try {
      await blogService.deletePost(id);
      await logClientEvent('DELETE_BLOG', { blogId: id });
      toast.success('Blog post deleted');
      setDeleteConfirm(null);
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await couponService.deleteCoupon(id);
      await logClientEvent('DELETE_COUPON', { couponId: id });
      toast.success('Coupon deleted');
      setDeleteConfirm(null);
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await orderService.deleteOrder(id);
      await logClientEvent('DELETE_ORDER', { orderId: id });
      toast.success('Order deleted');
      setDeleteConfirm(null);
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await userService.deleteUser(id);
      toast.success('User deleted');
      setDeleteConfirm(null);
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      await policyService.deletePolicy(id);
      toast.success('Policy deleted');
      setDeleteConfirm(null);
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProducts.length === 0) return;
    setConfirmDialog({
      title: 'Delete Products',
      message: `Are you sure you want to delete ${selectedProducts.length} products? This action is irreversible.`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await Promise.all(selectedProducts.map(id => productService.deleteProduct(id)));
          toast.success('Selected products deleted');
          setSelectedProducts([]);
          fetchData();
        } catch (error) {
          toast.error('Failed to delete some products');
        }
      }
    });
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrders.length === 0) return;
    setConfirmDialog({
      title: 'Delete Orders',
      message: `Are you sure you want to delete ${selectedOrders.length} orders? This action is irreversible.`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await Promise.all(selectedOrders.map(id => orderService.deleteOrder(id)));
          toast.success('Selected orders deleted');
          setSelectedOrders([]);
          fetchData();
        } catch (error) {
          toast.error('Failed to delete some orders');
        }
      }
    });
  };

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(oId => oId !== id) : [...prev, id]
    );
  };

  const toggleAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await orderService.updateOrderStatus(id, status);
      toast.success('Order status updated');
      
      // Send email notification
      const order = await orderService.getOrder(id);
      if (order && order.shippingAddress?.email) {
        try {
          await fetch('/api/emails/status-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: order.shippingAddress.email,
              userName: order.shippingAddress.name,
              orderId: id.slice(0, 8),
              status: status,
              paymentStatus: order.paymentStatus
            })
          });
        } catch (e) {
          console.error('Failed to send status update email:', e);
        }
      }
      
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (o.shippingAddress?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.shippingAddress?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    const template = [
      {
        name: 'Example Product',
        description: 'Detailed description here',
        price: 999,
        category: 'Components',
        imageUrl: 'https://picsum.photos/seed/product/400/400',
        images: 'https://picsum.photos/seed/p1/400/400, https://picsum.photos/seed/p2/400/400',
        stock: 50,
        specs: '{"Voltage": "5V", "Current": "2A"}'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "Product_Template.xlsx");
  };

  const handleBulkUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedProducts = data.map(item => {
          // Handle images column (comma separated)
          let images: string[] = [];
          if (item.images) {
            images = String(item.images).split(',').map(img => img.trim()).filter(img => img !== '');
          }

          return {
            name: String(item.name || ''),
            description: String(item.description || ''),
            price: Number(item.price || 0),
            category: String(item.category || 'Uncategorized'),
            imageUrl: String(item.imageUrl || (images.length > 0 ? images[0] : '')),
            images: images,
            stock: Number(item.stock || 0),
            specs: typeof item.specs === 'string' ? JSON.parse(item.specs) : (item.specs || {})
          };
        });

        await productService.bulkAddProducts(formattedProducts);
        toast.success(`Successfully uploaded ${formattedProducts.length} products`);
        fetchData();
      } catch (error) {
        console.error(error);
        toast.error('Failed to process file. Ensure format is correct.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBackup = () => {
    const backupData = {
      products,
      orders,
      blogs,
      coupons,
      settings,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GROBE_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup file generated and downloaded');
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteVerification.toLowerCase() !== 'delete') {
      toast.error('Please type "delete" to confirm');
      return;
    }

    setIsDeletingAll(true);
    try {
      await clearAllData();
      await logClientEvent('WIPE_ALL_DATA', { userId: user?.uid });
      toast.success('All data has been wiped');
      setDeleteVerification('');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete all data');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-50 border-r border-slate-200/50 flex flex-col py-6 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-6 mb-8">
          <div>
            <div className="text-2xl font-black text-blue-700 tracking-tighter font-headline">GROBE</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Technical Admin</div>
          </div>
          <button className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'dashboard' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'inventory' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Package className="w-5 h-5" />
            <span>Inventory</span>
          </button>
          <button onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'orders' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <ShoppingCart className="w-5 h-5" />
            <span>Orders</span>
          </button>
          <button onClick={() => { setActiveTab('blog'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'blog' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <FileText className="w-5 h-5" />
            <span>Blog</span>
          </button>
          <button onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'users' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Users className="w-5 h-5" />
            <span>Users</span>
          </button>
          <button onClick={() => { setActiveTab('coupons'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'coupons' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Ticket className="w-5 h-5" />
            <span>Coupons</span>
          </button>
          <button onClick={() => { setActiveTab('policies'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'policies' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Shield className="w-5 h-5" />
            <span>Policies</span>
          </button>
          <button onClick={() => { setActiveTab('reviews'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'reviews' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Star className="w-5 h-5" />
            <span>Reviews</span>
          </button>
          <button onClick={() => { setActiveTab('uiux'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'uiux' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Palette className="w-5 h-5" />
            <span>UI/UX</span>
          </button>
          <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'settings' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <button onClick={() => { setActiveTab('backups'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all ${activeTab === 'backups' ? 'text-blue-700 bg-white shadow-sm border border-slate-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white/50'}`}>
            <Database className="w-5 h-5" />
            <span>Backups & Logs</span>
          </button>
        </nav>

        <div className="px-4 mt-auto">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#f8f9ff]/90 backdrop-blur-md flex justify-between items-center px-4 sm:px-8 h-20 border-b border-slate-200/50">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative group hidden sm:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search system records..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 border-none rounded-full pl-10 pr-4 py-2.5 w-64 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all text-sm outline-none"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 sm:p-8">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500 font-bold">Loading data...</div>
            </div>
          )}
          {!loading && activeTab === 'dashboard' && (
            <>
              {/* Header Section */}
              <section className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-headline font-extrabold tracking-tight text-slate-900 mb-2">System Overview</h1>
                <p className="text-slate-500 text-sm">Real-time performance metrics and technical distribution.</p>
              </section>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                    <h3 className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Package className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Active Orders</p>
                    <h3 className="text-2xl font-black text-slate-900">{orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}</h3>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                      <Box className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Components in Stock</p>
                    <h3 className="text-2xl font-black text-slate-900">{products.reduce((sum, p) => sum + p.stock, 0)}</h3>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Data Table for Inventory and Orders */}
          {(activeTab === 'inventory' || activeTab === 'orders') && (
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-6 sm:p-8 flex flex-wrap justify-between items-center gap-4 border-b border-slate-50">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">{activeTab === 'inventory' ? 'Inventory Management' : 'Order Fulfillment'}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  {activeTab === 'inventory' && (
                    <>
                      {selectedProducts.length > 0 && (
                        <button 
                          onClick={handleBulkDeleteProducts}
                          className="px-4 py-2 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 transition-colors text-sm flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete ({selectedProducts.length})
                        </button>
                      )}
                      <button 
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm flex items-center gap-2"
                        title="Download Excel Template"
                      >
                        <Download className="w-4 h-4" /> Template
                      </button>
                      <label className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition-colors text-sm flex items-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" /> Bulk Upload
                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleBulkUpload} />
                      </label>
                      <button 
                        onClick={handleBackup}
                        className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-colors text-sm flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" /> Backup
                      </button>
                      <button 
                        onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Component
                      </button>
                    </>
                  )}
                  {activeTab === 'orders' && selectedOrders.length > 0 && (
                    <button 
                      onClick={handleBulkDeleteOrders}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 transition-colors text-sm flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete ({selectedOrders.length})
                    </button>
                  )}
                </div>
              </div>

              {activeTab === 'inventory' && (
                <div className="px-6 sm:px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Global Profit Margin</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={settings.profitMargin}
                            onChange={(e) => setSettings({...settings, profitMargin: Number(e.target.value)})}
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-sm font-bold text-blue-600 bg-white"
                          />
                          <span className="text-sm font-bold text-slate-400">%</span>
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={settings.profitMargin}
                        onChange={(e) => setSettings({...settings, profitMargin: Number(e.target.value)})}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await updateSettings({ profitMargin: settings.profitMargin });
                          toast.success('Profit margin updated globally');
                        } catch (error) {
                          toast.error('Failed to update margin');
                        }
                      }}
                      className="whitespace-nowrap px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                    >
                      Apply Margin
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center text-slate-500">Loading data...</div>
                ) : activeTab === 'inventory' ? (
                  <>
                    {/* Mobile Card Layout */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {filteredProducts.map(product => (
                        <div key={product.id} className="p-4 flex flex-col gap-3">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">{product.category}</span>
                              <div className="mt-2 flex items-center justify-between">
                                <span className={`font-bold text-xs ${product.stock < 10 ? 'text-red-500' : 'text-slate-500'}`}>{product.stock} Units</span>
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-slate-900 text-sm">₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  <span className="text-[10px] text-blue-600 font-bold">Sell: ₹{getAdjustedPrice(product.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                            <button onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }} className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteConfirm({ id: product.id, type: 'product' })} className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">No products found matching your search.</div>
                      )}
                    </div>

                    {/* Desktop Table Layout */}
                    <table className="hidden sm:table w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 sm:px-8 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                              onChange={toggleAllProducts}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Component</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Stock</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Price</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredProducts.map(product => (
                          <tr key={product.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedProducts.includes(product.id) ? 'bg-blue-50/30' : ''}`}>
                            <td className="px-6 sm:px-8 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <span className="font-bold text-slate-900 text-sm">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">{product.category}</span>
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5">
                              <span className={`font-bold text-sm ${product.stock < 10 ? 'text-red-500' : 'text-slate-900'}`}>{product.stock} Units</span>
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5">
                              <div className="font-bold text-slate-900 text-sm">₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              <div className="text-[10px] text-blue-600 font-bold">Sell: ₹{getAdjustedPrice(product.price, settings.profitMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => setDeleteConfirm({ id: product.id, type: 'product' })} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No products found matching your search.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <>
                    {/* Mobile Card Layout */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {filteredOrders.map(order => (
                        <div key={order.id} className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono text-xs text-blue-600 font-bold mb-1">{order.id.slice(0, 8)}...</div>
                              <div className="font-bold text-slate-900 text-sm">{order.shippingAddress?.name || 'Unknown'}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleDateString() : 'Just now'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900 text-sm mb-2">
                                ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <select 
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-none focus:ring-0 cursor-pointer ${
                                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                  order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredOrders.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">No orders found matching your search.</div>
                      )}
                    </div>

                    {/* Desktop Table Layout */}
                    <table className="hidden sm:table w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 sm:px-8 py-4 w-10">
                            <input 
                              type="checkbox" 
                              checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                              onChange={toggleAllOrders}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Order ID</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Customer</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Payment</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total</th>
                          <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredOrders.map(order => (
                          <tr key={order.id} className={`hover:bg-slate-50/50 transition-colors ${selectedOrders.includes(order.id) ? 'bg-blue-50/30' : ''}`}>
                            <td className="px-6 sm:px-8 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedOrders.includes(order.id)}
                                onChange={() => toggleOrderSelection(order.id)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5 font-mono text-xs text-blue-600 font-bold">{order.id.slice(0, 8)}...</td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5 font-bold text-slate-900 text-sm">{order.shippingAddress?.name || 'Unknown'}</td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    order.paymentStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                    order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {order.paymentStatus || 'pending'}
                                  </span>
                                </div>
                                {order.transactionId && (
                                  <span className="text-[10px] font-mono text-slate-400">TXN: {order.transactionId}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5">
                              <select 
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-none focus:ring-0 cursor-pointer ${
                                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                  order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5 font-bold text-slate-900 text-sm text-right">
                              ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setViewingOrder(order);
                                    setIsOrderDetailsOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ id: order.id, type: 'order' })}
                                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No orders found matching your search.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Blog Posts</h2>
                  <p className="text-sm text-slate-500">Manage your site's articles and updates.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search posts..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setEditingBlog(null);
                      setIsBlogModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    New Post
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase())).map(post => (
                  <div key={post.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col group">
                    {post.imageUrl && (
                      <div className="aspect-video w-full overflow-hidden bg-slate-50 relative">
                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <a href="/blog" target="_blank" className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-slate-900 shadow-xl">View on Site</a>
                        </div>
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{post.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-grow">{post.content}</p>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400 font-medium">{post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleDateString() : 'Recent'}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingBlog(post);
                              setIsBlogModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ id: post.id, type: 'blog' })}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {blogs.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100">
                    No blog posts found. Create your first post!
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'users' && (
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">User Management</h2>
                  <p className="text-sm text-slate-500">Control access levels and manage registered users.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">User Details</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Access Level</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Registration Date</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 sm:px-8 py-4 sm:py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5 text-sm text-slate-500">
                            {user.createdAt ? new Date(user.createdAt.toMillis()).toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <select 
                                value={user.role}
                                onChange={async (e) => {
                                  try {
                                    await userService.updateUserRole(user.id!, e.target.value as any);
                                    toast.success('User role updated');
                                    fetchData();
                                  } catch (error) {
                                    toast.error('Failed to update role');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 focus:ring-2 focus:ring-blue-600/50 outline-none cursor-pointer bg-white"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button 
                                onClick={() => setDeleteConfirm({ id: user.id!, type: 'user' })}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No users found matching your search.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'coupons' && (
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Coupons & Offers</h2>
                  <p className="text-sm text-slate-500">Create and manage discount codes for your customers.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingCoupon(null);
                    setIsCouponModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  New Coupon
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Code</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Discount</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Min Purchase</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 sm:px-8 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {coupons.map(coupon => (
                        <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 sm:px-8 py-4 sm:py-5">
                            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{coupon.code}</span>
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5">
                            <span className="font-bold text-slate-900">
                              {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                            </span>
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5 text-sm text-slate-500">
                            ₹{coupon.minPurchase || 0}
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              coupon.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {coupon.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 sm:px-8 py-4 sm:py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCoupon(coupon); setIsCouponModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteConfirm({ id: coupon.id, type: 'coupon' })} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {coupons.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No coupons found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'backups' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Backups & Logs</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleBackup}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Manual Backup
                  </button>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = async (e: any) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                          try {
                            const data = JSON.parse(e.target?.result as string);
                            // Logic to restore data would go here
                            toast.success('Backup uploaded successfully (Restore logic pending)');
                            await logClientEvent('RESTORE_BACKUP', { fileName: file.name });
                          } catch (err) {
                            toast.error('Failed to parse backup file');
                          }
                        };
                        reader.readAsText(file);
                      };
                      input.click();
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm shadow-sm"
                  >
                    <Upload className="w-4 h-4" /> Upload/Restore Backup
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <Database className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">Google Drive Automated Backups</h3>
                </div>
                
                {settings.googleDriveConfig?.enabled ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium text-sm">Automated backups are currently enabled and running {settings.googleDriveConfig.frequency}.</span>
                    </div>
                    
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-4 text-sm">Recent System Logs</h4>
                      <div className="space-y-3">
                        {logs.slice(0, 10).map((log, index) => (
                          <div key={index} className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-slate-600">{log.event}</span>
                            </div>
                            <span className="text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        ))}
                        {logs.length === 0 && <p className="text-sm text-slate-500">No logs found.</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="font-bold text-slate-900 mb-2">Automated Backups Disabled</h4>
                    <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                      Enable Google Drive backups in Settings to automatically secure your store's data on a regular schedule.
                    </p>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm shadow-sm"
                    >
                      Configure in Settings
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-900">System Logs</h3>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2">
                  <div className="flex gap-4"><span className="text-slate-500">[{new Date().toISOString()}]</span><span className="text-emerald-400">INFO</span><span>System initialized</span></div>
                  <div className="flex gap-4"><span className="text-slate-500">[{new Date(Date.now() - 3600000).toISOString()}]</span><span className="text-blue-400">SYNC</span><span>Products synchronized</span></div>
                  <div className="flex gap-4"><span className="text-slate-500">[{new Date(Date.now() - 7200000).toISOString()}]</span><span className="text-emerald-400">INFO</span><span>Settings updated by admin</span></div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Global Settings</h2>
                  <p className="text-sm text-slate-500">Configure your store's global parameters and payment details.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm p-6 sm:p-8 max-w-3xl">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const loadingToast = toast.loading('Saving settings...');
                  try {
                    // Trim sensitive keys to prevent whitespace issues
                    const trimmedSettings = {
                      ...settings,
                      razorpayKeyId: (settings.razorpayKeyId || '').trim(),
                      razorpayKeySecret: (settings.razorpayKeySecret || '').trim(),
                      zohoEmail: (settings.zohoEmail || '').trim(),
                      zohoPassword: (settings.zohoPassword || '').trim(),
                      shiprocketEmail: (settings.shiprocketEmail || '').trim(),
                      shiprocketPassword: (settings.shiprocketPassword || '').trim(),
                    };
                    
                    await updateSettings(trimmedSettings);
                    setSettings(trimmedSettings);
                    toast.success('Settings saved successfully', { id: loadingToast });
                  } catch (error) {
                    toast.error('Failed to update settings', { id: loadingToast });
                  }
                }} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Shop Name</label>
                      <input 
                        type="text" 
                        value={settings.shopName} 
                        onChange={e => setSettings({...settings, shopName: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" 
                        placeholder="e.g. GROBE Technologies"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Contact Email</label>
                      <input 
                        type="email" 
                        value={settings.contactEmail} 
                        onChange={e => setSettings({...settings, contactEmail: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" 
                        placeholder="support@example.com"
                      />
                    </div>
                  </div>

                  {/* Razorpay Configuration */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        Razorpay Configuration
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Test Mode</span>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, razorpayTestMode: !settings.razorpayTestMode})}
                          className={`w-10 h-5 rounded-full transition-colors relative ${settings.razorpayTestMode ? 'bg-orange-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.razorpayTestMode ? 'left-5.5' : 'left-0.5'}`} style={{ left: settings.razorpayTestMode ? '22px' : '2px' }} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Razorpay Key ID</label>
                        <input 
                          type="text" 
                          value={settings.razorpayKeyId} 
                          onChange={e => setSettings({...settings, razorpayKeyId: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="rzp_test_..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Razorpay Key Secret</label>
                        <input 
                          type="password" 
                          value={settings.razorpayKeySecret} 
                          onChange={e => setSettings({...settings, razorpayKeySecret: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="Razorpay Key Secret"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Get your credentials from the Razorpay Dashboard (Settings &gt; API Keys).</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Note: To send official Razorpay payment receipts, enable "Email Receipts" in your Razorpay Dashboard (Settings &gt; Configuration &gt; Email Receipts).</p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
                          toast.error('Please enter Razorpay Key ID and Secret first');
                          return;
                        }
                        const loadingToast = toast.loading('Testing Razorpay connection...');
                        try {
                          // Save settings first
                          await updateSettings(settings);
                          
                          const response = await fetch('/api/razorpay/create-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              amount: 1, // Test amount
                              currency: 'INR',
                              receipt: 'test_receipt'
                            })
                          });
                          const data = await response.json();
                          if (data.id) {
                            toast.success('Razorpay connection successful! Order ID: ' + data.id, { id: loadingToast });
                          } else {
                            throw new Error(data.error || 'Failed to create test order');
                          }
                        } catch (error: any) {
                          console.error('Razorpay Test Error:', error);
                          toast.error('Razorpay Test Failed: ' + error.message, { id: loadingToast });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors w-fit"
                    >
                      <Send className="w-3 h-3" />
                      Test Razorpay Connection
                    </button>
                  </div>

                  {/* Zoho Mail Configuration */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      Zoho Mail Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Zoho Email</label>
                        <input 
                          type="email" 
                          value={settings.zohoEmail} 
                          onChange={e => setSettings({...settings, zohoEmail: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="e.g. info@yourdomain.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">App Password</label>
                        <input 
                          type="password" 
                          value={settings.zohoPassword} 
                          onChange={e => setSettings({...settings, zohoPassword: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="Zoho App-Specific Password"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Use an App-Specific Password from Zoho Mail security settings for integration.</p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!settings.zohoEmail || !settings.zohoPassword) {
                          toast.error('Please enter Zoho Email and Password first');
                          return;
                        }
                        const loadingToast = toast.loading('Saving settings and sending test email...');
                        try {
                          // Save settings first so the server has the latest credentials
                          await updateSettings(settings);
                          
                          const response = await fetch('/api/test-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              to: user?.email || settings.contactEmail || settings.zohoEmail,
                              type: 'test',
                              data: {
                                userName: user?.displayName || 'Admin'
                              }
                            })
                          });
                          const data = await response.json();
                          if (data.success) {
                            toast.success('Test email sent successfully!', { id: loadingToast });
                          } else {
                            throw new Error(data.error || 'Failed to send test email');
                          }
                        } catch (error: any) {
                          console.error('Test Email Error:', error);
                          toast.error('Email Test Failed: ' + error.message, { id: loadingToast });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors w-fit"
                    >
                      <Send className="w-3 h-3" />
                      Test Email Configuration
                    </button>
                  </div>

                  {/* Shiprocket Configuration */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      Shiprocket Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shiprocket Email</label>
                        <input 
                          type="email" 
                          value={settings.shiprocketEmail} 
                          onChange={e => setSettings({...settings, shiprocketEmail: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="e.g. info@yourdomain.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shiprocket Password</label>
                        <input 
                          type="password" 
                          value={settings.shiprocketPassword} 
                          onChange={e => setSettings({...settings, shiprocketPassword: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="Shiprocket Password"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Platform Fee & Shipping Charge Configuration */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Platform & Shipping Fees
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Platform Fee (₹)</label>
                        <input 
                          type="number" 
                          value={settings.platformFee || 0} 
                          onChange={e => setSettings({...settings, platformFee: Number(e.target.value)})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shipping Charge (₹)</label>
                        <input 
                          type="number" 
                          value={settings.shippingCharge || 0} 
                          onChange={e => setSettings({...settings, shippingCharge: Number(e.target.value)})} 
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gemini AI Configuration */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Gemini AI Configuration
                    </h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gemini API Key</label>
                      <input 
                        type="password" 
                        value={settings.geminiApiKey || ''} 
                        onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} 
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm" 
                        placeholder="Enter your Gemini API Key"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">Used for AI-powered product descriptions and technical specifications extraction.</p>
                    </div>
                  </div>

                  {/* Google Drive Backup Configuration */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-600" />
                        Google Drive Automated Backups
                      </h3>
                      <button 
                        type="button"
                        onClick={() => setSettings({...settings, googleDriveConfig: { ...settings.googleDriveConfig, enabled: !settings.googleDriveConfig?.enabled } as any})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.googleDriveConfig?.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.googleDriveConfig?.enabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    
                    {settings.googleDriveConfig?.enabled && (
                      <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Client ID</label>
                            <input 
                              type="text" 
                              value={settings.googleDriveConfig?.clientId || ''} 
                              onChange={e => setSettings({...settings, googleDriveConfig: { ...settings.googleDriveConfig, clientId: e.target.value } as any})} 
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Client Secret</label>
                            <input 
                              type="password" 
                              value={settings.googleDriveConfig?.clientSecret || ''} 
                              onChange={e => setSettings({...settings, googleDriveConfig: { ...settings.googleDriveConfig, clientSecret: e.target.value } as any})} 
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Refresh Token</label>
                          <input 
                            type="password" 
                            value={settings.googleDriveConfig?.refreshToken || ''} 
                            onChange={e => setSettings({...settings, googleDriveConfig: { ...settings.googleDriveConfig, refreshToken: e.target.value } as any})} 
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm" 
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Folder ID</label>
                            <input 
                              type="text" 
                              value={settings.googleDriveConfig?.folderId || ''} 
                              onChange={e => setSettings({...settings, googleDriveConfig: { ...settings.googleDriveConfig, folderId: e.target.value } as any})} 
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Backup Frequency</label>
                            <select 
                              value={settings.googleDriveConfig?.frequency || 'daily'} 
                              onChange={e => setSettings({...settings, googleDriveConfig: { ...settings.googleDriveConfig, frequency: e.target.value as any } as any})} 
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Maintenance Mode</h4>
                        <p className="text-xs text-slate-500">When enabled, customers will see a maintenance page.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save All Changes
                    </button>
                  </div>
                </form>

                {/* Danger Zone */}
                <div className="mt-12 pt-12 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-6 text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Danger Zone</h2>
                  </div>
                  <div className="bg-red-50 rounded-3xl p-6 md:p-8 border border-red-100">
                    <h3 className="text-lg font-bold text-red-900 mb-2">Delete All Store Data</h3>
                    <p className="text-red-700 text-sm mb-6">
                      This will permanently delete all products, orders, blogs, coupons, and policies. 
                      This action is irreversible. Please download a backup before proceeding.
                    </p>
                    
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-xs font-bold text-red-900 uppercase tracking-widest mb-2">
                          Type "delete" to confirm
                        </label>
                        <input 
                          type="text" 
                          value={deleteVerification}
                          onChange={(e) => setDeleteVerification(e.target.value)}
                          placeholder="Type delete here..."
                          className="w-full px-4 py-3 rounded-xl bg-white border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-600/50 text-red-900 font-bold"
                        />
                      </div>
                      <button
                        onClick={handleDeleteAllData}
                        disabled={isDeletingAll || deleteVerification.trim().toLowerCase() !== 'delete'}
                        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:grayscale"
                      >
                        {isDeletingAll ? 'Wiping Data...' : (
                          <>
                            <Trash2 className="w-5 h-5" />
                            Wipe All Store Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'policies' && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Legal Policies</h2>
                  <p className="text-sm text-slate-500">Manage your store's legal documents and policies.</p>
                </div>
                <button 
                  onClick={() => { setEditingPolicy(null); setIsPolicyModalOpen(true); }}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-5 h-5" />
                  Add New Policy
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {policies.map(policy => (
                  <div key={policy.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingPolicy(policy); setIsPolicyModalOpen(true); }}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: policy.id, type: 'policy' })}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{policy.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mb-4">{policy.id}</p>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-6">{policy.content}</p>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Updated: {policy.updatedAt ? new Date(policy.updatedAt.toMillis()).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))}
                {policies.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No policies found. Create your first one!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="mt-8">
              <ReviewsManagement />
            </div>
          )}

          {activeTab === 'uiux' && (
            <div className="mt-8 space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">UI/UX Customization</h2>
                  <p className="text-sm text-slate-500">Manage your website's global theme settings and visual appearance.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleUpdateUISettings(settings.ui)}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Save className="w-5 h-5" />
                    Save Global Theme
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Colors */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-blue-600" />
                    Theme Colors
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={settings.ui.primaryColor}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, primaryColor: e.target.value}})}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input 
                          type="text" 
                          value={settings.ui.primaryColor}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, primaryColor: e.target.value}})}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secondary Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={settings.ui.secondaryColor}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, secondaryColor: e.target.value}})}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input 
                          type="text" 
                          value={settings.ui.secondaryColor}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, secondaryColor: e.target.value}})}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Background Color</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={settings.ui.backgroundColor}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, backgroundColor: e.target.value}})}
                          className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        />
                        <input 
                          type="text" 
                          value={settings.ui.backgroundColor}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, backgroundColor: e.target.value}})}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Typography & Layout */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Typography & Sizing
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Heading Font</label>
                        <select 
                          value={settings.ui.headingFont}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, headingFont: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Poppins">Poppins</option>
                          <option value="Playfair Display">Playfair Display</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Body Font</label>
                        <select 
                          value={settings.ui.bodyFont}
                          onChange={(e) => setSettings({...settings, ui: {...settings.ui, bodyFont: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Lato">Lato</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Border Radius ({settings.ui.borderRadius}px)</label>
                      <input 
                        type="range" 
                        min="0" max="32" 
                        value={settings.ui.borderRadius}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, borderRadius: Number(e.target.value)}})}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Card Padding ({settings.ui.cardPadding}px)</label>
                      <input 
                        type="range" 
                        min="8" max="48" step="4"
                        value={settings.ui.cardPadding}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, cardPadding: Number(e.target.value)}})}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Animations */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Animations
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Global Animation Speed</label>
                      <div className="flex gap-3">
                        {['slow', 'normal', 'fast'].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setSettings({...settings, ui: {...settings.ui, animationSpeed: speed as any}})}
                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold capitalize border transition-all ${
                              settings.ui.animationSpeed === speed 
                                ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {speed}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layout Toggles */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                    Layout Visibility
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: 'showTrendingNow', label: 'Trending Section' },
                      { key: 'showFlashDeals', label: 'Flash Deals Section' },
                      { key: 'showCategories', label: 'Categories Section' },
                      { key: 'showBlog', label: 'Blog Section' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-medium text-sm text-slate-700">{label}</span>
                        <button 
                          onClick={() => setSettings({...settings, ui: {...settings.ui, [key]: !(settings.ui as any)[key]}})}
                          className={`w-10 h-5 rounded-full transition-colors relative ${
                            (settings.ui as any)[key] ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                            (settings.ui as any)[key] ? 'left-5.5' : 'left-0.5'
                          }`} style={{ left: (settings.ui as any)[key] ? '22px' : '2px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Layout Controls */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-blue-600" />
                    Advanced Layout Controls
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desktop Menu Design</label>
                      <select 
                        value={settings.ui.desktopMenuDesign || 'top'}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, desktopMenuDesign: e.target.value as any}})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="top">Top Navigation Bar</option>
                        <option value="sidebar">Sidebar Menu</option>
                        <option value="minimal">Minimal (Logo + Icons)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Menu Design</label>
                      <select 
                        value={settings.ui.mobileMenuDesign || 'bottom'}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, mobileMenuDesign: e.target.value as any}})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="bottom">Bottom Tab Bar</option>
                        <option value="hamburger">Hamburger Menu (Top)</option>
                        <option value="floating">Floating Action Button</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Container Width</label>
                      <select 
                        value={settings.ui.containerWidth || 'normal'}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, containerWidth: e.target.value as any}})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="narrow">Narrow (Max 1024px)</option>
                        <option value="normal">Normal (Max 1280px)</option>
                        <option value="wide">Wide (Max 1536px)</option>
                        <option value="full">Full Width (100%)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Button Style</label>
                      <select 
                        value={settings.ui.buttonStyle || 'solid'}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, buttonStyle: e.target.value as any}})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="solid">Solid Colors</option>
                        <option value="outline">Outline / Bordered</option>
                        <option value="ghost">Ghost / Transparent</option>
                        <option value="soft">Soft / Tinted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Shadow Intensity</label>
                      <select 
                        value={settings.ui.shadowIntensity || 'medium'}
                        onChange={(e) => setSettings({...settings, ui: {...settings.ui, shadowIntensity: e.target.value as any}})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="none">No Shadows (Flat Design)</option>
                        <option value="light">Light Shadows</option>
                        <option value="medium">Medium Shadows</option>
                        <option value="heavy">Heavy Shadows (Neumorphic)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* History & Backups */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-5 h-5 text-orange-600" />
                      Theme History & Backups
                    </h3>
                    <button 
                      onClick={handleSaveUIHistory}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save Current as Snapshot
                    </button>
                  </div>
                  
                  {uiHistory.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uiHistory.map(history => (
                        <div key={history.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{history.name}</h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {history.createdAt ? new Date(history.createdAt.toMillis()).toLocaleString() : 'Just now'}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: history.settings.primaryColor }} />
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: history.settings.secondaryColor }} />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-auto pt-2 border-t border-slate-200">
                            <button 
                              onClick={() => handleRestoreUIHistory(history)}
                              className="flex-1 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                            >
                              Restore
                            </button>
                            <button 
                              onClick={() => handleDeleteUIHistory(history.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                      No theme snapshots saved yet. Save your current theme to create a backup.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <ProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        product={editingProduct}
        onSaved={fetchData}
      />
      
      <BlogModal 
        isOpen={isBlogModalOpen} 
        onClose={() => setIsBlogModalOpen(false)}
        post={editingBlog}
        onSaved={fetchData}
      />

      <CouponModal 
        isOpen={isCouponModalOpen} 
        onClose={() => setIsCouponModalOpen(false)}
        coupon={editingCoupon}
        onSaved={fetchData}
      />

      <PolicyModal 
        isOpen={isPolicyModalOpen} 
        onClose={() => setIsPolicyModalOpen(false)}
        policy={editingPolicy}
        onSuccess={fetchData}
      />

      <OrderDetailsModal
        isOpen={isOrderDetailsOpen}
        onClose={() => setIsOrderDetailsOpen(false)}
        order={viewingOrder}
        products={products}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
            <p className="text-slate-500 mb-6">Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.</p>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-left">
                Type "delete" to confirm
              </label>
              <input 
                type="text" 
                value={deleteVerification}
                onChange={(e) => setDeleteVerification(e.target.value)}
                placeholder="Type delete..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600/50 text-sm font-bold"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setDeleteConfirm(null); setDeleteVerification(''); }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={deleteVerification.toLowerCase() !== 'delete'}
                onClick={() => {
                  if (deleteConfirm.type === 'product') handleDeleteProduct(deleteConfirm.id);
                  else if (deleteConfirm.type === 'blog') handleDeleteBlog(deleteConfirm.id);
                  else if (deleteConfirm.type === 'coupon') handleDeleteCoupon(deleteConfirm.id);
                  else if (deleteConfirm.type === 'order') handleDeleteOrder(deleteConfirm.id);
                  else if (deleteConfirm.type === 'user') handleDeleteUser(deleteConfirm.id);
                  else if (deleteConfirm.type === 'policy') handleDeletePolicy(deleteConfirm.id);
                  setDeleteVerification('');
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:grayscale"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[201] p-8 border border-slate-100"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${confirmDialog.isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={`flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-lg ${confirmDialog.isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                >
                  {confirmDialog.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Prompt Dialog */}
      <AnimatePresence>
        {promptDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPromptDialog(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[201] p-8 border border-slate-100"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">{promptDialog.title}</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">{promptDialog.message}</p>
              <input
                autoFocus
                type="text"
                placeholder={promptDialog.placeholder}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50 mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPromptDialog(null);
                    setPromptValue('');
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    promptDialog.onConfirm(promptValue);
                    setPromptDialog(null);
                    setPromptValue('');
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
