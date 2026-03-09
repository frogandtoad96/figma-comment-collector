# Figma Comment Collector

피그마 댓글을 수집해서 화면(Frame)별로 정리하는 스크립트입니다.

## 준비사항
- Node.js 설치
- Figma Personal Access Token 발급
- 대상 Figma 파일 Key 확인

## 1. 환경변수 설정
프로젝트 폴더에 `.env` 파일을 만들고 아래 값을 입력합니다.

FIGMA_TOKEN=your_real_figma_token  
FIGMA_FILE_KEY=aPZLhcBaXZbOfzxjR9FXq5  

`.env.example` 파일은 샘플입니다.

## 2. 설치

npm install

## 3. 전체 실행

npm run collect-all

## 4. 생성되는 파일

실행 후 아래 파일이 생성됩니다.

- comments.json
- mapped-comments.json
- grouped-comments.json
- ai-ready-comments.json
- summary-input.txt

## 5. 개별 실행

댓글 수집  
npm start

프레임별 그룹핑  
npm run group-comments

AI 입력 JSON 생성  
npm run make-ai-ready

AI 입력 텍스트 생성  
npm run make-summary-input

## 주의사항

- `.env` 파일은 깃허브에 올리지 않습니다
- 결과 JSON / TXT 파일도 기본적으로 업로드하지 않습니다