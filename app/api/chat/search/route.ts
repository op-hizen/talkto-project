import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/auth";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const q = searchParams.get("q")?.trim() ?? "";
    const cursor = searchParams.get("cursor");
    const cursorDate = cursor ? new Date(cursor) : null;

    if (!roomId || !q) {
      return NextResponse.json(
        { error: "roomId and q are required" },
        { status: 400 }
      );
    }

    // ✅ sécurité: user participant
    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // --- SQL avec placeholders ---
    // $1 = roomId
    // $2 = q
    // $3 = cursorDate (optionnel)
    const baseSql = `
      SELECT
        m.id,
        m.content,
        m."createdAt",
        m."isEdited",
        m."deletedAt",
        u.id AS "authorId",
        u.username,
        u.image,
        u.role,
        ts_rank(
          m."searchVector",
          websearch_to_tsquery('french', $2)
        ) AS rank
      FROM "ChatMessage" m
      JOIN "User" u ON u.id = m."authorId"
      WHERE m."roomId" = $1
        AND m."searchVector" @@ websearch_to_tsquery('french', $2)
    `;

    const cursorSql =
      cursorDate && !Number.isNaN(cursorDate.getTime())
        ? ` AND m."createdAt" < $3`
        : "";

    const tailSql = `
      ORDER BY rank DESC, m."createdAt" DESC
      LIMIT ${PAGE_SIZE + 1};
    `;

    const sql = baseSql + cursorSql + tailSql;

    const params: any[] = [roomId, q];
    if (cursorSql) params.push(cursorDate);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        createdAt: Date;
        isEdited: boolean;
        deletedAt: Date | null;
        authorId: string;
        username: string | null;
        image: string | null;
        role: string | null;
        rank: number;
      }>
    >(sql, ...params);

    const hasMore = rows.length > PAGE_SIZE;
    const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const nextCursor = hasMore
      ? slice[slice.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      results: slice.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        isEdited: r.isEdited,
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
        author: {
          id: r.authorId,
          username: r.username,
          image: r.image,
          role: r.role,
        },
        rank: r.rank,
      })),
      nextCursor,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
