export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
      },
    }
  );
}
