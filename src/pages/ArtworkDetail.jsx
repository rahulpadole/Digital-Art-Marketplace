import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import CommentSection from '../components/CommentSection';

export default function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { startConversation } = useChat();
  
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Payment Gateway & Resell State
  const [showPayment, setShowPayment] = useState(false);
  const [cardDetails, setCardDetails] = useState({ utr: '', transactionId: '' });
  const [isPendingReview, setIsPendingReview] = useState(false);
  
  const [showResell, setShowResell] = useState(false);
  const [resellPrice, setResellPrice] = useState('');
  const [ArtworkUpiId, setArtworkUpiId] = useState('');
  const [resellLoading, setResellLoading] = useState(false);

  useEffect(() => {
    const fetchArtwork = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const artDoc = await getDoc(doc(db, 'artworks', id));
        if (artDoc.exists()) {
          setArtwork({ id: artDoc.id, ...artDoc.data() });
          
          // Check if current user has liked this artwork
          if (currentUser) {
            const likeDoc = await getDoc(doc(db, 'artworks', id, 'likes', currentUser.uid));
            setHasLiked(likeDoc.exists());
          }
        }
      } catch (error) {
        console.error("Error fetching artwork:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArtwork();
  }, [id, currentUser]);

  const handleMessageArtist = async () => {
    if (!currentUser) return showToast("Please log in to message the artist", "info");
    if (isOwner) return;
    
    setChatLoading(true);
    const chatId = await startConversation(artwork.artistId, artwork.artistName);
    setChatLoading(false);
    
    if (chatId) {
      navigate(`/messages/${chatId}`);
    } else {
      showToast("Error starting chat", "error");
    }
  };

  const handleLikeToggle = async () => {
    if (!currentUser || likeLoading || !artwork) return;
    if (!currentUser) return showToast("Please log in to like artworks", "info");
    setLikeLoading(true);

    try {
      const likeRef = doc(db, 'artworks', id, 'likes', currentUser.uid);
      const artworkRef = doc(db, 'artworks', id);

      if (hasLiked) {
        await deleteDoc(likeRef);
        await updateDoc(artworkRef, { likesCount: increment(-1) });
        setArtwork((prev) => ({ ...prev, likesCount: Math.max(0, (prev.likesCount || 0) - 1) }));
        setHasLiked(false);
      } else {
        await setDoc(likeRef, { createdAt: new Date() });
        await updateDoc(artworkRef, { likesCount: increment(1) });
        
        // Notification for artist
        if (artwork.artistId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: artwork.artistId,
            type: 'like',
            message: `${currentUser.displayName || 'Someone'} liked your artwork "${artwork.title}"`,
            link: `/artwork/${id}`,
            read: false,
            createdAt: serverTimestamp()
          });
        }

        setArtwork((prev) => ({ ...prev, likesCount: (prev.likesCount || 0) + 1 }));
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      showToast("Failed to update like", "error");
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePurchase = async (e) => {
    e?.preventDefault();
    if (!currentUser) return showToast("Please log in to purchase", "info");
    if (!artwork || isOwner || !artwork.forSale) return;

    const utrRegex = /^\d{12}$/;
    if (!utrRegex.test(cardDetails.utr)) {
      return showToast("Invalid UTR. Please enter exactly 12 numeric digits.", "error");
    }
    if (!cardDetails.transactionId.trim()) {
      return showToast("Please enter a valid Transaction ID", "error");
    }

    setPurchaseLoading(true);
    try {
      // 1. Verify against "Mock Bank Registry" (verified_payments collection)
      // We only query by UTR and TXID to avoid complex indexing errors
      const q = query(
        collection(db, 'verified_payments'),
        where('utr', '==', cardDetails.utr),
        where('transactionId', '==', cardDetails.transactionId.trim())
      );
      
      const querySnapshot = await getDocs(q);
      console.log("Verification Query Result:", querySnapshot.size, "docs found");

      // Simulate bank server validation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (querySnapshot.empty) {
        setPurchaseLoading(false);
        setIsPendingReview(true); // Offer manual review
        return showToast("Transaction not found. You can now 'Submit for Review' if you have already paid.", "error");
      }

      const paymentRecord = querySnapshot.docs[0].data();
      const requiredAmount = parseFloat(artwork.price);
      const paidAmount = parseFloat(paymentRecord.amount);
      const targetUpi = (artwork.upiId || 'test@upi').toLowerCase();
      const actualUpi = (paymentRecord.upiId || '').toLowerCase();

      // Check for price mismatch
      if (Math.abs(paidAmount - requiredAmount) > 0.01) {
        setPurchaseLoading(false);
        return showToast(`Amount mismatch! Payment was for ₹${paidAmount}, but price is ₹${requiredAmount}`, "error");
      }

      // Check for UPI ID mismatch
      if (targetUpi !== actualUpi) {
        setPurchaseLoading(false);
        return showToast(`UPI ID mismatch! This payment was sent to ${actualUpi}`, "error");
      }

      // Create order record
      const previousOwnerId = artwork.ownerId || artwork.artistId;
      const previousOwnerName = artwork.ownerName || artwork.artistName;

      await addDoc(collection(db, 'orders'), {
        artworkId: id,
        artworkTitle: artwork.title,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Buyer',
        sellerId: previousOwnerId,
        sellerName: previousOwnerName,
        price: artwork.price,
        utr: cardDetails.utr,
        transactionId: cardDetails.transactionId.trim(),
        purchasedAt: serverTimestamp()
      });

      // Mark artwork as sold and transfer ownership
      await updateDoc(doc(db, 'artworks', id), { 
        sold: true, 
        forSale: false,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || 'Buyer'
      });
      
      setArtwork(prev => ({ 
        ...prev, 
        sold: true, 
        forSale: false,
        ownerId: currentUser.uid,
        ownerName: currentUser.displayName || 'Buyer' 
      }));

      // Notify the previous owner
      if (previousOwnerId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: previousOwnerId,
          type: 'purchase',
          message: `${currentUser.displayName || 'Someone'} purchased your artwork "${artwork.title}" for ₹${artwork.price}`,
          link: `/artwork/${id}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      showToast("Payment Verified! 🎉 Ownership updated.", "success");
      setShowPayment(false);
      setIsPendingReview(false);
      setCardDetails({ utr: '', transactionId: '' });
    } catch (error) {
      console.error("Error processing purchase:", error);
      if (error.code === 'failed-precondition') {
        showToast("Database Index Required. See browser console for the creation link.", "error");
      } else if (error.code === 'permission-denied') {
        showToast("Payment Registry access denied. Please check Firestore Rules.", "error");
      } else {
        showToast(`Verification error: ${error.message || 'Bank server timeout'}`, "error");
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const submitForReview = async () => {
    if (!currentUser || !artwork) return;
    setPurchaseLoading(true);
    try {
      const previousOwnerId = artwork.ownerId || artwork.artistId;
      const previousOwnerName = artwork.ownerName || artwork.artistName;

      // 1. Create a Pending Order
      await addDoc(collection(db, 'orders'), {
        artworkId: id,
        artworkTitle: artwork.title,
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Buyer',
        sellerId: previousOwnerId,
        sellerName: previousOwnerName,
        price: artwork.price,
        utr: cardDetails.utr,
        transactionId: cardDetails.transactionId.trim(),
        status: 'pending',
        purchasedAt: serverTimestamp()
      });

      // 2. Mark artwork as pending payment
      await updateDoc(doc(db, 'artworks', id), {
        paymentStatus: 'pending_review',
        pendingBuyerId: currentUser.uid
      });

      // 3. Notify Seller
      await addDoc(collection(db, 'notifications'), {
        userId: previousOwnerId,
        type: 'payment_review',
        message: `${currentUser.displayName || 'Someone'} submitted a UPI payment (UTR: ${cardDetails.utr}) for "${artwork.title}". Please verify.`,
        link: `/profile`,
        read: false,
        createdAt: serverTimestamp()
      });

      showToast("Request submitted! The seller will verify and transfer ownership soon.", "success");
      setShowPayment(false);
      setIsPendingReview(false);
      setCardDetails({ utr: '', transactionId: '' });
    } catch (err) {
      console.error(err);
      showToast("Failed to submit review request", "error");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const simulatePayment = async () => {
    try {
      const mockUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();
      const mockTxid = 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      await addDoc(collection(db, 'verified_payments'), {
        utr: mockUtr,
        transactionId: mockTxid,
        amount: artwork.price,
        upiId: artwork.upiId || 'test@upi',
        timestamp: serverTimestamp()
      });
      
      setCardDetails({ utr: mockUtr, transactionId: mockTxid });
      showToast(`Mock Payment Recorded! UTR: ${mockUtr}`, "success");
    } catch (err) {
      showToast("Failed to simulate payment", "error");
    }
  };

  const handleResell = async (e) => {
    e.preventDefault();
    if (!resellPrice || isNaN(resellPrice) || parseFloat(resellPrice) <= 0) {
      return showToast("Please enter a valid price", "error");
    }
    if (!ArtworkUpiId.trim()) {
      return showToast("Please enter your UPI ID to receive payments", "error");
    }
    
    setResellLoading(true);
    try {
      await updateDoc(doc(db, 'artworks', id), {
        forSale: true,
        sold: false,
        price: parseFloat(resellPrice),
        upiId: ArtworkUpiId.trim()
      });
      setArtwork(prev => ({ ...prev, forSale: true, sold: false, price: parseFloat(resellPrice), upiId: ArtworkUpiId.trim() }));
      showToast("Artwork listed for sale!", "success");
      setShowResell(false);
      setResellPrice('');
      setArtworkUpiId('');
    } catch (error) {
      console.error("Error reselling:", error);
      showToast("Failed to list artwork", "error");
    } finally {
      setResellLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ marginTop: '4rem', textAlign: 'center' }}>Loading Artwork...</div>;
  }

  if (!artwork) {
    return <div className="container" style={{ marginTop: '4rem', textAlign: 'center' }}>Artwork not found.</div>;
  }

  const isOwner = currentUser && (artwork.ownerId === currentUser.uid || (!artwork.ownerId && artwork.artistId === currentUser.uid));

  return (
    <div className="container" style={{ marginTop: '3rem', maxWidth: '1000px' }}>
      <Link to="/explore" style={{ display: 'inline-block', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        ← Back to Explore
      </Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Main Image Section */}
        <div className="glass animate-fade-in" style={{ padding: '1rem', textAlign: 'center', position: 'relative' }}>
          {artwork.sold && (
            <div style={{
              position: 'absolute', top: '20px', right: '20px', background: 'var(--error)',
              color: 'white', padding: '0.5rem 1.5rem', borderRadius: '4px', fontWeight: 'bold',
              transform: 'rotate(5deg)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', zIndex: 5
            }}>
              SOLD
            </div>
          )}
          <img 
            src={artwork.imageUrl} 
            alt={artwork.title} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '70vh', 
              objectFit: 'contain',
              borderRadius: 'var(--border-radius-sm)' 
            }} 
          />
        </div>

        {/* Details and Interactions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '4rem' }}>
          
          <div className="animate-slide-up">
            <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>{artwork.title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              Created by <span style={{ color: 'var(--primary-accent)' }}>{artwork.artistName}</span>
            </p>
            {artwork.ownerId && artwork.ownerId !== artwork.artistId && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Owned by <span style={{ color: '#fff', fontWeight: '500' }}>{artwork.ownerName || 'Collector'}</span>
              </p>
            )}
            
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', marginTop: (!artwork.ownerId || artwork.ownerId === artwork.artistId) ? '1.5rem' : '0' }}>
              {/* Like Button */}
              <button 
                onClick={handleLikeToggle}
                disabled={!currentUser || likeLoading}
                className="btn btn-outline"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.6rem 1.2rem',
                  background: hasLiked ? 'rgba(102, 252, 241, 0.1)' : 'transparent',
                  borderColor: hasLiked ? 'var(--primary-accent)' : 'var(--glass-border)',
                  color: hasLiked ? 'var(--primary-accent)' : 'var(--text-primary)'
                }}
              >
                <span>{hasLiked ? '❤️' : '🤍'}</span> 
                <span>{artwork.likesCount || 0} Likes</span>
              </button>

              {/* Buy Section */}
              {artwork.forSale && !isOwner && !artwork.sold && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>₹{artwork.price}</span>
                  {artwork.paymentStatus === 'pending_review' ? (
                    <div style={{ padding: '0.6rem 1.2rem', background: 'rgba(237, 143, 3, 0.2)', color: '#ED8F03', borderRadius: '8px', fontSize: '1rem', border: '1px solid #ED8F03', fontWeight: '600' }}>
                      ⏳ Payment Pending Verification
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowPayment(true)}
                      className="btn btn-primary"
                      style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}
                    >
                      Buy Now
                    </button>
                  )}
                </div>
              )}

              {/* Message Artist Button */}
              {!isOwner && currentUser && (
                <button 
                  onClick={handleMessageArtist}
                  disabled={chatLoading}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem 1.2rem' }}
                >
                  {chatLoading ? 'Connecting...' : '📧 Message Artist'}
                </button>
              )}

              {artwork.forSale && isOwner && !artwork.sold && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <span className="badge badge-price">Listed for ₹{artwork.price}</span>
                  <span style={{ fontSize: '0.9rem' }}>(You own this)</span>
                </div>
              )}

              {!artwork.forSale && isOwner && (
                <button 
                  onClick={() => setShowResell(true)}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #FFB75E, #ED8F03)' }}
                >
                  🚀 Resell Artwork
                </button>
              )}

              {!artwork.forSale && !artwork.sold && !isOwner && (
                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not currently for sale</span>
              )}
              
              {artwork.sold && !isOwner && !artwork.forSale && (
                <span style={{ color: 'var(--error)', fontStyle: 'italic', fontWeight: 'bold' }}>Sold</span>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Description</h4>
                <div style={{ padding: '0.3rem 1rem', background: 'rgba(69, 162, 158, 0.1)', color: 'var(--primary-accent)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500' }}>
                  {artwork.category}
                </div>
              </div>
              <p style={{ whiteSpace: 'pre-line', fontSize: '1.05rem', lineHeight: '1.7' }}>{artwork.description || 'No description provided.'}</p>
            </div>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CommentSection 
              artworkId={artwork.id} 
              artworkTitle={artwork.title} 
              artistId={artwork.artistId} 
            />
          </div>

        </div>
      </div>

      {/* Mock Payment Gateway Modal */}
      {showPayment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass animate-slide-up" style={{
            background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '24px',
            width: '90%', maxWidth: '400px', position: 'relative', border: '1px solid rgba(102, 252, 241, 0.3)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center'
          }}>
            <button 
              onClick={() => setShowPayment(false)}
              style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
            >×</button>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--primary-accent)' }}>💳 UPI Checkout</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Scan to pay for <strong>{artwork.title}</strong></p>
            <h1 style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '2.5rem' }}>₹{artwork.price}</h1>
            
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img 
                src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(`upi://pay?pa=${artwork.upiId || 'test@upi'}&pn=${artwork.ownerName || artwork.artistName}&am=${artwork.price}&cu=INR`)} 
                alt="UPI QR Code" 
                style={{ width: '150px', height: '150px' }} 
              />
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Or pay to UPI ID:<br/>
              <strong style={{ color: '#fff' }}>{artwork.upiId || 'test@upi'}</strong>
            </p>

            <form onSubmit={handlePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>UTR (12 Digits)</label>
                  <input 
                    type="text" className="form-control" placeholder="3..." required maxLength="12"
                    value={cardDetails.utr} onChange={e => setCardDetails({ ...cardDetails, utr: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Transaction ID</label>
                  <input 
                    type="text" className="form-control" placeholder="TXN..." required
                    value={cardDetails.transactionId} onChange={e => setCardDetails({ ...cardDetails, transactionId: e.target.value })}
                  />
                </div>
              </div>
              
              <button disabled={purchaseLoading} type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1.1rem' }}>
                {purchaseLoading ? 'Verifying with Bank...' : 'Confirm Ownership Transfer'}
              </button>
            </form>

            {isPendingReview && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(102, 252, 241, 0.1)', borderRadius: '12px', border: '1px solid var(--primary-accent)' }}>
                <p style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.8rem' }}>
                  If you used a real UPI app and it's not and it's not matching our mock records, you can submit it for manual review.
                </p>
                <button 
                  onClick={submitForReview} 
                  disabled={purchaseLoading}
                  className="btn" 
                  style={{ width: '100%', background: '#ed8f03', color: '#000', fontWeight: 'bold' }}
                >
                  {purchaseLoading ? 'Submitting...' : 'Submit for Seller Review'}
                </button>
              </div>
            )}

            <button 
              onClick={simulatePayment}
              disabled={purchaseLoading}
              style={{ background: 'none', border: '1px dashed #ed8f03', color: '#ed8f03', padding: '0.5rem', marginTop: '1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', display: isPendingReview ? 'none' : 'inline-block' }}
            >
              🛠️ DEV: Simulate Real UPI Transaction
            </button>
          </div>
        </div>
      )}

      {/* Resell Modal */}
      {showResell && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass animate-slide-up" style={{
            background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '24px',
            width: '90%', maxWidth: '400px', position: 'relative'
          }}>
            <button 
              onClick={() => setShowResell(false)}
              style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
            >×</button>
            <h2 style={{ marginBottom: '1rem', color: '#ED8F03' }}>List for Resale</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Set a new price for <strong>{artwork.title}</strong>. It will be immediately available on the marketplace.</p>
            
            <form onSubmit={handleResell} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>New Price (₹)</label>
                <input 
                  type="number" step="1" className="form-control" placeholder="0" required
                  value={resellPrice} onChange={e => setResellPrice(e.target.value)}
                  style={{ fontSize: '1.5rem', padding: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Receiving UPI ID</label>
                <input 
                  type="text" className="form-control" placeholder="yourname@bank" required
                  value={ArtworkUpiId} onChange={e => setArtworkUpiId(e.target.value)}
                />
              </div>
              <button disabled={resellLoading} type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #FFB75E, #ED8F03)', padding: '1rem', fontSize: '1.1rem' }}>
                {resellLoading ? 'Listing...' : 'Confirm Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
