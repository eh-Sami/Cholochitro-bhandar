import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ThumbsUp, ThumbsDown, Plus, User } from 'lucide-react';
import '../Blogs.css';

export default function BlogsPage() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest'); // 'newest' or 'popular'
  
  // --- MOCK AUTH FOR TESTING ---
  // Since you haven't built login yet, you can toggle this to test features!
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const currentUser = isLoggedIn ? { userId: 1, name: "Test User" } : null;

  useEffect(() => {
    fetchBlogs();
  }, [page, sort]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/blogs?page=${page}&limit=10&sort=${sort}`);
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
  };

  const handleVote = async (e, blogId, type) => {
    e.preventDefault(); // Prevent navigating to blog detail page
    if (!currentUser) {
      alert("You must be logged in to vote!");
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3000/blogs/${blogId}/${type}`, {
        method: 'POST'
      });
      const json = await response.json();
      if (json.success) {
        // Update vote count locally without refreshing entire page
        setBlogs(prev => prev.map(blog => {
          if (blog.blogid === blogId) {
            return {
              ...blog,
              upvotecount: json.data.upvotecount,
              downvotecount: json.data.downvotecount
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
  const renderContentWithMentions = (text) => {
    if (!text) return null;
    const regex = /@\[(.*?)\]\((media|person|list):(\d+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const name = match[1];
      const type = match[2]; // media, person, list
      const id = match[3];

      let linkPath = '/';
      if (type === 'media') linkPath = `/movies/${id}`; // Or /tvshows/
      else if (type === 'person') linkPath = `/persons/${id}`;
      else if (type === 'list') linkPath = `/lists/${id}`; // Assuming lists endpoint

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
    if (!currentUser) {
      alert("You must be logged in to create a post!");
      return;
    }
    navigate('/blogs/new');
  };

  return (
    <div className="page blogs-page">
      {/* Dev Tool: Fake Login Toggle */}
      <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f59e0b' }}>
        <strong>🛠️ Dev Tool:</strong>
        <span>Status: <b>{currentUser ? `Logged in as ${currentUser.name}` : "Guest view"}</b></span>
        <button className="btn btn-secondary" onClick={() => setIsLoggedIn(!isLoggedIn)}>
          <User size={16} /> Toggle Login
        </button>
      </div>

      <div className="blogs-header">
        <h1>Community Blogs</h1>
        <div className="blogs-controls">
          <select 
            className="sort-select" 
            value={sort} 
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

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
              {renderContentWithMentions(blog.contentpreview)}
              {(blog.contentpreview?.length || 0) >= 200 && '...'}
            </p>
            
            <div className="blog-actions">
              <button className="action-btn" onClick={(e) => handleVote(e, blog.blogid, 'upvote')}>
                <ThumbsUp /> {blog.upvotecount}
              </button>
              <button className="action-btn" onClick={(e) => handleVote(e, blog.blogid, 'downvote')}>
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
