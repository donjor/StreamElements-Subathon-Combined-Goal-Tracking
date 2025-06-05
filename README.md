# StreamElements Subathon Combined Goal Tracking

Built from StreamElements Astro Websocket Gateway Example:
https://github.com/donjor/StreamElements-Websocket-Example

This project is an example Node.js application that connects to the StreamElements Astro Websocket Gateway to listen for channel activity events such as follows, subscriptions, tips, and cheers and tallys the points associcated from each action and updates a point.txt file

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
   git clone https://github.com/donjor/twitch-streamelements-listener.git
   cd twitch-streamelements-listener
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

    ##  How to get your JWT Token:

    Navigate to: https://streamelements.com/dashboard/account/channels
    
    Click the Copy Button under the JWT token

    Optionally Update the `POINTS_PER_...` variables 


## Usage

1. Start the application:
    ```bash
    node server.js
    ```