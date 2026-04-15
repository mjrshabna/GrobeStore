import React, { useState } from 'react';
import { Upload, Download, Star } from 'lucide-react';
import Papa from 'papaparse';
import { reviewService, Review } from '../services/db';
import toast from 'react-hot-toast';

export default function ReviewsManagement() {
  const [loading, setLoading] = useState(false);

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      { productId: 'PRODUCT_ID', userName: 'USER_NAME', rating: 5, comment: 'Great product!' }
    ]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reviews_template.csv';
    a.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const reviews = results.data.map((row: any) => ({
            productId: row.productId,
            userName: row.userName,
            rating: Number(row.rating),
            comment: row.comment
          }));
          await reviewService.bulkAddReviews(reviews);
          toast.success('Reviews uploaded successfully!');
        } catch (error) {
          toast.error('Failed to upload reviews.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-slate-900">Manage Reviews</h2>
        <div className="flex gap-4">
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">
            <Download className="w-4 h-4" /> Download Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 cursor-pointer">
            <Upload className="w-4 h-4" /> Upload Reviews
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
      {loading && <p>Uploading...</p>}
    </div>
  );
}
