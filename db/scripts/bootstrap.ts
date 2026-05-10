import { getPgliteClient } from '../client';

const client = await getPgliteClient();
console.log('PGlite ready with vector extension.');
await client.close();
