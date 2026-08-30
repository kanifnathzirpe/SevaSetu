from fastapi import FastAPI

app = FastAPI(title="SevaSetu")

@app.get("/")
def home():
    return {"message": "Backend Running"}