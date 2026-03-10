export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { token, fileKey, message, nodeId } = req.body || {};

  if (!token) return res.status(400).json({ error: "token 없음" });
  if (!fileKey) return res.status(400).json({ error: "fileKey 없음" });
  if (!message) return res.status(400).json({ error: "message 없음" });

  const body = { message };
  if (nodeId) {
    body.client_meta = {
      node_id: nodeId.replace(/-/g, ":"),
      node_offset: { x: 0, y: 0 }
    };
  }

  const figmaRes = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
    method: "POST",
    headers: { "X-Figma-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await figmaRes.json();
  return res.status(figmaRes.status).json(data);
}
