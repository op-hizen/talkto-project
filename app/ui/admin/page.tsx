// app/ui/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminUserActions from "./admin-user-actions";

export const runtime = "nodejs";

type SearchParams = {
  sort?: string;
  role?: string;
  q?: string;
  page?: string;
};

const validRoles = ["ADMIN", "DEV", "MODERATOR", "SUPPORT", "USER"] as const;
type ValidRole = (typeof validRoles)[number];

const PAGE_SIZE = 30;

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    sort = "created-desc",
    role = "ALL",
    q = "",
    page = "1",
  } = await searchParams;

  const query = q.trim();
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);

  const roleFilter = validRoles.includes(role as any)
    ? (role as ValidRole)
    : null;

  const orderBy =
    sort === "alpha"
      ? [{ username: "asc" as const }, { email: "asc" as const }]
      : sort === "created-asc"
      ? [{ createdAt: "asc" as const }]
      : [{ createdAt: "desc" as const }];

  const where = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { id: { contains: query } },
          ],
        }
      : {}),
  };

  // ✅ count filtré pour pagination
  const filteredTotal = await prisma.user.count({ where });
  const totalUsers = await prisma.user.count();
  const totalPages = Math.max(Math.ceil(filteredTotal / PAGE_SIZE), 1);

  const users = await prisma.user.findMany({
    where,
    orderBy,
    take: PAGE_SIZE,
    skip: (currentPage - 1) * PAGE_SIZE,
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      accessStatus: true,
      createdAt: true,
      lastUsernameChangeAt: true, // ✅ existe chez toi (vu dans user detail)
    },
  });

  const filteredCount = users.length;

  const countsByStatus = users.reduce(
    (acc, u) => {
      acc[u.accessStatus] = (acc[u.accessStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <main className="min-h-screen text-white">
      {/* Background premium */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 opacity-90 bg-[radial-gradient(50%_60%_at_10%_0%,rgba(56,189,248,0.14),transparent_60%),radial-gradient(50%_60%_at_90%_10%,rgba(168,85,247,0.12),transparent_60%),radial-gradient(40%_50%_at_50%_100%,rgba(16,185,129,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Header sticky */}
        <header className="sticky top-0 z-10 rounded-3xl border border-white/10 bg-black/60 p-4 md:p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Utilisateurs
              </h1>
              <p className="text-xs text-white/60 mt-1">
                {filteredTotal} sur {totalUsers} comptes
                {roleFilter ? ` • Filtre : ${roleFilter}` : ""}
                {query ? ` • Recherche : “${query}”` : ""}
              </p>
            </div>

            {/* Recherche */}
            <form
              action="/ui/admin"
              method="get"
              className="flex w-full max-w-xl items-center gap-2"
            >
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="role" value={roleFilter ?? "ALL"} />
              <input type="hidden" name="page" value="1" />

              <div className="relative flex-1">
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Rechercher (ID, pseudo, email)"
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                  ⌘K
                </div>
              </div>

              <button
                type="submit"
                className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-xs font-semibold hover:border-white/40 hover:bg-white/[0.12] transition"
              >
                Rechercher
              </button>
            </form>
          </div>

          {/* Filtres / tri */}
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-white/50 mr-1">Rôles</span>
              {["ALL", ...validRoles].map((r) => (
                <FilterChip
                  key={r}
                  label={r === "ALL" ? "Tous" : r}
                  active={role === r}
                  href={buildHref({
                    sort,
                    role: r === "ALL" ? undefined : r,
                    q: query || undefined,
                    page: 1,
                  })}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-white/50 mr-1">Tri</span>
              <FilterChip
                label="Récent"
                active={sort === "created-desc"}
                href={buildHref({
                  sort: "created-desc",
                  role: roleFilter ?? undefined,
                  q: query || undefined,
                  page: 1,
                })}
              />
              <FilterChip
                label="Ancien"
                active={sort === "created-asc"}
                href={buildHref({
                  sort: "created-asc",
                  role: roleFilter ?? undefined,
                  q: query || undefined,
                  page: 1,
                })}
              />
              <FilterChip
                label="A→Z"
                active={sort === "alpha"}
                href={buildHref({
                  sort: "alpha",
                  role: roleFilter ?? undefined,
                  q: query || undefined,
                  page: 1,
                })}
              />
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Résultats" value={filteredTotal} hint="filtrés" />
          <StatCard label="Page" value={currentPage} hint={`sur ${totalPages}`} />
          <StatCard
            label="Members"
            value={countsByStatus["MEMBER"] ?? 0}
            hint="dans cette page"
            accent="emerald"
          />
          <StatCard
            label="Banned"
            value={countsByStatus["BANNED"] ?? 0}
            hint="dans cette page"
            accent="red"
          />
        </div>

        {/* Table / Data grid */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/40 backdrop-blur-xl overflow-hidden">
          {/* Head */}
          <div className="grid grid-cols-[1.1fr_1fr_1.6fr_.7fr_.8fr_1fr_1fr_1fr] gap-2 bg-black/40 px-4 py-3 text-[11px] uppercase tracking-wider text-white/60">
            <div>ID</div>
            <div>Pseudo</div>
            <div>Email</div>
            <div>Rôle</div>
            <div>Statut</div>
            <div>Créé le</div>
            <div>Dernier change pseudo</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {users.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-white/60">
                Aucun utilisateur pour ce filtre / cette recherche.
              </div>
            )}

            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1.1fr_1fr_1.6fr_.7fr_.8fr_1fr_1fr_1fr] gap-2 px-4 py-3 text-sm border-t border-white/5 hover:bg-white/[0.03] transition"
              >
                <div className="font-mono text-[11px] text-white/70 truncate">
                  {user.id}
                </div>

                <div className="truncate">
                  {user.username ? (
                    user.username
                  ) : (
                    <span className="italic text-white/40">Aucun pseudo</span>
                  )}
                </div>

                <div className="truncate text-white/90">{user.email}</div>

                <div className="font-mono text-xs text-white/80">
                  {user.role}
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border ${getAccessStatusStyle(
                      user.accessStatus
                    )}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {user.accessStatus}
                  </span>
                </div>

                <div className="text-xs text-white/60">
                  {user.createdAt.toLocaleString("fr-FR")}
                </div>

                <div className="text-xs text-white/60">
                  {user.lastUsernameChangeAt
                    ? user.lastUsernameChangeAt.toLocaleString("fr-FR")
                    : "Jamais"}
                </div>

                {/* ✅ actions inline (client) */}
                <div className="flex justify-end">
                  <AdminUserActions
                    userId={user.id}
                    isBanned={user.accessStatus === "BANNED"}
                    currentRole={user.role}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          baseHref={(p) =>
            buildHref({
              sort,
              role: roleFilter ?? undefined,
              q: query || undefined,
              page: p,
            })
          }
        />

        <div className="text-[11px] text-white/50">
          Astuce : filtre rôle + recherche → tu passes de 10k lignes à 20 en 2 clics.
        </div>
      </section>
    </main>
  );
}

/* ---------- UI bits ---------- */

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "emerald" | "amber" | "sky" | "purple" | "red";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : accent === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : accent === "amber"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
      : accent === "sky"
      ? "border-sky-400/20 bg-sky-500/10 text-sky-100"
      : accent === "purple"
      ? "border-purple-400/20 bg-purple-500/10 text-purple-100"
      : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <p className="text-[11px] uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-[11px] opacity-70">{hint}</p>}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  baseHref,
}: {
  currentPage: number;
  totalPages: number;
  baseHref: (p: number) => string;
}) {
  const prev = Math.max(currentPage - 1, 1);
  const next = Math.min(currentPage + 1, totalPages);

  const pagesToShow = Array.from(
    new Set([
      1,
      prev,
      currentPage,
      next,
      totalPages,
    ])
  ).filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs">
      <Link
        href={baseHref(prev)}
        aria-disabled={currentPage === 1}
        className={`rounded-full border px-3 py-1 transition ${
          currentPage === 1
            ? "border-white/10 text-white/30 cursor-not-allowed"
            : "border-white/20 hover:border-white/40 hover:bg-white/[0.06]"
        }`}
      >
        ← Précédent
      </Link>

      <div className="flex items-center gap-1">
        {pagesToShow.map((p) => (
          <Link
            key={p}
            href={baseHref(p)}
            className={`min-w-8 text-center rounded-full border px-2.5 py-1 transition ${
              p === currentPage
                ? "border-white bg-white text-black"
                : "border-white/20 text-white/70 hover:border-white/40 hover:bg-white/[0.06]"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      <Link
        href={baseHref(next)}
        aria-disabled={currentPage === totalPages}
        className={`rounded-full border px-3 py-1 transition ${
          currentPage === totalPages
            ? "border-white/10 text-white/30 cursor-not-allowed"
            : "border-white/20 hover:border-white/40 hover:bg-white/[0.06]"
        }`}
      >
        Suivant →
      </Link>
    </div>
  );
}

/* ---------- Helpers ---------- */

function getAccessStatusStyle(status: string) {
  switch (status) {
    case "MEMBER":
      return "bg-emerald-500/15 border-emerald-500/40 text-emerald-200";
    case "TRIAL":
      return "bg-amber-500/15 border-amber-500/40 text-amber-200";
    case "BANNED":
      return "bg-red-500/15 border-red-500/40 text-red-300";
    default:
      return "bg-white/5 border-white/20 text-white/70";
  }
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1 border text-[11px] font-semibold transition",
        active
          ? "border-white bg-white text-black shadow-sm"
          : "border-white/20 bg-white/[0.04] text-white/70 hover:border-white/50 hover:bg-white/[0.08]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function buildHref(params: {
  sort?: string;
  role?: string;
  q?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.sort) search.set("sort", params.sort);
  if (params.role) search.set("role", params.role);
  if (params.q) search.set("q", params.q);
  if (params.page) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/ui/admin?${qs}` : "/ui/admin";
}
