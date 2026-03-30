import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ArtworkCard from '../components/ArtworkCard';

export default function Profile() {
  const { currentUser, userRole } = useAuth();
  const { showToast } = useToast();
  const [artworks, setArtworks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(userRole === 'artist' ? 'artworks' : 'collection'); // 'artworks', 'collection', 'purchases', 'sales'
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        if (activeTab === 'artworks') {
          const q = query(
            collection(db, 'artworks'),
            where('artistId', '==', currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          const arts = [];
          querySnapshot.forEach((doc) => arts.push({ id: doc.id, ...doc.data() }));
          arts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setArtworks(arts);
        } else if (activeTab === 'collection') {
          const q = query(
            collection(db, 'artworks'),
            where('ownerId', '==', currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          const arts = [];
          querySnapshot.forEach((doc) => arts.push({ id: doc.id, ...doc.data() }));
          arts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          setArtworks(arts);
        } else if (activeTab === 'purchases') {
          const q = query(collection(db, 'orders'), where('buyerId', '==', currentUser.uid));
          const snap = await getDocs(q);
          const pur = [];
          snap.forEach(doc => pur.push({ id: doc.id, ...doc.data() }));
          pur.sort((a, b) => (b.purchasedAt?.toMillis?.() || 0) - (a.purchasedAt?.toMillis?.() || 0));
          setOrders(pur);
        } else if (activeTab === 'sales') {
          const q = query(collection(db, 'orders'), where('sellerId', '==', currentUser.uid));
          const snap = await getDocs(q);
          const sal = [];
          snap.forEach(doc => sal.push({ id: doc.id, ...doc.data() }));
          sal.sort((a, b) => (b.purchasedAt?.toMillis?.() || 0) - (a.purchasedAt?.toMillis?.() || 0));
          setOrders(sal);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, activeTab]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this artwork?')) {
      try {
        await deleteDoc(doc(db, 'artworks', id));
        setArtworks(artworks.filter(art => art.id !== id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    
    setEditLoading(true);
    try {
      // Update Firebase Auth Profile
      await updateProfile(currentUser, { displayName: editName.trim() });
      
      // Update Firestore User Document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: editName.trim()
      });
      
      showToast("Profile updated successfully! Refresh to see changes across the app.", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Failed to update profile.", "error");
    }
    setEditLoading(false);
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      showToast("Password reset email sent! Check your inbox.", "success");
    } catch (error) {
      console.error("Error resetting password:", error);
      showToast("Failed to send reset email.", "error");
    }
  };

  const handleConfirmPayment = async (order) => {
    if (!window.confirm(`Verify that you received ₹${order.price} from ${order.buyerName}? This will transfer the artwork ownership.`)) return;
    
    setLoading(true);
    try {
      // 1. Update Order Status
      await updateDoc(doc(db, 'orders', order.id), { status: 'completed' });

      // 2. Update Artwork Ownership & Payment Status
      await updateDoc(doc(db, 'artworks', order.artworkId), {
        sold: true,
        forSale: false,
        ownerId: order.buyerId,
        ownerName: order.buyerName,
        paymentStatus: 'completed',
        pendingBuyerId: null
      });

      // 3. Notify Buyer
      await addDoc(collection(db, 'notifications'), {
        userId: order.buyerId,
        type: 'purchase_confirmed',
        message: `Your payment for "${order.artworkTitle}" has been verified! You now own the artwork.`,
        link: `/artwork/${order.artworkId}`,
        read: false,
        createdAt: serverTimestamp()
      });

      showToast("Payment confirmed! Art ownership transferred.", "success");
      
      // Refresh local orders list
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
    } catch (err) {
      console.error(err);
      showToast("Failed to confirm payment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async (order) => {
    if (!window.confirm(`Reject this payment record from ${order.buyerName}? This will put the artwork back on sale.`)) return;
    
    setLoading(true);
    try {
      // 1. Update Order Status
      await updateDoc(doc(db, 'orders', order.id), { status: 'rejected' });

      // 2. Clear Artwork Pending Status (Put back on sale)
      await updateDoc(doc(db, 'artworks', order.artworkId), {
        paymentStatus: 'none',
        pendingBuyerId: null
      });

      // 3. Notify Buyer
      await addDoc(collection(db, 'notifications'), {
        userId: order.buyerId,
        type: 'purchase_rejected',
        message: `Your payment verification for "${order.artworkTitle}" was rejected by the seller. The artwork is available for buy again.`,
        link: `/artwork/${order.artworkId}`,
        read: false,
        createdAt: serverTimestamp()
      });

      showToast("Payment rejected. Artwork is back on sale.", "info");
      
      // Refresh local orders list
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'rejected' } : o));
    } catch (err) {
      console.error(err);
      showToast("Failed to reject payment", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="container" style={{ marginTop: '4rem', textAlign: 'center' }}>Please log in to view your profile.</div>;
  }

  return (
    <div className="container" style={{ marginTop: '3rem' }}>
      <div className="glass animate-slide-up" style={{ padding: '2rem', marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--bg-color)', fontWeight: 'bold'
        }}>
          {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          {isEditing ? (
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="form-control"
                style={{ padding: '0.4rem', fontSize: '1rem', width: '200px' }}
                autoFocus
              />
              <button disabled={editLoading} type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>Save</button>
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ padding: '0.4rem 1rem' }}>Cancel</button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ margin: 0 }}>{currentUser.displayName || 'User Profile'}</h2>
              <button 
                onClick={() => { setEditName(currentUser.displayName || ''); setIsEditing(true); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
              >
                Edit
              </button>
            </div>
          )}
          
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{currentUser.email}</p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-block', padding: '0.2rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', fontSize: '0.85rem' }}>
              Role: <span style={{ color: userRole === 'artist' ? 'var(--primary-accent)' : 'var(--secondary-accent)' }}>{userRole || 'user'}</span>
            </div>
            <button 
              onClick={handleResetPassword}
              style={{ background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', padding: '0.2rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {userRole === 'artist' && (
          <button 
            onClick={() => setActiveTab('artworks')}
            style={{ 
              padding: '1rem', background: 'none', border: 'none', color: activeTab === 'artworks' ? 'var(--primary-accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'artworks' ? '2px solid var(--primary-accent)' : 'none', cursor: 'pointer', fontWeight: '600'
            }}
          >
            My Creations
          </button>
        )}
        <button 
          onClick={() => setActiveTab('collection')}
          style={{ 
            padding: '1rem', background: 'none', border: 'none', color: activeTab === 'collection' ? 'var(--primary-accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'collection' ? '2px solid var(--primary-accent)' : 'none', cursor: 'pointer', fontWeight: '600'
          }}
        >
          My Collection
        </button>
        <button 
          onClick={() => setActiveTab('purchases')}
          style={{ 
            padding: '1rem', background: 'none', border: 'none', color: activeTab === 'purchases' ? 'var(--primary-accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'purchases' ? '2px solid var(--primary-accent)' : 'none', cursor: 'pointer', fontWeight: '600'
          }}
        >
          Purchases
        </button>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ 
            padding: '1rem', background: 'none', border: 'none', color: activeTab === 'sales' ? 'var(--primary-accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'sales' ? '2px solid var(--primary-accent)' : 'none', cursor: 'pointer', fontWeight: '600'
          }}
        >
          Sales
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--primary-accent)', padding: '3rem' }}>Loading...</div>
      ) : activeTab === 'artworks' || activeTab === 'collection' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          {artworks.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>No artworks found in this tab.</p>
          ) : (
            artworks.map(art => (
              <div key={art.id} style={{ position: 'relative' }}>
                <ArtworkCard artwork={art} />
                {activeTab === 'artworks' && (
                  <button onClick={() => handleDelete(art.id)} className="btn-delete" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>✕</button>
                )}
                {activeTab === 'collection' && (
                  <a 
                    href={art.imageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ 
                      position: 'absolute', bottom: '10px', left: '10px', right: '10px', 
                      padding: '0.4rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)', borderColor: 'var(--primary-accent)'
                    }}
                  >
                    📥 Download High-Res
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="glass" style={{ padding: '0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Artwork</th>
                <th style={{ padding: '1rem' }}>{activeTab === 'purchases' ? 'Seller' : 'Buyer'}</th>
                <th style={{ padding: '1rem' }}>Price</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions yet.</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500' }}>{order.artworkTitle}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {order.id.substring(0,6)}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{activeTab === 'purchases' ? order.sellerName : order.buyerName}</td>
                    <td style={{ padding: '1rem', color: 'var(--primary-accent)', fontWeight: '600' }}>₹{order.price}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ 
                        background: order.status === 'pending' ? 'rgba(237, 143, 3, 0.15)' : 
                                    order.status === 'rejected' ? 'rgba(255, 75, 75, 0.15)' : 'rgba(102, 252, 241, 0.15)',
                        color: order.status === 'pending' ? '#ED8F03' : 
                               order.status === 'rejected' ? 'var(--error)' : 'var(--primary-accent)',
                        border: `1px solid ${order.status === 'pending' ? 'rgba(237, 143, 3, 0.3)' : 
                                              order.status === 'rejected' ? 'rgba(255, 75, 75, 0.3)' : 'rgba(102, 252, 241, 0.3)'}`
                      }}>
                        {order.status === 'pending' ? 'Pending Review' : 
                         order.status === 'rejected' ? 'Rejected' : 'Completed'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {order.status === 'pending' && activeTab === 'sales' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>UTR: <code style={{color: '#fff'}}>{order.utr}</code></span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleConfirmPayment(order)}
                              className="btn-verify"
                              style={{ flex: 1, background: '#27ae60', border: 'none', color: '#fff', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                            >
                              Verify
                            </button>
                            <button 
                              onClick={() => handleRejectPayment(order)}
                              style={{ flex: 1, background: 'var(--error)', border: 'none', color: '#fff', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                          {order.transactionId && <div>TXID: {order.transactionId.substring(0, 12)}...</div>}
                          <div>{order.purchasedAt?.toDate ? order.purchasedAt.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
