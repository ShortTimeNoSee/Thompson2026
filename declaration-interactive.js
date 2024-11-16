// Array of California counties
const CALIFORNIA_COUNTIES = [
    'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa',
    'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo',
    'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa',
    'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange',
    'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino',
    'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo',
    'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou',
    'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare',
    'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
];

const WORKER_URL = 'https://declaration-signatures.theedenwatcher.workers.dev';

class DeclarationComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.hasSignedBefore = localStorage.getItem('hasSignedDeclaration');
        this.signatures = 0;
        this.counties = 0;
        this.signaturesList = [];
        
        this.render();
        this.fetchStats();
        this.initializeSignaturesList();
    }

    async fetchStats() {
        try {
            const response = await fetch(`${WORKER_URL}/api/declaration-stats`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Fetched stats data:', data);
            console.log('Signatures list:', data.signaturesList);
            this.signatures = data.signatures || 0;
            this.counties = data.counties || 0;
            this.signaturesList = data.signaturesList || [];
            
            console.log('After assignment:', {
                signatures: this.signatures,
                counties: this.counties,
                signaturesList: this.signaturesList
            });
            
            this.updateStats();
            this.renderSignaturesList();
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            this.signatures = 42;
            this.counties = 12;
            this.updateStats();
        }
    }

    initializeSignaturesList() {
        if (!document.getElementById('signatures-list')) {
            const signaturesContainer = document.createElement('div');
            signaturesContainer.id = 'signatures-list';
            this.container.parentNode.insertBefore(signaturesContainer, this.container.nextSibling);
        }
    }

    updateStats() {
        const signaturesEl = this.container.querySelector('.signatures-count');
        const countiesEl = this.container.querySelector('.counties-count');
        
        if (signaturesEl) signaturesEl.textContent = this.signatures;
        if (countiesEl) countiesEl.textContent = this.counties;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    renderSignaturesList() {
        const container = document.getElementById('signatures-list');
        console.log('Container found:', !!container);  // Add this log
        console.log('Signatures list length:', this.signaturesList.length);  // Add this log
        
        if (!container || !this.signaturesList.length) {
            console.log('Early return - container or signatures missing');  // Add this log
            return;
        }

        // Check if we're on the index page
        const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index.html';
        const displayCount = isIndexPage ? 5 : this.signaturesList.length;
        const signatures = this.signaturesList.slice(0, displayCount);

        const listHtml = `
            <div class="signatures-list-container">
                <h4>Signed by the People</h4>
                <div class="signatures-grid">
                    ${signatures.map(sig => `
                        <div class="signature-entry">
                            <span class="signer-name">${sig.name || 'Citizen'}</span>
                            <span class="signer-county">${sig.county} County</span>
                            ${sig.comment ? `<span class="signer-comment">"${sig.comment}"</span>` : ''}
                            <span class="sign-date">${this.formatDate(sig.timestamp)}</span>
                        </div>
                    `).join('')}
                </div>
                ${isIndexPage && this.signaturesList.length > displayCount ? `
                    <div class="view-all-signatures">
                        <a href="/declaration_of_war#signatures-list" class="view-all-button">
                            View All ${this.signaturesList.length} Signatures
                        </a>
                    </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = listHtml;
    }

    async signDeclaration(county, name, comment) {
        try {
            const response = await fetch(`${WORKER_URL}/api/sign-declaration`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    county, 
                    name: name?.trim() || 'Citizen',
                    comment: comment?.trim() || ''
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to sign declaration');
            }

            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('hasSignedDeclaration', 'true');
                localStorage.setItem('signedCounty', county);
                localStorage.setItem('signedName', name);
                this.signatures = result.signatures;
                this.counties = result.counties;
                this.signaturesList = result.signaturesList;
                this.hasSignedBefore = true;
                this.render();
                this.renderSignaturesList();
            } else {
                throw new Error('Failed to sign declaration');
            }
        } catch (error) {
            console.error('Failed to sign:', error);
            alert(error.message || 'There was an error signing the declaration. Please try again later.');
        }
    }

    createCountySelector() {
        const select = document.createElement('select');
        select.className = 'county-select';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Choose your county...';
        select.appendChild(defaultOption);
        
        CALIFORNIA_COUNTIES.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            select.appendChild(option);
        });
        
        return select;
    }

    render() {
        const html = `
            <div class="declaration-interactive">
                <div class="stats-container">
                    <div class="stat">
                        <span class="signatures-count">${this.signatures}</span>
                        <span class="label">Citizens United</span>
                    </div>
                    <div class="stat">
                        <span class="counties-count">${this.counties}</span>
                        <span class="label">Counties Represented</span>
                    </div>
                </div>
                
                ${!this.hasSignedBefore ? `
                    <div class="sign-container">
                        <div class="sign-header">
                            <span class="sign-subtitle">Publicly join the citizens below in standing for liberty</span>
                        </div>
                        <input type="text" 
                            class="name-field" 
                            placeholder="Your Name (Optional)" 
                            maxlength="50"
                        />
                        <div class="name-dependent-fields" style="display: none;">
                            <textarea 
                                class="comment-field" 
                                placeholder="Add a comment (Optional)" 
                                maxlength="280"
                            ></textarea>
                            <div class="char-count">0/280</div>
                        </div>
                        <div class="county-selector"></div>
                        <button class="sign-button">Sign the Declaration</button>
                    </div>
                ` : `
                    <div class="signed-message">
                        <span>✓ You've Joined the Movement</span>
                        <div class="share-prompt">
                            Share your stand: Rally others to join the cause for liberty
                        </div>
                        <div class="share-buttons">
                            <button class="share-button primary-share" data-platform="native">
                                <!-- Share SVG Icon -->
                                Share
                            </button>
                            <div class="secondary-share-buttons">
                                <button class="share-button twitter" data-platform="twitter">
                                    <!-- Twitter SVG Icon -->
                                </button>
                                <button class="share-button facebook" data-platform="facebook">
                                    <!-- Facebook SVG Icon -->
                                </button>
                                <button class="share-button email" data-platform="email">
                                    <!-- Email SVG Icon -->
                                </button>
                                <button class="share-button copy" data-platform="copy">
                                    <!-- Copy SVG Icon -->
                                </button>
                            </div>
                        </div>
                        <div class="share-confirmation"></div>
                    </div>
                `}
            </div>
        `;
        
        this.container.innerHTML = html;
        
        if (!this.hasSignedBefore) {
            const selectorContainer = this.container.querySelector('.county-selector');
            selectorContainer.appendChild(this.createCountySelector());
            
            const signButton = this.container.querySelector('.sign-button');
            const nameField = this.container.querySelector('.name-field');
            const commentContainer = this.container.querySelector('.name-dependent-fields');
            const commentField = this.container.querySelector('.comment-field');
            const charCount = this.container.querySelector('.char-count');
            const countySelect = this.container.querySelector('.county-select');

            nameField.addEventListener('input', () => {
                commentContainer.style.display = nameField.value.trim() ? 'block' : 'none';
            });
            
            commentField?.addEventListener('input', (e) => {
                const count = e.target.value.length;
                charCount.textContent = `${count}/280`;
                
                // Prevent typing beyond 280 chars
                if (count > 280) {
                    e.target.value = e.target.value.slice(0, 280);
                    charCount.textContent = "280/280";
                }
            });

            signButton.addEventListener('click', () => {
                if (countySelect.value) {
                    const comment = commentField?.value || '';
                    this.signDeclaration(countySelect.value, nameField.value, comment);
                } else {
                    alert('Please select your county');
                }
            });

            nameField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && countySelect.value) {
                    const comment = commentField?.value || '';
                    this.signDeclaration(countySelect.value, nameField.value, comment);
                }
            });

        } else {
            const shareButtons = this.container.querySelectorAll('.share-button');
            shareButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const platform = event.currentTarget.getAttribute('data-platform');
                    this.shareDeclaration(platform);
                });
            });
        }
    }

    async shareDeclaration(platform) {
        const shareUrl = window.location.href;
        const shareText = "I just signed the California Declaration of Constitutional Liberty! Join me in standing for our rights.";

        if (platform === 'native') {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'California Declaration of Constitutional Liberty',
                        text: shareText,
                        url: shareUrl
                    });
                    this.showShareConfirmation('Thanks for sharing!');
                } catch (err) {
                    console.error('Error sharing:', err);
                }
            } else {
                this.shareDeclaration('copy');
            }
        } else if (platform === 'twitter') {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(shareUrl)}`;
            window.open(twitterUrl, '_blank');
        } else if (platform === 'facebook') {
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
            window.open(facebookUrl, '_blank');
        } else if (platform === 'email') {
            const emailSubject = 'Join me in standing for our rights!';
            const emailBody = `${shareText}\n\n${shareUrl}`;
            const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
            window.location.href = mailtoLink;
        } else if (platform === 'discord' || platform === 'copy') {
            const textToCopy = `${shareText}\n\n${shareUrl}`;
            await this.copyToClipboard(textToCopy);
            if (platform === 'discord') {
                this.showShareConfirmation('Text copied to clipboard! Paste it into Discord.');
            } else {
                this.showShareConfirmation('Link and message copied to clipboard!');
            }
        }
    }

    async copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
            } catch (err) {
                console.error('Failed to copy using navigator.clipboard:', err);
                this.copyToClipboardFallback(text);
            }
        } else {
            this.copyToClipboardFallback(text);
        }
    }

    copyToClipboardFallback(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Prevent scrolling to bottom in Edge
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const successful = document.execCommand('copy');
            if (!successful) {
                throw new Error('Failed to copy text.');
            }
        } catch (err) {
            console.error('Failed to copy using execCommand:', err);
            alert('Failed to copy text. Please copy it manually.');
        }
        document.body.removeChild(textarea);
    }

    showShareConfirmation(message) {
        const confirmationDiv = this.container.querySelector('.share-confirmation');
        if (confirmationDiv) {
            confirmationDiv.textContent = message;
            confirmationDiv.style.opacity = '1';
            setTimeout(() => {
                confirmationDiv.style.opacity = '0';
            }, 3000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeclarationComponent('declaration-interactive');
});