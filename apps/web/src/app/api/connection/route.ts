export const runtime = "nodejs";
export async function GET() {
  return Response.json({ modelReady: Boolean(process.env.OPENAI_API_KEY) });
}
