/**
 * THIS FILE IS THE WORKER.JS FILE USED ON MY CLOUDFLARE WORKER.
 * It is included here purely for open-source viewing.
 */
export default {
  async fetch(request, env) {
    const allowedOrigins = [
      "https://thompson2026.com",
      "https://www.thompson2026.com",
      "https://shop.thompson2026.com",
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

    async function hmacSHA256(keyString, dataString) {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(keyString),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, enc.encode(dataString));
      const bytes = new Uint8Array(signature);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function base64UrlEncodeString(str) {
      // Encode a string as base64url without padding
      const utf8 = new TextEncoder().encode(str);
      let bin = "";
      for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]);
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    // Cart handoff endpoint (frontend -> worker -> WP)
    if (url.pathname === "/api/cart-handoff") {
      if (!isAllowed) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json", "Vary": "Origin" } }
        );
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
        const body = await request.json();
        const items = Array.isArray(body.items) ? body.items : [];
        const address = body.address || {};

        // Minimal validation
        if (!items.length) {
          return new Response(
            JSON.stringify({ error: "No items provided" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
          );
        }

        const payload = {
          items,
          address,
          ts: Date.now()
        };
        const payloadJson = JSON.stringify(payload);

        const secret = env.HANDOFF_SECRET || env.ADMIN_KEY || "dev-secret";
        const sig = await hmacSHA256(secret, payloadJson);
        const payloadB64 = base64UrlEncodeString(payloadJson);

        const handoffUrl = new URL("https://shop.thompson2026.com/");
        handoffUrl.searchParams.set("wc_cart_handoff", "1");
        handoffUrl.searchParams.set("payload", payloadB64);
        handoffUrl.searchParams.set("sig", sig);

        return new Response(
          JSON.stringify({ url: handoffUrl.toString() }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Failed to create handoff", details: e.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin' } }
        );
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

        const { county, name, comment, email, subscribeBlog, volunteerInterest } = await request.json();

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
        const sanitizedEmail = email ? email.trim().toLowerCase().substring(0, 254) : "";

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

        // Handle blog subscription if email provided and subscribeBlog is true
        if (sanitizedEmail && subscribeBlog) {
          try {
            let subscribers = [];
            try {
              subscribers = JSON.parse(await env.DECLARATION_KV.get("blog_subscribers") || "[]");
            } catch (e) {
              subscribers = [];
            }

            // Only add if not already subscribed
            if (!subscribers.some(s => s.email === sanitizedEmail)) {
              const subscriber = {
                id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
                email: sanitizedEmail,
                name: sanitizedName,
                timestamp: now,
                source: "declaration",
                confirmed: true,
                metadata: {
                  ip: clientIP,
                  country: request.cf?.country,
                  city: request.cf?.city
                }
              };
              subscribers.push(subscriber);
              await env.DECLARATION_KV.put("blog_subscribers", JSON.stringify(subscribers));
            }
          } catch (subError) {
            console.error("Blog subscription error:", subError);
          }
        }

        // Handle volunteer interest notification
        if (volunteerInterest && sanitizedEmail) {
          try {
            // Store in volunteer interests list
            let volunteers = [];
            try {
              volunteers = JSON.parse(await env.DECLARATION_KV.get("volunteer_interests") || "[]");
            } catch (e) {
              volunteers = [];
            }

            // Add if not already in list
            if (!volunteers.some(v => v.email === sanitizedEmail)) {
              const volunteer = {
                id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
                email: sanitizedEmail,
                name: sanitizedName,
                county: sanitizedCounty,
                timestamp: now,
                metadata: {
                  ip: clientIP,
                  country: request.cf?.country,
                  city: request.cf?.city
                }
              };
              volunteers.push(volunteer);
              await env.DECLARATION_KV.put("volunteer_interests", JSON.stringify(volunteers));

              // Send admin notification for new volunteer interest
              const volSubject = "New Volunteer Interest from Declaration";
              const volHtml = `
                <h2>Someone wants to volunteer!</h2>
                <p><strong>Name:</strong> ${sanitizedName}</p>
                <p><strong>Email:</strong> ${sanitizedEmail}</p>
                <p><strong>County:</strong> ${sanitizedCounty}</p>
                <p><strong>Location:</strong> ${request.cf?.city || "Unknown"}, ${request.cf?.country || "Unknown"}</p>
                <p style="color: #666; font-size: 12px;">They signed the Declaration and expressed interest in volunteering.</p>
              `;
              const volText = `New volunteer interest: ${sanitizedName} (${sanitizedEmail}) from ${sanitizedCounty} County`;
              await sendBrevoNotification(env, volSubject, volHtml, volText);
            }
          } catch (volError) {
            console.error("Volunteer interest error:", volError);
          }
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

    // ============================================
    // BLOG COMMENTS & NEWSLETTER SUBSCRIPTION
    // ============================================

    // Helper: Send email notification via Brevo
    async function sendBrevoNotification(env, subject, htmlContent, textContent, replyTo = null) {
      if (!env.BREVO_API_KEY) {
        console.log("Brevo API key not configured, skipping email notification");
        return false;
      }
      try {
        const emailPayload = {
          sender: { name: "Thompson 2026 Blog", email: "blog@thompson2026.com" },
          to: [{ email: env.ADMIN_EMAIL || "nicholas4liberty@gmail.com", name: "Nick" }],
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent
        };
        if (replyTo) {
          emailPayload.replyTo = { email: replyTo };
        }
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": env.BREVO_API_KEY
          },
          body: JSON.stringify(emailPayload)
        });
        return response.ok;
      } catch (e) {
        console.error("Brevo notification error:", e);
        return false;
      }
    }

    // Helper: Validate email format
    function isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    // POST /api/blog/comment - Submit a new comment
    if (url.pathname === "/api/blog/comment") {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", "Vary": "Origin" } });
      }
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const now = Date.now();
        
        // Rate limiting: 1 comment per 2 minutes per IP
        const commentRateKey = `comment_rate:${clientIP}`;
        const lastCommentTime = await env.DECLARATION_KV.get(commentRateKey);
        if (lastCommentTime && (now - parseInt(lastCommentTime)) < 120000) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded", message: "Please wait before posting another comment" }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        const { name, email, comment, postSlug } = await request.json();

        // Validation
        if (!name || !name.trim()) {
          return new Response(JSON.stringify({ error: "Name is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }
        if (!email || !isValidEmail(email)) {
          return new Response(JSON.stringify({ error: "Valid email is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }
        if (!comment || !comment.trim() || comment.trim().length < 10) {
          return new Response(JSON.stringify({ error: "Comment must be at least 10 characters" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }
        if (!postSlug || !postSlug.trim()) {
          return new Response(JSON.stringify({ error: "Post slug is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }
        if (comment.length > 2000) {
          return new Response(JSON.stringify({ error: "Comment too long (max 2000 characters)" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        // Sanitize inputs
        const sanitizedName = escapeHTML(name.trim().substring(0, 100));
        const sanitizedEmail = email.trim().toLowerCase().substring(0, 254);
        const sanitizedComment = escapeHTML(comment.trim().substring(0, 2000));
        const sanitizedSlug = postSlug.trim().replace(/[^a-z0-9-]/gi, "").substring(0, 100);

        // Store rate limit
        await env.DECLARATION_KV.put(commentRateKey, now.toString(), { expirationTtl: 120 });

        // Create comment object
        const commentObj = {
          id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
          name: sanitizedName,
          email: sanitizedEmail,
          comment: sanitizedComment,
          postSlug: sanitizedSlug,
          timestamp: now,
          approved: false,
          metadata: {
            ip: clientIP,
            userAgent: request.headers.get("User-Agent"),
            country: request.cf?.country,
            city: request.cf?.city
          }
        };

        // Get existing comments for this post
        const commentsKey = `blog_comments:${sanitizedSlug}`;
        let comments = [];
        try {
          comments = JSON.parse(await env.DECLARATION_KV.get(commentsKey) || "[]");
        } catch (e) {
          comments = [];
        }
        comments.push(commentObj);
        await env.DECLARATION_KV.put(commentsKey, JSON.stringify(comments));

        // Also add to global comments list for admin
        let allComments = [];
        try {
          allComments = JSON.parse(await env.DECLARATION_KV.get("blog_comments_all") || "[]");
        } catch (e) {
          allComments = [];
        }
        allComments.push(commentObj);
        await env.DECLARATION_KV.put("blog_comments_all", JSON.stringify(allComments));

        // Send email notification
        const emailSubject = `New Blog Comment on "${sanitizedSlug}"`;
        const emailHtml = `
          <h2>New Comment Pending Approval</h2>
          <p><strong>Post:</strong> ${sanitizedSlug}</p>
          <p><strong>From:</strong> ${sanitizedName} (${sanitizedEmail})</p>
          <p><strong>Location:</strong> ${request.cf?.city || "Unknown"}, ${request.cf?.country || "Unknown"}</p>
          <p><strong>Comment:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin: 10px 0;">${sanitizedComment}</blockquote>
          <p><a href="https://thompson2026.com/blog/${sanitizedSlug}">View Post</a></p>
          <p style="color: #666; font-size: 12px;">Use the admin dashboard to approve or delete this comment.</p>
        `;
        const emailText = `New comment on "${sanitizedSlug}" from ${sanitizedName} (${sanitizedEmail}): ${sanitizedComment}`;
        await sendBrevoNotification(env, emailSubject, emailHtml, emailText);

        return new Response(
          JSON.stringify({ success: true, message: "Comment submitted for approval" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        console.error("Comment submission error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to submit comment", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // GET /api/blog/comments?slug=xxx - Get approved comments for a post
    if (url.pathname === "/api/blog/comments" && request.method === "GET") {
      try {
        const postSlug = url.searchParams.get("slug");
        if (!postSlug) {
          return new Response(JSON.stringify({ error: "Post slug required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        const sanitizedSlug = postSlug.trim().replace(/[^a-z0-9-]/gi, "").substring(0, 100);
        const commentsKey = `blog_comments:${sanitizedSlug}`;
        
        let comments = [];
        try {
          comments = JSON.parse(await env.DECLARATION_KV.get(commentsKey) || "[]");
        } catch (e) {
          comments = [];
        }

        // Only return approved comments, strip email and metadata for public
        const publicComments = comments
          .filter(c => c.approved)
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(({ id, name, comment, timestamp }) => ({ id, name, comment, timestamp }));

        return new Response(
          JSON.stringify({ comments: publicComments, count: publicComments.length }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch comments", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // POST /api/blog/subscribe - Subscribe to newsletter
    if (url.pathname === "/api/blog/subscribe") {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", "Vary": "Origin" } });
      }
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const now = Date.now();
        
        // Rate limiting: 1 subscribe attempt per 10 minutes per IP
        const subRateKey = `subscribe_rate:${clientIP}`;
        const lastSubTime = await env.DECLARATION_KV.get(subRateKey);
        if (lastSubTime && (now - parseInt(lastSubTime)) < 600000) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded", message: "Please wait before trying again" }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        const { email, name } = await request.json();

        if (!email || !isValidEmail(email)) {
          return new Response(JSON.stringify({ error: "Valid email is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        const sanitizedEmail = email.trim().toLowerCase().substring(0, 254);
        const sanitizedName = escapeHTML((name || "").trim().substring(0, 100)) || "Subscriber";

        // Store rate limit
        await env.DECLARATION_KV.put(subRateKey, now.toString(), { expirationTtl: 600 });

        // Get existing subscribers
        let subscribers = [];
        try {
          subscribers = JSON.parse(await env.DECLARATION_KV.get("blog_subscribers") || "[]");
        } catch (e) {
          subscribers = [];
        }

        // Check if already subscribed
        if (subscribers.some(s => s.email === sanitizedEmail)) {
          return new Response(
            JSON.stringify({ success: true, message: "You're already subscribed!" }),
            { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        // Add subscriber
        const subscriber = {
          id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
          email: sanitizedEmail,
          name: sanitizedName,
          timestamp: now,
          confirmed: true,
          metadata: {
            ip: clientIP,
            country: request.cf?.country,
            city: request.cf?.city
          }
        };
        subscribers.push(subscriber);
        await env.DECLARATION_KV.put("blog_subscribers", JSON.stringify(subscribers));

        // Send notification to admin
        const emailSubject = "New Blog Subscriber";
        const emailHtml = `
          <h2>New Newsletter Subscriber</h2>
          <p><strong>Email:</strong> ${sanitizedEmail}</p>
          <p><strong>Name:</strong> ${sanitizedName}</p>
          <p><strong>Location:</strong> ${request.cf?.city || "Unknown"}, ${request.cf?.country || "Unknown"}</p>
          <p><strong>Total Subscribers:</strong> ${subscribers.length}</p>
        `;
        const emailText = `New subscriber: ${sanitizedName} (${sanitizedEmail}). Total: ${subscribers.length}`;
        await sendBrevoNotification(env, emailSubject, emailHtml, emailText);

        return new Response(
          JSON.stringify({ success: true, message: "Successfully subscribed!" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        console.error("Subscribe error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to subscribe", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // POST /api/contact - Contact form submission
    if (url.pathname === "/api/contact") {
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", "Vary": "Origin" } });
      }
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const now = Date.now();
        
        // Rate limiting: 1 contact message per 5 minutes per IP
        const contactRateKey = `contact_rate:${clientIP}`;
        const lastContactTime = await env.DECLARATION_KV.get(contactRateKey);
        if (lastContactTime && (now - parseInt(lastContactTime)) < 300000) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded", message: "Please wait a few minutes before sending another message" }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        const { name, email, message, subscribe, volunteerInterest } = await request.json();

        if (!email || !isValidEmail(email)) {
          return new Response(JSON.stringify({ error: "Valid email is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }
        if (!message || message.trim().length < 10) {
          return new Response(JSON.stringify({ error: "Message must be at least 10 characters" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }
        if (message.length > 5000) {
          return new Response(JSON.stringify({ error: "Message is too long (max 5000 characters)" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        const sanitizedEmail = email.trim().toLowerCase().substring(0, 254);
        const sanitizedName = escapeHTML((name || "").trim().substring(0, 100)) || "Anonymous";
        const sanitizedMessage = escapeHTML(message.trim().substring(0, 5000));

        // Store rate limit
        await env.DECLARATION_KV.put(contactRateKey, now.toString(), { expirationTtl: 300 });

        // Store the message for reference
        const contactMessage = {
          id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
          name: sanitizedName,
          email: sanitizedEmail,
          message: sanitizedMessage,
          subscribe: !!subscribe,
          volunteerInterest: !!volunteerInterest,
          timestamp: now,
          metadata: {
            ip: clientIP,
            userAgent: request.headers.get("User-Agent"),
            country: request.cf?.country,
            city: request.cf?.city
          }
        };

        let contactMessages = [];
        try {
          contactMessages = JSON.parse(await env.DECLARATION_KV.get("contact_messages") || "[]");
        } catch (e) {
          contactMessages = [];
        }
        contactMessages.push(contactMessage);
        await env.DECLARATION_KV.put("contact_messages", JSON.stringify(contactMessages));

        // Handle subscription if opted in
        if (subscribe) {
          let subscribers = [];
          try {
            subscribers = JSON.parse(await env.DECLARATION_KV.get("blog_subscribers") || "[]");
          } catch (e) {
            subscribers = [];
          }

          if (!subscribers.some(s => s.email === sanitizedEmail)) {
            const subscriber = {
              id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
              email: sanitizedEmail,
              name: sanitizedName,
              timestamp: now,
              source: "contact",
              confirmed: true,
              metadata: {
                ip: clientIP,
                country: request.cf?.country,
                city: request.cf?.city
              }
            };
            subscribers.push(subscriber);
            await env.DECLARATION_KV.put("blog_subscribers", JSON.stringify(subscribers));
          }
        }

        // Handle volunteer interest notification
        if (volunteerInterest && sanitizedEmail) {
          try {
            let volunteers = [];
            try {
              volunteers = JSON.parse(await env.DECLARATION_KV.get("volunteer_interests") || "[]");
            } catch (e) {
              volunteers = [];
            }

            if (!volunteers.some(v => v.email === sanitizedEmail)) {
              const volunteer = {
                id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
                email: sanitizedEmail,
                name: sanitizedName,
                timestamp: now,
                source: "contact",
                metadata: {
                  ip: clientIP,
                  country: request.cf?.country,
                  city: request.cf?.city
                }
              };
              volunteers.push(volunteer);
              await env.DECLARATION_KV.put("volunteer_interests", JSON.stringify(volunteers));

              const volSubject = "New Volunteer Interest from Contact Form";
              const volHtml = `
                <h2>Someone wants to volunteer!</h2>
                <p><strong>Name:</strong> ${sanitizedName}</p>
                <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
                <p><strong>Location:</strong> ${request.cf?.city || "Unknown"}, ${request.cf?.country || "Unknown"}</p>
                <p style="color: #666; font-size: 12px;">They submitted a contact form and expressed interest in volunteering.</p>
              `;
              const volText = `New volunteer interest: ${sanitizedName} (${sanitizedEmail})`;
              await sendBrevoNotification(env, volSubject, volHtml, volText);
            }
          } catch (volError) {
            console.error("Volunteer interest error:", volError);
          }
        }

        // Send email notification to admin
        const emailSubject = `Contact Form: ${sanitizedName}`;
        const emailHtml = `
          <h2>New Contact Form Message</h2>
          <p><strong>From:</strong> ${sanitizedName}</p>
          <p><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
          <p><strong>Location:</strong> ${request.cf?.city || "Unknown"}, ${request.cf?.country || "Unknown"}</p>
          <p><strong>Subscribed to updates:</strong> ${subscribe ? "Yes" : "No"}</p>
          <p><strong>Interested in volunteering:</strong> ${volunteerInterest ? "Yes" : "No"}</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${sanitizedMessage}</div>
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Reply directly to this email to respond to ${sanitizedName}.</p>
        `;
        const emailText = `New contact message from ${sanitizedName} (${sanitizedEmail}):\n\n${message}\n\nSubscribed: ${subscribe ? "Yes" : "No"}\nInterested in volunteering: ${volunteerInterest ? "Yes" : "No"}`;
        await sendBrevoNotification(env, emailSubject, emailHtml, emailText, sanitizedEmail);

        return new Response(
          JSON.stringify({ success: true, message: "Message sent successfully!" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        console.error("Contact form error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to send message", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Get all comments (for moderation)
    if (url.pathname === "/api/admin/comments") {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      try {
        let allComments = [];
        try {
          allComments = JSON.parse(await env.DECLARATION_KV.get("blog_comments_all") || "[]");
        } catch (e) {
          allComments = [];
        }
        
        // Sort by timestamp descending
        allComments.sort((a, b) => b.timestamp - a.timestamp);

        return new Response(
          JSON.stringify({ comments: allComments, count: allComments.length }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch comments", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Approve/reject comment
    if (url.pathname === "/api/admin/comment-action") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const { commentId, action, postSlug } = await request.json();

        if (!commentId || !action || !postSlug) {
          return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        const sanitizedSlug = postSlug.trim().replace(/[^a-z0-9-]/gi, "").substring(0, 100);
        const commentsKey = `blog_comments:${sanitizedSlug}`;

        // Update in post-specific comments
        let comments = [];
        try {
          comments = JSON.parse(await env.DECLARATION_KV.get(commentsKey) || "[]");
        } catch (e) {
          comments = [];
        }

        if (action === "approve") {
          comments = comments.map(c => c.id === commentId ? { ...c, approved: true } : c);
        } else if (action === "delete") {
          comments = comments.filter(c => c.id !== commentId);
        }
        await env.DECLARATION_KV.put(commentsKey, JSON.stringify(comments));

        // Update in global comments list
        let allComments = [];
        try {
          allComments = JSON.parse(await env.DECLARATION_KV.get("blog_comments_all") || "[]");
        } catch (e) {
          allComments = [];
        }

        if (action === "approve") {
          allComments = allComments.map(c => c.id === commentId ? { ...c, approved: true } : c);
        } else if (action === "delete") {
          allComments = allComments.filter(c => c.id !== commentId);
        }
        await env.DECLARATION_KV.put("blog_comments_all", JSON.stringify(allComments));

        return new Response(
          JSON.stringify({ success: true, comments: allComments }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to update comment", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Get all subscribers
    if (url.pathname === "/api/admin/subscribers") {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      try {
        let subscribers = [];
        try {
          subscribers = JSON.parse(await env.DECLARATION_KV.get("blog_subscribers") || "[]");
        } catch (e) {
          subscribers = [];
        }
        
        subscribers.sort((a, b) => b.timestamp - a.timestamp);

        return new Response(
          JSON.stringify({ subscribers: subscribers, count: subscribers.length }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch subscribers", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Get volunteer interests
    if (url.pathname === "/api/admin/volunteers") {
      if (request.method !== "GET") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      try {
        let volunteers = [];
        try {
          volunteers = JSON.parse(await env.DECLARATION_KV.get("volunteer_interests") || "[]");
        } catch (e) {
          volunteers = [];
        }
        
        volunteers.sort((a, b) => b.timestamp - a.timestamp);

        return new Response(
          JSON.stringify({ volunteers: volunteers, count: volunteers.length }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch volunteers", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Remove volunteer
    if (url.pathname === "/api/admin/volunteer-remove") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const { volunteerId } = await request.json();

        let volunteers = [];
        try {
          volunteers = JSON.parse(await env.DECLARATION_KV.get("volunteer_interests") || "[]");
        } catch (e) {
          volunteers = [];
        }

        volunteers = volunteers.filter(v => v.id !== volunteerId);
        await env.DECLARATION_KV.put("volunteer_interests", JSON.stringify(volunteers));

        return new Response(
          JSON.stringify({ success: true, volunteers: volunteers }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to remove volunteer", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Remove subscriber
    if (url.pathname === "/api/admin/subscriber-remove") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const { subscriberId } = await request.json();

        let subscribers = [];
        try {
          subscribers = JSON.parse(await env.DECLARATION_KV.get("blog_subscribers") || "[]");
        } catch (e) {
          subscribers = [];
        }

        subscribers = subscribers.filter(s => s.id !== subscriberId);
        await env.DECLARATION_KV.put("blog_subscribers", JSON.stringify(subscribers));

        return new Response(
          JSON.stringify({ success: true, subscribers: subscribers }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to remove subscriber", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
    }

    // Admin: Draft Brevo Campaign
    if (url.pathname === "/api/admin/draft-campaign") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        if (!env.BREVO_API_KEY) {
          return new Response(JSON.stringify({ error: "Brevo API key not configured" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        const { subject, preview, htmlContent } = await request.json();

        if (!subject || !htmlContent) {
          return new Response(JSON.stringify({ error: "Subject and content are required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        async function safeReadBrevoBody(res) {
          try {
            const text = await res.text();
            if (!text) return null;
            try {
              return JSON.parse(text);
            } catch {
              return { raw: text };
            }
          } catch {
            return null;
          }
        }

        // Get subscribers
        let subscribers = [];
        try {
          subscribers = JSON.parse(await env.DECLARATION_KV.get("blog_subscribers") || "[]");
        } catch (e) {
          subscribers = [];
        }

        if (subscribers.length === 0) {
          return new Response(JSON.stringify({ error: "No subscribers to send campaign to" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } });
        }

        // Step 1: Create or update a contact list for campaign subscribers
        const listName = "Thompson 2026 Newsletter";
        let listId = null;

        // Check if list exists
        const listsResponse = await fetch("https://api.brevo.com/v3/contacts/lists?limit=50", {
          headers: { "Accept": "application/json", "api-key": env.BREVO_API_KEY }
        });
        if (!listsResponse.ok) {
          const errBody = await safeReadBrevoBody(listsResponse);
          return new Response(
            JSON.stringify({ error: "Failed to fetch Brevo lists", details: errBody || listsResponse.statusText }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        const listsData = await safeReadBrevoBody(listsResponse) || {};
        
        if (listsData.lists) {
          const existingList = listsData.lists.find(l => l.name === listName);
          if (existingList) {
            listId = existingList.id;
          }
        }

        // Create list if it doesn't exist
        if (!listId) {
          const createListResponse = await fetch("https://api.brevo.com/v3/contacts/lists", {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
            body: JSON.stringify({ name: listName })
          });
          if (!createListResponse.ok) {
            const errBody = await safeReadBrevoBody(createListResponse);
            return new Response(
              JSON.stringify({ error: "Failed to create Brevo list", details: errBody || createListResponse.statusText }),
              { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
            );
          }
          const createListData = await safeReadBrevoBody(createListResponse) || {};
          listId = createListData.id;
          if (!listId) {
            return new Response(
              JSON.stringify({ error: "Failed to create Brevo list", details: createListData }),
              { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
            );
          }
        }

        // Step 2: Add/update contacts in Brevo
        const contacts = subscribers.map(s => ({
          email: s.email,
          attributes: { FIRSTNAME: s.name || "Supporter" },
          listIds: [listId],
          updateEnabled: true
        }));

        // Import contacts in batch
        const importResponse = await fetch("https://api.brevo.com/v3/contacts/import", {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
          body: JSON.stringify({
            listIds: [listId],
            jsonBody: contacts,
            updateExistingContacts: true
          })
        });

        if (!importResponse.ok) {
          const errBody = await safeReadBrevoBody(importResponse);
          return new Response(
            JSON.stringify({ error: "Failed to import contacts to Brevo", details: errBody || importResponse.statusText }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        // Step 3: Create email campaign draft
        // Brevo requires the sender to be an active/validated Marketing sender.
        const desiredSenderEmail = (env.BREVO_CAMPAIGN_SENDER_EMAIL || "blog@thompson2026.com").toLowerCase();
        const sendersResponse = await fetch("https://api.brevo.com/v3/senders", {
          headers: { "Accept": "application/json", "api-key": env.BREVO_API_KEY }
        });
        if (!sendersResponse.ok) {
          const errBody = await safeReadBrevoBody(sendersResponse);
          return new Response(
            JSON.stringify({ error: "Failed to fetch Brevo senders", details: errBody || sendersResponse.statusText }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }
        const sendersData = await safeReadBrevoBody(sendersResponse) || {};
        const senders = Array.isArray(sendersData.senders) ? sendersData.senders : [];
        const matchingSender = senders.find(s => (s.email || "").toLowerCase() === desiredSenderEmail);
        if (!matchingSender) {
          return new Response(
            JSON.stringify({
              error: "Sender is invalid / inactive",
              details: {
                message: `Brevo does not have an active sender configured for ${desiredSenderEmail}. Add/verify it in Brevo (Settings -> Senders) and try again, or set BREVO_CAMPAIGN_SENDER_EMAIL to a sender email that is active in Brevo.`,
                desiredSenderEmail,
                availableSenders: senders.map(s => ({ email: s.email, active: s.active, id: s.id }))
              }
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }
        if (matchingSender.active === false) {
          return new Response(
            JSON.stringify({
              error: "Sender is invalid / inactive",
              details: {
                message: `Brevo sender ${desiredSenderEmail} exists but is not active. Verify/activate it in Brevo (Settings -> Senders) and try again.`,
                desiredSenderEmail,
                sender: { email: matchingSender.email, active: matchingSender.active, id: matchingSender.id }
              }
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        const campaignName = `${subject} - ${new Date().toLocaleDateString()}`;
        const campaignResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json", "api-key": env.BREVO_API_KEY },
          body: JSON.stringify({
            name: campaignName,
            subject: subject,
            // Prefer sender id since Brevo campaign senders must be validated.
            sender: matchingSender.id ? { id: matchingSender.id } : { name: "Nicholas A. Thompson", email: desiredSenderEmail },
            replyTo: env.ADMIN_EMAIL || "nicholas4liberty@gmail.com",
            recipients: { listIds: [listId] },
            htmlContent: htmlContent,
            previewText: preview || "",
            inlineImageActivation: false
          })
        });

        if (!campaignResponse.ok) {
          const errorData = await safeReadBrevoBody(campaignResponse);
          return new Response(
            JSON.stringify({ error: "Failed to create campaign", details: errorData }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
          );
        }

        const campaignData = await safeReadBrevoBody(campaignResponse) || {};

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Campaign draft created in Brevo",
            campaignId: campaignData.id,
            subscriberCount: subscribers.length
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      } catch (error) {
        console.error("Campaign creation error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create campaign", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...(isAllowed ? { "Access-Control-Allow-Origin": origin } : {}), "Vary": "Origin" } }
        );
      }
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
