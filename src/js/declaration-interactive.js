const CALIFORNIA_COUNTIES = [
    'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa',
    'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo',
    'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa',
    'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange',
    'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino',
    'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo',
    'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou',
    'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare',
    'Tuolumne', 'Ventura', 'Yolo', 'Yuba', 'Unlisted/Other'
];

const WORKER_URL = 'https://declaration-signatures.theedenwatcher.workers.dev';

const devSignatures = [
    {
        name: "Patrick Henry",
        county: "Virginia (Historical)",
        comment: "Liberty or death. I smell a rat in this attempt to consolidate power.",
        timestamp: new Date("1788-06-05").getTime()
    },
    {
        name: "Samuel Adams",
        county: "Massachusetts (Historical)",
        comment: "The natural liberty of man is to be free from any superior power on Earth.",
        timestamp: new Date("1788-08-15").getTime()
    },
    {
        name: "George Mason",
        county: "Virginia (Historical)",
        comment: "The government should fear the people, not the other way around.",
        timestamp: new Date("1788-07-21").getTime()
    },
    {
        name: "Luther Martin",
        county: "Maryland (Historical)",
        comment: "This consolidation of power will be the death of state sovereignty.",
        timestamp: new Date("1788-04-18").getTime()
    },
    {
        name: "Lysander Spooner",
        county: "Massachusetts (Historical)",
        comment: "The Constitution has either authorized such a government as we have had, or has been powerless to prevent it.",
        timestamp: new Date("1867-12-01").getTime()
    },
    {
        name: "H.L. Mencken",
        county: "Maryland (Historical)",
        comment: "Every decent man is ashamed of the government he lives under.",
        timestamp: new Date("1925-05-15").getTime()
    },
    {
        name: "Murray Rothbard",
        county: "New York (Historical)",
        comment: "The state is a gang of thieves writ large.",
        timestamp: new Date("1973-09-30").getTime()
    },
    {
        name: "Rose Wilder Lane",
        county: "Missouri (Historical)",
        comment: "Freedom is self-control, no more, no less.",
        timestamp: new Date("1943-11-12").getTime()
    },
    {
        name: "Thomas Jefferson",
        county: "Virginia (Historical)",
        comment: "When the people fear their government, there is tyranny; when the government fears the people, there is liberty.",
        timestamp: new Date("1787-09-17").getTime()
    },
    {
        name: "John Locke",
        county: "England (Historical)",
        comment: "The end of law is not to abolish or restrain, but to preserve and enlarge freedom.",
        timestamp: new Date("1689-12-16").getTime()
    },
    {
        name: "Frederic Bastiat",
        county: "France (Historical)",
        comment: "The state is the great fiction through which everyone endeavors to live at the expense of everyone else.",
        timestamp: new Date("1850-03-15").getTime()
    },
    {
        name: "Ayn Rand",
        county: "New York (Historical)",
        comment: "The smallest minority on earth is the individual. Those who deny individual rights cannot claim to be defenders of minorities.",
        timestamp: new Date("1961-11-20").getTime()
    },
    {
        name: "Ludwig von Mises",
        county: "Austria (Historical)",
        comment: "Government is essentially the negation of liberty.",
        timestamp: new Date("1949-05-10").getTime()
    },
    {
        name: "Friedrich Hayek",
        county: "Austria (Historical)",
        comment: "The road to serfdom is paved with good intentions.",
        timestamp: new Date("1944-09-14").getTime()
    },
    {
        name: "Benjamin Franklin",
        county: "Pennsylvania (Historical)",
        comment: "Those who would give up essential liberty to purchase a little temporary safety deserve neither liberty nor safety.",
        timestamp: new Date("1775-11-11").getTime()
    },
    {
        name: "James Madison",
        county: "Virginia (Historical)",
        comment: "The accumulation of all powers in the same hands is the very definition of tyranny.",
        timestamp: new Date("1788-02-08").getTime()
    },
    {
        name: "John Stuart Mill",
        county: "England (Historical)",
        comment: "The only purpose for which power can be rightfully exercised over any member of a civilized community is to prevent harm to others.",
        timestamp: new Date("1859-01-01").getTime()
    },
    {
        name: "Henry David Thoreau",
        county: "Massachusetts (Historical)",
        comment: "That government is best which governs least.",
        timestamp: new Date("1849-07-12").getTime()
    },
    {
        name: "Albert Jay Nock",
        county: "New York (Historical)",
        comment: "The state claims and exercises the monopoly of crime.",
        timestamp: new Date("1935-03-22").getTime()
    },
    {
        name: "Isabel Paterson",
        county: "Canada (Historical)",
        comment: "The humanitarian in theory is the terrorist in action.",
        timestamp: new Date("1943-06-18").getTime()
    },
    {
        name: "Frank Chodorov",
        county: "New York (Historical)",
        comment: "The state is a criminal organization writ large.",
        timestamp: new Date("1952-11-30").getTime()
    },
    {
        name: "Leonard Read",
        county: "California (Historical)",
        comment: "I, Pencil is a lesson in how the free market works.",
        timestamp: new Date("1958-12-01").getTime()
    }
];

class DeclarationComponent {
    constructor(container) {
        this.container = container;
        this.signatures = [];
        this.counties = new Set();

        // Simplified environment detection
        const hostname = window.location.hostname || '';
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isProduction = hostname.includes('thompson2026.com');
        
        this.shouldFetch = isLocalHost || isProduction;
        this.isDevelopment = !this.shouldFetch;

        this.isDeclarationPage = document.body.id === 'declaration_of_war_page';
        this.currentPage = 1;
        this.signaturesPerPage = 10;
    }

    async initialize() {
        if (!this.container) {
            console.error('Declaration component container not found');
            return;
        }
        
        // Create the initial structure
            this.container.innerHTML = `
            <div class="stats-container">
                <div class="stat">
                    <span class="signatures-count">0</span>
                    <span class="label">Signatures</span>
                </div>
                <div class="stat">
                    <span class="counties-count">0</span>
                    <span class="label">Counties</span>
                </div>
            </div>
            <div class="sign-form">
                <h2>Sign the Declaration</h2>
                <form id="declaration-form">
                    <div class="form-group">
                        <input type="text" id="signer-name" name="name" placeholder="Your Name (Optional)" maxlength="50">
                    </div>
                    <div class="form-group">
                        <label for="signer-county" class="sr-only">County</label>
                        <select id="signer-county" name="county" required aria-describedby="signer-county-help">
                            <option value="">Choose your county...</option>
                            ${CALIFORNIA_COUNTIES.map(county => 
                                `<option value="${county}">${county}</option>`
                            ).join('')}
                        </select>
                        <div id="signer-county-help" class="sr-only">Select your county</div>
                    </div>
                    <div class="form-group">
                        <textarea id="signer-comment" name="comment" placeholder="Comment (Optional)" maxlength="280"></textarea>
                        <div class="char-count">0/280</div>
                    </div>
                    <div class="sign-button-container">
                        <button type="submit" class="sign-button">Sign Declaration</button>
                    </div>
                </form>
            </div>
            ${this.isDeclarationPage ? `
            <div class="signatures-list-container">
                <h3>Recent Signatures</h3>
                <div class="signature-grid"></div>
                <div class="pagination-container">
                    <button class="pagination-btn prev-btn" disabled>← Previous</button>
                    <span class="page-info">Page <span class="current-page">1</span> of <span class="total-pages">1</span></span>
                    <button class="pagination-btn next-btn">Next →</button>
                </div>
            </div>
            ` : ''}`; // Only show signatures list on declaration page

        // Add development signatures only if we strictly cannot fetch
        if (this.isDevelopment) {
            devSignatures.forEach(sig => {
                this.signatures.push(sig);
                this.counties.add(sig.county);
            });
            this.updateStats();
            if (this.isDeclarationPage) this.renderSignatures();
        }

        // Setup character counter for comment
        const commentField = this.container.querySelector('#signer-comment');
        const charCount = this.container.querySelector('.char-count');
        if (commentField && charCount) {
            commentField.addEventListener('input', () => {
                const count = commentField.value.length;
                charCount.textContent = `${count}/280`;
            });
        }

        // Setup focus on name field when clicking any sign button that links to the form
        const signButtons = document.querySelectorAll('a[href="#declaration-interactive"]');
        const nameField = this.container.querySelector('#signer-name');
        if (nameField) {
            signButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    nameField.focus();
                    // Smooth scroll to the form
                    this.container.scrollIntoView({ behavior: 'smooth' });
                });
            });
        }

        try {
            // Attempt to fetch from worker if we are on an allowed origin
            if (this.shouldFetch) {
                const response = await fetch(`${WORKER_URL}/api/declaration-stats`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                this.signatures = data.signaturesList || [];
                this.counties = new Set(this.signatures.map(sig => sig.county));
                
                // Force update UI with fetched data
                this.updateStats();
                if (this.isDeclarationPage) {
                    this.renderSignatures();
                    this.updatePagination();
                }
            }
        } catch (error) {
            console.error('Error fetching signatures:', error);
            // Fallback to dev signatures on error if list is empty
            if (this.signatures.length === 0) {
                 devSignatures.forEach(sig => {
                    this.signatures.push(sig);
                    this.counties.add(sig.county);
                });
                this.updateStats();
                if (this.isDeclarationPage) this.renderSignatures();
            }
        }

        this.setupPagination(); // pagination controls
        this.setupForm();
    }

    updateStats() {
        const signaturesCount = this.container.querySelector('.signatures-count');
        const countiesCount = this.container.querySelector('.counties-count');
        
        if (signaturesCount) {
            signaturesCount.textContent = this.signatures.length;
        }
        if (countiesCount) {
            countiesCount.textContent = this.counties.size;
        }
    }

    renderSignatures() {
        const signatureGrid = this.container.querySelector('.signature-grid');
        if (!signatureGrid) return;

        const startIndex = (this.currentPage - 1) * this.signaturesPerPage;
        const endIndex = startIndex + this.signaturesPerPage;
        const signaturesToShow = this.signatures.slice(startIndex, endIndex);

        signatureGrid.textContent = '';
        for (const sig of signaturesToShow) {
            const entry = document.createElement('div');
            entry.className = 'signature-entry';
            const name = document.createElement('div');
            name.className = 'signer-name';
            name.textContent = sig.name || '';
            const county = document.createElement('div');
            county.className = 'signer-county';
            county.textContent = sig.county || '';
            if (sig.comment) {
                const comment = document.createElement('div');
                comment.className = 'signer-comment';
                comment.textContent = sig.comment;
                entry.appendChild(comment);
            }
            const date = document.createElement('div');
            date.className = 'sign-date';
            const ts = sig.timestamp || sig.date;
            date.textContent = new Date(ts).toLocaleDateString();
            entry.prepend(county);
            entry.prepend(name);
            entry.appendChild(date);
            signatureGrid.appendChild(entry);
        }

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.signatures.length / this.signaturesPerPage);
        const currentPageSpan = this.container.querySelector('.current-page');
        const totalPagesSpan = this.container.querySelector('.total-pages');
        const prevBtn = this.container.querySelector('.prev-btn');
        const nextBtn = this.container.querySelector('.next-btn');

        if (!currentPageSpan || !totalPagesSpan || !prevBtn || !nextBtn) return;

        if (totalPages === 0) {
            if (currentPageSpan) currentPageSpan.textContent = 0;
            if (totalPagesSpan) totalPagesSpan.textContent = 0;
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }

        if (currentPageSpan) currentPageSpan.textContent = this.currentPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    }

    setupPagination() {
        const prevBtn = this.container.querySelector('.prev-btn');
        const nextBtn = this.container.querySelector('.next-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderSignatures();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.signatures.length / this.signaturesPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderSignatures();
                }
            });
        }
    }

    setupForm() {
        const form = this.container.querySelector('#declaration-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const signature = {
                name: formData.get('name'),
                county: formData.get('county'),
                comment: formData.get('comment'),
                timestamp: Date.now()
            };

            // If we are in a "fetchable" environment (prod or localhost), try to submit
            if (this.shouldFetch) {
                try {
                    const response = await fetch(`${WORKER_URL}/api/sign-declaration`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(signature)
                    });
                    
                    if (response.ok) {
                        this.signatures.unshift(signature);
                        this.counties.add(signature.county);
                        this.updateStats();
                        this.currentPage = 1;
                        if (this.isDeclarationPage) this.renderSignatures();
                        form.reset();
                    } else {
                        const err = await response.json();
                        alert(err.message || 'Error signing declaration');
                    }
                } catch (error) {
                    console.error('Error submitting signature:', error);
                    alert('Network error. Please try again.');
                }
            } else {
                // Fallback for strictly local files/previews that don't have CORS
                this.signatures.unshift(signature);
                this.counties.add(signature.county);
                this.updateStats();
                this.currentPage = 1;
                if (this.isDeclarationPage) this.renderSignatures();
                form.reset();
            }
        });
    }

    showError() {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Unable to load signatures. Please try again later.';
        this.container.appendChild(errorMessage);
    }
}

// Initialize the component
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('declaration-interactive');
    if (!container) return;
    const component = new DeclarationComponent(container);
    const start = () => component.initialize();
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(start, { timeout: 1000 });
    } else {
        window.requestAnimationFrame(start);
    }
});
