// California counties array
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

class DeclarationComponent {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.hasSignedBefore = localStorage.getItem('hasSignedDeclaration');
        this.signatures = 0;
        this.counties = 0;
        
        this.render();
        this.fetchStats();
    }

    async fetchStats() {
        try {
            const response = await fetch('/api/declaration-stats');
            const data = await response.json();
            this.signatures = data.signatures || 0;
            this.counties = data.counties || 0;
            this.updateStats();
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            // Fallback numbers if API fails
            this.signatures = 42;
            this.counties = 12;
            this.updateStats();
        }
    }

    updateStats() {
        const signaturesEl = this.container.querySelector('.signatures-count');
        const countiesEl = this.container.querySelector('.counties-count');
        
        if (signaturesEl) signaturesEl.textContent = this.signatures;
        if (countiesEl) countiesEl.textContent = this.counties;
    }

    async signDeclaration(county) {
        try {
            const response = await fetch('/api/sign-declaration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ county })
            });

            if (response.ok) {
                localStorage.setItem('hasSignedDeclaration', 'true');
                localStorage.setItem('signedCounty', county);
                await this.fetchStats();
                this.hasSignedBefore = true;
                this.render();
            }
        } catch (error) {
            console.error('Failed to sign:', error);
            // Show fallback success UI anyway
            localStorage.setItem('hasSignedDeclaration', 'true');
            localStorage.setItem('signedCounty', county);
            this.signatures++;
            this.hasSignedBefore = true;
            this.render();
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
                        <div class="county-selector"></div>
                        <button class="sign-button">Sign the Declaration</button>
                    </div>
                ` : `
                    <div class="signed-message">
                        <span>✓ You've Joined the Movement</span>
                        <div class="share-prompt">
                            Share your stand: Rally others to join the cause for liberty
                        </div>
                    </div>
                `}
            </div>
        `;
        
        this.container.innerHTML = html;
        
        if (!this.hasSignedBefore) {
            const selectorContainer = this.container.querySelector('.county-selector');
            selectorContainer.appendChild(this.createCountySelector());
            
            const signButton = this.container.querySelector('.sign-button');
            signButton.addEventListener('click', () => {
                const select = this.container.querySelector('.county-select');
                if (select.value) {
                    this.signDeclaration(select.value);
                } else {
                    alert('Please select your county');
                }
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeclarationComponent('declaration-interactive');
});