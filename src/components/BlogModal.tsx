import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { BlogPost, blogService } from '../services/db';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: BlogPost | null;
  onSaved: () => void;
}

export default function BlogModal({ isOpen, onClose, post, onSaved }: BlogModalProps) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    content: '',
    imageUrl: '',
    author: profile?.email || user?.email || 'Admin'
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (post) {
      setFormData(post);
    } else {
      setFormData({
        title: '',
        content: '',
        imageUrl: '',
        author: profile?.email || user?.email || 'Admin'
      });
    }
  }, [post, isOpen, profile, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `blogs/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, imageUrl: url });
      toast.success('Image uploaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (post?.id) {
        await blogService.updatePost(post.id, formData);
        toast.success('Post updated');
      } else {
        await blogService.addPost(formData as any);
        toast.success('Post added');
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl z-[101] overflow-hidden border border-white/40 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline font-bold text-slate-900">
                  {post ? 'Edit Post' : 'Add New Post'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Content</label>
                  <textarea required rows={6} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/50 resize-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Cover Image</label>
                  <div className="flex items-center gap-4">
                    {formData.imageUrl && (
                      <img src={formData.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {uploadingImage ? (
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-slate-400" />
                      )}
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploadingImage}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Post'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
