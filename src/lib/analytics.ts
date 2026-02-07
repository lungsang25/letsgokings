import { logEvent, Analytics } from 'firebase/analytics';
import { analytics } from './firebase';

// GA4 Event Types for the app
export type AnalyticsEvent =
  | { name: 'login'; params: { method: 'google' | 'guest' } }
  | { name: 'logout'; params: { user_type: 'google' | 'guest' } }
  | { name: 'sign_up'; params: { method: 'google' | 'guest' } }
  | { name: 'challenge_started'; params: { user_type: 'google' | 'guest' } }
  | { name: 'relapse_reported'; params: { streak_days: number; user_type: 'google' | 'guest' } }
  | { name: 'streak_confirmed'; params: { streak_days: number; user_type: 'google' | 'guest' } }
  | { name: 'feedback_submitted'; params: { user_type: 'google' | 'guest' } }
  | { name: 'page_view'; params: { page_title: string; page_path: string } }
  | { name: 'leaderboard_viewed'; params: { user_type: 'google' | 'guest' } }
  | { name: 'rules_viewed'; params: { user_type: 'google' | 'guest' } }
  | { name: 'live_chat_viewed'; params: { user_type: 'google' | 'guest' } }
  | { name: 'share_clicked'; params: { method: string; streak_days: number } };

let analyticsInstance: Analytics | null = null;

// Initialize analytics instance
const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (analyticsInstance) return analyticsInstance;
  analyticsInstance = await analytics;
  return analyticsInstance;
};

/**
 * Track a GA4 event with type safety
 */
export const trackEvent = async <T extends AnalyticsEvent>(
  event: T
): Promise<void> => {
  try {
    const instance = await getAnalyticsInstance();
    if (instance) {
      // Cast to string to avoid Firebase's strict overload matching for built-in events
      logEvent(instance, event.name as string, event.params);
      if (import.meta.env.DEV) {
        console.log('[Analytics]', event.name, event.params);
      }
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

// Convenience functions for common events
export const trackLogin = (method: 'google' | 'guest') => {
  trackEvent({ name: 'login', params: { method } });
};

export const trackLogout = (userType: 'google' | 'guest') => {
  trackEvent({ name: 'logout', params: { user_type: userType } });
};

export const trackSignUp = (method: 'google' | 'guest') => {
  trackEvent({ name: 'sign_up', params: { method } });
};

export const trackChallengeStarted = (userType: 'google' | 'guest') => {
  trackEvent({ name: 'challenge_started', params: { user_type: userType } });
};

export const trackRelapse = (streakDays: number, userType: 'google' | 'guest') => {
  trackEvent({ name: 'relapse_reported', params: { streak_days: streakDays, user_type: userType } });
};

export const trackStreakConfirmed = (streakDays: number, userType: 'google' | 'guest') => {
  trackEvent({ name: 'streak_confirmed', params: { streak_days: streakDays, user_type: userType } });
};

export const trackFeedbackSubmitted = (userType: 'google' | 'guest') => {
  trackEvent({ name: 'feedback_submitted', params: { user_type: userType } });
};

export const trackPageView = (pageTitle: string, pagePath: string) => {
  trackEvent({ name: 'page_view', params: { page_title: pageTitle, page_path: pagePath } });
};

export const trackLeaderboardViewed = (userType: 'google' | 'guest') => {
  trackEvent({ name: 'leaderboard_viewed', params: { user_type: userType } });
};

export const trackRulesViewed = (userType: 'google' | 'guest') => {
  trackEvent({ name: 'rules_viewed', params: { user_type: userType } });
};

export const trackLiveChatViewed = (userType: 'google' | 'guest') => {
  trackEvent({ name: 'live_chat_viewed', params: { user_type: userType } });
};

export const trackShareClicked = (method: string, streakDays: number) => {
  trackEvent({ name: 'share_clicked', params: { method, streak_days: streakDays } });
};
