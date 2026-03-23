import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function CommentSection({ artworkId, artworkTitle, artistId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!artworkId) return;

    const q = query(
      collection(db, 'comments'),
      where('artworkId', '==', artworkId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = [];
      snapshot.forEach((doc) => {
        fetchedComments.push({ id: doc.id, ...doc.data() });
      });
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [artworkId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    try {
      await addDoc(collection(db, 'comments'), {
        artworkId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous User',
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });

      // Notification for artist
      if (artistId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: artistId,
          type: 'comment',
          message: `${currentUser.displayName || 'Someone'} commented on "${artworkTitle}"`,
          link: `/artwork/${artworkId}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
    } catch (error) {
      console.error("Error adding comment: ", error);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        Comments ({comments.length})
      </h3>

      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <button type="submit" className="btn btn-outline" disabled={!newComment.trim()}>
            Post
          </button>
        </form>
      ) : (
        <div style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
          Please log in to leave a comment.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {comments.map((comment) => (
          <div key={comment.id} className="glass" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '600', color: 'var(--primary-accent)' }}>{comment.userName}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : 'Just now'}
              </span>
            </div>
            <p style={{ margin: 0 }}>{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
