export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      if (request.method === 'POST' && url.pathname === '/submit-signature') {
        const formData = await request.formData();
        const name = formData.get('name');
        const comment = formData.get('comment') || '';
  
        // Insert the signature into D1
        const query = `
          INSERT INTO signatures (name, comment)
          VALUES (?, ?)
        `;
        await env.DB.prepare(query).bind(name, comment).run();
  
        return new Response('Thank you for signing!', { status: 200 });
      }
  
      // Handle other methods or routes
      return new Response('Method not allowed', { status: 405 });
    }
  };  