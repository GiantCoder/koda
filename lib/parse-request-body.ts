/**
 * Parse JSON body from a Request. Extracted so tests can mock it when the
 * test environment doesn't reliably support request.json() (e.g. Vite bundle).
 */
export async function parseRequestBody(request: Request): Promise<unknown> {
  return request.json();
}
