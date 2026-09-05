import { handleEvaluateApplicationRequest } from "../_lib/aiHandlers";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { status, body } = await handleEvaluateApplicationRequest(req.body);
  res.status(status).json(body);
}
