import * as WebBrowser from 'expo-web-browser';

export const SITE_URL = 'https://withink.me';
export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const TERMS_URL = `${SITE_URL}/terms`;

export function openLegalPage(url: string): void {
  void WebBrowser.openBrowserAsync(url);
}
