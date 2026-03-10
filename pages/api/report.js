export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, fileKey } = req.body || {};
  if (!token || !fileKey) return res.status(400).json({ error: "token과 fileKey가 필요합니다" });

  try {
    // 댓글 수집
    const commentsRes = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
      headers: { "X-Figma-Token": token },
    });
    if (!commentsRes.ok) {
      const err = await commentsRes.json();
      return res.status(commentsRes.status).json({ error: err.err || "Figma API 오류" });
    }
    const { comments } = await commentsRes.json();

    // 파일 노드 정보
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
      headers: { "X-Figma-Token": token },
    });
    const fileData = fileRes.ok ? await fileRes.json() : null;

    // 노드ID → 이름 맵
    const nodeMap = {};
    if (fileData?.document?.children) {
      for (const page of fileData.document.children) {
        if (page.children) {
          for (const frame of page.children) {
            nodeMap[frame.id] = frame.name;
          }
        }
      }
    }

    // 댓글을 화면(frame)별로 그룹핑
    const frameMap = {};
    for (const c of comments) {
      if (!c.client_meta?.node_id) continue;
      const nodeId = c.client_meta.node_id;
      const frameName = nodeMap[nodeId] || nodeId;
      const figmaUrl = `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeId)}`;

      if (!frameMap[nodeId]) {
        frameMap[nodeId] = { id: nodeId, name: frameName, url: figmaUrl, comments: [], latest: null };
      }

      frameMap[nodeId].comments.push(c);

      const d = new Date(c.created_at);
      if (!frameMap[nodeId].latest || d > new Date(frameMap[nodeId].latest)) {
        frameMap[nodeId].latest = c.created_at;
      }
    }

    // 최신순 정렬
    const frames = Object.values(frameMap).sort((a, b) => new Date(b.latest) - new Date(a.latest));

    // 카테고리 키워드 매핑
    const CAT_KEYWORDS = {
      "UI 수정": ["UI", "디자인", "레이아웃", "색상", "폰트", "사이즈", "간격", "아이콘", "이미지"],
      "기능 변경": ["기능", "버튼", "클릭", "동작", "플로우", "인터랙션", "이동", "연결"],
      "텍스트 수정": ["텍스트", "문구", "글자", "오타", "내용", "복사", "카피"],
    };

    function categorize(text) {
      for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
        if (kws.some((k) => text.includes(k))) return cat;
      }
      return "UI 수정";
    }

    // 마크다운 생성
    let md = `# Figma 수정사항\n\n`;
    for (const frame of frames) {
      const date = new Date(frame.latest);
      const dateStr = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,"0")}.${String(date.getDate()).padStart(2,"0")}`;
      md += `## ${frame.id} / ${frame.name}\n`;
      md += `🔗 ${frame.url}\n`;
      md += `🕐 최근 업데이트: ${dateStr}\n\n`;

      // 카테고리별 분류
      const bycat = {};
      for (const c of frame.comments) {
        const text = c.message || "";
        const cat = categorize(text);
        if (!bycat[cat]) bycat[cat] = [];
        bycat[cat].push(text);
      }
      for (const [cat, items] of Object.entries(bycat)) {
        md += `[${cat}]\n`;
        for (const item of items) md += `- ${item}\n`;
        md += "\n";
      }
    }

    return res.status(200).json({ figmaTodo: md, frameCount: frames.length, commentCount: comments.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
