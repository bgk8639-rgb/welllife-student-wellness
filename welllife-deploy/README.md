# WellLife – Student Wellness Support

A small Node.js + Express demo for daily wellness check-ins, habit tracking, short learning cards, and support contacts.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000. The health check is at http://localhost:3000/health.

## Deploy to Render (Web Service)

1. Extract this ZIP and upload the project to a Git repository.
2. In Render, create a **New Web Service** and connect that repository.
3. Use these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy. Render supplies the `PORT` environment variable automatically.

The `public/index.html` location is required: Express serves the web page from the `public` directory.

## Important limitations before a real public launch

- This is a student/demo prototype, not a medical service.
- The backend stores check-ins and optional notes in `data.json` as plain JSON. Do not collect real or sensitive health information until you add appropriate authentication, access controls, secure storage, retention/deletion controls, and a privacy notice.
- Many hosting platforms use an ephemeral filesystem by default, so JSON data can disappear on redeploy/restart. Configure persistent storage or use a managed database before relying on saved data.
- Verify the listed support contacts and local emergency information before publishing for a particular region.
- Add rate limiting, request validation, security headers, monitoring, and backups before production use.
