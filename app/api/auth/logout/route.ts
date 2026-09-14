import { buildLogoutCookie } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";

async function POST_handler() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": buildLogoutCookie(),
      },
    }
  );
}

export const POST = withErrorHandling(POST_handler);
