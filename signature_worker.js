export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      // Handle signature form submission
      if (request.method === 'POST' && url.pathname === '/submit-signature') {
        const formData = await request.formData();
        const name = formData.get('name');
        const comment = formData.get('comment') || '';
  
        // Insert the signature into D1
        const query = `
          INSERT INTO signatures (name, comment)
          VALUES (?, ?)
        `;
  
        try {
          await env.DB.prepare(query).bind(name, comment).run();
          return new Response('Thank you for signing!', { status: 200 });
        } catch (err) {
          console.error('Error inserting signature:', err);
          return new Response('Error inserting signature', { status: 500 });
        }
      }
  
      // Handle fetching all signatures
      if (request.method === 'GET' && url.pathname === '/get-signatures') {
        const query = `SELECT * FROM signatures ORDER BY created_at DESC`;
        try {
          const signatures = await env.DB.prepare(query).all();
          return new Response(JSON.stringify(signatures.results), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        } catch (err) {
          console.error('Error fetching signatures:', err);
          return new Response('Error fetching signatures', { status: 500 });
        }
      }
  
      return new Response('Method not allowed', { status: 405 });
    }
  };  