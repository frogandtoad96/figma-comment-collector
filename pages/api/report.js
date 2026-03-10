async function fetchComments(token, fileKey) {
  const url = `https://api.figma.com/v1/files/${fileKey}/comments`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`댓글 조회 실패: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.comments || [];
}

async function fetchFile(token, fileKey) {
  const url = `https://api.figma.com/v1/files/${fileKey}`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`파일 조회 실패: ${res.status} ${text}`);
  }
  return await res.json();
}

function walk(node, parentId = null, nodeMap = {}, parentMap = {}) {
  if (!node || !node.id) return { nodeMap, parentMap };
  nodeMap[node.id] = node;
  parentMap[node.id] = parentId;
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, node.id, nodeMap, parentMap);
    }
  }
  return { nodeMap, parentMap };
}

function findAncestorFrame(nodeId, nodeMap, parentMap) {
  let currentId = nodeId;
  while (currentId) {
    const currentNode = nodeMap[currentId];
    if (!currentNode) break;
    if (currentNode.type === "FRAME") return currentNode;
    currentId = parentMap[currentId];
  }
  return null;
}

function groupByFrame(mappedComments) {
  const groupedMap = {};

  for (const item of mappedComments) {
    if (!item.frameName) continue;

    if (!groupedMap[item.frameName]) {
      groupedMap[item.frameName] = {
        frameName: item.frameName,
        frameId: item.frameId,
        commentCount: 0,
        latest_updated_at: null,
        comments: []
      };
    }

    groupedMap[item.frameName].comments.push({
      message: item.message,
      created_at: item.created_at,
      user: item.user
    });

    // 가장 최근 날짜 업데이트
    const current = groupedMap[item.frameName].latest_updated_at;
    if (!current || item.created_at > current) {
      groupedMap[item.frameName].latest_updated_at = item.created_at;
    }

    groupedMap[item.frameName].commentCount += 1;
  }

  // 최근 업데이트순 정렬
  return Object.values(groupedMap).sort((a, b) => {
    if (!a.latest_updated_at) return 1;
    if (!b.latest_updated_at) return -1;
    return new Date(b.latest_updated_at) - new Date(a.latest_updated_at);
  });
}

function cleanMessage(message) {
  if (!message) return "";
  return message.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim();
}

function classifyComment(msg) {
  if (/그대로 두시면|수정예정|피드백 오면|감사|확인|좋아요|추가했습니다|반영했습니다/.test(msg))
    return "반응";
  if (/텍스트|문구|워딩|오타|표기|띄어쓰기|숫자표기/.test(msg))
    return "텍스트 수정";
  if (/버튼|정렬|위치|UI|간격|레이아웃|색상|컬러|아이콘|화살표|노출|미노출|크기|디자인|팝업|모달|토스트|배지|라벨|톤앤매너|모바일 동일|모바일/.test(msg))
    return "UI 수정";
  if (/추가|삭제|기능|필터|옵션|기간|자동취소|상태|제재|연동|조회|이동|변경|입력필드|선택 시|바껴야|변경되어야|추가되어야|검색|7일/.test(msg))
    return "기능 변경";
  return "기타";
}

function buildDocs(grouped, fileKey) {
  let notion = "# Figma 댓글 변경사항 정리\n\n";
  let figma = "";

  grouped.forEach((group) => {
    const clean = group.comments
      .map((c) => cleanMessage(c.message))
      .filter((msg) => {
        if (!msg) return false;
        if (msg.includes("감사")) return false;
        if (msg.includes("확인")) return false;
        if (msg.includes("@")) return false;
        if (msg.length < 4) return false;
        return true;
      });

    if (clean.length === 0) return;

    const frameId = group.frameId;
    const figmaLink = frameId
      ? `https://www.figma.com/file/${fileKey}?node-id=${frameId}`
      : null;

    notion += `## ${group.frameName}\n`;
    figma += `## ${group.frameName}\n`;

    // 날짜 표시
    if (group.latest_updated_at) {
      const d = new Date(group.latest_updated_at);
      const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      notion += `🕐 최근 업데이트: ${dateStr}\n`;
      figma += `🕐 최근 업데이트: ${dateStr}\n`;
    }

    if (figmaLink) {
      notion += `🔗 ${figmaLink}\n\n`;
      figma += `🔗 ${figmaLink}\n\n`;
    }

    const groupedByType = {};
    clean.forEach((msg) => {
      const type = classifyComment(msg);
      if (!groupedByType[type]) groupedByType[type] = [];
      groupedByType[type].push(msg);
    });

    Object.keys(groupedByType).forEach((type) => {
      if (type === "반응") return;
      if (type === "기타") return;

      notion += `[${type}]\n`;
      figma += `[${type}]\n`;

      groupedByType[type].slice(0, 5).forEach((msg) => {
        notion += `- ${msg}\n`;
        figma += `- ${msg}\n`;
      });

      notion += "\n";
      figma += "\n";
    });

    notion += "\n";
    figma += "\n";
  });

  return { notion, figma };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, fileKey } = req.body || {};

    if (!token || !fileKey) {
      return res.status(400).json({ error: "token과 fileKey가 필요합니다." });
    }

    const comments = await fetchComments(token, fileKey);
    const fileData = await fetchFile(token, fileKey);
    const { nodeMap, parentMap } = walk(fileData.document);

    const mappedComments = comments
      .filter((c) => c.client_meta && c.client_meta.node_id)
      .map((comment) => {
        const nodeId = comment.client_meta.node_id;
        const frame = findAncestorFrame(nodeId, nodeMap, parentMap);
        return {
          message: comment.message,
          created_at: comment.created_at,
          user: comment.user?.handle || "unknown",
          frameName: frame ? frame.name : null,
          frameId: frame ? frame.id : null
        };
      });

    const grouped = groupByFrame(mappedComments);
    const { notion, figma } = buildDocs(grouped, fileKey);

    return res.status(200).json({
      changeLog: notion,
      figmaTodo: figma,
      groupedCount: grouped.length
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "서버 실행 중 오류가 발생했습니다."
    });
  }
}