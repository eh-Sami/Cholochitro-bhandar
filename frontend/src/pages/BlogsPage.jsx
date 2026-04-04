import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';
import '../Blogs.css';
import { getAuthToken, getStoredAuth } from '../utils/auth';

export default function BlogsPage() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest'); // 'newest' or 'popular'
  const [pageError, setPageError] = useState('');
  
  const { user: currentUser } = getStoredAuth();
  const token = getAuthToken();

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`http://localhost:3000/blogs?page=${page}&limit=10&sort=${sort}`, { headers });
      const json = await response.json();
      if (json.success) {
        setBlogs(json.data);
        setTotalPages(json.pagination.pages);
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sort]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleVote = async (e, blogId, type) => {
    e.preventDefault(); // Prevent navigating to blog detail page
    if (!currentUser || !token) {
      alert("You must be logged in to vote!");
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/blogs/${blogId}/${type}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.success) {
        // Update vote count locally without refreshing entire page
        setBlogs(prev => prev.map(blog => {
          if (blog.blogid === blogId) {
            return {
              ...blog,
              upvotecount: json.data.upvotecount,
              downvotecount: json.data.downvotecount,
              uservote: json.data.uservote ?? null
            };
          }
          return blog;
        }));
      }
    } catch (error) {
      console.error(`Error ${type}ing blog:`, error);
    }
  };

  // Parses raw text to convert @[Name](type:id) into clickable Links
  const renderContentWithMentions = (text, mentions = []) => {
    if (!text) return null;
    const regex = /@\[(.*?)\]\((media|person|list):(\d+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    const mediaMentions = new Map(
      mentions
        .filter((mention) => mention.type === 'media')
        .map((mention) => [String(mention.id), mention])
    );

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const name = match[1];
      const type = match[2]; // media, person, list
      const id = match[3];

      let linkPath = '/';
      if (type === 'media') {
        const mediaType = mediaMentions.get(id)?.mediaType;
        linkPath = mediaType === 'TVSeries' ? `/tvshows/${id}` : `/movies/${id}`;
      } else if (type === 'person') {
        linkPath = `/persons/${id}`;
      } else if (type === 'list') {
        linkPath = `/lists/${id}`;
      }

      parts.push(
        <Link key={match.index} to={linkPath} className="mention-link">
          {name}
        </Link>
      );
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleCreateClick = () => {
    if (!currentUser || !token) {
      setPageError('You must be logged in to create a post.');
      return;
    }
    setPageError('');
    navigate('/blogs/new');
  };

  return (
    <div className="page blogs-page">
      <div className="blogs-header" style={{
          background: 'linear-gradient(135deg, #1f2635, #3b4255)', 
          padding: '3rem', 
          borderRadius: '20px', 
          color: 'white',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          marginBottom: '3rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '3rem', color: 'white', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Community Blogs</h1>
            <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Read, write, and discuss with fellow movie buffs.</p>
          </div>
          <div className="blogs-controls">
            <select 
              className="sleek-dropdown" 
              value={sort} 
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              style={{ padding: '0.8rem 1.5rem', borderRadius: '50px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <option value="newest" style={{ color: "black" }}>Newest First</option>
              <option value="popular" style={{ color: "black" }}>Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {pageError && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 0.9rem',
            borderRadius: '10px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontWeight: 600
          }}
        >
          {pageError}
        </div>
      )}

      {loading && <p>Loading blogs...</p>}

      {!loading && blogs.length === 0 && <p>No blogs right now.</p>}

      <div className="blogs-list">
        {blogs.map(blog => (
          <Link to={`/blogs/${blog.blogid}`} key={blog.blogid} className="blog-card">
            <div className="blog-card-header">
              <div>
                <h2 className="blog-card-title">{blog.blogtitle}</h2>
                <div className="blog-author">By {blog.authorname}</div>
              </div>
              <div className="blog-date">{new Date(blog.postdate).toLocaleDateString()}</div>
            </div>
            
            <p className="blog-preview">
              {renderContentWithMentions(blog.contentpreview, blog.mentions)}
              {(blog.contentpreview?.length || 0) >= 200 && '...'}
            </p>
            
            <div className="blog-actions">
              <button className={`action-btn vote-up ${blog.uservote === 'upvote' ? 'active' : ''}`} onClick={(e) => handleVote(e, blog.blogid, 'upvote')}>
                <ThumbsUp /> {blog.upvotecount}
              </button>
              <button className={`action-btn vote-down ${blog.uservote === 'downvote' ? 'active' : ''}`} onClick={(e) => handleVote(e, blog.blogid, 'downvote')}>
                <ThumbsDown /> {blog.downvotecount}
              </button>
              <button className="action-btn">
                <MessageSquare /> {blog.commentcount || 0} {blog.commentcount == 1 ? 'Comment' : 'Comments'}
              </button>
            </div>
          </Link>
        ))}
      </div>

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <button className="fab" title="Create Post" onClick={handleCreateClick}>
        <Plus size={28} />
      </button>
    </div>
  );
}
