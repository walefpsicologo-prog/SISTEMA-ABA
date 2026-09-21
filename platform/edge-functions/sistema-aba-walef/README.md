# ABA edge runtime

This directory restores the source corresponding to production version 56, which had diverged from the repository branch. The embedded JavaScript, responsive layout, and family/applicator modules were compared with the deployed bundle before editing.

Version 57 fixes dispatch ordering: the main application and enhancements routes run before the generic embedded-file route. The main application once again receives its twelve feature imports, canonical login redirects, and deferred criterion loading. Embedded scripts also pass through the existing observer-loop optimizer.

The administrator credential form now supports password-only updates, preserves clinical notes, and distinguishes pending email confirmation from profile synchronization failures. Account lifecycle operations are separate from this client update.

`general.ts` contains the embedded client snapshot; it is intentionally not regenerated wholesale from the current public asset directory because those sources differ from the deployed client. Keep a targeted client change consistent in both the snapshot and its corresponding public asset.

Run the focused regression suite from the repository root:

```sh
node --experimental-strip-types --experimental-vm-modules --test tools/test-aba-edge-routing.mjs
```

The public shell serves code and static assets only. Clinical access remains enforced by the existing authentication, API authorization, and database RLS. Internal authenticated UI flows still require a signed-in browser for end-to-end verification.

## Auth soft deletion

The database migration `preserve_profile_on_auth_soft_delete` was applied separately. Auth anonymizes an account's email during soft deletion; the profile synchronization trigger previously forwarded that change to the historical profile, where the existing sensitive-field guard correctly rejected it. Skip profile synchronization only when Auth marks the account deleted. This preserves historical profiles and clinical authorship without changing the field guard, RLS, or role assignment.

A rollback-only database check verified that the Auth update succeeds, the complete historical profile stays identical, and direct profile email changes remain blocked. The two authorized obsolete ABA logins are managed through Auth's admin API; no account IDs, credentials, or deletion commands are included here.

Applied database definition:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auth soft deletion anonymizes credentials. Keep the historical profile
  -- unchanged so clinical authorship remains intact.
  IF new.deleted_at IS NOT NULL THEN
    RETURN new;
  END IF;

  INSERT INTO public.profiles(id, email, full_name, role)
  VALUES(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    CASE WHEN lower(coalesce(new.email,''))='walefpsicologo@gmail.com'
      THEN 'admin'::public.user_role ELSE 'student'::public.user_role END
  )
  ON CONFLICT(id) DO UPDATE SET email=excluded.email;
  RETURN new;
END;
$function$;
```
