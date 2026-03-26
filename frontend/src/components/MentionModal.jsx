import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

export default function MentionModal({ onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`http://localhost:3000/search?q=${searchQuery}&limit=5`);
      const json = await response.json();
      if (json.success) setSearchResults(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', width: '500px', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#1f2635' }}>Mention a Movie or TV Show</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a7488' }}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
            style={{ flex: 1, padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid #d7dbe6' }}
          />
          <button type="submit" className="btn btn-primary" disabled={isSearching}>
            <Search size={16} />
          </button>
        </form>

        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isSearching && <p style={{ color: '#6a7488', textAlign: 'center' }}>Searching...</p>}
          {!isSearching && searchResults.length === 0 && searchQuery && <p style={{ color: '#6a7488', textAlign: 'center' }}>No results found.</p>}
          {searchResults.map(item => (
            <div 
              key={item.mediaid} 
              onClick={() => onSelect(item)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', border: '1px solid #edf0f6', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              <img src={item.poster ? `https://image.tmdb.org/t/p/w92${item.poster}` : ''} alt={item.title} style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px', background: '#eee' }} />
              <div>
                <h4 style={{ margin: 0, color: '#1f2635' }}>{item.title}</h4>
                <span style={{ fontSize: '0.8rem', color: '#6a7488' }}>{item.releaseyear} • {item.mediatype}</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#6a7488', textAlign: 'center' }}>
          *Person and List searching requires backend endpoints to be added first.
        </p>
      </div>
    </div>
  );
}
