export type SharePayload = {
  text: string;
  url: string;
};

export function buildXShareUrl({ text, url }: SharePayload): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function buildLineShareUrl({ text, url }: SharePayload): string {
  return `https://line.me/R/msg/text/?${encodeURIComponent(`${text}\n${url}`)}`;
}

export function openShare(shareUrl: string): void {
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
}
