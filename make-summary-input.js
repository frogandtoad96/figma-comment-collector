import fs from "fs";

function main() {
  const raw = fs.readFileSync("ai-ready-comments.json", "utf-8");
  const data = JSON.parse(raw);

  let output = "";
  output += "아래는 피그마 화면별 댓글 수집 결과입니다.\n";
  output += "각 화면별 댓글을 읽고, 논의/호출/감사 표현은 제거한 뒤 실제 작업 필요한 변경사항만 3~5개 이내로 정리해주세요.\n";
  output += "출력 형식은 화면별로 아래와 같이 맞춰주세요.\n\n";
  output += "[화면명]\n";
  output += "- 변경사항 1\n";
  output += "- 변경사항 2\n";
  output += "- 변경사항 3\n\n";
  output += "----------------------------------------\n\n";

  data.forEach((item, index) => {
    output += `### 화면명: ${item.frameName}\n`;
    output += `댓글 수: ${item.commentCount}\n`;
    output += "댓글 목록:\n";

    item.messages.forEach((msg, i) => {
      output += `${i + 1}. ${msg}\n`;
    });

    output += "\n";
  });

  fs.writeFileSync("summary-input.txt", output, "utf-8");

  console.log("완료: summary-input.txt 생성");
  console.log(`프레임 수: ${data.length}개`);
}

main();
