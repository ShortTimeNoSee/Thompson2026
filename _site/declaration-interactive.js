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
        date: "1788-06-05"
    },
    {
        name: "Samuel Adams",
        county: "Massachusetts (Historical)",
        comment: "The natural liberty of man is to be free from any superior power on Earth.",
        date: "1788-08-15"
    },
    {
        name: "George Mason",
        county: "Virginia (Historical)",
        comment: "The government should fear the people, not the other way around.",
        date: "1788-07-21"
    },
    {
        name: "Luther Martin",
        county: "Maryland (Historical)",
        comment: "This consolidation of power will be the death of state sovereignty.",
        date: "1788-04-18"
    },
    {
        name: "Lysander Spooner",
        county: "Massachusetts (Historical)",
        comment: "The Constitution has either authorized such a government as we have had, or has been powerless to prevent it.",
        date: "1867-12-01"
    },
    {
        name: "H.L. Mencken",
        county: "Maryland (Historical)",
        comment: "Every decent man is ashamed of the government he lives under.",
        date: "1925-05-15"
    },
    {
        name: "Murray Rothbard",
        county: "New York (Historical)",
        comment: "The state is a gang of thieves writ large.",
        date: "1973-09-30"
    },
    {
        name: "Rose Wilder Lane",
        county: "Missouri (Historical)",
        comment: "Freedom is self-control, no more, no less.",
        date: "1943-11-12"
    }
];

class DeclarationComponent {
    constructor(container) {
        this.container = container;
        this.signatures = [];
        this.counties = new Set();
        this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.isDeclarationPage = document.body.id === 'declaration_of_war_page';
    }

    async initialize() {
        if (!this.container) return;
        
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
                <h3>Sign the Declaration</h3>
                <form id="declaration-form">
                    <div class="form-group">
                        <input type="text" id="signer-name" name="name" placeholder="Your Name (Optional)" maxlength="50">
                    </div>
                    <div class="form-group">
                        <select id="signer-county" name="county" required>
                            <option value="">Choose your county...</option>
                            ${CALIFORNIA_COUNTIES.map(county => 
                                `<option value="${county}">${county}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <textarea id="signer-comment" name="comment" placeholder="Optional Comment" maxlength="280"></textarea>
                        <div class="char-count">0/280</div>
                    </div>
                    <button type="submit" class="sign-button">Sign Declaration</button>
                </form>
            </div>
            ${this.isDeclarationPage ? `
            <div class="signatures-list-container">
                <h4>Recent Signatures</h4>
                <div class="signature-grid"></div>
            </div>
            ` : ''}`; // Only show signatures list on declaration page

        // Add development signatures immediately in dev environment
        if (this.isDevelopment) {
            console.log('Development environment detected, adding historical signatures...');
            devSignatures.forEach(sig => {
                this.signatures.push(sig);
                this.counties.add(sig.county);
            });
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
            // Only try to fetch from worker in production
            if (!this.isDevelopment) {
                const response = await fetch(`${WORKER_URL}/api/declaration-stats`);
                const data = await response.json();
                this.signatures = data.signatures || [];
                this.counties = new Set(data.counties || []);
            }
        } catch (error) {
            console.log('Error fetching signatures (expected in development):', error);
            if (!this.isDevelopment) {
                this.showError();
            }
        }

        this.updateStats();
        if (this.isDeclarationPage) {
            this.renderSignatures(); // Only render signatures on declaration page
        }
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

        signatureGrid.innerHTML = this.signatures
            .slice(0, 10) // Show only the last 10 signatures
            .map(sig => `
                <div class="signature-entry">
                    <div class="signer-name">${sig.name}</div>
                    <div class="signer-county">${sig.county}</div>
                    ${sig.comment ? `<div class="signer-comment">${sig.comment}</div>` : ''}
                    <div class="sign-date">${new Date(sig.date).toLocaleDateString()}</div>
                </div>
            `)
            .join('');
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
                date: new Date().toISOString()
            };

            if (this.isDevelopment) {
                // In development, just add to local signatures
                this.signatures.unshift(signature);
                this.counties.add(signature.county);
                this.updateStats();
                this.renderSignatures();
                form.reset();
            } else {
                // In production, submit to worker
                try {
                    const response = await fetch(`${WORKER_URL}/api/sign`, {
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
                        this.renderSignatures();
                        form.reset();
                    }
                } catch (error) {
                    console.error('Error submitting signature:', error);
                }
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
    if (container) {
        const component = new DeclarationComponent(container);
        component.initialize();
    }
});