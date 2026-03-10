import fs from "fs";

function cleanMessage(message) {
  if (!message) return "";
  return message.replace(/\r/g, "").replace(/\n{2,}/g, "\n").trim();
}

function main() {
  const raw = fs.readFileSync("grouped-comments.json", "utf-8");
  const grouped = JSON.parse(raw);

  const aiReady = grouped.map((group) => {
    // 댓글 중 가장 최근 날짜 추출
    const dates = group.comments
      .map((c) => c.created_at)
      .filter(Boolean)
      .sort();
    const latest_updated_at = dates[dates.length - 1] || null;

    return {
      frameName: group.frameName,
      commentCount: group.commentCount,
      latest_updated_at,
      messages: group.comments
        .map((c) => cleanMessage(c.message))
        .filter((m) => m !== ""),
    };
  });

  fs.writeFileSync("ai-ready-comments.json", JSON.stringify(aiReady, null, 2), "utf-8");
  console.log("완료: ai-ready-comments.json 생성");
  console.log(`프레임 수: ${aiReady.length}개`);
}
main();