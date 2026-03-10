import fs from "fs";

function formatDate(isoString) {
  if (!isoString) return "날짜 없음";
  const d = new Date(isoString);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function main() {
  const raw = fs.readFileSync("ai-ready-comments.json", "utf-8");
  const data = JSON.parse(raw);

  // 최근 업데이트순 정렬
  const sorted = [...data].sort((a, b) => {
    if (!a.latest_updated_at) return 1;
    if (!b.latest_updated_at) return -1;
    return new Date(b.latest_updated_at) - new Date(a.latest_updated_at);
  });

  let notion = "# Figma 댓글 변경사항 정리\n\n";
  let figma = "";

  sorted.forEach((item) => {
    const clean = item.messages.filter(
      (msg) =>
        !msg.includes("확인") &&
        !msg.includes("감사") &&
        !msg.includes("@") &&
        msg.length >= 4
    );
    if (clean.length === 0) return;

    const dateStr = formatDate(item.latest_updated_at);

    notion += `## ${item.frameName}\n`;
    notion += `🕐 최근 업데이트: ${dateStr}\n`;
    figma  += `## ${item.frameName}\n`;
    figma  += `🔗 \n`;  // figma 링크는 기존대로 유지

    clean.slice(0, 5).forEach((m) => {
      notion += `- ${m}\n`;
      figma  += `- ${m}\n`;
    });

    notion += "\n";
    figma  += "\n";
  });

  fs.writeFileSync("change-log.md", notion, "utf-8");
  fs.writeFileSync("figma-todo.md", figma, "utf-8");
  console.log("완료: change-log.md / figma-todo.md 생성 (최근 업데이트순 정렬)");
}
main();