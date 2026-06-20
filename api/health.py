from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    """
    Standard health check endpoint to check if the API service is alive and healthy.
    
    Returns:
        A JSON dictionary indicating system health.
    """
    return {
        "status": "healthy"
    }
