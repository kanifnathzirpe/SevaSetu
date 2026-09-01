from fastapi import APIRouter

from app.api.v1.routers import (
    admin,
    appointments,
    asha,
    auth,
    chat,
    doctors,
    emergency,
    hospitals,
    notifications,
    patients,
    reports,
    symptoms,
    video,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(asha.router)
api_router.include_router(doctors.router)
api_router.include_router(doctors.public_router)
api_router.include_router(admin.router)
api_router.include_router(appointments.router)
api_router.include_router(hospitals.router)
api_router.include_router(reports.router)
api_router.include_router(chat.router)
api_router.include_router(symptoms.router)
api_router.include_router(symptoms.ai_router)
api_router.include_router(emergency.router)
api_router.include_router(video.router)
api_router.include_router(notifications.router)
