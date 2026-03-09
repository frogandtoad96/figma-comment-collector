import fs from "fs";
import "dotenv/config";

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = process.env.FIGMA_FILE_KEY;

if (!FIGMA_TOKEN) {
  throw new Error("FIGMA_TOKEN 이 없습니다. .env 파일을 확인해주세요.");
}

if (!FILE_KEY) {
  throw new Error("FIGMA_FILE_KEY 가 없습니다. .env 파일을 확인해주세요.");
}

async function fetchComments() {
  const url = `https://api.figma.com/v1/files/${FILE_KEY}/comments`;

  const res = await fetch(url, {
    headers: {
      "X-Figma-Token": FIGMA_TOKEN
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`댓글 조회 실패: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.comments || [];
}

async function fetchFile() {
  const url = `https://api.figma.com/v1/files/${FILE_KEY}`;

  const res = await fetch(url, {
    headers: {
      "X-Figma-Token": FIGMA_TOKEN
    }
  });

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
  const path = [];

  while (currentId) {
    const currentNode = nodeMap[currentId];
    if (!currentNode) break;

    path.push({
      id: currentNode.id,
      name: currentNode.name,
      type: currentNode.type
    });

    if (currentNode.type === "FRAME") {
      return {
        frame: currentNode,
        path
      };
    }

    currentId = parentMap[currentId];
  }

  return {
    frame: null,
    path
  };
}

async function main() {
  const comments = await fetchComments();
  const fileData = await fetchFile();

  const documentNode = fileData.document;
  const { nodeMap, parentMap } = walk(documentNode);

  const validComments = comments.filter(
    (c) => c.client_meta && c.client_meta.node_id
  );

  console.log(`전체 댓글 수: ${comments.length}개`);
  console.log(`node_id 있는 댓글 수: ${validComments.length}개`);
  console.log("--------------------------------------------------");

  const results = [];

  for (const comment of validComments) {
    const nodeId = comment.client_meta.node_id;
    const found = findAncestorFrame(nodeId, nodeMap, parentMap);

    console.log(`댓글: ${comment.message}`);
    console.log(`작성자: ${comment.user?.handle || "unknown"}`);
    console.log(`node_id: ${nodeId}`);

    if (found.frame) {
      console.log(`찾은 상위 FRAME 이름: ${found.frame.name}`);
      console.log(`찾은 상위 FRAME id: ${found.frame.id}`);
    } else {
      console.log("상위 FRAME을 찾지 못함");
    }

    console.log("상위 경로:");
    found.path.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.type}] ${item.name} (${item.id})`);
    });

    console.log("--------------------------------------------------");

    results.push({
      comment_id: comment.id,
      message: comment.message,
      created_at: comment.created_at,
      user: comment.user?.handle || "unknown",
      node_id: nodeId,
      ancestor_frame_name: found.frame ? found.frame.name : null,
      ancestor_frame_id: found.frame ? found.frame.id : null,
      path: found.path
    });
  }

  fs.writeFileSync(
    "mapped-comments.json",
    JSON.stringify(results, null, 2),
    "utf-8"
  );

  console.log("완료: mapped-comments.json 생성");
}

main().catch((err) => {
  console.error("에러 발생:");
  console.error(err.message);
});