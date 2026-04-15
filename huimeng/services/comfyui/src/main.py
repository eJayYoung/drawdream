"""
ComfyUI API Service for Huimeng
Handles workflow execution and job management
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import asyncio
import uuid
import json
from datetime import datetime

app = FastAPI(title="ComfyUI API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class PromptRequest(BaseModel):
    prompt: dict
    client_id: str


class PromptResponse(BaseModel):
    prompt_id: str
    number: int


class WebSocketMessage(BaseModel):
    type: str
    data: dict


# Job state management
jobs: dict = {}


class JobManager:
    def __init__(self):
        self.jobs = {}

    async def queue_job(self, prompt_id: str, workflow: dict, client_id: str) -> dict:
        job = {
            "id": prompt_id,
            "workflow": workflow,
            "client_id": client_id,
            "status": "queued",
            "progress": 0,
            "outputs": None,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": None,
        }
        self.jobs[prompt_id] = job
        return job

    def get_job(self, prompt_id: str) -> Optional[dict]:
        return self.jobs.get(prompt_id)

    async def execute_job(self, prompt_id: str, websocket: WebSocket):
        """Execute a job and send progress updates via WebSocket"""
        job = self.jobs.get(prompt_id)
        if not job:
            return

        job["status"] = "running"
        job["started_at"] = datetime.utcnow().isoformat()

        try:
            # Simulate workflow execution with progress updates
            # In production, this would actually execute the ComfyUI workflow
            workflow = job["workflow"]
            total_steps = 100

            for step in range(total_steps):
                # Simulate processing
                await asyncio.sleep(0.05)

                # Calculate progress
                progress = int((step / total_steps) * 100)
                job["progress"] = progress

                # Send progress update
                await websocket.send_json({
                    "type": "progress",
                    "data": {
                        "prompt_id": prompt_id,
                        "progress": progress,
                        "node_id": str(step % 10),
                    }
                })

            # Generate mock outputs
            job["outputs"] = {
                "images": [
                    {
                        "filename": f"output_{prompt_id}.png",
                        "subfolder": "",
                        "type": "output"
                    }
                ]
            }
            job["status"] = "success"
            job["completed_at"] = datetime.utcnow().isoformat()

            # Send completion
            await websocket.send_json({
                "type": "success",
                "data": {
                    "prompt_id": prompt_id,
                    "outputs": job["outputs"],
                }
            })

        except Exception as e:
            job["status"] = "failed"
            job["error"] = str(e)
            job["completed_at"] = datetime.utcnow().isoformat()

            await websocket.send_json({
                "type": "error",
                "data": {
                    "prompt_id": prompt_id,
                    "error": str(e),
                }
            })


manager = JobManager()


@app.get("/api/info")
async def get_info():
    """Get ComfyUI server info"""
    return {
        "version": "1.0.0",
        "description": "ComfyUI API Service for Huimeng",
    }


@app.post("/api/prompt", response_model=PromptResponse)
async def queue_prompt(request: PromptRequest):
    """Queue a new prompt for execution"""
    prompt_id = str(uuid.uuid4())

    # Create job
    await manager.queue_job(prompt_id, request.prompt, request.client_id)

    return PromptResponse(
        prompt_id=prompt_id,
        number=1,  # Queue position
    )


@app.get("/api/history/{prompt_id}")
async def get_history(prompt_id: str):
    """Get execution history for a prompt"""
    job = manager.get_job(prompt_id)
    if not job:
        raise HTTPException(status_code=404, detail="Prompt not found")

    return {
        prompt_id: {
            "status": job["status"],
            "outputs": job["outputs"],
            "error": job["error"],
        }
    }


@app.get("/api/queue")
async def get_queue():
    """Get current queue status"""
    queued = [j for j in manager.jobs.values() if j["status"] == "queued"]
    running = [j for j in manager.jobs.values() if j["status"] == "running"]

    return {
        "queue_running": running,
        "queue_pending": queued,
    }


@app.delete("/apiqueue")
async def clear_queue():
    """Clear the queue"""
    # In production, implement proper queue clearing
    return {"status": "cleared"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()

    client_id = None

    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")

            if msg_type == "auth":
                client_id = message.get("client_id")
                await websocket.send_json({
                    "type": "auth_success",
                    "data": {"client_id": client_id}
                })

            elif msg_type == "execute":
                prompt_id = message.get("prompt_id")
                if prompt_id and prompt_id in manager.jobs:
                    await manager.execute_job(prompt_id, websocket)

            elif msg_type == "interrupt":
                # Handle interruption
                await websocket.send_json({
                    "type": "interrupted",
                    "data": {}
                })

    except WebSocketDisconnect:
        pass
    finally:
        if client_id:
            # Cleanup client sessions
            pass


@app.get("/workflows/{workflow_name}")
async def get_workflow(workflow_name: str):
    """Get predefined workflow template"""
    workflows = {
        "character_image": {
            "name": "Character Image Generation",
            "nodes": [
                {"id": "1", "type": "CheckpointLoaderSimple"},
                {"id": "2", "type": "CLIPTextEncode"},
                {"id": "3", "type": "CLIPTextEncode"},
                {"id": "4", "type": "KSampler"},
                {"id": "5", "type": "VAEDecode"},
                {"id": "6", "type": "SaveImage"},
            ]
        },
        "storyboard_image": {
            "name": "Storyboard Image Generation",
            "nodes": [
                {"id": "1", "type": "CheckpointLoaderSimple"},
                {"id": "2", "type": "CLIPTextEncode"},
                {"id": "3", "type": "ControlNetLoader"},
                {"id": "4", "type": "KSampler"},
                {"id": "5", "type": "VAEDecode"},
                {"id": "6", "type": "SaveImage"},
            ]
        },
        "storyboard_video": {
            "name": "Storyboard Video Generation",
            "nodes": [
                {"id": "1", "type": "LoadImage"},
                {"id": "2", "type": "SVD_img2vid_Conditioning"},
                {"id": "3", "type": "KSampler"},
                {"id": "4", "type": "VAC_Encode_GFPGAN"},
                {"id": "5", "type": "SaveVideo"},
            ]
        },
    }

    if workflow_name not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return workflows[workflow_name]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8188)
