import { makeHandler } from './handler.mjs';
const nomes = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CLARA_MCP_URL', 'RESEND_API_KEY', 'CLARA_EMAIL_REMETENTE', 'CLARA_PAINEL_URL'];
Deno.serve(makeHandler(Object.fromEntries(nomes.map((n) => [n, Deno.env.get(n)]))));
