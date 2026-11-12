-- Complete covering indexes for composite institutional foreign keys.
-- Existing partial indexes remain useful for active-school lookup paths.
begin;
create index if not exists edu_memberships_class_school on public.edu_memberships(class_id,school_id);
create index if not exists edu_requests_class_school on public.edu_support_requests(class_id,school_id);
create index if not exists edu_assignments_class_school on public.edu_teacher_assignments(class_id,school_id);
commit;
