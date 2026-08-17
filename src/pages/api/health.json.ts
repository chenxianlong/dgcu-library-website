export const prerender = false;

export function GET() {
  return new Response(JSON.stringify({ status: 'ok', service: 'dgcu-library', timestamp: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
