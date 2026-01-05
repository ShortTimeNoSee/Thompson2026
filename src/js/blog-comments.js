/**
 * Blog Comments & Newsletter Subscription System
 */

const WORKER_URL = 'https://declaration-signatures.theedenwatcher.workers.dev';

function decodeHTMLEntities(text) {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

class BlogComments {
    constructor() {
        this.postSlug = this.getPostSlug();
        this.comments = [];
        this.isSubmitting = false;
        this.sortOrder = localStorage.getItem('comment_sort') || 'newest';
        this.voterId = this.getOrCreateVoterId();
        this.replyingTo = null;
        
        if (this.postSlug) {
            this.init();
        }
    }

    getPostSlug() {
        const path = window.location.pathname;
        const match = path.match(/\/blog\/([a-z0-9-]+)\/?$/i);
        return match ? match[1] : null;
    }

    getOrCreateVoterId() {
        let id = localStorage.getItem('blog_voter_id');
        if (!id) {
            id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('blog_voter_id', id);
        }
        return id;
    }

    getVotes() {
        try {
            return JSON.parse(localStorage.getItem('blog_votes') || '{}');
        } catch {
            return {};
        }
    }

    setVote(commentId, vote) {
        const votes = this.getVotes();
        votes[commentId] = vote;
        localStorage.setItem('blog_votes', JSON.stringify(votes));
    }

    async init() {
        await this.loadComments();
        this.setupCommentForm();
        this.setupSubscribeForm();
        this.setupSortControls();
        this.handlePermalink();
    }

    async loadComments() {
        const commentsContainer = document.getElementById('comments-list');
        if (!commentsContainer) return;

        try {
            const response = await fetch(`${WORKER_URL}/api/blog/comments?slug=${this.postSlug}&voterId=${this.voterId}`);
            if (!response.ok) throw new Error('Failed to load comments');
            
            const data = await response.json();
            this.comments = data.comments || [];
            this.renderComments();
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsContainer.innerHTML = '<p class="comments-error">Unable to load comments. Please try again later.</p>';
        }
    }

    sortComments(comments) {
        const sorted = [...comments];
        switch (this.sortOrder) {
            case 'oldest':
                sorted.sort((a, b) => a.timestamp - b.timestamp);
                break;
            case 'top':
                sorted.sort((a, b) => {
                    const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
                    const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
                    return scoreB - scoreA;
                });
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => b.timestamp - a.timestamp);
        }
        return sorted;
    }

    buildCommentTree(comments) {
        const map = {};
        const roots = [];
        
        comments.forEach(c => {
            map[c.id] = { ...c, replies: [] };
        });
        
        comments.forEach(c => {
            if (c.replyTo && map[c.replyTo]) {
                map[c.replyTo].replies.push(map[c.id]);
            } else {
                roots.push(map[c.id]);
            }
        });
        
        return this.sortComments(roots);
    }

    renderComments() {
        const commentsContainer = document.getElementById('comments-list');
        const commentsCount = document.getElementById('comments-count');
        
        if (!commentsContainer) return;

        if (commentsCount) {
            commentsCount.textContent = this.comments.length;
        }

        if (this.comments.length === 0) {
            commentsContainer.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        const tree = this.buildCommentTree(this.comments);
        commentsContainer.innerHTML = tree.map(c => this.renderComment(c, 0)).join('');
        
        this.attachCommentEventListeners();
    }

    renderComment(comment, depth) {
        const votes = this.getVotes();
        const userVote = votes[comment.id] || 0;
        const score = (comment.upvotes || 0) - (comment.downvotes || 0);
        const isAuthor = (comment.name || '').toLowerCase().includes('nicholas') && 
                        (comment.name || '').toLowerCase().includes('thompson');
        const maxDepth = 4;
        const effectiveDepth = Math.min(depth, maxDepth);
        
        const repliesHtml = (comment.replies || [])
            .map(r => this.renderComment(r, depth + 1))
            .join('');

        return `
            <div class="comment ${comment.pending ? 'comment-pending' : ''} ${isAuthor ? 'comment-author' : ''}" 
                 data-id="${this.escapeHtml(comment.id)}" 
                 data-depth="${effectiveDepth}"
                 id="comment-${this.escapeHtml(comment.id)}">
                <div class="comment-main">
                    <div class="comment-votes">
                        <button class="vote-btn vote-up ${userVote === 1 ? 'voted' : ''}" 
                                data-id="${this.escapeHtml(comment.id)}" 
                                data-vote="1" 
                                aria-label="Upvote"
                                ${comment.pending ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4l-8 8h5v8h6v-8h5z"/></svg>
                        </button>
                        <span class="vote-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}">${score}</span>
                        <button class="vote-btn vote-down ${userVote === -1 ? 'voted' : ''}" 
                                data-id="${this.escapeHtml(comment.id)}" 
                                data-vote="-1" 
                                aria-label="Downvote"
                                ${comment.pending ? 'disabled' : ''}>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 20l8-8h-5v-8h-6v8h-5z"/></svg>
                        </button>
                    </div>
                    <div class="comment-content">
                <div class="comment-header">
                            <span class="comment-author">
                                ${decodeHTMLEntities(comment.name)}
                                ${isAuthor ? '<span class="author-badge">Author</span>' : ''}
                            </span>
                            ${comment.pending ? '<span class="comment-pending-badge">Pending</span>' : ''}
                            <a href="#comment-${this.escapeHtml(comment.id)}" class="comment-date comment-permalink" 
                               title="Permalink to this comment">
                                <time datetime="${new Date(comment.timestamp).toISOString()}">
                        ${this.formatDate(comment.timestamp)}
                    </time>
                            </a>
                </div>
                <div class="comment-body">
                            ${this.renderMarkdown(comment.comment)}
                        </div>
                        <div class="comment-actions">
                            <button class="comment-action-btn reply-btn" 
                                    data-id="${this.escapeHtml(comment.id)}"
                                    data-name="${decodeHTMLEntities(comment.name)}"
                                    ${depth >= maxDepth ? 'disabled title="Max reply depth reached"' : ''}>
                                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                                Reply
                            </button>
                            <button class="comment-action-btn report-btn" 
                                    data-id="${this.escapeHtml(comment.id)}"
                                    title="Report inappropriate content">
                                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                            </button>
                            <span class="vote-counts">
                                <span class="upvote-count" title="Upvotes">↑${comment.upvotes || 0}</span>
                                <span class="downvote-count" title="Downvotes">↓${comment.downvotes || 0}</span>
                            </span>
                        </div>
                    </div>
                </div>
                ${repliesHtml ? `<div class="comment-replies">${repliesHtml}</div>` : ''}
            </div>
        `;
    }

    renderMarkdown(text) {
        if (!text) return '';
        let html = decodeHTMLEntities(text);
        html = this.escapeHtml(html);
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, 
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    attachCommentEventListeners() {
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleVote(e));
        });
        
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleReplyClick(e));
        });
        
        document.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleReport(e));
        });
    }

    async handleVote(e) {
        const btn = e.currentTarget;
        const commentId = btn.dataset.id;
        const vote = parseInt(btn.dataset.vote);
        const votes = this.getVotes();
        const currentVote = votes[commentId] || 0;
        
        const newVote = currentVote === vote ? 0 : vote;
        
        try {
            const response = await fetch(`${WORKER_URL}/api/blog/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commentId,
                    postSlug: this.postSlug,
                    vote: newVote,
                    voterId: this.voterId
                })
            });
            
            if (response.ok) {
                this.setVote(commentId, newVote);
                const data = await response.json();
                this.updateVoteDisplay(commentId, data.upvotes, data.downvotes, newVote);
            }
        } catch (error) {
            console.error('Vote error:', error);
        }
    }

    updateVoteDisplay(commentId, upvotes, downvotes, userVote) {
        const comment = document.querySelector(`.comment[data-id="${commentId}"]`);
        if (!comment) return;
        
        const score = upvotes - downvotes;
        const scoreEl = comment.querySelector('.vote-score');
        const upBtn = comment.querySelector('.vote-up');
        const downBtn = comment.querySelector('.vote-down');
        const upCount = comment.querySelector('.upvote-count');
        const downCount = comment.querySelector('.downvote-count');
        
        if (scoreEl) {
            scoreEl.textContent = score;
            scoreEl.className = `vote-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`;
        }
        if (upBtn) upBtn.classList.toggle('voted', userVote === 1);
        if (downBtn) downBtn.classList.toggle('voted', userVote === -1);
        if (upCount) upCount.textContent = `↑${upvotes}`;
        if (downCount) downCount.textContent = `↓${downvotes}`;
    }

    handleReplyClick(e) {
        const btn = e.currentTarget;
        const commentId = btn.dataset.id;
        const authorName = btn.dataset.name;
        
        document.querySelectorAll('.inline-reply-form').forEach(f => f.remove());
        
        const comment = document.querySelector(`.comment[data-id="${commentId}"]`);
        if (!comment) return;
        
        this.replyingTo = commentId;
        
        const replyForm = document.createElement('div');
        replyForm.className = 'inline-reply-form';
        replyForm.innerHTML = `
            <div class="reply-form-header">
                <span>Replying to <strong>${this.escapeHtml(authorName)}</strong></span>
                <button type="button" class="cancel-reply-btn" aria-label="Cancel reply">×</button>
            </div>
            <form class="reply-form">
                <div class="form-row">
                    <input type="text" name="name" placeholder="Your name" required maxlength="100" 
                           value="${localStorage.getItem('blog_commenter_name') || ''}">
                    <input type="email" name="email" placeholder="Your email (private)" required maxlength="254"
                           value="${localStorage.getItem('blog_commenter_email') || ''}">
                </div>
                <textarea name="comment" placeholder="Write your reply... (Supports **bold**, *italic*, \`code\`, [links](url))" 
                          required minlength="10" maxlength="2000" rows="3"></textarea>
                <div class="reply-form-footer">
                    <label class="checkbox-label">
                        <input type="checkbox" name="notifyReplies" checked>
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">Notify me of replies to this thread</span>
                    </label>
                    <button type="submit" class="reply-submit-btn">Post Reply</button>
                </div>
                <div class="reply-form-message" style="display: none;"></div>
            </form>
        `;
        
        comment.querySelector('.comment-content').appendChild(replyForm);
        replyForm.querySelector('textarea').focus();
        
        replyForm.querySelector('.cancel-reply-btn').addEventListener('click', () => {
            replyForm.remove();
            this.replyingTo = null;
        });
        
        replyForm.querySelector('form').addEventListener('submit', (e) => this.handleReplySubmit(e, commentId));
    }

    async handleReplySubmit(e, parentId) {
        e.preventDefault();
        if (this.isSubmitting) return;
        
        const form = e.target;
        const formMessage = form.querySelector('.reply-form-message');
        const submitBtn = form.querySelector('.reply-submit-btn');
        
        const name = form.querySelector('input[name="name"]').value.trim();
        const email = form.querySelector('input[name="email"]').value.trim();
        const comment = form.querySelector('textarea[name="comment"]').value.trim();
        const notifyReplies = form.querySelector('input[name="notifyReplies"]').checked;
        
        if (!name || name.length < 2) {
            this.showFormMessage(formMessage, 'Please enter your name.', 'error');
            return;
        }
        if (!email || !this.isValidEmail(email)) {
            this.showFormMessage(formMessage, 'Please enter a valid email.', 'error');
            return;
        }
        if (!comment || comment.length < 10) {
            this.showFormMessage(formMessage, 'Reply must be at least 10 characters.', 'error');
            return;
        }
        
        this.isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Posting...';
        
        try {
            const response = await fetch(`${WORKER_URL}/api/blog/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    comment,
                    postSlug: this.postSlug,
                    replyTo: parentId,
                    notifyReplies
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showFormMessage(formMessage, 'Reply submitted for review!', 'success');
                localStorage.setItem('blog_commenter_name', name);
                localStorage.setItem('blog_commenter_email', email);
                
                setTimeout(() => {
                    form.closest('.inline-reply-form').remove();
                    this.replyingTo = null;
                    this.showPendingComment(name, comment, parentId);
                }, 1500);
            } else {
                this.showFormMessage(formMessage, data.message || 'Failed to submit reply.', 'error');
            }
        } catch (error) {
            this.showFormMessage(formMessage, 'Network error. Please try again.', 'error');
        } finally {
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Post Reply';
        }
    }

    async handleReport(e) {
        const btn = e.currentTarget;
        const commentId = btn.dataset.id;
        
        if (btn.classList.contains('reported')) return;
        
        const reason = prompt(
            'Why are you reporting this comment?\n\n' +
            '(If you want to delete YOUR OWN comment, email nicholas@thompson2026.com from the same email address you used when posting.)'
        );
        if (reason === null) return;
        
        try {
            const response = await fetch(`${WORKER_URL}/api/blog/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commentId,
                    postSlug: this.postSlug,
                    reason: reason || 'No reason provided'
                })
            });
            
            if (response.ok) {
                btn.classList.add('reported');
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Reported';
                btn.disabled = true;
                alert('Thank you for your report. It has been sent for review.');
            }
        } catch (error) {
            console.error('Report error:', error);
            alert('Failed to submit report. Please try again.');
        }
    }

    setupSortControls() {
        const sortContainer = document.querySelector('.comments-sort');
        if (!sortContainer) return;
        
        const buttons = sortContainer.querySelectorAll('.sort-btn');
        buttons.forEach(btn => {
            if (btn.dataset.sort === this.sortOrder) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sortOrder = btn.dataset.sort;
                localStorage.setItem('comment_sort', this.sortOrder);
                this.renderComments();
            });
        });
    }

    handlePermalink() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#comment-')) {
            setTimeout(() => {
                const comment = document.querySelector(hash);
                if (comment) {
                    comment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    comment.classList.add('comment-highlighted');
                    setTimeout(() => comment.classList.remove('comment-highlighted'), 3000);
                }
            }, 500);
        }
    }

    setupCommentForm() {
        const form = document.getElementById('comment-form');
        if (!form) return;

        const charCount = document.getElementById('comment-char-count');
        const textarea = form.querySelector('textarea[name="comment"]');
        
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                const count = textarea.value.length;
                charCount.textContent = `${count}/2000`;
                charCount.classList.toggle('warning', count > 1800);
                charCount.classList.toggle('error', count > 2000);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isSubmitting) return;

            const submitBtn = form.querySelector('button[type="submit"]');
            const formMessage = document.getElementById('comment-form-message');
            
            const formData = new FormData(form);
            const name = formData.get('name')?.trim();
            const email = formData.get('email')?.trim();
            const comment = formData.get('comment')?.trim();
            const notifyReplies = form.querySelector('input[name="notifyReplies"]')?.checked ?? true;

            if (!name || name.length < 2) {
                this.showFormMessage(formMessage, 'Please enter your name.', 'error');
                return;
            }
            if (!email || !this.isValidEmail(email)) {
                this.showFormMessage(formMessage, 'Please enter a valid email address.', 'error');
                return;
            }
            if (!comment || comment.length < 10) {
                this.showFormMessage(formMessage, 'Comment must be at least 10 characters.', 'error');
                return;
            }
            if (comment.length > 2000) {
                this.showFormMessage(formMessage, 'Comment is too long (max 2000 characters).', 'error');
                return;
            }

            this.isSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

            try {
                const response = await fetch(`${WORKER_URL}/api/blog/comment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        comment,
                        postSlug: this.postSlug,
                        notifyReplies
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    this.showFormMessage(formMessage, 'Thank you! Your comment has been submitted for review.', 'success');
                    form.reset();
                    if (charCount) charCount.textContent = '0/2000';
                    
                    localStorage.setItem('blog_commenter_name', name);
                    localStorage.setItem('blog_commenter_email', email);
                    
                    this.showPendingComment(name, comment);
                } else {
                    this.showFormMessage(formMessage, data.message || data.error || 'Failed to submit comment.', 'error');
                }
            } catch (error) {
                console.error('Comment submission error:', error);
                this.showFormMessage(formMessage, 'Network error. Please try again.', 'error');
            } finally {
                this.isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Post Comment';
            }
        });

        const savedName = localStorage.getItem('blog_commenter_name');
        const savedEmail = localStorage.getItem('blog_commenter_email');
        if (savedName) form.querySelector('input[name="name"]').value = savedName;
        if (savedEmail) form.querySelector('input[name="email"]').value = savedEmail;
    }

    setupSubscribeForm() {
        const form = document.getElementById('subscribe-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isSubmitting) return;

            const submitBtn = form.querySelector('button[type="submit"]');
            const formMessage = document.getElementById('subscribe-form-message');
            
            const formData = new FormData(form);
            const email = formData.get('email')?.trim();
            const name = formData.get('name')?.trim() || '';

            if (!email || !this.isValidEmail(email)) {
                this.showFormMessage(formMessage, 'Please enter a valid email address.', 'error');
                return;
            }

            this.isSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Subscribing...';

            try {
                const response = await fetch(`${WORKER_URL}/api/blog/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name })
                });

                const data = await response.json();

                if (response.ok) {
                    this.showFormMessage(formMessage, data.message || 'Successfully subscribed!', 'success');
                    form.reset();
                    
                    const subscribeBox = form.closest('.subscribe-box');
                    if (subscribeBox) {
                        subscribeBox.classList.add('subscribed');
                    }
                } else {
                    this.showFormMessage(formMessage, data.message || data.error || 'Failed to subscribe.', 'error');
                }
            } catch (error) {
                console.error('Subscribe error:', error);
                this.showFormMessage(formMessage, 'Network error. Please try again.', 'error');
            } finally {
                this.isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Subscribe';
            }
        });
    }

    showFormMessage(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = `form-message ${type}`;
        element.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    showPendingComment(name, comment, replyTo = null) {
        const commentsContainer = document.getElementById('comments-list');
        if (!commentsContainer) return;
        
        const noComments = commentsContainer.querySelector('.no-comments');
        if (noComments) noComments.remove();
        
        const pendingComment = document.createElement('div');
        pendingComment.className = 'comment comment-pending';
        pendingComment.innerHTML = `
            <div class="comment-main">
                <div class="comment-votes">
                    <button class="vote-btn vote-up" disabled><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4l-8 8h5v8h6v-8h5z"/></svg></button>
                    <span class="vote-score">0</span>
                    <button class="vote-btn vote-down" disabled><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 20l8-8h-5v-8h-6v8h-5z"/></svg></button>
                </div>
                <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">${name}</span>
                <span class="comment-pending-badge">Pending Moderation</span>
                <time class="comment-date">Just now</time>
            </div>
            <div class="comment-body">
                        ${this.renderMarkdown(comment)}
                    </div>
                </div>
            </div>
        `;
        
        if (replyTo) {
            const parentComment = document.querySelector(`.comment[data-id="${replyTo}"]`);
            if (parentComment) {
                let repliesContainer = parentComment.querySelector('.comment-replies');
                if (!repliesContainer) {
                    repliesContainer = document.createElement('div');
                    repliesContainer.className = 'comment-replies';
                    parentComment.appendChild(repliesContainer);
                }
                repliesContainer.appendChild(pendingComment);
            } else {
                commentsContainer.insertBefore(pendingComment, commentsContainer.firstChild);
            }
        } else {
        commentsContainer.insertBefore(pendingComment, commentsContainer.firstChild);
        }
        
        const commentsCount = document.getElementById('comments-count');
        if (commentsCount) {
            const current = parseInt(commentsCount.textContent) || 0;
            commentsCount.textContent = current + 1;
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
        }
        
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        }
        
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return days === 1 ? 'Yesterday' : `${days} days ago`;
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BlogComments();
});
