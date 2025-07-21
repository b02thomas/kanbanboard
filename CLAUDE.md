# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a full-stack web application with a React frontend and a Python (FastAPI) backend.

-   `frontend/`: Contains the React frontend application. It was bootstrapped with Create React App.
-   `backend/`: Contains the FastAPI backend application.

## Common Development Tasks

### Frontend

-   **Run the development server:** In the `frontend` directory, run `npm start`.
-   **Build for production:** In the `frontend` directory, run `npm run build`.
-   **Run tests:** In the `frontend` directory, run `npm test`.

### Backend

-   **Install dependencies:** In the `backend` directory, run `pip install -r requirements.txt`.
-   **Run the development server:** In the `backend` directory, run `uvicorn server:app --reload`.
-   **Create admin users:** In the `backend` directory, run `python3 create_admin_users.py`.

### Deployment

The application is deployed using `systemd` and `nginx`.

-   **Backend service:** `/etc/systemd/system/kanbanboard-backend.service`
-   **Frontend service:** `/etc/systemd/system/kanbanboard-frontend.service`

To manage the services, you can use the following commands:

-   `sudo systemctl start <service-name>`
-   `sudo systemctl stop <service-name>`
-   `sudo systemctl status <service-name>`
