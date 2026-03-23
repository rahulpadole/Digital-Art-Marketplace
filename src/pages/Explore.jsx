import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import ArtworkCard from '../components/ArtworkCard';

const CATEGORIES = ['All', 'Digital Painting', '3D Render', 'Concept Art', 'Vector Art', 'Pixel Art'];
const SORTS = ['Newest', 'Oldest', 'Most Liked', 'Price: Low to High', 'Price: High to Low'];

export default function Explore() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('Newest');

  useEffect(() => {
    const fetchAllArtworks = async () => {
      try {
        const q = query(collection(db, 'artworks'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const arts = [];
        querySnapshot.forEach((doc) => {
          arts.push({ id: doc.id, ...doc.data() });
        });
        setArtworks(arts);
      } catch (error) {
        console.error("Error fetching explore data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllArtworks();
  }, []);

  const getFilteredAndSorted = () => {
    let result = [...artworks];

    // Filter by Category
    if (activeCategory !== 'All') {
      result = result.filter(art => art.category === activeCategory);
    }

    // Filter by Search
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(art => 
        art.title.toLowerCase().includes(lowerSearch) || 
        art.artistName.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (activeSort === 'Newest') {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      }
      if (activeSort === 'Oldest') {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateA - dateB;
      }
      if (activeSort === 'Most Liked') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      if (activeSort === 'Price: Low to High') {
        const pA = a.forSale ? (a.price || 0) : Infinity;
        const pB = b.forSale ? (b.price || 0) : Infinity;
        return pA - pB;
      }
      if (activeSort === 'Price: High to Low') {
        const pA = a.forSale ? (a.price || 0) : -1;
        const pB = b.forSale ? (b.price || 0) : -1;
        return pB - pA;
      }
      return 0;
    });

    return result;
  };

  const displayedArtworks = getFilteredAndSorted();

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '6rem' }}>
      <div className="glass animate-fade-in" style={{ padding: '2rem', marginBottom: '3rem' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>Explore Marketplace</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Search */}
          <div>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by title or artist..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ padding: '1rem', fontSize: '1.1rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Categories */}
            <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem', flexGrow: 1 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: activeCategory === cat ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)',
                    color: activeCategory === cat ? 'var(--bg-color)' : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: activeCategory === cat ? 'var(--primary-accent)' : 'var(--glass-border)',
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '220px' }}>
              <label style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Sort:</label>
              <select 
                className="form-control" 
                value={activeSort} 
                onChange={e => setActiveSort(e.target.value)}
                style={{ background: 'rgba(31, 40, 51, 0.9)', padding: '0.5rem 1rem' }}
              >
                {SORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-slide-up">
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <div style={{ color: 'var(--primary-accent)', fontSize: '1.2rem' }}>Searching the gallery...</div>
          </div>
        ) : displayedArtworks.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-md)' }}>
            No artworks match your filters. Try a different search!
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Showing {displayedArtworks.length} {displayedArtworks.length === 1 ? 'result' : 'results'}
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '2rem' 
            }}>
              {displayedArtworks.map(art => (
                <ArtworkCard key={art.id} artwork={art} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
