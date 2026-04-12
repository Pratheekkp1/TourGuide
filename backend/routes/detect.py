"""
Lightweight face detection only — no CLIP, fast enough to poll at ~500ms.
Used by the frontend to update entity boxes independently of the full analysis cycle.
"""
from fastapi import APIRouter, File, UploadFile, HTTPException
from routes.analyze import people_det   # reuse the singleton

router = APIRouter()


@router.post("/detect")
async def detect_people(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image file")

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image")

    return people_det.detect(image_bytes)
