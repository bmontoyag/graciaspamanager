# Gracias Spa Manager

## Project Structure
- **backend/**: NestJS Microservices/Monolith.
- **web-admin/**: Next.js Web Administration Portal.
- **mobile/**: Flutter Mobile App (ToDo).
- **docker/**: Infrastructure configuration.

## Prerequisites
- Node.js & npm
- Docker Desktop (for Database)
- Flutter SDK (for Mobile App)

## Getting Started

### 1. Database
Make sure Docker Desktop is running, then start the database:
```bash
docker-compose up -d
```
Access Adminer at http://localhost:8080 (System: PostgreSQL, Server: postgres, User: admin, Pass: adminpassword, DB: graciaspa_db).

### 2. Backend
Navigate to `backend/` and install dependencies:
```bash
cd backend
npm install
```
Start the server:
```bash
npm run start:dev
```
*Note: The server requires the database to be running.*

### 3. Web Admin
Navigate to `web-admin/` and install dependencies:
```bash
cd web-admin
npm install
```
Start the development server:
```bash
npm run dev
```
Access the admin panel at http://localhost:3000.

## Features Implemented (MVP)
- **Backend**: Auth Module structure, Prisma Schema (Users, Clients, Appointments).
- **Web Admin**: Login Page, Dashboard Layout with placeholders.
