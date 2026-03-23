import React from 'react';
import { Link } from 'react-router-dom';
import './ArtworkCard.css';

export default function ArtworkCard({ artwork }) {
  // artwork: id, title, artistName, imageUrl, likesCount
  return (
    <Link to={`/artwork/${artwork.id}`} className="artwork-card glass animate-slide-up">
      <div className="card-image-wrapper">
        <img 
          src={artwork.imageUrl} 
          alt={artwork.title} 
          loading="lazy" 
          className="card-image" 
        />
        <div className="card-overlay">
          <div className="card-info">
            <h3 className="card-title" style={{ marginBottom: '0.2rem' }}>{artwork.title}</h3>
            <p className="card-artist" style={{ marginBottom: '0.2rem' }}>by {artwork.artistName}</p>
            {artwork.ownerId && artwork.ownerId !== artwork.artistId && (
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                Owned by <span style={{ color: '#fff', fontWeight: '500' }}>{artwork.ownerName || 'Collector'}</span>
              </p>
            )}
          </div>
          <div className="card-stats" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            {artwork.forSale && (
              <span className="badge badge-price">${artwork.price}</span>
            )}
            <span>❤️ {artwork.likesCount || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
