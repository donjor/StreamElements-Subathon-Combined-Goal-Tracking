# StreamElements Subathon Combined Goal Tracking

Built from StreamElements Astro Websocket Gateway Example:
https://github.com/donjor/StreamElements-Websocket-Example

This project is an example Node.js application that connects to the StreamElements Astro Websocket Gateway to listen for channel activity events such as follows, subscriptions, tips, and cheers and tallys the points (or earnings) associcated from each action and updates a point.txt file (and/or earnings.txt file) that can be used in an OBS text source to display a combined goal for your stream.

Stream Elements docs
https://docs.streamelements.com/websockets

## Features

- Connects to the StreamElements WebSocket API.
- Subscribes to `channel.activities` to receive real-time notifications.
- Handles, logs and adds points for each of the following activity types:
  - Follows
  - Subscriptions (with tier and amount details)
  - Tips (donations)
  - Cheers (bits donations)

## Prerequisites

- [Node.js](https://nodejs.org/)
- A JWT token from StreamElements.

## Installation

Use cmd or powershell on Windows:

1. Clone the repository:

   ```bash
   git clone https://github.com/donjor/StreamElements-Subathon-Combined-Goal-Tracking.git
   cd StreamElements-Subathon-Combined-Goal-Tracking
   ```

2. Install Packages

   ```bash
   npm i
   ```

3. Create a .env file by copying the .env.example file:

   ```bash
   cp .env.example .env
   ```

4. Update the .env file with your StreamElements JWT token:
   JWTTOKEN = "your_jwt_token_here"

   ## How to get your JWT Token:

   Navigate to: https://streamelements.com/dashboard/account/channels

   Click the Copy Button under the JWT token

   Optionally Update the `POINTS_PER_...` variables

## Usage

1. Start the application:
   ```bash
   node server.js
   ```

## Build a Windows Executable (no Node.js required for end user)

Packaging uses [`pkg`](https://github.com/vercel/pkg) to bundle the server with a Node runtime.

1. Install dependencies (one-time on the build machine):
   ```bash
   npm install
   ```
2. Build the Windows binary:
   ```bash
   npm run build:win
   ```
   - The compiled executable is written to `dist/streamelements-goal-tracker.exe`.
   - A redistributable ZIP named `streamelements-goal-tracker-win-<version>.zip` is produced in `releases/`.

### Shipping the build to a Windows user

Distribute the generated `releases/streamelements-goal-tracker-win-<version>.zip`. It already contains:
- `streamelements-goal-tracker.exe`
- `.env.example` (have the user rename/fill in `.env`)
- `points.txt` and `earnings.txt` initialised to `0.00`
- `README.md` with usage details

Usage for the recipient: unzip everything into one folder, copy `.env.example` to `.env` and configure it, then double-click `streamelements-goal-tracker.exe` (or run it from PowerShell). The console window will stay open showing connection status and updates.

### Publishing the ZIP to GitHub Releases

With the [GitHub CLI](https://cli.github.com/) installed and authenticated:

```bash
gh auth login                               # if not already logged in
VERSION=$(node -p "require('./package.json').version")
gh release create "v$VERSION" "releases/streamelements-goal-tracker-win-$VERSION.zip" --notes "Windows build for v$VERSION"
```

Adjust `--notes` to match your release notes. GitHub will attach the ZIP to the new release automatically.
