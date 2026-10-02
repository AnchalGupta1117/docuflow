# DocuFlow

DocuFlow is an AI-powered document workspace designed to help users upload, manage, edit, search, and understand documents in one place. The app combines practical PDF utilities with AI-assisted analysis so people can work with documents faster without switching between multiple tools.

## Core product features

### 1. Document workspace
- upload documents to a dashboard
- manage multiple files in one place
- browse and organize stored documents
- persist uploaded files in browser storage for a smoother workflow

### 2. PDF processing tools
- merge multiple PDF files into one
- split a PDF into selected pages or ranges
- compress PDFs to reduce file size
- rotate and reorder pages
- convert PDFs into images
- convert images into PDF files
- extract text from scanned images using OCR
- search within or across document content

### 3. AI document assistant
- ask questions about document content
- generate summaries
- pull out key facts and important sections
- explain complex material in simpler terms
- support document understanding workflows for reports, research, and study material

### 4. Dashboard UX
- modern dark UI with cyan-accent styling
- quick access to document actions
- grouped tool cards for key workflows
- tailored landing-page experience for a document SaaS product

## How the app is structured

The app is organized around a document-first workflow:

1. user logs in or signs up
2. document is uploaded to the dashboard
3. file is stored locally in IndexedDB
4. user chooses a PDF tool or AI action
5. document is processed, queried, or analyzed

## Key screens and modules

### Landing page
The homepage presents the product story and highlights the core document features.

### Dashboard
Main workspace for managing uploaded documents and launching actions.

### Tool pages
Standalone pages under app/tools include PDF workflows like merge, split, search, OCR, and conversion.

### AI route
The AI integration is handled in app/api/ai/route.ts using the Gemini API.

### Local storage layer
Document persistence and browser storage logic lives in lib/document-store.ts.

### Auth layer
User sign-up and login logic is handled in lib/auth.ts.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Gemini API
- IndexedDB
- PDF.js and PDF-lib
- Tesseract.js
- Mammoth

## Project structure

```txt
docuflow/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── route.ts
│   ├── dashboard/
│   ├── documents/
│   ├── login/
│   ├── settings/
│   ├── signup/
│   ├── tools/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── DocumentCard.tsx
│   ├── Navbar.tsx
│   ├── ToolCard.tsx
│   └── UploadZone.tsx
├── lib/
│   ├── auth.ts
│   ├── document-store.ts
│   └── utils.ts
├── public/
│   └── pdf.js/
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── README.md
└── .gitignore
```

## Environment setup

Create a .env.local file in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

## Installation

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Feature summary

DocuFlow is built around a practical use case: turning document work into a single streamlined workflow. Instead of requiring multiple separate apps for file organization, PDF editing, OCR, and AI analysis, the project brings these capabilities together into one platform.

This is strongest as a modern document productivity MVP and a useful foundation for a real AI document SaaS product.

## Future improvements

- make the dashboard more modular and maintainable
- standardize styling across all tool pages
- improve loading states and empty states
- strengthen accessibility and keyboard support
- switch auth to a secure backend-based system for production
- add real backend storage for multi-user workflows
- expand testing and document processing reliability

## License

No license file is currently included in the repo. If you plan to publish or distribute this project publicly, add an appropriate license before release.
