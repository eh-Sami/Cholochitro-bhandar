import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, MessageSquare, ArrowLeft, Link as LinkIcon, Trash2, MoreVertical, Edit2 } from 'lucide-react';
import MentionModal from '../components/MentionModal';
import '../Blogs.css';
import { getAuthToken, getStoredAuth } from '../utils/auth';

const CommentNode = ({ comment, currentUser, token, handleEntityVote, renderContentWithMentions, blogId, fetchBlogAndComments }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyMentions, setReplyMentions] = useState([]);
  const [showReplyMentionModal, setShowReplyMentionModal] = useState(false);
  const [isReplyingSubmitting, setIsReplyingSubmitting] = useState(false);
  const replyInputRef = React.useRef(null);

  // Edit State
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commenttext);
  const [editMentions, setEditMentions] = useState([]); // Assuming backend needs payload
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [showEditMentionModal, setShowEditMentionModal] = useState(false);
  const editInputRef = React.useRef(null);

  const handleReply = async () => {
    if (!currentUser || !token) {
      alert('Please login to reply.');
      return;
    }

    if (!replyText.trim()) return;
    setIsReplyingSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/blogs/${blogId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          replyToCommentId: comment.commentid,
          commentText: replyText,
          mentions: replyMentions
        })
      });
      const json = await response.json();
      if (json.success) {
        setIsReplying(false);
        setReplyText('');
        setReplyMentions([]);
        fetchBlogAndComments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsReplyingSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!currentUser || !token) {
      alert('Please login to edit a comment.');
      return;
    }

    if (!editText.trim()) return;
    setIsEditSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/comments/${comment.commentid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          commentText: editText,
          mentions: editMentions
        })
      });
      const json = await response.json();
      if (json.success) {
        setIsEditing(false);
        fetchBlogAndComments();
      } else {
        alert("Failed to edit: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error editing");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!currentUser || !token) {
      alert('Please login to delete a comment.');
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const response = await fetch(`http://localhost:3000/comments/${comment.commentid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.success) {
        fetchBlogAndComments(); // Reload the whole tree to drop the comment safely
      } else {
        alert("Failed to delete comment: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting comment");
    }
  };

  return (
    <div className="comment-node-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid #edf0f6', borderRadius: '8px', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div>
            <strong style={{ color: '#1f2635' }}>{comment.commentername}</strong>
            <span style={{ fontSize: '0.8rem', color: '#8a94a6', marginLeft: '0.5rem' }}>
              {new Date(comment.postdate).toLocaleString()}
              {comment.editedat && comment.editedat !== comment.postdate && <span style={{ fontStyle: 'italic', marginLeft: '0.5rem' }}>(edited)</span>}
            </span>
          </div>
          {currentUser && Number(currentUser.userId) === Number(comment.userid) && (
             <div style={{ position: 'relative' }}>
               <button className="btn btn-ghost" style={{ padding: '0.2rem', color: '#6a7488' }} onClick={() => setShowMenu(!showMenu)} title="Options">
                 <MoreVertical size={16} />
               </button>
               {showMenu && (
                 <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #edf0f6', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '120px' }}>
                   <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', marginBottom: '0.2rem', padding: '0.4rem' }} onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                     <Edit2 size={14} /> Edit
                   </button>
                   <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', color: '#ef4444', padding: '0.4rem' }} onClick={() => { setShowMenu(false); handleDeleteComment(); }}>
                     <Trash2 size={14} /> Delete
                   </button>
                 </div>
               )}
             </div>
          )}
        </div>
        
        {isEditing ? (
          <div style={{ marginBottom: '1rem' }}>
            <textarea
               ref={editInputRef}
               value={editText}
               onChange={e => setEditText(e.target.value)}
               disabled={isEditSubmitting}
               rows="3"
               style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d7dbe6', resize: 'vertical' }}
             />
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEditMentionModal(true)}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <LinkIcon size={12} /> Mention
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} disabled={isEditSubmitting || !editText.trim()} onClick={handleEditSubmit}>
                    Save
                  </button>
                </div>
             </div>

             {showEditMentionModal && (
               <MentionModal 
                 onClose={() => setShowEditMentionModal(false)}
                 onSelect={(item) => {
                   const text = ` @[${item.title}](${item.type}:${item.id}) `;
                   const cur = editInputRef.current?.selectionStart || editText.length;
                   setEditText(editText.slice(0, cur) + text + editText.slice(cur));
                   setEditMentions(p => p.find(m => m.id === item.id && m.type === item.type) ? p : [...p, {type: item.type, id: item.id}]);
                   setShowEditMentionModal(false);
                 }}
               />
             )}
          </div>
        ) : (
          <div style={{ color: '#4a566e', marginBottom: '1rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {renderContentWithMentions(comment.commenttext, comment.mentions)}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
          <button className={`action-btn vote-up ${comment.uservote === 'upvote' ? 'active' : ''}`} onClick={() => handleEntityVote(comment.commentid, 'upvote', true)} style={{ padding: '0.2rem 0.5rem' }}>
            <ThumbsUp size={14} /> {comment.upvotecount}
          </button>
          <button className={`action-btn vote-down ${comment.uservote === 'downvote' ? 'active' : ''}`} onClick={() => handleEntityVote(comment.commentid, 'downvote', true)} style={{ padding: '0.2rem 0.5rem' }}>
            <ThumbsDown size={14} /> {comment.downvotecount}
          </button>
          <button className="action-btn" style={{ padding: '0.2rem 0.5rem', marginLeft: 'auto' }} onClick={() => {
            if (!currentUser) return alert("Log in to reply!");
            setIsReplying(!isReplying);
          }}>
            Reply
          </button>
        </div>
      </div>

      {isReplying && (
        <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #edf0f6' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#6a7488' }}>Replying to {comment.commentername}...</span>
              <button type="button" className="btn btn-secondary" onClick={() => setShowReplyMentionModal(true)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <LinkIcon size={12} /> Mention
              </button>
           </div>
           
           <textarea
             ref={replyInputRef}
             value={replyText}
             onChange={e => setReplyText(e.target.value)}
             disabled={isReplyingSubmitting}
             rows="2"
             style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d7dbe6', resize: 'vertical' }}
           />
           
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', gap: '0.5rem' }}>
              <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setIsReplying(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} disabled={isReplyingSubmitting || !replyText.trim()} onClick={handleReply}>
                Reply
              </button>
           </div>

           {showReplyMentionModal && (
             <MentionModal 
               onClose={() => setShowReplyMentionModal(false)}
               onSelect={(item) => {
                 const text = ` @[${item.title}](${item.type}:${item.id}) `;
                 const cur = replyInputRef.current?.selectionStart || replyText.length;
                 setReplyText(replyText.slice(0, cur) + text + replyText.slice(cur));
                 setReplyMentions(p => p.find(m => m.id === item.id && m.type === item.type) ? p : [...p, {type: item.type, id: item.id}]);
                 setShowReplyMentionModal(false);
               }}
             />
           )}
        </div>
      )}

      {comment.children.length > 0 && (
        <div className="comment-thread">
          {comment.children.map(child => (
            <CommentNode 
              key={child.commentid} 
              comment={child} 
              currentUser={currentUser}
              token={token}
              handleEntityVote={handleEntityVote}
              renderContentWithMentions={renderContentWithMentions}
              blogId={blogId}
              fetchBlogAndComments={fetchBlogAndComments}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function BlogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlogMenu, setShowBlogMenu] = useState(false);
  const { user: currentUser } = getStoredAuth();
  const token = getAuthToken();

  // Step 6: Comment Posting State
  const [newComment, setNewComment] = useState('');
  const [commentMentions, setCommentMentions] = useState([]);
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentInputRef = React.useRef(null);

  const fetchBlogAndComments = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [blogRes, commentsRes] = await Promise.all([
        fetch(`http://localhost:3000/blogs/${id}`, { headers }),
        fetch(`http://localhost:3000/blogs/${id}/comments`, { headers })
      ]);
      
      const blogJson = await blogRes.json();
      const commentsJson = await commentsRes.json();
      
      if (blogJson.success) setBlog(blogJson.data);
      if (commentsJson.success) setComments(commentsJson.data);
      
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBlogAndComments();
  }, [fetchBlogAndComments]);

  const handleEntityVote = async (entityId, type, isComment = false) => {
    if (!currentUser || !token) {
      alert("You must be logged in to vote!");
      return;
    }
    
    // Determine the API endpoint based on whether we are voting on the blog or a comment
    const endpoint = isComment 
      ? `http://localhost:3000/comments/${entityId}/${type}`
      : `http://localhost:3000/blogs/${entityId}/${type}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const json = await response.json();
      
      if (json.success) {
        if (isComment) {
          // Update comment vote counts locally
          setComments(prev => prev.map(c => 
            c.commentid === entityId 
              ? { ...c, upvotecount: json.data.upvotecount, downvotecount: json.data.downvotecount, uservote: json.data.uservote ?? null }
              : c
          ));
        } else {
          // Update blog vote counts locally
          setBlog(prev => ({
            ...prev,
            upvotecount: json.data.upvotecount,
            downvotecount: json.data.downvotecount,
            uservote: json.data.uservote ?? null
          }));
        }
      }
    } catch (error) {
      console.error(`Error ${type}ing:`, error);
    }
  };

  const handleDeleteBlog = async () => {
    if (!currentUser || !token) {
      alert('Please login to delete a blog post.');
      return;
    }

    if (!window.confirm("Are you sure you want to delete this full blog post?")) return;
    try {
      const response = await fetch(`http://localhost:3000/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const json = await response.json();
      if (json.success) {
        navigate('/blogs');
      } else {
        alert("Failed to delete blog: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting blog");
    }
  };

  const insertCommentMention = (item) => {
    const insertionText = ` @[${item.title}](${item.type}:${item.id}) `;
    
    // Insert into textarea at cursor
    const cursor = commentInputRef.current?.selectionStart || newComment.length;
    const updatedText = newComment.slice(0, cursor) + insertionText + newComment.slice(cursor);
    setNewComment(updatedText);
    
    // Update payload array
    setCommentMentions(prev => {
      if (!prev.find(m => m.id === item.id && m.type === item.type)) {
        return [...prev, { type: item.type, id: item.id }];
      }
      return prev;
    });

    setShowMentionModal(false);
  };

  const handlePostComment = async () => {
    if (!currentUser || !token) return alert("You must be logged in to comment.");
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:3000/blogs/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          replyToCommentId: null, // Top-level comment for now
          commentText: newComment,
          mentions: commentMentions
        })
      });

      const json = await response.json();
      if (json.success) {
        // Clear form
        setNewComment('');
        setCommentMentions([]);
        // Re-fetch comments to show the new one
        fetchBlogAndComments();
      } else {
        alert("Failed to post comment: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error posting comment");
    } finally {
      setIsSubmitting(false);
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
      const type = match[2];
      const refId = match[3];

      let linkPath = '/';
      if (type === 'media') {
        const mediaType = mediaMentions.get(refId)?.mediaType;
        linkPath = mediaType === 'TVSeries' ? `/tvshows/${refId}` : `/movies/${refId}`;
      } else if (type === 'person') {
        linkPath = `/persons/${refId}`;
      } else if (type === 'list') {
        linkPath = `/lists/${refId}`;
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

    // Convert newlines to breaks to preserve spacing
    return parts.map((part, i) => 
      typeof part === 'string' 
        ? <span key={`text-${i}`}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{line}<br/></React.Fragment>)}</span> 
        : part
    );
  };

  if (loading) return <div className="page"><p>Loading Blog...</p></div>;
  if (!blog) return <div className="page"><p>Blog not found.</p><Link to="/blogs" className="btn btn-secondary">Back to Blogs</Link></div>;

  return (
    <div className="page blogs-page" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      
      <button className="btn btn-ghost" onClick={() => navigate('/blogs')} style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Back to Blogs
      </button>

      <div style={{ background: 'white', border: '1px solid #e2e6f0', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1>
            {blog.blogtitle}
            {blog.editedat && blog.editedat !== blog.postdate && <span style={{ fontSize: '0.9rem', color: '#8a94a6', fontStyle: 'italic', fontWeight: 'normal', marginLeft: '1rem' }}>(edited)</span>}
          </h1>
          {currentUser && Number(currentUser.userId) === Number(blog.userid) && (
            <div style={{ position: 'relative' }}>
               <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#6a7488' }} onClick={() => setShowBlogMenu(!showBlogMenu)}>
                 <MoreVertical size={24} />
               </button>
               {showBlogMenu && (
                 <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #edf0f6', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '150px' }}>
                   <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', marginBottom: '0.2rem', padding: '0.5rem' }} onClick={() => navigate(`/blogs/${blog.blogid}/edit`)}>
                     <Edit2 size={16} /> Edit Blog
                   </button>
                   <button className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left', color: '#ef4444', padding: '0.5rem' }} onClick={() => { setShowBlogMenu(false); handleDeleteBlog(); }}>
                     <Trash2 size={16} /> Delete
                   </button>
                 </div>
               )}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', color: '#6a7488', fontSize: '0.9rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #edf0f6' }}>
          <span>Written by <strong>{blog.authorname}</strong></span>
          <span>•</span>
          <span>{new Date(blog.postdate).toLocaleDateString()}</span>
        </div>

        <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#334155', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
          {renderContentWithMentions(blog.content, blog.mentions)}
        </div>

        {/* Voting Actions */}
        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #edf0f6', paddingTop: '1rem' }}>
          <button className={`action-btn vote-up ${blog.uservote === 'upvote' ? 'active' : ''}`} onClick={() => handleEntityVote(blog.blogid, 'upvote', false)}>
            <ThumbsUp /> {blog.upvotecount}
          </button>
          <button className={`action-btn vote-down ${blog.uservote === 'downvote' ? 'active' : ''}`} onClick={() => handleEntityVote(blog.blogid, 'downvote', false)}>
            <ThumbsDown /> {blog.downvotecount}
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div style={{ background: 'white', border: '1px solid #e2e6f0', borderRadius: '12px', padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <MessageSquare size={24} /> {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>

        {/* Step 6: Create Comment Form */}
        <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
          
          {currentUser && (
            <div style={{ marginBottom: '0.8rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowMentionModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                <LinkIcon size={14} /> Add Mention
              </button>
            </div>
          )}

          <textarea 
            ref={commentInputRef}
            placeholder={currentUser ? "Add your thoughts..." : "Log in to comment"} 
            disabled={!currentUser || isSubmitting}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            rows="3" 
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #d7dbe6', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.8rem' }}>
            <button 
              className="btn btn-primary" 
              disabled={!currentUser || isSubmitting || !newComment.trim()}
              onClick={handlePostComment}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>

        {showMentionModal && (
          <MentionModal 
            onClose={() => setShowMentionModal(false)}
            onSelect={insertCommentMention}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* We now build a tree from the flat comments array */}
          {(() => {
            const commentMap = {};
            const roots = [];
            
            // Map by ID
            comments.forEach(c => {
              commentMap[c.commentid] = { ...c, children: [] };
            });

            // Build tree
            comments.forEach(c => {
              if (c.replytocommentid) {
                if (commentMap[c.replytocommentid]) {
                  commentMap[c.replytocommentid].children.push(commentMap[c.commentid]);
                } else {
                  roots.push(commentMap[c.commentid]); // Orphan fallback
                }
              } else {
                roots.push(commentMap[c.commentid]);
              }
            });

            return roots.map(root => (
              <CommentNode 
                key={root.commentid} 
                comment={root} 
                currentUser={currentUser}
                token={token}
                handleEntityVote={handleEntityVote}
                renderContentWithMentions={renderContentWithMentions}
                blogId={id}
                fetchBlogAndComments={fetchBlogAndComments}
              />
            ));
          })()}

          {comments.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6a7488', padding: '2rem 0' }}>No comments yet. Be the first to start the discussion!</p>
          )}
        </div>
      </div>
    </div>
  );
}
