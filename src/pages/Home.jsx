import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import ArtworkCard from '../components/ArtworkCard';
import { Link } from 'react-router-dom';

const CATEGORIES = ['All', 'Digital Painting', '3D Render', 'Concept Art', 'Vector Art', 'Pixel Art'];

export default function Home() {
  const [artworks, setArtworks] = useState([]);
  const [trendingArtists, setTrendingArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        // Fetch top artworks by likes
        const q = query(
          collection(db, 'artworks'), 
          orderBy('likesCount', 'desc'),
          limit(12)
        );
        const querySnapshot = await getDocs(q);
        const arts = [];
        querySnapshot.forEach((doc) => {
          arts.push({ id: doc.id, ...doc.data() });
        });
        setArtworks(arts);

        // Derive trending artists from most liked artworks
        const artistsMap = new Map();
        arts.forEach(art => {
          if (!artistsMap.has(art.artistId)) {
            artistsMap.set(art.artistId, {
              id: art.artistId,
              name: art.artistName,
              likes: art.likesCount || 0,
              artworks: 1
            });
          } else {
            const artist = artistsMap.get(art.artistId);
            artist.likes += (art.likesCount || 0);
            artist.artworks += 1;
          }
        });
        
        const topArtists = Array.from(artistsMap.values())
          .sort((a, b) => b.likes - a.likes)
          .slice(0, 4);
          
        setTrendingArtists(topArtists);

      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const filteredArtworks = activeCategory === 'All' 
    ? artworks 
    : artworks.filter(art => art.category === activeCategory);

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        padding: '6rem 1.5rem',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, transparent, rgba(31, 40, 51, 0.4))',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div className="container animate-slide-up">
          <h1 style={{ fontSize: '4rem', marginBottom: '1rem', lineHeight: '1.1' }}>
            Discover, Collect & Sell <br/>
            <span style={{ color: 'var(--primary-accent)' }}>Extraordinary Digital Art</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Join the premier platform for artists and collectors. Explore trending creations and connect directly with creators.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/explore" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.8rem 2rem' }}>
              Explore Marketplace
            </Link>
            <Link to="/upload" className="btn btn-outline" style={{ fontSize: '1.1rem', padding: '0.8rem 2rem' }}>
              Sell Your Art
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '4rem', marginBottom: '6rem' }}>
        
        {/* Trending Artists Section */}
        {!loading && trendingArtists.length > 0 && (
          <div style={{ marginBottom: '4rem' }} className="animate-fade-in">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              🔥 Trending Artists
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {trendingArtists.map(artist => (
                <div key={artist.id} className="glass" style={{ padding: '1.5rem', textAlign: 'center', transition: 'all var(--transition-normal)' }}>
                   <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--bg-color)', fontWeight: 'bold', margin: '0 auto 1rem'
                  }}>
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{artist.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{artist.likes} Total Likes</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Artworks Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            ✨ Trending Artworks
          </h2>
          <Link to="/explore" style={{ color: 'var(--primary-accent)', fontWeight: '500' }}>
            View All →
          </Link>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem', WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className="btn"
              style={{
                background: activeCategory === category ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
                color: activeCategory === category ? 'var(--bg-color)' : 'var(--text-primary)',
                border: '1px solid',
                borderColor: activeCategory === category ? 'var(--primary-accent)' : 'var(--glass-border)',
                padding: '0.5rem 1.25rem',
                borderRadius: '30px',
                whiteSpace: 'nowrap',
                fontWeight: '500'
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div style={{ color: 'var(--primary-accent)', fontSize: '1.2rem' }}>Loading Collection...</div>
          </div>
        ) : filteredArtworks.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-md)' }}>
            No artworks found in this category. Be the first to upload one!
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '2rem' 
          }}>
            {filteredArtworks.map(art => (
              <ArtworkCard key={art.id} artwork={art} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
