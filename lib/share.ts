export type SharePayload = {
  text: string;
  url: string;
};

export function buildXShareUrl({ text, url }: SharePayload): string {
  const params = new URLSearchParams({ text: `${text}\n${url}` });
  return `https://x.com/intent/tweet?${params}`;
}

export function buildLineShareUrl({ text, url }: SharePayload): string {
  const params = new URLSearchParams({ text: `${text}\n${url}` });
  return `https://line.me/R/msg/text/?${params}`;
}

export function openShare(shareUrl: string): void {
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
}
