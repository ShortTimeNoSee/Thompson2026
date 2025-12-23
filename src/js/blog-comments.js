/**
 * Blog Comments & Newsletter Subscription System
 * Handles comment submission, display, and newsletter subscriptions for blog posts.
 */

const WORKER_URL = 'https://declaration-signatures.theedenwatcher.workers.dev';

class BlogComments {
    constructor() {
        this.postSlug = this.getPostSlug();
        this.comments = [];
        this.isSubmitting = false;
        
        if (this.postSlug) {
            this.init();
        }
    }

    getPostSlug() {
        const path = window.location.pathname;
        const match = path.match(/\/blog\/([a-z0-9-]+)\/?$/i);
        return match ? match[1] : null;
    }

    async init() {
        await this.loadComments();
        this.setupCommentForm();
        this.setupSubscribeForm();
    }

    async loadComments() {
        const commentsContainer = document.getElementById('comments-list');
        if (!commentsContainer) return;

        try {
            const response = await fetch(`${WORKER_URL}/api/blog/comments?slug=${this.postSlug}`);
            if (!response.ok) throw new Error('Failed to load comments');
            
            const data = await response.json();
            this.comments = data.comments || [];
            this.renderComments();
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsContainer.innerHTML = '<p class="comments-error">Unable to load comments. Please try again later.</p>';
        }
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

        commentsContainer.innerHTML = this.comments.map(comment => `
            <div class="comment" data-id="${this.escapeHtml(comment.id)}">
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(comment.name)}</span>
                    <time class="comment-date" datetime="${new Date(comment.timestamp).toISOString()}">
                        ${this.formatDate(comment.timestamp)}
                    </time>
                </div>
                <div class="comment-body">
                    ${this.escapeHtml(comment.comment).replace(/\n/g, '<br>')}
                </div>
            </div>
        `).join('');
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

            // Client-side validation
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
                        postSlug: this.postSlug
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    this.showFormMessage(formMessage, 'Thank you! Your comment has been submitted for review.', 'success');
                    form.reset();
                    if (charCount) charCount.textContent = '0/2000';
                    
                    // Store name/email for convenience
                    localStorage.setItem('blog_commenter_name', name);
                    localStorage.setItem('blog_commenter_email', email);
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

        // Pre-fill from localStorage
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
                    
                    // Show success state
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

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 hour ago
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return mins <= 1 ? 'Just now' : `${mins} minutes ago`;
        }
        
        // Less than 24 hours ago
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        }
        
        // Less than 7 days ago
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return days === 1 ? 'Yesterday' : `${days} days ago`;
        }
        
        // Otherwise, show full date
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BlogComments();
});
