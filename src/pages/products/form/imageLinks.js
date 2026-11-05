const MAX_LINKS = 10;
const HTTP_URL = /^https?:\/\/\S+$/i;

// Splits pasted text into links. error says what to fix, or is null when they are all usable.
export const parseImageLinks = (text) => {
  const urls = text
    .split(/\s+/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length > MAX_LINKS) {
    return { urls, error: `Add up to ${MAX_LINKS} links at a time` };
  }
  const bad = urls.find((url) => !HTTP_URL.test(url) || url.length > 500);
  return { urls, error: bad ? `This is not a full http or https link: ${bad}` : null };
};
