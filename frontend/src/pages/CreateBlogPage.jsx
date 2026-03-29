import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import '../Blogs.css';
import MentionModal from '../components/MentionModal';

export default function CreateBlogPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState([]); // [{ type: 'media', id: 123, name: 'Inception' }]
  const textareaRef = useRef(null);
  
  // Fake login user (same as BlogsPage)
  const currentUser = { userId: 1, name: "Test User" }; 

  const [showMentionModal, setShowMentionModal] = useState(false);

  const insertMention = (item) => {
    // 1. the tag string
    const insertionText = ` @[${item.title}](${item.type}:${item.id}) `;
    
    // 2. insert into textarea at cursor
    const cursorPosition = textareaRef.current?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPosition) + insertionText + content.slice(cursorPosition);
    setContent(newContent);
    
    // 3. update mentions payload array for the backend
    setMentions(prev => {
      // Prevent duplicates in the payload array
      if (!prev.find(m => m.id === item.id && m.type === item.type)) {
        return [...prev, { type: item.type, id: item.id }];
      }
      return prev;
    });

    // close modal
    setShowMentionModal(false);
  };

  // Parses raw text into beautiful UI links for the Live Preview
  const renderLivePreview = (text) => {
    if (!text) return null;
    const regex = /@\[(.*?)\]\((media|person|list):(\d+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const name = match[1];
      parts.push(
        <span key={match.index} className="mention-link" style={{ pointerEvents: 'none' }}>
          {name}
        </span>
      );
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // Convert newlines to breaks
    return parts.map((part, i) => 
      typeof part === 'string' 
        ? <span key={`text-${i}`}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{line}<br/></React.Fragment>)}</span> 
        : part
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert("Please provide both a title and content.");
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          blogTitle: title,
          content: content,
          mentions: mentions
        })
      });
      
      const json = await response.json();
      if (json.success) {
        // Rediect back to blogs feed
        navigate('/blogs');
      } else {
        alert("Error creating blog: " + json.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit block. Is the server running?");
    }
  };

  return (
    <div className="page blogs-page">
      <div className="blogs-header" style={{ marginBottom: '1rem' }}>
        <h1>Create a New Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e6f0' }}>
        <input 
          type="text" 
          placeholder="Blog Title..." 
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', fontSize: '1.5rem', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #d7dbe6', borderRadius: '8px', fontWeight: 'bold' }}
        />
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setShowMentionModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <LinkIcon size={16} /> Add Mention
          </button>
        </div>

        <textarea 
          ref={textareaRef}
          placeholder="Write your thoughts here..." 
          value={content}
          onChange={e => setContent(e.target.value)}
          rows="12"
          style={{ width: '100%', padding: '1rem', border: '1px solid #d7dbe6', borderRadius: '8px', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.6', resize: 'vertical' }}
        />
        
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/blogs')}>Cancel</button>
          <button type="submit" className="btn btn-primary">Publish Post</button>
        </div>
      </form>

      {/* Live Preview Box */}
      {content.trim() && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e6f0' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>✨ Live Preview</h3>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>{title || 'Untitled Blog'}</h2>
          <div style={{ color: '#334155', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {renderLivePreview(content)}
          </div>
        </div>
      )}

      {showMentionModal && (
        <MentionModal 
          onClose={() => setShowMentionModal(false)}
          onSelect={insertMention}
        />
      )}
    </div>
  );
}
