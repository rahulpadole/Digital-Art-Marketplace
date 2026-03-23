import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import '../index.css';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function UploadArt() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Digital Painting');
  const [price, setPrice] = useState('');
  const [upiId, setUpiId] = useState('');
  const [forSale, setForSale] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Protect route
  if (!currentUser) {
    return <div className="container" style={{marginTop: '4rem', textAlign: 'center'}}>Please log in to upload art.</div>;
  }
  
  if (userRole !== 'artist') {
    return <div className="container" style={{marginTop: '4rem', textAlign: 'center'}}>Only artists can upload artworks. You can update your role in settings (future feature).</div>;
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile || !title) {
      setError('Please provide an image and title');
      return;
    }

    if (forSale && (!price || isNaN(price) || parseFloat(price) <= 0)) {
       setError('Please provide a valid price for items for sale');
       return;
    }

    if (forSale && !upiId.trim()) {
       setError('Please provide a valid UPI ID to receive payments');
       return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload Image to Cloudinary (unsigned upload — no API secret needed)
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'artworks');

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!cloudinaryRes.ok) {
        const errData = await cloudinaryRes.json();
        throw new Error(errData.error?.message || 'Cloudinary upload failed');
      }

      const cloudinaryData = await cloudinaryRes.json();
      const downloadUrl = cloudinaryData.secure_url;

      // 2. Save Data to Firestore
      const artworkData = {
        artistId: currentUser.uid,
        artistName: currentUser.displayName || 'Unknown Artist',
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || 'Unknown Artist',
        title,
        description,
        category,
        price: forSale ? parseFloat(price) : null,
        upiId: forSale ? upiId.trim() : null,
        forSale,
        imageUrl: downloadUrl,
        likesCount: 0,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'artworks'), artworkData);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to upload artwork: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ maxWidth: '800px', marginTop: '3rem' }}>
      <div className="glass animate-slide-up" style={{ padding: '2.5rem' }}>
        <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Upload New Artwork</h2>
        {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
          
          {/* Left Column: Image Upload */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="form-label">Artwork Image</label>
            <div 
              style={{
                border: '2px dashed var(--glass-border)',
                borderRadius: '8px',
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.02)',
                position: 'relative'
              }}
              onClick={() => document.getElementById('imageUpload').click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>Click to select an image</span>
              )}
              <input 
                id="imageUpload"
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Right Column: Details */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input 
                className="form-control" 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Neon Dreams"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-control" 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ background: 'rgba(31, 40, 51, 0.9)' }}
              >
                <option value="Digital Painting">Digital Painting</option>
                <option value="3D Render">3D Render</option>
                <option value="Concept Art">Concept Art</option>
                <option value="Vector Art">Vector Art</option>
                <option value="Pixel Art">Pixel Art</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <input 
                type="checkbox" 
                id="forSale"
                checked={forSale}
                onChange={(e) => setForSale(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="forSale" style={{ cursor: 'pointer', fontWeight: '500' }}>List for Sale</label>
            </div>

            {forSale && (
              <div className="form-group animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Price (₹)</label>
                  <input 
                    className="form-control" 
                    type="number" 
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 500"
                    required={forSale}
                  />
                </div>
                <div>
                  <label className="form-label">Your UPI ID</label>
                  <input 
                    className="form-control" 
                    type="text" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. number@paytm"
                    required={forSale}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    Payments will be transferred directly to this UPI ID.
                  </small>
                </div>
              </div>
            )}

            <div className="form-group" style={{ flexGrow: 1 }}>
              <label className="form-label">Description (Optional)</label>
              <textarea 
                className="form-control" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                style={{ resize: 'vertical' }}
                placeholder="Share the story behind your art..."
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ marginTop: 'auto' }}
            >
              {loading ? 'Publishing...' : 'Publish Artwork'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
