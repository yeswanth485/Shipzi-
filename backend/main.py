import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes import optimize, health, analytics

app = FastAPI(
    title="PackVision AI Backend",
    description="Python API for PackVision ML Optimization Engine",
    version="1.0.0"
)

# CORS configuration — accepts localhost, Vercel preview URLs, and custom FRONTEND_URL
cors_origins = [
    "http://localhost:3000",
    "https://*.vercel.app",
    "https://shipzi-frontend-q8ly.onrender.com"
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware: Request timing
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.on_event("startup")
async def startup():
    print("Application started. Ready to process optimization batches using deterministic 3D-fitting algorithm.")
    # XGBoost model is bypassed per instructions, so no loading is needed.

# Include routers
app.include_router(health.router)
app.include_router(optimize.router)
app.include_router(analytics.router)

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
