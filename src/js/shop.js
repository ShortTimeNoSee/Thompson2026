// =================================================================================
// Shop Module - Handles headless WooCommerce integration
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        products: [],
        cart: [],
        loading: true,
        error: null,
    };

    // DOM Elements
    const shopGrid = document.getElementById('shop-grid');
    const cartContainer = document.getElementById('cart-container');
    const productDetailContainer = document.getElementById('product-detail-container');
    const apiBase = 'https://declaration-signatures.theedenwatcher.workers.dev/api/shop';

    // =================================================================================
    // ROUTING LOGIC
    // =================================================================================

    function handleRouting() {
        // Check if we're on a product detail page
        if (productDetailContainer) {
            if (typeof window.productId !== 'undefined') {
                fetchSingleProduct(window.productId);
                return;
            }
            
            // Fallback to URL parameter for direct access
            const params = new URLSearchParams(window.location.search);
            const productId = params.get('product');
            if (productId) {
                fetchSingleProduct(productId);
                return;
            }
            
            window.location.href = '/shop/';
        } else if (shopGrid) {
            fetchProducts();
        }
    }

    // =================================================================================
    // API FUNCTIONS
    // =================================================================================

    async function fetchProducts() {
        setLoading(true);
        try {
            const response = await fetch(`${apiBase}/products`);
            if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
            state.products = await response.json();
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
            render();
        }
    }

    async function fetchSingleProduct(productId) {
        setLoading(true);
        try {
            const productResponse = await fetch(`${apiBase}/products/${productId}`);
            if (!productResponse.ok) throw new Error(`Failed to fetch product: ${productResponse.statusText}`);
            const product = await productResponse.json();

            if (product.type === 'variable') {
                const variationsResponse = await fetch(`${apiBase}/products/${productId}/variations`);
                if (!variationsResponse.ok) throw new Error(`Failed to fetch variations: ${variationsResponse.statusText}`);
                product.variations = await variationsResponse.json();
            }
            renderProductDetail(product);
        } catch (error) {
            setError(error.message);
            render();
        } finally {
            setLoading(false);
        }
    }

    // =================================================================================
    // RENDER FUNCTIONS
    // =================================================================================

    function render() {
        if (productDetailContainer) {
             if (state.error) productDetailContainer.innerHTML = `<p class="error-message">${state.error}</p>`;
             if (state.loading) productDetailContainer.innerHTML = '<div class="loading-spinner"></div>';
            return;
        }
        renderShopGrid();
        renderCart();
    }
    
    function renderShopGrid() {
        if (!shopGrid) return;
        if (state.loading) {
            shopGrid.innerHTML = '<div class="loading-spinner"></div>';
            return;
        }
        if (state.error) {
            shopGrid.innerHTML = `<p class="error-message">${state.error}</p>`;
            return;
        }
        if (state.products.length === 0) {
            shopGrid.innerHTML = '<p>No products found.</p>';
            return;
        }

        shopGrid.innerHTML = state.products.map(product => {
            const cleanPrice = cleanPriceHtml(product.price_html);
            // SEO-friendly URL slug from product name
            const slug = product.name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-');
            
            return `
            <a href="/shop/product/?product=${product.id}" class="product-card-link" aria-label="View details for ${product.name}">
                <div class="product-card">
                    <img src="${product.images[0]?.src || ''}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <div class="product-price">${cleanPrice}</div>
                    </div>
                </div>
            </a>
        `}).join('');
    }

    function renderProductDetail(product) {
        if (!productDetailContainer) return;

        const cleanDescription = DOMPurify.sanitize(product.description);
        const cleanPrice = cleanPriceHtml(product.price_html);
        
        const thumbnailsHtml = product.images.map((img, index) => `
            <img src="${img.src}" alt="${img.alt || product.name}" class="thumbnail ${index === 0 ? 'active' : ''}" data-full-src="${img.src}" tabindex="0" role="button" aria-label="View ${product.name} image ${index + 1}">
        `).join('');

        let variationOptions = '';
        if (product.type === 'variable' && product.variations) {
            const attributeName = product.attributes[0]?.name || 'Select Option';
            // Sort variations by size order (S, M, L, XL, 2XL, etc.)
            const sortedVariations = [...product.variations].sort((a, b) => {
                const sizeA = a.attributes[0]?.option || '';
                const sizeB = b.attributes[0]?.option || '';
                return compareSizes(sizeA, sizeB);
            });
            variationOptions = `
                <div class="product-variants">
                    <label for="variant-select">${attributeName}:</label>
                    <select id="variant-select" aria-describedby="variant-help">
                        <option value="">Choose ${attributeName.toLowerCase()}...</option>
                        ${sortedVariations.map(v => `
                            <option value="${v.id}" data-price="${v.price}">
                                ${v.attributes.map(attr => attr.option).join(' - ')} ($${v.price})
                            </option>
                        `).join('')}
                    </select>
                    <div id="variant-help" class="sr-only">Select a ${attributeName.toLowerCase()} to see the price and enable purchasing</div>
                </div>
            `;
        }
        
        // Generate quantity options (1-999)
        const quantityOptions = Array.from({length: 999}, (_, i) => i + 1)
            .map(num => `<option value="${num}">${num}</option>`).join('');
        
        productDetailContainer.innerHTML = `
            <div class="product-detail">
                <div class="product-gallery">
                    <img src="${product.images[0]?.src}" alt="${product.name}" class="main-image">
                    <div class="product-thumbnails" role="group" aria-label="Product image gallery">${thumbnailsHtml}</div>
                </div>
                <div class="product-summary">
                    <h1>${product.name}</h1>
                    <div class="product-price" aria-live="polite">${cleanPrice}</div>
                    <div class="product-short-description">${product.short_description}</div>
                    <div class="product-options">
                        ${variationOptions}
                        <div class="product-quantity">
                            <label for="quantity-select">Quantity:</label>
                            <select id="quantity-select" aria-describedby="quantity-help">
                                ${quantityOptions}
                            </select>
                            <div id="quantity-help" class="sr-only">Select how many items to add to your cart</div>
                        </div>
                    </div>
                    <div class="add-to-cart-wrapper">
                        <button class="cta-button primary add-to-cart-btn" data-product-id="${product.id}" ${product.type === 'variable' ? 'disabled aria-disabled="true"' : 'aria-disabled="false"'}>Add to Cart</button>
                        ${product.type === 'variable' ? '<div class="add-to-cart-tooltip" role="tooltip">Please select a size first</div>' : ''}
                    </div>
                </div>
                <div class="product-detail-cart">
                    <h3>Your Cart</h3>
                    <div id="product-page-cart">Loading cart...</div>
                </div>
                <div class="product-full-description">
                    <h3>Product Details</h3>
                    ${cleanDescription}
                </div>
            </div>
        `;
        
        // Render cart in the product detail sidebar
        renderProductPageCart();
    }


    function renderCart() {
        const cartElement = cartContainer || document.getElementById('cart-container-placeholder');
        if (!cartElement) return;

        if (state.cart.length === 0) {
            cartElement.innerHTML = '<h3>Your Cart</h3><p>Your cart is empty.</p>';
            return;
        }

        const cartTotal = state.cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);

        cartElement.innerHTML = `
            <h3>Your Cart</h3>
            <div class="cart-items" role="list">
                ${state.cart.map(item => `
                    <div class="cart-item" role="listitem">
                        <span class="cart-item-name">${item.name} (x${item.quantity})</span>
                        <div class="cart-item-details">
                            <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                            <button class="remove-from-cart-btn" data-product-id="${item.product_id}" data-variant-id="${item.variant_id || ''}" aria-label="Remove ${item.name} from cart">&times;</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <p class="cart-total" aria-live="polite">Total: $${cartTotal.toFixed(2)}</p>
            <button id="checkout-btn" class="cta-button primary">Checkout</button>
        `;
    }
    
    function renderProductPageCart() {
        const productCartElement = document.getElementById('product-page-cart');
        if (!productCartElement) return;

        if (state.cart.length === 0) {
            productCartElement.innerHTML = '<p>Your cart is empty.</p>';
            return;
        }

        const cartTotal = state.cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);

        productCartElement.innerHTML = `
            <div class="cart-items" role="list">
                ${state.cart.map(item => `
                    <div class="cart-item" role="listitem">
                        <span class="cart-item-name">${item.name} (x${item.quantity})</span>
                        <div class="cart-item-details">
                            <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                            <button class="remove-from-cart-btn" data-product-id="${item.product_id}" data-variant-id="${item.variant_id || ''}" aria-label="Remove ${item.name} from cart">&times;</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <p class="cart-total" aria-live="polite">Total: $${cartTotal.toFixed(2)}</p>
            <button id="checkout-btn" class="cta-button primary">Checkout</button>
        `;
    }

    // =================================================================================
    // LOGIC & STATE CHANGES
    // =================================================================================

    function addToCart(productId, variantId, quantity, productName, productPrice) {
        const cartItemIdentifier = variantId || productId;
        const existingItem = state.cart.find(item => (item.variant_id || item.product_id) === cartItemIdentifier);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            state.cart.push({
                product_id: productId,
                variant_id: variantId,
                quantity: quantity,
                name: productName,
                price: productPrice,
            });
        }
        saveCartToStorage();
        renderCart();
        renderProductPageCart();
    }
    
    function cleanPriceHtml(priceHtml) {
        // Remove screen reader text and clean up the price HTML
        return priceHtml
            .replace(/<span class="screen-reader-text">.*?<\/span>/g, '')
            .replace(/<span class="price-range">.*?<\/span>/g, '')
            .trim();
    }
    
    function compareSizes(sizeA, sizeB) {
        // Define size order
        const sizeOrder = {
            'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5,
            '2XL': 6, '3XL': 7, '4XL': 8, '5XL': 9, '6XL': 10
        };
        
        const orderA = sizeOrder[sizeA] || 999;
        const orderB = sizeOrder[sizeB] || 999;
        
        return orderA - orderB;
    }

    function removeFromCart(productId, variantId) {
        const cartItemIdentifier = variantId || productId;
        const itemIndex = state.cart.findIndex(item => (item.variant_id || item.product_id) == cartItemIdentifier);

        if (itemIndex > -1) {
            state.cart.splice(itemIndex, 1);
        }
        saveCartToStorage();
        renderCart();
        renderProductPageCart();
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
    }

    function setError(errorMessage) {
        state.error = errorMessage;
        console.error(errorMessage);
    }

    // =================================================================================
    // LOCAL STORAGE
    // =================================================================================

    function saveCartToStorage() {
        try {
            localStorage.setItem('thompson2026_cart', JSON.stringify(state.cart));
        } catch (e) { console.warn("Could not save cart.", e); }
    }

    function loadCartFromStorage() {
        try {
            const savedCart = localStorage.getItem('thompson2026_cart');
            if (savedCart) state.cart = JSON.parse(savedCart);
        } catch (e) {
            console.warn("Could not load cart.", e);
            state.cart = [];
        }
    }

    // =================================================================================
    // EVENT LISTENERS
    // =================================================================================

    function setupEventListeners() {
        document.body.addEventListener('click', async (e) => {
            if (e.target.matches('.add-to-cart-btn')) {
                e.preventDefault();
                const button = e.target;
                const productId = parseInt(button.dataset.productId, 10);
                const variantSelect = document.getElementById('variant-select');
                const quantitySelect = document.getElementById('quantity-select');
                
                let variantId = null;
                let productName = document.querySelector('.product-summary h1')?.textContent || 'Product';
                let productPrice = '0';
                const quantity = quantitySelect ? parseInt(quantitySelect.value, 10) : 1;

                if (variantSelect) {
                    variantId = parseInt(variantSelect.value, 10);
                    if (!variantId) {
                        variantSelect.focus();
                        showTooltipBriefly();
                        return;
                    }
                    const selectedOption = variantSelect.options[variantSelect.selectedIndex];
                    const baseProductName = document.querySelector('.product-summary h1').textContent;
                    productName = `${baseProductName} - ${selectedOption.textContent.split('(')[0].trim()}`;
                    productPrice = selectedOption.dataset.price;
                } else {
                    const priceElement = document.querySelector('.product-summary .product-price');
                    productPrice = priceElement ? priceElement.textContent.replace(/[^\d.-]/g, '') : '0';
                }
                
                addToCart(productId, variantId, quantity, productName, productPrice);

                button.textContent = 'Added!';
                button.disabled = true;
                button.setAttribute('aria-disabled', 'true');
                setTimeout(() => {
                    button.textContent = 'Add to Cart';
                    const variantSelect = document.getElementById('variant-select');
                    if (!variantSelect || variantSelect.value) {
                        button.disabled = false;
                        button.setAttribute('aria-disabled', 'false');
                    }
                }, 1500);
            }

            if (e.target.matches('.remove-from-cart-btn')) {
                const productId = parseInt(e.target.dataset.productId, 10);
                const variantId = parseInt(e.target.dataset.variantId, 10) || null;
                removeFromCart(productId, variantId);
            }

            if (e.target.id === 'checkout-btn') {
                handleCheckout();
            }

            if (e.target.matches('.thumbnail')) {
                const mainImage = document.querySelector('.main-image');
                mainImage.src = e.target.dataset.fullSrc;
                mainImage.alt = e.target.alt;
                document.querySelectorAll('.thumbnail').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                e.target.classList.add('active');
                e.target.setAttribute('aria-selected', 'true');
            }
        });

        document.body.addEventListener('change', (e) => {
            if (e.target.id === 'variant-select') {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const price = selectedOption.dataset.price;
                const priceElement = document.querySelector('.product-summary .product-price');
                const addToCartBtn = document.querySelector('.add-to-cart-btn');
                const requirementMessage = document.querySelector('.variant-requirement');

                if (price) {
                    priceElement.innerHTML = `$${price}`;
                    addToCartBtn.disabled = false;
                    addToCartBtn.setAttribute('aria-disabled', 'false');
                } else {
                    addToCartBtn.disabled = true;
                    addToCartBtn.setAttribute('aria-disabled', 'true');
                }
            }
        });
        
        // Add keyboard support for thumbnails
        document.body.addEventListener('keydown', (e) => {
            if (e.target.matches('.thumbnail') && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.target.click();
            }
        });
        
        // Mobile tap support for tooltip
        document.body.addEventListener('touchstart', (e) => {
            if (e.target.matches('.add-to-cart-btn') && e.target.disabled) {
                e.preventDefault();
                const wrapper = e.target.closest('.add-to-cart-wrapper');
                if (wrapper) {
                    wrapper.classList.add('mobile-tapped');
                    positionTooltip(wrapper);
                    setTimeout(() => {
                        wrapper.classList.remove('mobile-tapped');
                    }, 3000);
                }
            }
        });
        
        // Position tooltip on hover/focus
        document.body.addEventListener('mouseenter', (e) => {
            if (e.target.matches('.add-to-cart-wrapper')) {
                positionTooltip(e.target);
            }
        }, true);
    }

    async function handleCheckout() {
        if (state.cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        // Show customer info form first
        showCustomerInfoForm();
    }

    function showCustomerInfoForm() {
        const formModal = document.createElement('div');
        formModal.className = 'checkout-modal';
        formModal.innerHTML = `
            <div class="checkout-form-container">
                <div class="checkout-form-header">
                    <h3>Checkout Information</h3>
                    <button class="close-checkout" onclick="this.closest('.checkout-modal').remove()">&times;</button>
                </div>
                <form id="checkout-customer-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="checkout-first-name">First Name *</label>
                            <input type="text" id="checkout-first-name" name="first_name" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-last-name">Last Name *</label>
                            <input type="text" id="checkout-last-name" name="last_name" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="checkout-email">Email *</label>
                        <input type="email" id="checkout-email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="checkout-phone">Phone</label>
                        <input type="tel" id="checkout-phone" name="phone">
                    </div>
                    <div class="form-group">
                        <label for="checkout-address">Address *</label>
                        <input type="text" id="checkout-address" name="address_1" required>
                    </div>
                    <div class="form-group">
                        <label for="checkout-address2">Address Line 2</label>
                        <input type="text" id="checkout-address2" name="address_2">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="checkout-city">City *</label>
                            <input type="text" id="checkout-city" name="city" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-state">State *</label>
                            <input type="text" id="checkout-state" name="state" required>
                        </div>
                        <div class="form-group">
                            <label for="checkout-zip">ZIP Code *</label>
                            <input type="text" id="checkout-zip" name="postcode" required>
                        </div>
                    </div>
                    <div class="checkout-summary">
                        <h4>Order Summary</h4>
                        ${state.cart.map(item => `
                            <div class="checkout-item">
                                <span>${item.name} (x${item.quantity})</span>
                                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                        <div class="checkout-total">
                            <strong>Total: $${state.cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0).toFixed(2)}</strong>
                        </div>
                    </div>
                    <button type="submit" class="cta-button primary" id="complete-checkout-btn">Complete Order</button>
                </form>
            </div>
        `;
        
        formModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            overflow-y: auto;
        `;
        
        const formContainer = formModal.querySelector('.checkout-form-container');
        formContainer.style.cssText = `
            background: var(--secondary-color);
            padding: 2rem;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid var(--accent-color);
            position: relative;
        `;
        
        // Style the form elements
        const style = document.createElement('style');
        style.textContent = `
            .checkout-form-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                border-bottom: 1px solid var(--accent-alpha);
                padding-bottom: 1rem;
            }
            .close-checkout {
                background: none;
                border: none;
                color: var(--accent-color);
                font-size: 2rem;
                cursor: pointer;
                line-height: 1;
            }
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            .form-row.three-col {
                grid-template-columns: 1fr 1fr 1fr;
            }
            .checkout-form-container .form-group {
                margin-bottom: 1rem;
            }
            .checkout-form-container .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--text-color);
                font-weight: 600;
            }
            .checkout-form-container .form-group input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid var(--accent-alpha);
                border-radius: 4px;
                background: var(--primary-color);
                color: var(--text-color);
                font-size: 1rem;
            }
            .checkout-form-container .form-group input:focus {
                border-color: var(--accent-color);
                outline: none;
                box-shadow: 0 0 0 2px var(--accent-alpha);
            }
            .checkout-summary {
                background: var(--primary-color);
                padding: 1.5rem;
                border-radius: 4px;
                margin: 1.5rem 0;
                border: 1px solid var(--accent-alpha);
            }
            .checkout-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--accent-alpha);
            }
            .checkout-total {
                margin-top: 1rem;
                padding-top: 1rem;
                border-top: 2px solid var(--accent-color);
                text-align: right;
                font-size: 1.2rem;
                color: var(--accent-color);
            }
            @media (max-width: 768px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
                .form-row.three-col {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(formModal);
        
        // Handle form submission
        const form = formModal.querySelector('#checkout-customer-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const customerData = Object.fromEntries(formData);
            
            formModal.remove();
            await processCheckout(customerData);
        });
    }

    async function processCheckout(customerData) {
        setLoading(true);
        
        try {
            // Create WooCommerce order with cart items and customer data
            const orderData = {
                set_paid: false,
                billing: {
                    first_name: customerData.first_name,
                    last_name: customerData.last_name,
                    email: customerData.email,
                    phone: customerData.phone || '',
                    address_1: customerData.address_1,
                    address_2: customerData.address_2 || '',
                    city: customerData.city,
                    state: customerData.state,
                    postcode: customerData.postcode,
                    country: 'US'
                },
                shipping: {
                    first_name: customerData.first_name,
                    last_name: customerData.last_name,
                    address_1: customerData.address_1,
                    address_2: customerData.address_2 || '',
                    city: customerData.city,
                    state: customerData.state,
                    postcode: customerData.postcode,
                    country: 'US'
                },
                line_items: state.cart.map(item => ({
                    product_id: item.product_id,
                    variation_id: item.variant_id || 0,
                    quantity: item.quantity
                })),
                status: 'pending'
            };

            console.log('Creating WooCommerce order...', orderData);

            const response = await fetch(`${apiBase}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Order creation failed:', errorData);
                throw new Error(`Failed to create order: ${response.statusText}`);
            }

            const order = await response.json();
            console.log('Order created successfully:', order);

            // Clear the cart
            state.cart = [];
            saveCartToStorage();
            renderCart();
            renderProductPageCart();

            // Redirect to WooCommerce order payment endpoint to render gateway form
            const checkoutUrl = `https://shop.thompson2026.com/checkout/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`;
            window.open(checkoutUrl, '_blank');

            // Show success message
            showCheckoutSuccess(order.id);

        } catch (error) {
            console.error('Checkout error:', error);
            alert(`Checkout failed: ${error.message}. Please try again.`);
        } finally {
            setLoading(false);
        }
    }

    function showCheckoutSuccess(orderId) {
        const successMessage = document.createElement('div');
        successMessage.className = 'checkout-success';
        successMessage.innerHTML = `
            <div class="success-content">
                <h3>Order Created Successfully!</h3>
                <p>Order #${orderId} has been created.</p>
                <p>You've been redirected to complete payment.</p>
                <button onclick="this.parentElement.parentElement.remove()" class="cta-button primary">Continue Shopping</button>
            </div>
        `;
        successMessage.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        successMessage.querySelector('.success-content').style.cssText = `
            background: var(--secondary-color);
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            max-width: 400px;
            border: 1px solid var(--accent-color);
        `;
        document.body.appendChild(successMessage);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (successMessage.parentElement) {
                successMessage.remove();
            }
        }, 10000);
    }

    // =================================================================================
    // INITIALIZATION
    // =================================================================================
    
    if (productDetailContainer && !cartContainer) {
        const placeholder = document.createElement('div');
        placeholder.id = 'cart-container-placeholder';
        productDetailContainer.appendChild(placeholder);
    }
    
    // Add screen reader only class for accessibility
    const style = document.createElement('style');
    style.textContent = `
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        
        /* Ensure mobile viewport */
        @media (max-width: 768px) {
            body {
                font-size: 16px;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Tooltip positioning function
    function positionTooltip(wrapper) {
        const tooltip = wrapper.querySelector('.add-to-cart-tooltip');
        if (!tooltip) return;
        
        const rect = wrapper.getBoundingClientRect();
        const tooltipHeight = 60;
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        
        tooltip.classList.remove('tooltip-below');
        
        if (spaceAbove < tooltipHeight && spaceBelow > tooltipHeight) {
            tooltip.classList.add('tooltip-below');
        }
    }
    
    function showTooltipBriefly() {
        const wrapper = document.querySelector('.add-to-cart-wrapper');
        if (!wrapper) return;
        
        wrapper.classList.add('show-tooltip');
        positionTooltip(wrapper);
        
        setTimeout(() => {
            wrapper.classList.remove('show-tooltip');
        }, 3000);
    }
    
    loadCartFromStorage();
    handleRouting();
    setupEventListeners();
});
