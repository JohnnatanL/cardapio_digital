import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Torna importáveis os módulos do ETL (auth.py com conecta_altovalor / conecta_databricks)
ETL_PATH = os.environ.get("ETL_PATH")
if ETL_PATH and ETL_PATH not in sys.path:
    sys.path.insert(0, ETL_PATH)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-inseguro")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

# Sem banco próprio: os dados vêm do altovalor e do Databricks.
INSTALLED_APPS = ["quartil"]
DATABASES = {}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    }
]

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

# ---- Regras do painel ----
DIM_CALENDARIO_TABELA = os.environ.get("DIM_CALENDARIO_TABELA", "b2c.planejamento_comercial.dim_calendario")
DIM_CALENDARIO_COL_DATA = os.environ.get("DIM_CALENDARIO_COL_DATA", "data")
DIM_CALENDARIO_COL_DU_ACC = os.environ.get("DIM_CALENDARIO_COL_DU_ACC", "du_acc")
PERFIS_VENDEDOR = [p.strip().lower() for p in os.environ.get("PERFIS_VENDEDOR", "consultor").split(",") if p.strip()]
DOMINIO_EMAIL = os.environ.get("DOMINIO_EMAIL", "@alloha.com")
CACHE_SEGUNDOS = int(os.environ.get("CACHE_SEGUNDOS", "600"))
