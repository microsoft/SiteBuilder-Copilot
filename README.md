# Project Name

## Introduction
This project is a web application that consists of a client-side built with React, TypeScript, and Vite, and a server-side built with Python. The client-side provides a user interface for interacting with AI agents, while the server-side handles the AI logic and communication with external APIs.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Python (v3.8 or higher)
- pip (v20 or higher)

### Installation

#### Client
1. Navigate to the `client` directory:
    ```sh
    cd client
    ```
2. Install the dependencies:
    ```sh
    npm install
    ```

#### Server
1. Navigate to the `server` directory:
    ```sh
    cd server
    ```
2. (Optional) Create a virtual environment:
    ```sh
    python -m venv venv
    ```
3. (Optional) Activate the virtual environment:
    - On Windows:
        ```sh
        venv\Scripts\activate
        ```
    - On macOS/Linux:
        ```sh
        source venv/bin/activate
        ```
4. Install the dependencies:
    ```sh
    pip install -r requirements.txt
    ```

## Running the Project

### Client
1. Navigate to the [`client`] directory:
    ```sh
    cd client
    ```
2. Start the development server:
    ```sh
    npm run dev
    ```
3. Open your browser and go to `http://localhost:5173/`.

### Server
1. Navigate to the [`server`] directory:
    ```sh
    cd server
    ```
2. Start the server:
    ```sh
    python app.py
    ```
3. The server will be running at `http://127.0.0.1:5000`.