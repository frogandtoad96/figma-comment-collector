import fs from "fs";

function main() {
  const raw = fs.readFileSync("mapped-comments.json", "utf-8");
  const mappedComments = JSON.parse(raw);

  const validItems = mappedComments.filter(
    (item) => item.ancestor_frame_name && item.ancestor_frame_name.trim() !== ""
  );

  const groupedMap = {};

  for (const item of validItems) {
    const frameName = item.ancestor_frame_name;

    if (!groupedMap[frameName]) {
      groupedMap[frameName] = {
        frameName,
        commentCount: 0,
        comments: []
      };
    }

    groupedMap[frameName].comments.push({
      message: item.message,
      created_at: item.created_at,
      user: item.user,
      node_id: item.node_id,
      ancestor_frame_id: item.ancestor_frame_id
    });

    groupedMap[frameName].commentCount += 1;
  }

  const groupedArray = Object.values(groupedMap)
    .sort((a, b) => b.commentCount - a.commentCount);

  fs.writeFileSync(
    "grouped-comments.json",
    JSON.stringify(groupedArray, null, 2),
    "utf-8"
  );

  console.log("완료: grouped-comments.json 생성");
  console.log(`그룹 수: ${groupedArray.length}개`);

  console.log("댓글 많은 상위 10개 프레임:");
  groupedArray.slice(0, 10).forEach((group, index) => {
    console.log(`${index + 1}. ${group.frameName} (${group.commentCount}개)`);
  });
}

main();
