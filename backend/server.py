import asyncio
import os
import random
import logging
from contextlib import suppress
from pathlib import Path
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import BaseModel, Field
from typing import Optional
import bcrypt
import jwt
import uuid
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
logger = logging.getLogger("brk")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"username": payload.get("username")})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return {"id": str(user["_id"]), "username": user["username"], "email": user.get("email"), "role": user.get("role", "admin")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class LoginInput(BaseModel):
    username: str
    password: str


class SettingsInput(BaseModel):
    chave_pix: str = ""
    tipo_chave: str = "aleatoria"
    nome_beneficiario: str = ""
    cidade: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    notificacoes_ativas: bool = False
    notify_pix_gerado: bool = True
    notify_pix_copiado: bool = True
    notify_acesso: bool = False

# ---------------------------------------------------------------------------
# Simulation data pools
# ---------------------------------------------------------------------------

VALORES = [78.70, 89.40, 129.90, 159.20, 199.20, 219.80, 249.90, 312.40, 98.60, 145.30]
CIDADES = [
    "Porto Alegre/RS", "Florianópolis/SC", "Curitiba/PR", "São Paulo/SP", "Rio de Janeiro/RJ",
    "Jaraguá do Sul/SC", "Tubarão/SC", "Ariquemes/RO", "Santana do Livramento/RS", "Belo Horizonte/MG",
    "Salvador/BA", "Recife/PE", "Fortaleza/CE", "Goiânia/GO", "Campinas/SP",
]
DEVICES = ["mobile", "desktop"]
NAVEGADORES = ["Chrome", "Safari", "Firefox", "Edge"]


def gen_documento() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(11))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def start_of_today_utc() -> datetime:
    n = datetime.now(timezone.utc)
    return n.replace(hour=0, minute=0, second=0, microsecond=0)

# ---------------------------------------------------------------------------
# Seed + simulator
# ---------------------------------------------------------------------------

async def seed_admin():
    username = os.environ.get("ADMIN_USERNAME", "donas")
    password = os.environ.get("ADMIN_PASSWORD", "Seinao10@@")
    existing = await db.users.find_one({"username": username})
    if existing is None:
        await db.users.insert_one({
            "username": username,
            "password_hash": hash_password(password),
            "email": os.environ.get("ADMIN_EMAIL", ""),
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info("Admin '%s' criado.", username)


async def seed_sample_data():
    if await db.faturas.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    faturas = []
    # distribute across last 7 days, weighted toward recent
    for day_offset in range(6, -1, -1):
        day = now - timedelta(days=day_offset)
        count = random.randint(4, 14) if day_offset <= 2 else random.randint(1, 6)
        for _ in range(count):
            ts = day.replace(hour=random.randint(8, 22), minute=random.randint(0, 59), second=random.randint(0, 59))
            valor = random.choice(VALORES)
            qr_copiado = random.random() < 0.3
            pix_copiado = random.random() < 0.25
            status = "pago" if pix_copiado and random.random() < 0.6 else random.choice(["pendente", "pendente", "expirado"])
            if pix_copiado and status != "expirado":
                status = "pago"
            faturas.append({
                "id": str(uuid.uuid4()),
                "documento": gen_documento(),
                "valor": valor,
                "status": status,
                "qr_copiado": qr_copiado,
                "pix_copiado": pix_copiado,
                "cidade": random.choice(CIDADES),
                "device": random.choice(DEVICES),
                "navegador": random.choice(NAVEGADORES),
                "created_at": ts.isoformat(),
            })
    await db.faturas.insert_many(faturas)

    # counters for clicks
    await db.counters.update_one(
        {"_id": "main"},
        {"$set": {
            "clicks_home_total": random.randint(300, 420),
            "clicks_faturas_total": random.randint(260, 360),
            "clicks_home_today": random.randint(120, 260),
            "clicks_faturas_today": random.randint(100, 230),
            "today_date": start_of_today_utc().date().isoformat(),
        }},
        upsert=True,
    )

    # seed recent activity feed
    acts = []
    for fat in sorted(faturas, key=lambda f: f["created_at"], reverse=True)[:30]:
        acts.append({
            "id": str(uuid.uuid4()),
            "type": "pix_gerado",
            "title": f"PIX gerado · Doc {fat['documento']}",
            "subtitle": fat["cidade"],
            "valor": fat["valor"],
            "documento": fat["documento"],
            "device": fat["device"],
            "created_at": fat["created_at"],
        })
    await db.activities.insert_many(acts)
    logger.info("Dados de exemplo gerados: %d faturas.", len(faturas))


async def trim_activities():
    total = await db.activities.count_documents({})
    if total > 300:
        olds = await db.activities.find({}, {"_id": 1}).sort("created_at", ASCENDING).limit(total - 300).to_list(total - 300)
        await db.activities.delete_many({"_id": {"$in": [o["_id"] for o in olds]}})


async def bump_click(page: str):
    today = start_of_today_utc().date().isoformat()
    doc = await db.counters.find_one({"_id": "main"}) or {}
    if doc.get("today_date") != today:
        await db.counters.update_one({"_id": "main"}, {"$set": {
            "today_date": today, "clicks_home_today": 0, "clicks_faturas_today": 0,
        }}, upsert=True)
    field = "clicks_home" if page == "home" else "clicks_faturas"
    await db.counters.update_one({"_id": "main"}, {"$inc": {f"{field}_total": 1, f"{field}_today": 1}}, upsert=True)


async def add_activity(doc: dict):
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.activities.insert_one(doc)


async def pick_recent_fatura(cond: dict):
    rows = await db.faturas.find(cond).sort("created_at", DESCENDING).limit(20).to_list(20)
    return random.choice(rows) if rows else None


async def simulate_loop():
    await asyncio.sleep(3)
    while True:
        try:
            await asyncio.sleep(random.uniform(1.5, 2.0))
            r = random.random()
            if r < 0.42:
                valor = random.choice(VALORES)
                doc = gen_documento()
                fat = {
                    "id": str(uuid.uuid4()), "documento": doc, "valor": valor, "status": "pendente",
                    "qr_copiado": False, "pix_copiado": False, "cidade": random.choice(CIDADES),
                    "device": random.choice(DEVICES), "navegador": random.choice(NAVEGADORES),
                    "created_at": now_iso(),
                }
                await db.faturas.insert_one(fat)
                await add_activity({"type": "pix_gerado", "title": f"PIX gerado · Doc {doc}", "subtitle": fat["cidade"], "valor": valor, "documento": doc, "device": fat["device"]})
            elif r < 0.56:
                fat = await pick_recent_fatura({"qr_copiado": False})
                if fat:
                    await db.faturas.update_one({"id": fat["id"]}, {"$set": {"qr_copiado": True}})
                    await add_activity({"type": "qr_copiado", "title": f"QR Code copiado · Doc {fat['documento']}", "subtitle": fat["cidade"], "valor": fat["valor"], "documento": fat["documento"], "device": fat.get("device")})
            elif r < 0.72:
                fat = await pick_recent_fatura({"pix_copiado": False})
                if fat:
                    pago = random.random() < 0.55
                    upd = {"pix_copiado": True}
                    if pago:
                        upd["status"] = "pago"
                    await db.faturas.update_one({"id": fat["id"]}, {"$set": upd})
                    await add_activity({"type": "pix_copiado", "title": f"PIX copiado · Doc {fat['documento']}", "subtitle": fat["cidade"], "valor": fat["valor"], "documento": fat["documento"], "device": fat.get("device")})
            elif r < 0.88:
                await bump_click("home")
                await add_activity({"type": "acesso_home", "title": "Novo acesso · Página inicial", "subtitle": random.choice(CIDADES), "device": random.choice(DEVICES)})
            else:
                await bump_click("faturas")
                await add_activity({"type": "acesso_faturas", "title": "Novo acesso · Página de faturas", "subtitle": random.choice(CIDADES), "device": random.choice(DEVICES)})
            await trim_activities()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("simulate_loop: %s", exc)
            await asyncio.sleep(2)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI()
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "BRK Painel API"}


@api.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"username": data.username})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")
    token = create_access_token(str(user["_id"]), user["username"])
    return {"token": token, "user": {"username": user["username"], "email": user.get("email"), "role": user.get("role", "admin")}}


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


async def compute_stats():
    today = start_of_today_utc().isoformat()
    total_faturas = await db.faturas.count_documents({})
    total_faturas_hoje = await db.faturas.count_documents({"created_at": {"$gte": today}})
    qr_total = await db.faturas.count_documents({"qr_copiado": True})
    qr_hoje = await db.faturas.count_documents({"qr_copiado": True, "created_at": {"$gte": today}})

    async def sum_valor(match):
        cur = db.faturas.aggregate([{"$match": match}, {"$group": {"_id": None, "s": {"$sum": "$valor"}}}])
        rows = await cur.to_list(1)
        return round(rows[0]["s"], 2) if rows else 0.0

    pag_total = await sum_valor({})
    pag_hoje = await sum_valor({"created_at": {"$gte": today}})
    pix_total = await sum_valor({"pix_copiado": True})
    pix_hoje = await sum_valor({"pix_copiado": True, "created_at": {"$gte": today}})

    counters = await db.counters.find_one({"_id": "main"}) or {}
    today_date = start_of_today_utc().date().isoformat()
    ch_today = counters.get("clicks_home_today", 0) if counters.get("today_date") == today_date else 0
    cf_today = counters.get("clicks_faturas_today", 0) if counters.get("today_date") == today_date else 0

    return {
        "total_pagamentos_gerados": total_faturas,
        "total_pagamentos_gerados_hoje": total_faturas_hoje,
        "total_qr_copiados": qr_total,
        "total_qr_copiados_hoje": qr_hoje,
        "total_pagamentos_rs": pag_total,
        "total_pagamentos_rs_hoje": pag_hoje,
        "total_pix_copiados_rs": pix_total,
        "total_pix_copiados_rs_hoje": pix_hoje,
        "clicks_home": counters.get("clicks_home_total", 0),
        "clicks_home_hoje": ch_today,
        "clicks_faturas": counters.get("clicks_faturas_total", 0),
        "clicks_faturas_hoje": cf_today,
    }


async def compute_chart():
    now = datetime.now(timezone.utc)
    dias_pt = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    out = []
    best = {"label": "-", "valor": 0}
    total7 = 0.0
    for off in range(6, -1, -1):
        day = (now - timedelta(days=off)).replace(hour=0, minute=0, second=0, microsecond=0)
        nxt = day + timedelta(days=1)
        cur = db.faturas.aggregate([
            {"$match": {"created_at": {"$gte": day.isoformat(), "$lt": nxt.isoformat()}}},
            {"$group": {"_id": None, "s": {"$sum": "$valor"}}},
        ])
        rows = await cur.to_list(1)
        valor = round(rows[0]["s"], 2) if rows else 0.0
        label = dias_pt[(day.weekday() + 1) % 7]
        out.append({"dia": label, "valor": valor})
        total7 += valor
        if valor > best["valor"]:
            best = {"label": label, "valor": valor}
    return {"data": out, "total7": round(total7, 2), "melhor_dia": best}


@api.get("/dashboard/overview")
async def overview(current=Depends(get_current_user)):
    stats = await compute_stats()
    chart = await compute_chart()
    activities = await db.activities.find({}, {"_id": 0}).sort("created_at", DESCENDING).limit(30).to_list(30)
    recentes = await db.faturas.find({}, {"_id": 0}).sort("created_at", DESCENDING).limit(8).to_list(8)
    return {"stats": stats, "chart": chart, "activities": activities, "recentes": recentes}


@api.get("/faturas")
async def listar_faturas(
    current=Depends(get_current_user),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    q: dict = {}
    if status and status != "todos":
        q["status"] = status
    if search:
        q["documento"] = {"$regex": search, "$options": "i"}
    rows = await db.faturas.find(q, {"_id": 0}).sort("created_at", DESCENDING).limit(limit).to_list(limit)
    return {"faturas": rows, "total": await db.faturas.count_documents(q)}


@api.get("/activities")
async def listar_activities(current=Depends(get_current_user), limit: int = Query(30, ge=1, le=100)):
    rows = await db.activities.find({}, {"_id": 0}).sort("created_at", DESCENDING).limit(limit).to_list(limit)
    return {"activities": rows}


@api.get("/settings")
async def get_settings(current=Depends(get_current_user)):
    doc = await db.settings.find_one({"_id": "main"}, {"_id": 0})
    return doc or SettingsInput().model_dump()


@api.put("/settings")
async def put_settings(data: SettingsInput, current=Depends(get_current_user)):
    await db.settings.update_one({"_id": "main"}, {"$set": {**data.model_dump(), "updated_at": now_iso()}}, upsert=True)
    return {"ok": True, "settings": data.model_dump()}


@api.post("/settings/telegram/test")
async def telegram_test(current=Depends(get_current_user)):
    s = await db.settings.find_one({"_id": "main"}) or {}
    token = (s.get("telegram_bot_token") or "").strip()
    chat_id = (s.get("telegram_chat_id") or "").strip()
    if not token or not chat_id:
        raise HTTPException(status_code=400, detail="Configure o token do bot e o Chat ID antes de testar.")
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": "✅ Painel conectado! Notificação de teste enviada com sucesso.", "parse_mode": "HTML"},
            timeout=10,
        )
        data = resp.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao contatar o Telegram: {exc}")
    if not data.get("ok"):
        raise HTTPException(status_code=400, detail=f"Telegram: {data.get('description', 'erro desconhecido')}")
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

INDEXES = {
    "users": [IndexModel([("username", ASCENDING)], name="username", unique=True)],
    "faturas": [IndexModel([("created_at", DESCENDING)], name="created_at_desc"), IndexModel([("status", ASCENDING)], name="status")],
    "activities": [IndexModel([("created_at", DESCENDING)], name="created_at_desc")],
}


async def ensure_indexes():
    for coll, models in INDEXES.items():
        for m in models:
            with suppress(Exception):
                await db[coll].create_indexes([m])


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await seed_admin()
    await seed_sample_data()
    app.state.sim = asyncio.create_task(simulate_loop())


@app.on_event("shutdown")
async def shutdown():
    app.state.sim.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.sim
    client.close()
