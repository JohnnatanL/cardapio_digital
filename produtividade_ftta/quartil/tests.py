import datetime as dt
from unittest import mock

import pandas as pd
from django.core.cache import cache
from django.test import SimpleTestCase

from . import services


def _vendedores():
    return pd.DataFrame(
        [
            ("ana", "consultor", "gestor.a"),
            ("bia", "consultor", "gestor.a"),
            ("caio", "consultor", "gestor.b"),
            ("dani", "consultor", "gestor.b"),
            ("edu", "consultor", "gestor.b"),
            ("fabi", "consultor", "gestor.a"),
            ("gestor.a", "gestao", "chefe"),
        ],
        columns=["username", "perfil", "gestor_direto"],
    )


def _vendas():
    return pd.DataFrame(
        [("ANA@alloha.com", 20), ("bia@alloha.com", 10), ("caio@alloha.com", 10),
         ("dani@alloha.com", 4), ("intruso@alloha.com", 3), ("gestor.a@alloha.com", 1)],
        columns=["email", "vendas"],
    )


class CalculoTests(SimpleTestCase):
    def test_quartis(self):
        r = services.calcular_quartis(_vendedores(), _vendas(), 10, ["consultor"], "@alloha.com")
        df = r["vendedores"].set_index("username")
        self.assertNotIn("gestor.a", df.index)  # só consultores
        self.assertEqual(df.loc["ana", "vendas"], 20)  # e-mail case-insensitive
        self.assertAlmostEqual(df.loc["ana", "produtividade"], 2.0)
        self.assertEqual(df.loc["edu", "vendas"], 0)  # sem venda entra com 0
        self.assertEqual(df.loc["ana", "quartil"], "Q1")
        self.assertEqual(df.loc["bia", "quartil"], df.loc["caio", "quartil"])  # empate
        self.assertEqual(df.loc["edu", "quartil"], df.loc["fabi", "quartil"])
        self.assertEqual(df.loc["edu", "quartil"], "Q4")
        self.assertEqual(list(r["sem_hierarquia"]["email"]), ["intruso@alloha.com"])
        self.assertEqual(sum(q["vendedores"] for q in r["resumo"]), 6)

    def test_du_zero(self):
        with self.assertRaises(ValueError):
            services.calcular_quartis(_vendedores(), _vendas(), 0, ["consultor"], "@alloha.com")

    def test_dia_referencia(self):
        hoje = dt.date(2026, 10, 2)
        self.assertEqual(services.dia_referencia(dt.date(2026, 10, 1), hoje), hoje)
        self.assertEqual(services.dia_referencia(dt.date(2026, 9, 1), hoje), dt.date(2026, 9, 30))
        self.assertEqual(services.dia_referencia(dt.date(2026, 2, 1), hoje), dt.date(2026, 2, 28))


class PaginaTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        p = mock.patch.multiple(
            services,
            buscar_vendedores=mock.Mock(return_value=_vendedores()),
            buscar_vendas=mock.Mock(return_value=_vendas()),
            buscar_du_acc=mock.Mock(return_value=10.0),
        )
        p.start()
        self.addCleanup(p.stop)

    def test_pagina(self):
        resp = self.client.get("/?mes=2026-09")
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "ana")
        self.assertContains(resp, "intruso@alloha.com")
        services.buscar_du_acc.assert_called_with(dt.date(2026, 9, 30))

    def test_filtro_gestor_e_csv(self):
        resp = self.client.get("/?mes=2026-09&gestor=gestor.b&formato=csv")
        corpo = resp.content.decode("utf-8-sig")
        self.assertIn("caio", corpo)
        self.assertNotIn("ana", corpo)

    def test_erro_vira_mensagem(self):
        services.buscar_du_acc.side_effect = ValueError("dim_calendario sem du_acc")
        resp = self.client.get("/?mes=2026-08")
        self.assertContains(resp, "dim_calendario sem du_acc")
