from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router
from routes.guidance import router as guidance_router
from routes.detect import router as detect_router
from routes.identify import router as identify_router
from routes.city_intel import router as city_intel_router
from routes.nearby import router as nearby_router
from routes.placeinfo import router as placeinfo_router
from routes.route import router as route_router
from routes.tts import router as tts_router

app = FastAPI(title="TourGuide API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")
app.include_router(guidance_router, prefix="/api")
app.include_router(detect_router, prefix="/api")
app.include_router(identify_router, prefix="/api")
app.include_router(city_intel_router, prefix="/api")
app.include_router(nearby_router, prefix="/api")
app.include_router(placeinfo_router, prefix="/api")
app.include_router(route_router, prefix="/api")
app.include_router(tts_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
