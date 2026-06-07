# Deployment Documentation

This document describes the containerization structure, database configuration, CI/CD pipeline, and instructions for deploying ElectraSim AI to cloud platforms.

---

## 1. Local Containerized Orchestration (Docker)

To run the entire stack locally in production mode:
1. Ensure Docker and Docker Compose are installed.
2. Spin up the containers using Compose:
   ```bash
   docker-compose up --build -d
   ```
3. Verify the container health:
   ```bash
   docker-compose ps
   ```
4. Access:
   - Next.js client: `http://localhost:3000`
   - FastAPI server: `http://localhost:8000`
   - API Docs: `http://localhost:8000/api/v1/docs`

---

## 2. Cloud Deployment Configuration

### 2.1 Backend Deployment (Render or Railway)
FastAPI can be deployed using Railway or Render from your connected GitHub repository.
1. Create a new Web Service on Render/Railway.
2. Specify the Root directory: `backend/`
3. Command / Entrypoint:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `DATABASE_URL`: Your managed cloud PostgreSQL connection URL (e.g. Supabase, AWS RDS, Render Postgres).
   - `SECRET_KEY`: A cryptographically secure random string.
   - `OPENAI_API_KEY`: (Optional) Your OpenAI API key for advanced engineering AI queries.

### 2.2 Frontend Deployment (Vercel)
The Next.js 16 app router project is optimized to run serverlessly on Vercel out-of-the-box.
1. Import your repository into Vercel.
2. Select the Root Directory: `frontend/`
3. Configure the Build Settings:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Set Environment Variables:
   - `NEXT_PUBLIC_API_URL`: The production URL of your FastAPI backend service (e.g. `https://api.electrasim.com/api/v1`).

---

## 3. Database Migrations

For schema updates:
- When running in local mode, FastAPI automatically creates tables at startup using:
  ```python
  Base.metadata.create_all(bind=engine)
  ```
- For production-grade staging, integrate **Alembic** to generate migration history scripts. Avoid raw DDL execution in production environments.
- Enable automatic connection pooling on the cloud PostgreSQL instance to handle concurrent circuit simulation queries.
