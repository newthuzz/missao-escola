-- Apply after social.sql and social-personalization.sql. Safe to reapply.
begin;
alter table public.social_profiles drop constraint if exists social_profiles_avatar_check;
alter table public.social_profiles add constraint social_profiles_avatar_check
 check(avatar in ('✦','☾','✿','♜') or avatar ~ '^(fox|rabbit|cat|capybara|frog|bear|sprout|mushroom|dragon|axolotl|geode|jellyfish|astronaut|robot|alien|mooncat|penguin|snowfox|yak|owl|phoenix|moth|comet|starwhale)(~(original|mint|violet|sunset)~(none|goggles|crown|headphones))?$');
commit;
