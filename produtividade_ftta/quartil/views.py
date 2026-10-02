import datetime as dt
import logging

from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone

from . import services

log = logging.getLogger(__name__)


def _mes_do_request(request, hoje):
    try:
        return dt.datetime.strptime(request.GET.get("mes", ""), "%Y-%m").date()
    except ValueError:
        return hoje.replace(day=1)


def index(request):
    hoje = timezone.localdate()
    mes = _mes_do_request(request, hoje)
    gestor = request.GET.get("gestor", "")
    quartil = request.GET.get("quartil", "")

    contexto = {"mes": mes, "mes_max": hoje.strftime("%Y-%m"), "gestor": gestor, "quartil": quartil}
    try:
        dados = services.montar_painel(mes, hoje)
    except Exception as e:  # noqa: BLE001 — mostra o erro na página em vez de 500
        log.exception("falha ao montar painel de %s", mes)
        contexto["erro"] = str(e)
        return render(request, "quartil/index.html", contexto)

    df = dados["vendedores"]
    if gestor:
        df = df[df["gestor_direto"] == gestor]
    if quartil:
        df = df[df["quartil"] == quartil]

    if request.GET.get("formato") == "csv":
        resp = HttpResponse(content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="quartil_{mes:%Y_%m}.csv"'
        resp.write("﻿")  # BOM para o Excel abrir com acento
        df.assign(produtividade=df["produtividade"].round(4)).to_csv(resp, index=False, sep=";", decimal=",")
        return resp

    contexto.update({
        "linhas": df.to_dict("records"),
        "resumo": dados["resumo"],
        "du_acc": dados["du_acc"],
        "dia_referencia": dados["dia_referencia"],
        "gestores": sorted(dados["vendedores"]["gestor_direto"].dropna().unique()),
        "sem_hierarquia": dados["sem_hierarquia"].to_dict("records"),
        "total_vendedores": len(dados["vendedores"]),
    })
    return render(request, "quartil/index.html", contexto)
