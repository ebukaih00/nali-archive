/**
 * Safely tracks a custom event in Google Analytics 4.
 * 
 * @param action - The name of the event (e.g., 'search', 'play_name')
 * @param params - Optional extra data (e.g., { search_term: 'Adaobi' })
 */
export const trackEvent = (action: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', action, params);
    }
};
