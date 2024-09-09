export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      if (request.method === 'POST' && url.pathname === '/submit-signature') {
        const formData = await request.formData();
        const name = formData.get('name');
        const comment = formData.get('comment') || '';
  
        console.log(`Received signature: ${name}, comment: ${comment}`);
  
        const query = `
          INSERT INTO signatures (name, comment)
          VALUES (?, ?)
        `;
        
        try {
          await env.DB.prepare(query).bind(name, comment).run();
          console.log("Signature inserted into database successfully.");
        } catch (err) {
          console.error("Error inserting signature into database:", err);
          return new Response('Error inserting signature', { status: 500 });
        }
  
        return new Response('Thank you for signing!', { status: 200 });
      }
  
      return new Response('Method not allowed', { status: 405 });
    }
  };  