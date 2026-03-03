from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio

app = FastAPI(title="Suhail Vision AI Service (Mock)")

class VisionRequest(BaseModel):
    image_base64: str

class VisionResponse(BaseModel):
    description: str
    confidence: float

@app.post("/describe-scene", response_model=VisionResponse)
async def describe_scene(request: VisionRequest):
    try:
        print("Received image for scene description.")
        
        # Simulate processing time for BLIP -> T5 -> MarianMT
        await asyncio.sleep(2)
        
        arabic_translation = "يبدو أنك في غرفة داخلية مضاءة جيدًا. يوجد مكتب عليه جهاز كمبيوتر محمول أمامك."
        print(f"Arabic Translation: {arabic_translation}")

        # Return final translated string
        return VisionResponse(
            description=arabic_translation,
            confidence=0.85 # Mock confidence score for pipelines
        )
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
