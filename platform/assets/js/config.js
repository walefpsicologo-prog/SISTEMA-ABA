export const CONFIG = Object.freeze({
  SUPABASE_URL: 'https://olegdikznieawsiaqtnr.supabase.co',
  SUPABASE_KEY: 'sb_publishable_XYsGEZSA51XFX-66Cc9Hpw_UYkHXk5i',
  SITE_URL: 'https://walef-teixeira-oficial.vercel.app',
  DEFAULT_COURSE_SLUG: 'formacao-aplicador-aba',
  HERO_URL: 'https://olegdikznieawsiaqtnr.supabase.co/functions/v1/internalize-public-assets?asset=hero',
  TEA_URL: 'https://olegdikznieawsiaqtnr.supabase.co/functions/v1/internalize-public-assets?asset=tea'
});
export const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
