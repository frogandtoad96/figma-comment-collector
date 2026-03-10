import fs from "fs";

function main() {
  const input = fs.readFileSync("summary-input.txt", "utf-8");

  const blocks = input.split("### 화면명: ").slice(1);

  let notion = "# Figma 댓글 변경사항 정리\n\n";
  let figma = "";

  blocks.forEach((block) => {
    const lines = block.split("\n");

    const frameName = lines[0].trim();
    const messages = lines
      .filter((l) => l.match(/^\d+\./))
      .map((l) => l.replace(/^\d+\.\s*/, "").trim());

    const clean = [];

    messages.forEach((msg) => {
      if (
        msg.includes("확인") ||
        msg.includes("감사") ||
        msg.includes("@") ||
        msg.length < 4
      ) {
        return;
      }

      clean.push(msg);
    });

    if (clean.length === 0) return;

    notion += `## ${frameName}\n`;
    figma += `## ${frameName}\n`;

    clean.slice(0, 5).forEach((m) => {
      notion += `- ${m}\n`;
      figma += `- ${m}\n`;
    });

    notion += "\n";
    figma += "\n";
  });

  fs.writeFileSync("change-log.md", notion, "utf-8");
  fs.writeFileSync("figma-todo.md", figma, "utf-8");

  console.log("완료: change-log.md 생성");
  console.log("완료: figma-todo.md 생성");
}

main();
