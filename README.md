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

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.