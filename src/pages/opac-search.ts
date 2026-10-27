import type { APIRoute } from 'astro';

const OPAC_SEARCH_URL = 'http://10.20.208.253/opac/search';

export const GET: APIRoute = ({ url, redirect }) => {
  const query = url.searchParams.get('q')?.trim();

  if (!query) {
    return redirect('/', 303);
  }

  const target = new URL(OPAC_SEARCH_URL);
  target.searchParams.set('q', query);
  target.searchParams.set('searchWay', '');
  target.searchParams.set('searchSource', 'reader');

  return redirect(target.toString(), 302);
};
