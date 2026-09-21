import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
test("PostgreSQL migration, owner isolation, atomic quota, and deletion", async () => {
  const db = new PGlite();
  try {
    // Minimal local equivalent of Supabase auth primitives. Not a fake production login.
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users values ('${userA}'),('${userB}');`);
    await db.exec(
      await readFile(
        new URL("../../supabase/migrations/202609140001_prediction_workspace.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${userA}';`);
    const result = JSON.stringify([
      {
        row: 1,
        outcome: "Graduate",
        probabilities: { Graduate: 0.7, Enrolled: 0.2, Dropout: 0.1 },
      },
    ]);
    const insert = await db.query<{ id: string }>(
      `insert into public.prediction_runs(user_id,stage,row_count,model_version,results) values ($1,'enrollment',1,$2,$3) returning id`,
      [userA, "a".repeat(64), result],
    );
    const id = insert.rows[0].id;
    assert.equal((await db.query("select * from public.prediction_runs")).rows.length, 1);
    assert.deepEqual(
      (
        await db.query<{ prediction_summary: { runs: number; profiles: number } }>(
          "select public.prediction_summary()",
        )
      ).rows[0].prediction_summary,
      { runs: 1, profiles: 1 },
    );
    await assert.rejects(
      db.query(
        `insert into public.prediction_runs(user_id,stage,row_count,model_version,results) values ($1,'enrollment',1,$2,$3)`,
        [userB, "a".repeat(64), result],
      ),
    );
    await db.exec(`set request.jwt.claim.sub='${userB}';`);
    assert.equal((await db.query("select * from public.prediction_runs")).rows.length, 0);
    assert.equal(
      (await db.query("delete from public.prediction_runs where id=$1 returning id", [id])).rows
        .length,
      0,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select public.consume_prediction_quota(250) as allowed",
        )
      ).rows[0].allowed,
      true,
    );
    for (let i = 1; i < 12; i++)
      await db.query<{ allowed: boolean }>("select public.consume_prediction_quota(250)");
    assert.equal(
      (await db.query<{ allowed: boolean }>("select public.consume_prediction_quota(1) as allowed"))
        .rows[0].allowed,
      false,
    );
    await assert.rejects(db.query("select * from public.prediction_usage"));
    await db.exec(`set request.jwt.claim.sub='${userA}';`);
    for (let i = 0; i < 30; i++)
      assert.equal(
        (
          await db.query<{ allowed: boolean }>(
            "select public.consume_prediction_quota(1) as allowed",
          )
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (await db.query<{ allowed: boolean }>("select public.consume_prediction_quota(1) as allowed"))
        .rows[0].allowed,
      false,
    );
    assert.equal(
      (await db.query("delete from public.prediction_runs where id=$1 returning id", [id])).rows
        .length,
      1,
    );
    // Operator can expire a window; the next request starts a fresh one.
    await db.exec(
      `reset role; update public.prediction_usage set window_start=now()-interval '2 hours'; set role authenticated;`,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select public.consume_prediction_quota(250) as allowed",
        )
      ).rows[0].allowed,
      true,
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.query("select * from public.prediction_runs"));
    await assert.rejects(
      db.query<{ allowed: boolean }>("select public.consume_prediction_quota(1)"),
    );
  } finally {
    await db.close();
  }
});
