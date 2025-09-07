/**
 * THIS FILE IS THE WORKER.JS FILE USED ON MY CLOUDFLARE WORKER.
 * It is included here purely for open-source viewing.
 */
export default {
  async fetch(request, env) {
    const allowedOrigins = [
      "https://thompson2026.com",
      "https://www.thompson2026.com",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:8083",
      "http://127.0.0.1:8083",
      "null",
      "file://"
    ];

    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    const origin = request.headers.get("Origin");
    const isAllowed = origin && allowedOrigins.includes(origin);

    if (request.method === "OPTIONS") {
      const headers = { ...corsHeaders, "Vary": "Origin" };
      if (isAllowed) headers["Access-Control-Allow-Origin"] = origin;
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const clientIP = request.headers.get("CF-Connecting-IP");

    // Cart handoff: sign payload and return redirect URL to shop site
    if (url.pathname === '/api/cart-handoff') {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' } });
      }
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } });
      }
      const jsonError = (function requireJSON(req){
        const ct = req.headers.get('Content-Type') || '';
        if (!ct.includes('application/json')) {
          return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } });
        }
        return null;
      })(request);
      if (jsonError) return jsonError;

      try {
        const body = await request.json();
        const items = Array.isArray(body.items) ? body.items : [];
        const shipping = body.shipping || {};
        const billing = body.billing || {};
        const returnUrl = body.return_url || 'https://thompson2026.com/shop/';

        if (!items.length) {
          return new Response(JSON.stringify({ error: 'No items provided' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        if (!env.CART_HANDOFF_SECRET) {
          return new Response(JSON.stringify({ error: 'Server not configured: CART_HANDOFF_SECRET missing' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }

        const payload = {
          items: items.map(it => ({
            product_id: parseInt(it.product_id, 10),
            variation_id: it.variant_id ? parseInt(it.variant_id, 10) : 0,
            quantity: parseInt(it.quantity, 10) || 1
          })),
          shipping,
          billing,
          ts: Date.now(),
          return_url: returnUrl
        };

        const enc = new TextEncoder();
        const secretKey = await crypto.subtle.importKey(
          'raw',
          enc.encode(env.CART_HANDOFF_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const dataStr = JSON.stringify(payload);
        const sigBuf = await crypto.subtle.sign('HMAC', secretKey, enc.encode(dataStr));

        function toB64UrlFromBytes(bytes) {
          let binary = '';
          const len = bytes.length;
          for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
        }

        const dataB64 = toB64UrlFromBytes(enc.encode(dataStr));
        const sigB64 = toB64UrlFromBytes(new Uint8Array(sigBuf));

        const redirectUrl = `https://shop.thompson2026.com/cart-handoff/?data=${dataB64}&sig=${sigB64}`;

        return new Response(
          JSON.stringify({ redirectUrl }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      } catch (e) {
        console.error('Cart handoff error:', e);
        return new Response(JSON.stringify({ error: 'Failed to create handoff', details: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
    }

    // Route for Printful API
    if (url.pathname.startsWith('/api/shop/printful/order')) {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' } });
      }
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      
      const target = 'https://api.printful.com/orders';
      
      const printfulRequest = new Request(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.PRINTFUL_KEY}`
        },
        body: request.body
      });

      const printfulResponse = await fetch(printfulRequest);
      const data = await printfulResponse.text();
      
      return new Response(data, {
        status: printfulResponse.status,
        headers: { ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin', 'Content-Type': 'application/json' }
      });
    }

    // Route for WooCommerce API
    if (url.pathname.startsWith('/api/shop/')) {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' } });
      }
      const path = url.pathname.replace('/api/shop', '');
      const target = `https://shop.thompson2026.com/wp-json/wc/v3${path}`;
      
      const credentials = `${env.WC_USER}:${env.WC_PASS}`;
      const basicAuth = btoa(credentials);
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      };
      
      // Add any query parameters from the original request
      const newUrl = new URL(target);
      for (const [key, value] of url.searchParams) {
        newUrl.searchParams.set(key, value);
      }

      const wcRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: headers,
        body: ['GET', 'DELETE'].includes(request.method) ? undefined : request.body
      });

      const wcResponse = await fetch(wcRequest);
      const data = await wcResponse.text();

      // Log the error for debugging
      if (!wcResponse.ok) {
        console.error(`WooCommerce API Error: ${wcResponse.status} - ${wcResponse.statusText}`);
        console.error(`Request URL: ${newUrl}`);
        console.error(`Response: ${data}`);
      }

      return new Response(data, {
        status: wcResponse.status,
        headers: { ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin', 'Content-Type': 'application/json' }
      });
    }

    // Helper: Enforce that POST requests include a JSON Content-Type header.
    function requireJSON(req) {
      const ct = req.headers.get("Content-Type") || "";
      if (!ct.includes("application/json")) {
        return new Response(
          JSON.stringify({ error: "Content-Type must be application/json" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      return null;
    }

    // Helper: Escape HTML special characters to prevent XSS.
    function escapeHTML(str) {
      if (typeof str !== "string") return str;
      return str.replace(/[&<>"']/g, (match) => {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[match];
      });
    }

    // Verify admin authentication for endpoints under /api/admin/
    const isAdminRequest = url.pathname.includes("/api/admin/");
    if (isAdminRequest) {
      if (!isAllowed) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || authHeader !== `Bearer ${env.ADMIN_KEY}`) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
    }

    // Admin endpoint: Edit signature
    if (url.pathname.includes("/api/admin/edit-signature")) {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const { oldTimestamp, name, county, timestamp, comment } = await request.json();

        if (!oldTimestamp || !county || !timestamp) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
          );
        }

        // Sanitize all text inputs.
        const sanitizedName = escapeHTML(name?.trim() || "Citizen");
        const sanitizedCounty = escapeHTML(county);
        const sanitizedComment = escapeHTML(comment?.trim() || "");

        // Get and update signatures list.
        let signaturesList = [];
        try {
          signaturesList = JSON.parse(await env.DECLARATION_KV.get("signatures_list") || "[]");
        } catch (e) {
          console.error("Error parsing signatures list:", e);
          signaturesList = [];
        }

        const signatureIndex = signaturesList.findIndex(sig => sig.timestamp === oldTimestamp);
        if (signatureIndex === -1) {
          return new Response(
            JSON.stringify({ error: "Signature not found" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        signaturesList[signatureIndex] = {
          name: sanitizedName,
          county: sanitizedCounty,
          comment: sanitizedComment,
          timestamp,
          metadata: signaturesList[signatureIndex].metadata || {}
        };

        await env.DECLARATION_KV.put("signatures_list", JSON.stringify(signaturesList));

        const uniqueCounties = [...new Set(signaturesList.map(sig => sig.county))];
        await env.DECLARATION_KV.put("counties_list", JSON.stringify(uniqueCounties));
        await env.DECLARATION_KV.put("counties_represented", uniqueCounties.length.toString());

        return new Response(
          JSON.stringify({ success: true, signatures: signaturesList.length, counties: uniqueCounties.length, signaturesList }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      } catch (error) {
        console.error("Edit signature error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to edit signature", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
    }

    // Admin endpoint: Remove signature
    if (url.pathname.includes("/api/admin/remove-signature")) {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const { timestamp } = await request.json();

        let signaturesList = [];
        try {
          signaturesList = JSON.parse(await env.DECLARATION_KV.get("signatures_list") || "[]");
        } catch (e) {
          console.error("Error parsing signatures list:", e);
          signaturesList = [];
        }

        // Optionally remove rate-limiting and IP tracking for the signature being removed.
        const signature = signaturesList.find(sig => sig.timestamp === timestamp);
        if (signature?.metadata?.ip) {
          const ip = signature.metadata.ip;
          await env.DECLARATION_KV.delete(`rate_limit:${ip}`);
          await env.DECLARATION_KV.delete(`ip_county:${ip}`);
          await env.DECLARATION_KV.delete(`ip_sign_count:${ip}`);
        }

        const newSignaturesList = signaturesList.filter(sig => sig.timestamp !== timestamp);
        const newCount = newSignaturesList.length;
        await env.DECLARATION_KV.put("total_signatures", newCount.toString());

        const uniqueCounties = [...new Set(newSignaturesList.map(sig => sig.county))];
        await env.DECLARATION_KV.put("counties_list", JSON.stringify(uniqueCounties));
        await env.DECLARATION_KV.put("counties_represented", uniqueCounties.length.toString());

        await env.DECLARATION_KV.put("signatures_list", JSON.stringify(newSignaturesList));

        return new Response(
          JSON.stringify({ success: true, signatures: newCount, counties: uniqueCounties.length, signaturesList: newSignaturesList }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      } catch (error) {
        console.error("Remove signature error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to remove signature", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
    }

    // Endpoint: Sign declaration
    if (url.pathname.includes("/api/sign-declaration")) {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' } });
      }
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        // Rate limiting check.
        const rateLimitKey = `rate_limit:${clientIP}`;
        const lastSignTime = await env.DECLARATION_KV.get(rateLimitKey);
        const now = Date.now();
        if (lastSignTime) {
          const timeSinceLastSign = now - parseInt(lastSignTime);
          if (timeSinceLastSign < 86400000) { // 24-hour cooldown
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded", message: "You can only sign once every 24 hours" }),
              { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
            );
          }
        }

        const { county, name, comment } = await request.json();

        if (!county) {
          return new Response(
            JSON.stringify({ error: "County is required" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
          );
        }

        // Sanitize inputs
        const sanitizedCounty = escapeHTML(county);
        const sanitizedName = escapeHTML(name?.trim() || "Citizen");
        const sanitizedComment = escapeHTML(comment?.trim() || "");

        // Store signing time for rate limiting
        await env.DECLARATION_KV.put(rateLimitKey, now.toString(), { expirationTtl: 86400 });

        // Track IP to county mapping.
        const ipCountyKey = `ip_county:${clientIP}`;
        const previousCounty = await env.DECLARATION_KV.get(ipCountyKey);
        if (previousCounty && previousCounty !== sanitizedCounty) {
          return new Response(
            JSON.stringify({ error: "Already signed", message: "You have already signed from a different county" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        await env.DECLARATION_KV.put(ipCountyKey, sanitizedCounty, { expirationTtl: 31536000 });

        // Create signature object with enhanced (and sanitized) data.
        const signature = {
          county: sanitizedCounty,
          name: sanitizedName,
          comment: sanitizedComment,
          timestamp: now,
          metadata: {
            ip: clientIP,
            userAgent: request.headers.get("User-Agent"),
            referrer: request.headers.get("Referer"),
            country: request.cf.country,
            region: request.cf.region,
            city: request.cf.city,
            timezone: request.cf.timezone,
            browserLocale: request.headers.get("Accept-Language"),
            platform: getPlatformFromUA(request.headers.get("User-Agent")),
            device: getDeviceFromUA(request.headers.get("User-Agent")),
            signCount: await getSignatureCountForIP(env, clientIP)
          }
        };

        function getPlatformFromUA(ua) {
          if (!ua) return "Unknown";
          if (ua.includes("Windows")) return "Windows";
          if (ua.includes("Mac")) return "Mac";
          if (ua.includes("Linux")) return "Linux";
          if (ua.includes("Android")) return "Android";
          if (ua.includes("iOS")) return "iOS";
          return "Other";
        }
        function getDeviceFromUA(ua) {
          if (!ua) return "Unknown";
          if (ua.includes("Mobile")) return "Mobile";
          if (ua.includes("Tablet")) return "Tablet";
          return "Desktop";
        }
        async function getSignatureCountForIP(env, ip) {
          const ipKey = `ip_sign_count:${ip}`;
          const count = await env.DECLARATION_KV.get(ipKey) || "0";
          await env.DECLARATION_KV.put(ipKey, (parseInt(count) + 1).toString());
          return parseInt(count) + 1;
        }

        let signaturesList = [];
        try {
          signaturesList = JSON.parse(await env.DECLARATION_KV.get("signatures_list") || "[]");
        } catch (e) {
          console.error("Error parsing signatures list:", e);
          signaturesList = [];
        }
        signaturesList.push(signature);
        await env.DECLARATION_KV.put("signatures_list", JSON.stringify(signaturesList));

        const currentSignatures = parseInt(await env.DECLARATION_KV.get("total_signatures") || "0");
        await env.DECLARATION_KV.put("total_signatures", (currentSignatures + 1).toString());

        let countiesList = [];
        try {
          countiesList = JSON.parse(await env.DECLARATION_KV.get("counties_list") || "[]");
        } catch (e) {
          console.error("Error parsing counties list:", e);
          countiesList = [];
        }
        if (!countiesList.includes(sanitizedCounty)) {
          countiesList.push(sanitizedCounty);
          await env.DECLARATION_KV.put("counties_list", JSON.stringify(countiesList));
          await env.DECLARATION_KV.put("counties_represented", countiesList.length.toString());
        }

        return new Response(
          JSON.stringify({ success: true, signatures: currentSignatures + 1, counties: countiesList.length }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      } catch (error) {
        console.error("Signature error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to process signature", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
    }

    // Stats endpoint: Returns signature and county counts plus sorted signatures list.
    if (url.pathname.includes("/api/declaration-stats")) {
      try {
        const signatures = await env.DECLARATION_KV.get("total_signatures") || "0";
        const counties = await env.DECLARATION_KV.get("counties_represented") || "0";
        let signaturesList = [];
        try {
          signaturesList = JSON.parse(await env.DECLARATION_KV.get("signatures_list") || "[]");
        } catch (e) {
          console.error("Error parsing signatures list:", e);
          signaturesList = [];
        }

        const publicList = signaturesList
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(({ name, county, timestamp, comment }) => ({ name, county, timestamp, comment }));

        return new Response(
          JSON.stringify({
            signatures: parseInt(signatures),
            counties: parseInt(counties),
            signaturesList: publicList
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch stats", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      }
    }

    // Admin verification endpoint.
    if (url.pathname.includes("/api/admin/verify")) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Worker Route Not Found", 
        pathname: url.pathname // This will show us the exact path it's trying to match
      }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
    );
  }
};
