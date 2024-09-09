export default {
    async fetch(request, env) {
      if (request.method === 'POST') {
        const formData = await request.formData();
        const name = formData.get('name');
        const comment = formData.get('comment') || '';
  
        // Insert data into the D1 database
        const query = `
          INSERT INTO signatures (name, comment)
          VALUES (?, ?)
        `;
        await env.DB.prepare(query).bind(name, comment).run();
  
        return new Response('Thank you for signing!', { status: 200 });
      }
  
      return new Response('Method not allowed', { status: 405 });
    }
  };  