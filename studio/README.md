# Studio Management System - Local Deployment Guide

This is a React + TypeScript + Vite application for managing a dance academy studio.

## Prerequisites

- **Node.js** (v18 or higher) - ✅ You have Node.js v25.3.0 installed
- **npm** (comes with Node.js) - ✅ You have npm v11.6.2 installed

## Step-by-Step Local Deployment

### Step 1: Navigate to Project Directory

Open your terminal and navigate to the project folder:

```bash
cd "/Users/01tech/Desktop/Jason/01 Tech/studio2/studio"
```

### Step 1.5: Configure API Connection (Optional)

The frontend is configured to connect to the backend API. By default, it will connect to `http://localhost:3001/api`.

To customize the API URL, create a `.env` file in the `studio/` directory:

```bash
# .env file
VITE_API_URL=http://localhost:3001/api
```

**Note:** Make sure the backend API server (in `studio-api/` folder) is running before using features that require API access.

### Step 2: Install Dependencies

Install all required packages (this only needs to be done once, or when dependencies change):

```bash
npm install
```

This will:
- Read `package.json` to see what packages are needed
- Download and install all dependencies into `node_modules/` folder
- Create/update `package-lock.json` to lock versions

**Note:** This may take a few minutes the first time.

### Step 3: Start Development Server

Run the development server:

```bash
npm run dev
```

You should see output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Open in Browser

Open your web browser and navigate to:
```
http://localhost:5173
```

The application will automatically reload when you make changes to the code.

### Step 5: Stop the Server

To stop the development server, press `Ctrl + C` in the terminal.

## Available Scripts

- **`npm run dev`** - Start development server (hot reload enabled)
- **`npm run build`** - Build the project for production
- **`npm run preview`** - Preview the production build locally
- **`npm run lint`** - Run ESLint to check code quality
- **`npm run typecheck`** - Check TypeScript types without building

## API Connection

The frontend communicates with the backend API for data operations:

- **Backend Location**: `studio-api/` folder
- **Default API URL**: `http://localhost:3001/api`
- **API Endpoints**: 
  - `GET /api/admin/classes` - Fetch all classes
  - `POST /api/admin/classes` - Create a new class
  - `PATCH /api/admin/classes/:id` - Update a class
  - `DELETE /api/admin/classes/:id` - Delete a class (if implemented)

### Starting the Backend API

1. Navigate to the API directory:
   ```bash
   cd "../studio-api"
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Set up Google Sheets API credentials (see `studio-api/README.md`)

4. Start the API server:
   ```bash
   npm run dev
   ```

The API server will run on `http://localhost:3001` by default.

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port (5174, 5175, etc.). Check the terminal output for the actual port.

### API Connection Errors

If you see "Cannot connect to API server" errors:

1. **Check if backend is running**: Ensure the `studio-api` server is running on port 3001
2. **Check API URL**: Verify the `VITE_API_URL` in your `.env` file (if you created one)
3. **Check CORS**: The backend should have CORS configured to allow requests from `http://localhost:5173`
4. **Check browser console**: Open browser DevTools (F12) and check the Console and Network tabs for detailed error messages

### Dependencies Installation Issues

If `npm install` fails:
1. Delete `node_modules` folder (if it exists)
2. Delete `package-lock.json`
3. Run `npm install` again

### Clear Cache

If you encounter strange issues:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Project Structure

```
studio/
├── public/          # Static assets (images, etc.)
├── src/
│   ├── components/  # Reusable React components
│   ├── contexts/    # React contexts (Auth, etc.)
│   ├── lib/         # Utilities and configurations
│   ├── pages/       # Page components
│   └── main.tsx     # Application entry point
├── package.json     # Project dependencies and scripts
└── vite.config.ts   # Vite configuration
```

## Development Tips

1. **Hot Module Replacement (HMR)**: Changes to your code will automatically refresh in the browser
2. **Browser DevTools**: Use browser developer tools (F12) to debug
3. **Console Logs**: Check browser console for any errors or warnings
4. **Network Tab**: Use browser DevTools Network tab to see API calls (if any)

## Next Steps

Once the server is running:
- The application will be available at `http://localhost:5173`
- You can test the trial lesson form at the trial page
- Login with test accounts (if configured in AuthContext)
- Explore all the features of the studio management system

## Production Build

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `dist/` folder that can be deployed to any static hosting service.
