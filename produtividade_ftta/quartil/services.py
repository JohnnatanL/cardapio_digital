"""Busca de dados e cálculo do quartil de produtividade (vendas / DU acumulado)."""
import datetime as dt
import math

import pandas as pd
from django.conf import settings
from django.core.cache import cache

QUARTIS = ["Q1", "Q2", "Q3", "Q4"]


def inicio_mes(d):
    return d.replace(day=1)


def proximo_mes(d):
    d = inicio_mes(d)
    return (d + dt.timedelta(days=32)).replace(day=1)


def dia_referencia(mes, hoje):
    """Dia cujo du_acc vale para o mês: hoje no mês corrente, último dia nos meses fechados."""
    if inicio_mes(hoje) == inicio_mes(mes):
        return hoje
    return proximo_mes(mes) - dt.timedelta(days=1)


# ---------------------------------------------------------------- consultas


def _ler(conn, sql, params=None):
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params) if params else cursor.execute(sql)
            linhas = cursor.fetchall()
            colunas = [d[0] for d in cursor.description]
    finally:
        conn.close()
    return pd.DataFrame([tuple(l) for l in linhas], columns=colunas)


def buscar_vendedores(mes):
    """Hierarquia do mês (tbhierarquia + tbusuarios) no altovalor."""
    from auth import conecta_altovalor

    # Intervalo em vez de igualdade: periodo pode ser timestamp com fuso.
    sql = """
        SELECT u.username, u.perfil, h.gestor_direto
        FROM tbhierarquia h
        JOIN tbusuarios u ON u.id = h.id_usuario
        WHERE h.periodo >= %s AND h.periodo < %s
    """
    return _ler(conecta_altovalor(), sql, (inicio_mes(mes), proximo_mes(mes)))


def buscar_vendas(mes):
    """Vendas FTTA do mês por e-mail do vendedor, já gravadas na tbvendas pelo ETL."""
    from auth import conecta_altovalor

    sql = """
        SELECT LOWER(email_vendedor) AS email, SUM(vendas) AS vendas
        FROM tbvendas
        WHERE data_venda >= %s AND data_venda < %s
          AND email_vendedor IS NOT NULL
        GROUP BY LOWER(email_vendedor)
    """
    return _ler(conecta_altovalor(), sql, (inicio_mes(mes), proximo_mes(mes)))


def buscar_du_acc(dia):
    """du_acc da dim_calendario (Databricks) no dia informado."""
    from auth import conecta_databricks

    chave = f"du_acc:{dia.isoformat()}"
    valor = cache.get(chave)
    if valor is not None:
        return valor

    sql = (
        f"SELECT MAX({settings.DIM_CALENDARIO_COL_DU_ACC}) AS du_acc "
        f"FROM {settings.DIM_CALENDARIO_TABELA} "
        f"WHERE DATE({settings.DIM_CALENDARIO_COL_DATA}) = DATE('{dia:%Y-%m-%d}')"
    )
    df = _ler(conecta_databricks(), sql)
    valor = df.iloc[0, 0] if not df.empty else None
    if valor is None or pd.isna(valor):
        raise ValueError(f"dim_calendario sem du_acc para {dia:%d/%m/%Y}")
    valor = float(valor)
    cache.set(chave, valor, 60 * 60 * 6)
    return valor


# ---------------------------------------------------------------- cálculo


def calcular_quartis(vendedores, vendas, du_acc, perfis, dominio):
    """Cruza hierarquia x vendas e classifica a produtividade em quartis.

    Q1 = 25% mais produtivos. Empates ficam no mesmo quartil (o melhor que alcançam),
    por isso a contagem por quartil pode não ser exatamente 25%.
    Vendedores da hierarquia sem venda entram com 0.
    """
    if du_acc <= 0:
        raise ValueError("du_acc é 0 — ainda não há dia útil acumulado no mês")

    vendedores = vendedores.copy()
    vendedores["username"] = vendedores["username"].astype(str).str.strip().str.lower()
    vendedores["perfil"] = vendedores["perfil"].astype(str).str.strip().str.lower()
    vendedores["email"] = vendedores["username"] + dominio.lower()
    vendedores = vendedores.drop_duplicates("email")

    vendas = vendas.copy()
    vendas["email"] = vendas["email"].astype(str).str.strip().str.lower()
    vendas["vendas"] = pd.to_numeric(vendas["vendas"]).fillna(0)
    vendas = vendas.groupby("email", as_index=False)["vendas"].sum()

    # Vendas cujo e-mail não está na hierarquia do mês (qualquer perfil).
    sem_hierarquia = vendas[~vendas["email"].isin(vendedores["email"])]

    df = vendedores[vendedores["perfil"].isin(perfis)]
    df = df.merge(vendas, on="email", how="left")
    df["vendas"] = df["vendas"].fillna(0).astype(int)
    df["produtividade"] = df["vendas"] / du_acc

    n = len(df)
    if n:
        rank = df["produtividade"].rank(method="min", ascending=False)
        df["quartil"] = [QUARTIS[min(3, math.ceil(4 * r / n) - 1)] for r in rank]
    else:
        df["quartil"] = pd.Series(dtype=str)

    df = df.sort_values(["produtividade", "username"], ascending=[False, True]).reset_index(drop=True)
    df["posicao"] = df.index + 1

    resumo = []
    for q in QUARTIS:
        parte = df[df["quartil"] == q]
        resumo.append({
            "quartil": q,
            "vendedores": len(parte),
            "vendas": int(parte["vendas"].sum()),
            "prod_min": float(parte["produtividade"].min()) if len(parte) else None,
            "prod_max": float(parte["produtividade"].max()) if len(parte) else None,
            "prod_media": float(parte["produtividade"].mean()) if len(parte) else None,
        })

    return {
        "vendedores": df[["posicao", "username", "gestor_direto", "vendas", "produtividade", "quartil"]],
        "resumo": resumo,
        "sem_hierarquia": sem_hierarquia.sort_values("vendas", ascending=False),
    }


def montar_painel(mes, hoje=None):
    hoje = hoje or dt.date.today()
    mes = inicio_mes(mes)
    chave = f"painel:{mes.isoformat()}:{hoje.isoformat()}"
    resultado = cache.get(chave)
    if resultado is not None:
        return resultado

    ref = dia_referencia(mes, hoje)
    du_acc = buscar_du_acc(ref)
    resultado = calcular_quartis(
        buscar_vendedores(mes),
        buscar_vendas(mes),
        du_acc,
        settings.PERFIS_VENDEDOR,
        settings.DOMINIO_EMAIL,
    )
    resultado.update({"du_acc": du_acc, "dia_referencia": ref})
    cache.set(chave, resultado, settings.CACHE_SEGUNDOS)
    return resultado
