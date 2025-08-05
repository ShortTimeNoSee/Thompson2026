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
    const apiBase = 'https://declaration-signatures.theedenwatcher.workers.dev/api/shop'; // Using the same worker as declarations

    // =================================================================================
    // API FUNCTIONS
    // =================================================================================

    async function fetchProducts() {
        try {
            const response = await fetch(`${apiBase}/products`);
            if (!response.ok) {
                throw new Error(`Failed to fetch products: ${response.statusText}`);
            }
            const products = await response.json();
            state.products = products.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                image: p.images[0]?.src || '',
                // You'll need to map this in your backend or here
                printful_variant_id: p.meta_data.find(m => m.key === '_printful_variant_id')?.value 
            }));
            state.loading = false;
        } catch (error) {
            state.error = error.message;
            state.loading = false;
            console.error(error);
        }
        render();
    }

    // =================================================================================
    // RENDER FUNCTIONS
    // =================================================================================

    function render() {
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
            shopGrid.innerHTML = `<p class="error-message">Failed to load products. ${state.error}</p>`;
            return;
        }

        if (state.products.length === 0) {
            shopGrid.innerHTML = '<p>No products found. Please check back later.</p>';
            return;
        }

        shopGrid.innerHTML = state.products.map(product => `
            <div class="product-card">
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p class="product-price">$${product.price}</p>
                    <button class="cta-button primary add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `).join('');
    }

    function renderCart() {
        if (!cartContainer) return;

        if (state.cart.length === 0) {
            cartContainer.innerHTML = '<h3>Your Cart</h3><p>Your cart is empty.</p>';
            return;
        }

        const cartTotal = state.cart.reduce((total, item) => {
            const product = state.products.find(p => p.id === item.product_id);
            return total + (parseFloat(product.price) * item.quantity);
        }, 0);

        cartContainer.innerHTML = `
            <h3>Your Cart</h3>
            <div class="cart-items">
                ${state.cart.map(item => {
                    const product = state.products.find(p => p.id === item.product_id);
                    return `
                        <div class="cart-item">
                            <span>${product.name} (x${item.quantity})</span>
                            <span>$${(product.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
            <p class="cart-total">Total: $${cartTotal.toFixed(2)}</p>
            <button id="checkout-btn" class="cta-button primary">Proceed to Checkout</button>
        `;
    }

    // =================================================================================
    // EVENT LISTENERS & LOGIC
    // =================================================================================

    function addToCart(productId) {
        const existingItem = state.cart.find(item => item.product_id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            state.cart.push({ product_id: productId, quantity: 1 });
        }
        renderCart();
    }

    shopGrid.addEventListener('click', (e) => {
        if (e.target.matches('.add-to-cart-btn')) {
            const productId = parseInt(e.target.dataset.productId, 10);
            addToCart(productId);
        }
    });
    
    // NOTE: The checkout process is complex and requires more steps.
    // This is a simplified version to illustrate the flow.
    // You'll need a form to collect shipping info.
    cartContainer.addEventListener('click', async (e) => {
        if (e.target.id === 'checkout-btn') {
            alert("Checkout process initiated! See the console for next steps. You'll need to build a form to collect user address information before this can be fully functional.");
            
            // 1. Create WooCommerce Order to get an order number and lock in items
            const wcOrderPayload = {
                line_items: state.cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
            };

            console.log("Creating WooCommerce order...");
            const wcResponse = await fetch(`${apiBase}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wcOrderPayload)
            });

            if (!wcResponse.ok) {
                console.error('Failed to create WooCommerce order.', await wcResponse.json());
                return;
            }
            
            const wcOrder = await wcResponse.json();
            console.log('WooCommerce Order Created:', wcOrder);

            // 2. You would now collect shipping/payment details via a form.
            // For now, we'll use placeholder data.
            const shippingDetails = {
                name: "John Doe",
                address1: "123 Freedom Way",
                city: "Sacramento",
                state_code: "CA",
                country_code: "US",
                zip: "95814"
            };

            // 3. Create Printful Order for fulfillment
            const printfulOrderPayload = {
                recipient: shippingDetails,
                items: state.cart.map(item => {
                    const product = state.products.find(p => p.id === item.product_id);
                    return {
                        variant_id: product.printful_variant_id, // Ensure this mapping exists!
                        quantity: item.quantity
                    };
                }),
                external_id: wcOrder.id // Link to the WC order
            };
            
            console.log("Creating Printful order...", printfulOrderPayload);
            const printfulResponse = await fetch(`${apiBase}/printful/order`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(printfulOrderPayload)
            });

            if (!printfulResponse.ok) {
                console.error('Failed to create Printful order.', await printfulResponse.json());
                return;
            }

            const printfulOrder = await printfulResponse.json();
            console.log('Printful Order Created:', printfulOrder);

            // 4. Clear cart and show confirmation
            state.cart = [];
            render();
            alert(`Order #${wcOrder.id} successfully placed!`);
        }
    });

    // =================================================================================
    // INITIALIZATION
    // =================================================================================
    
    fetchProducts();
});
