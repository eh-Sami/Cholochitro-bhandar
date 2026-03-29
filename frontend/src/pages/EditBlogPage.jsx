import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import MentionModal from '../components/MentionModal';
import '../Blogs.css';

export default function EditBlogPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentInputRef = useRef(null);

  // Fake user (same as other pages)
  const currentUser = { userId: 1, name: "Test User" }; 

  const [showMentionModal, setShowMentionModal] = useState(false);

  useEffect(() => {
    // Fetch existing blog data
    const fetchBlog = async () => {
      try {
        const response = await fetch(`http://localhost:3000/blogs/${id}`);
        const json = await response.json();
        if (json.success) {
          setTitle(json.data.blogtitle);
          setContent(json.data.content);
          // Assuming backend returns mentions array inside blog data or we just rebuild it
          if (json.data.mentions) {
             setMentions(json.data.mentions);
          }
        } else {
          alert('Blog not found!');
          navigate('/blogs');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlog();
  }, [id, navigate]);

  const insertMention = (item) => {
    const mentionTag = ` @[${item.title}](${item.type}:${item.id}) `;
    
    // insert text at cursor position
    const cursorPosition = contentInputRef.current?.selectionStart || content.length;
    const newContent = content.slice(0, cursorPosition) + mentionTag + content.slice(cursorPosition);
    setContent(newContent);

    // update mentions array for the backend payload
    setMentions(prev => {
      // Check if we already have this exact mention type+id
      const exists = prev.find(m => m.id === item.id && m.type === item.type);
      if (!exists) {
        return [...prev, { type: item.type, id: item.id }];
      }
      return prev;
    });

    // close modal
    setShowMentionModal(false);
  };

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
      parts.push(
        <Link key={match.index} to="#" className="mention-link">
          {match[1]}
        </Link>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.map((part, i) => 
      typeof part === 'string' 
        ? <span key={`text-${i}`}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{line}<br/></React.Fragment>)}</span> 
        : part
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("Title and Content are required.");
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.userId,
          blogTitle: title,
          content: content,
          mentions: mentions
        })
      });

      const json = await response.json();
      if (json.success) {
        navigate(`/blogs/${id}`);
      } else {
        alert("Failed to update blog: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating blog.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="page"><p>Loading editor...</p></div>;

  return (
    <div className="page blogs-page">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>Edit Blog Post</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div className="form-group">
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Blog Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your blog a catchy title"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d7dbe6', fontSize: '1rem' }}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold' }}>Content</label>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowMentionModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                disabled={isSubmitting}
              >
                <LinkIcon size={14} /> Add Mention
              </button>
            </div>
            
            <textarea 
              ref={contentInputRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind? You can mention movies, tv shows, people, or lists!"
              rows="12"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d7dbe6', fontSize: '1rem', resize: 'vertical', fontFamily: 'inherit' }}
              disabled={isSubmitting}
            />
            <p style={{ fontSize: '0.8rem', color: '#6a7488', marginTop: '0.5rem' }}>
              Tip: Click "Add Mention" to search and insert a link to a Movie or TV Show.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`/blogs/${id}`)} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !title.trim() || !content.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Updates'}
            </button>
          </div>
        </form>

        {/* Live Preview Container */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e6f0' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>✨ Live Preview</h3>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>{title || 'Untitled Blog'}</h2>
          <div style={{ color: '#334155', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {renderLivePreview(content)}
          </div>
        </div>
      </div>

      {showMentionModal && (
        <MentionModal 
          onClose={() => setShowMentionModal(false)}
          onSelect={insertMention}
        />
      )}
    </div>
  );
}
