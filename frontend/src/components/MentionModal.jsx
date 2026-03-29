import React, { useState } from 'react';
import { X, Search, Film, User, List } from 'lucide-react';

export default function MentionModal({ onClose, onSelect }) {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'person' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      let endpoint = '';
      if (activeTab === 'media') endpoint = `http://localhost:3000/search?q=${searchQuery}&limit=5`;
      if (activeTab === 'person') endpoint = `http://localhost:3000/persons/search?q=${searchQuery}&limit=5`;
      if (activeTab === 'list') endpoint = `http://localhost:3000/lists/search?q=${searchQuery}&limit=5`;
      
      const response = await fetch(endpoint);
      const json = await response.json();
      
      if (json.success) {
        // Normalize results so the UI can render them universally
        const normalized = json.data.map(item => {
          if (activeTab === 'media') {
            return {
              type: 'media',
              id: item.mediaid,
              title: item.title,
              subtitle: `${item.releaseyear || ''} • ${item.mediatype || 'Media'}`,
              imageUrl: item.poster ? `https://image.tmdb.org/t/p/w92${item.poster}` : ''
            };
          }
          if (activeTab === 'person') {
            return {
              type: 'person',
              id: item.personid,
              title: item.fullname,
              subtitle: `${item.title_count || 0} Credits`,
              imageUrl: item.picture ? `https://image.tmdb.org/t/p/w92${item.picture}` : ''
            };
          }
          if (activeTab === 'list') {
            return {
              type: 'list',
              id: item.listid,
              title: item.listname,
              subtitle: `Created by ${item.creator}`,
              imageUrl: '' // Lists don't have posters yet
            };
          }
        });
        setSearchResults(normalized);
      }
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
          <h3 style={{ margin: 0, color: '#1f2635' }}>Mention a Tag</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a7488' }}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            type="button" 
            onClick={() => { setActiveTab('media'); setSearchResults([]); setSearchQuery(''); }}
            style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: activeTab === 'media' ? '#eff6ff' : 'transparent', color: activeTab === 'media' ? '#3b82f6' : '#6a7488', fontWeight: activeTab === 'media' ? 'bold' : 'normal' }}
          >
            <Film size={16}/> Media
          </button>
          <button 
            type="button" 
            onClick={() => { setActiveTab('person'); setSearchResults([]); setSearchQuery(''); }}
            style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: activeTab === 'person' ? '#eff6ff' : 'transparent', color: activeTab === 'person' ? '#3b82f6' : '#6a7488', fontWeight: activeTab === 'person' ? 'bold' : 'normal' }}
          >
            <User size={16}/> Person
          </button>
          <button 
            type="button" 
            onClick={() => { setActiveTab('list'); setSearchResults([]); setSearchQuery(''); }}
            style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: activeTab === 'list' ? '#eff6ff' : 'transparent', color: activeTab === 'list' ? '#3b82f6' : '#6a7488', fontWeight: activeTab === 'list' ? 'bold' : 'normal' }}
          >
            <List size={16}/> List
          </button>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
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
              key={item.id} 
              onClick={() => onSelect(item)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', border: '1px solid #edf0f6', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ width: '40px', height: '60px', background: '#eee', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{fontSize: '0.6rem', color: '#888'}}>{item.type}</span>}
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#1f2635' }}>{item.title}</h4>
                <span style={{ fontSize: '0.8rem', color: '#6a7488' }}>{item.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
