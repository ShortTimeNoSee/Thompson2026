class BallotPetitionComponent {
    constructor() {
        this.selectedCounty = null;
        this.countyData = null;
    }

    initialize() {
        this.populateCountyDropdown();
        this.setupEventListeners();
    }

    populateCountyDropdown() {
        const select = document.getElementById('county-select');
        if (!select) return;

        if (!window.REGISTRAR_DATA) {
            console.error('REGISTRAR_DATA not found. Ensure registrars.json is loaded.');
            return;
        }

        const counties = Object.keys(window.REGISTRAR_DATA.counties).sort();
        counties.forEach(county => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = county;
            select.appendChild(option);
        });

        const savedCounty = sessionStorage.getItem('declarationCounty');
        if (savedCounty && counties.includes(savedCounty)) {
            select.value = savedCounty;
            this.selectedCounty = savedCounty;
            this.countyData = window.REGISTRAR_DATA.counties[savedCounty];
            const countySubmit = document.getElementById('county-submit');
            if (countySubmit) {
                countySubmit.disabled = false;
            }
            
            const banner = document.createElement('div');
            banner.className = 'county-prefilled-banner';
            banner.innerHTML = `
                <span class="banner-icon">✓</span>
                <span>Your county (<strong>${savedCounty}</strong>) has been pre-selected from your Declaration signature.</span>
                <button class="banner-close" aria-label="Dismiss">✕</button>
            `;
            
            const countySelector = document.getElementById('county-selector');
            if (countySelector) {
                countySelector.insertBefore(banner, countySelector.firstChild);
                
                const closeBtn = banner.querySelector('.banner-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        banner.remove();
                    });
                }
                
                setTimeout(() => {
                    banner.classList.add('banner-visible');
                }, 100);
            }

            select.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    setupEventListeners() {
        const countySelect = document.getElementById('county-select');
        const countySubmit = document.getElementById('county-submit');
        const changeCountyBtn = document.getElementById('change-county-btn');
        const personalizedDownloadBtn = document.getElementById('download-personalized');
        const blankDownloadLink = document.querySelector('.download-button.blank');

        if (countySelect) {
            countySelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    countySubmit.disabled = false;
                    this.selectedCounty = e.target.value;
                    this.countyData = window.REGISTRAR_DATA.counties[e.target.value];
                } else {
                    countySubmit.disabled = true;
                }
            });
        }

        if (countySubmit) {
            countySubmit.addEventListener('click', () => {
                this.showInstructions();
            });
        }

        if (changeCountyBtn) {
            changeCountyBtn.addEventListener('click', () => {
                this.resetToCountySelection();
            });
        }

        if (personalizedDownloadBtn) {
            personalizedDownloadBtn.addEventListener('click', async (e) => {
                // Open window SYNCHRONOUSLY during click (required for Safari sandbox)
                // Must happen before any async work or Safari blocks it as a popup
                const pdfWindow = window.open('about:blank', '_blank');
                await this.downloadPersonalizedPDF(pdfWindow);
                this.updateSteps(3);
            });
        }

        if (blankDownloadLink) {
            blankDownloadLink.addEventListener('click', () => {
                this.updateSteps(3);
            });
        }
    }

    async downloadPersonalizedPDF(pdfWindow = null) {
        if (!this.selectedCounty) return;

        const btn = document.getElementById('download-personalized');
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<span>Generating PDF...</span>';

        try {
            if (!window.generatePersonalizedPetition) {
                const script = document.createElement('script');
                script.src = '/js/pdf-generator.js';
                document.head.appendChild(script);
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    setTimeout(reject, 10000);
                });
            }

            const success = await window.generatePersonalizedPetition(this.selectedCounty, pdfWindow);
            
            if (!success) {
                throw new Error('PDF generation failed');
            }

        } catch (error) {
            console.error('Failed to generate personalized PDF:', error);
            // Close pre-opened window on error
            if (pdfWindow && !pdfWindow.closed) {
                pdfWindow.close();
            }
            alert('Failed to generate personalized PDF. Please try the blank form instead.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    showInstructions() {
        if (!this.countyData) return;

        const countySelector = document.getElementById('county-selector');
        const instructionsSection = document.getElementById('instructions-section');

        countySelector.classList.add('hidden');
        instructionsSection.classList.remove('hidden');

        this.updateSteps(2);
        this.populateRegistrarInfo();
        this.populateInstructions();

        instructionsSection.scrollIntoView({ behavior: 'smooth' });
    }

    resetToCountySelection() {
        const countySelector = document.getElementById('county-selector');
        const instructionsSection = document.getElementById('instructions-section');

        instructionsSection.classList.add('hidden');
        countySelector.classList.remove('hidden');

        this.updateSteps(1);

        document.getElementById('county-select').value = '';
        document.getElementById('county-submit').disabled = true;

        countySelector.scrollIntoView({ behavior: 'smooth' });
    }

    updateSteps(currentStep) {
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    populateRegistrarInfo() {
        if (!this.countyData) return;

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${this.countyData.address}, ${this.countyData.city}, CA ${this.countyData.zip}`
        )}`;

        document.getElementById('registrar-name').textContent = `${this.countyData.name} County Elections Office`;
        document.getElementById('registrar-official').textContent = this.countyData.official;
        document.getElementById('registrar-street').textContent = this.countyData.address;
        document.getElementById('registrar-city').textContent = `${this.countyData.city}, CA ${this.countyData.zip}`;
        document.getElementById('registrar-phone').textContent = `Phone: ${this.countyData.phone}`;
        document.getElementById('registrar-hours').textContent = `Hours: ${this.countyData.hours}`;
        
        const websiteLink = document.getElementById('registrar-website');
        websiteLink.href = this.countyData.website;
        
        const mapsLink = document.getElementById('registrar-maps');
        mapsLink.href = mapsUrl;
    }

    populateInstructions() {
        if (!this.countyData) return;

        const countyNameDisplay = document.getElementById('county-name-display');
        const countyNamePrefill = document.getElementById('county-name-prefill');
        const countyEmphasis = document.querySelectorAll('.county-emphasis');
        const dropoffAddress = document.getElementById('dropoff-address-repeat');
        const officeHours = document.getElementById('office-hours-repeat');

        if (countyNameDisplay) {
            countyNameDisplay.textContent = this.countyData.name;
        }

        if (countyNamePrefill) {
            countyNamePrefill.textContent = this.countyData.name;
        }

        countyEmphasis.forEach(el => {
            el.textContent = `${this.countyData.name} County`;
        });

        if (dropoffAddress) {
            dropoffAddress.innerHTML = `
                <strong>${this.countyData.name} County Elections Office</strong><br>
                ${this.countyData.address}<br>
                ${this.countyData.city}, CA ${this.countyData.zip}
            `;
        }

        if (officeHours) {
            officeHours.textContent = this.countyData.hours;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('petition-interactive')) {
        const component = new BallotPetitionComponent();
        component.initialize();
    }
});

