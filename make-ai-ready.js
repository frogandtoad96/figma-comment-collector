import fs from "fs";

function cleanMessage(message) {
  if (!message) return "";

  return message
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function main() {
  const raw = fs.readFileSync("grouped-comments.json", "utf-8");
  const grouped = JSON.parse(raw);

  const aiReady = grouped.map((group) => ({
    frameName: group.frameName,
    commentCount: group.commentCount,
    messages: group.comments
      .map((comment) => cleanMessage(comment.message))
      .filter((message) => message !== "")
  }));

  fs.writeFileSync(
    "ai-ready-comments.json",
    JSON.stringify(aiReady, null, 2),
    "utf-8"
  );

  console.log("완료: ai-ready-comments.json 생성");
  console.log(`프레임 수: ${aiReady.length}개`);

  console.log("상위 5개 샘플:");
  aiReady.slice(0, 5).forEach((item, index) => {
    console.log(`${index + 1}. ${item.frameName} (${item.commentCount}개)`);
  });
}

main();
