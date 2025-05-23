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
      "null",
      "file://",
      "*"
    ];

    const corsHeaders = {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    const origin = request.headers.get("Origin");
    if (allowedOrigins.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    } else {
      corsHeaders["Access-Control-Allow-Origin"] = "https://thompson2026.com";
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const clientIP = request.headers.get("CF-Connecting-IP");

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
    const isAdminRequest = request.url.includes("/api/admin/");
    if (isAdminRequest) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || authHeader !== `Bearer ${env.ADMIN_KEY}`) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Admin endpoint: Edit signature
    if (request.url.includes("/api/admin/edit-signature")) {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      const jsonError = requireJSON(request);
      if (jsonError) return jsonError;

      try {
        const { oldTimestamp, name, county, timestamp, comment } = await request.json();

        if (!oldTimestamp || !county || !timestamp) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        console.error("Edit signature error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to edit signature", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Admin endpoint: Remove signature
    if (request.url.includes("/api/admin/remove-signature")) {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        console.error("Remove signature error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to remove signature", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Endpoint: Sign declaration
    if (request.url.includes("/api/sign-declaration")) {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
              { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        }

        const { county, name, comment } = await request.json();

        if (!county) {
          return new Response(
            JSON.stringify({ error: "County is required" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
          JSON.stringify({ success: true, signatures: currentSignatures + 1, counties: countiesList.length, signaturesList }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        console.error("Signature error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to process signature", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Stats endpoint: Returns signature and county counts plus sorted signatures list.
    if (request.url.includes("/api/declaration-stats")) {
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

        return new Response(
          JSON.stringify({
            signatures: parseInt(signatures),
            counties: parseInt(counties),
            signaturesList: signaturesList.sort((a, b) => b.timestamp - a.timestamp)
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch stats", details: error.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Admin verification endpoint.
    if (request.url.includes("/api/admin/verify")) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};