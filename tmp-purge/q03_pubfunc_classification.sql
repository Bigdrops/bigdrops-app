CREATE TEMP TABLE _pubfuncs AS
SELECT
  p.oid                                   AS fnoid,
  p.proname::text                         AS fname,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.prosecdef                             AS secdef,
  NOT p.proisplpgsql AND p.prolang <> (SELECT oid FROM pg_language WHERE lanname = 'c') AND p.prolang <> (SELECT oid FROM pg_language WHERE lanname = 'sql') AS non_body_lang
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

-- same-named function present in tenant schema?
ALTER TABLE _pubfuncs ADD COLUMN in_tenant boolean;
UPDATE _pubfuncs pf SET in_tenant = EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'entity_bigdrops-main_main' AND p.proname = pf.fname
);

-- hard dependencies: any object owned by tenant schema depending on this public function
ALTER TABLE _pubfuncs ADD COLUMN dep_tenant_hard boolean;
UPDATE _pubfuncs pf SET dep_tenant_hard = EXISTS (
  SELECT 1 FROM pg_depend d
  LEFT JOIN pg_class c   ON c.oid = d.objid  AND d.classid = 'pg_class'::regclass
  LEFT JOIN pg_constraint cn ON cn.oid = d.objid AND d.classid = 'pg_constraint'::regclass
  LEFT JOIN pg_rewrite rw ON rw.oid = d.objid AND d.classid = 'pg_rewrite'::regclass
  LEFT JOIN pg_trigger tg ON tg.oid = d.objid AND d.classid = 'pg_trigger'::regclass
  WHERE d.refobjid = pf.fnoid
    AND COALESCE(c.relnamespace, CASE WHEN cn.oid IS NOT NULL THEN (SELECT relnamespace FROM pg_class WHERE oid = cn.conrelid) END,
                (SELECT relnamespace FROM pg_class WHERE oid = rw.ev_class),
                (SELECT relnamespace FROM pg_class WHERE oid = tg.tgrelid)) = 'entity_bigdrops-main_main'::regnamespace
);

-- textual references: tenant function bodies / policies / constraints mentioning this function
ALTER TABLE _pubfuncs ADD COLUMN dep_tenant_text boolean;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT fnoid, fname FROM _pubfuncs LOOP
    PERFORM 1;
    UPDATE _pubfuncs pf SET dep_tenant_text = true
    WHERE pf.fnoid = r.fnoid
      AND (
        EXISTS (
          SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'entity_bigdrops-main_main'
            AND pg_get_functiondef(p.oid) ~* ('(^|[^[:alnum:]_])' || pf.fname || '\s*\(')
        )
        OR EXISTS (
          SELECT 1 FROM pg_policies pol
          WHERE pol.schemaname = 'entity_bigdrops-main_main'
            AND (COALESCE(pol.qual,'') || ' ' || COALESCE(pol.with_check,'')) ~* ('(^|[^[:alnum:]_])' || pf.fname || '\s*\(')
        )
        OR EXISTS (
          SELECT 1 FROM pg_constraint cn JOIN pg_class cl ON cl.oid = cn.conrelid
          JOIN pg_namespace nn ON nn.oid = cl.relnamespace
          WHERE nn.nspname = 'entity_bigdrops-main_main'
            AND pg_get_constraintdef(cn.oid) ~* ('(^|[^[:alnum:]_])' || pf.fname || '\s*\(')
        )
      );
  END LOOP;
END $$;

SELECT fname, args, in_tenant, dep_tenant_hard, dep_tenant_text, secdef
FROM _pubfuncs
ORDER BY fname, args;
