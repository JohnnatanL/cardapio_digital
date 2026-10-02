# Quartil de produtividade — vendas FTTA

Página Django que classifica os vendedores em quartis de produtividade:

```
produtividade = vendas no mês / du_acc
```

| Fonte | Onde | O que vem |
|---|---|---|
| `tbhierarquia` + `tbusuarios` | altovalor (`conecta_altovalor`) | vendedores do mês (`periodo` = 1º dia do mês), perfil e gestor direto |
| `tbvendas` | altovalor (`conecta_altovalor`) | vendas FTTA gravadas pelo ETL (`vendas()` + `inserir_dados()`) |
| `dim_calendario` | Databricks (`conecta_databricks`) | `du_acc` do dia de referência |

O cruzamento é `username + "@alloha.com" = email_vendedor` (sem diferenciar maiúsculas).

## Regras

- **Dia de referência do du_acc:** hoje, no mês corrente; último dia do mês, nos meses fechados.
- **Quem entra:** usuários da hierarquia do mês com perfil em `PERFIS_VENDEDOR` (padrão `consultor`).
  Consultor sem venda entra com 0.
- **Quartil:** Q1 = 25% mais produtivos, Q4 = 25% menos. Empates ficam no mesmo quartil, então
  as contagens podem não bater exatamente 25%.
- O quartil é calculado sobre **todos** os consultores; o filtro de gestor só recorta a tabela.
- Vendas com e-mail que não está na hierarquia do mês aparecem num bloco recolhível no fim da página.
- Botão **Baixar CSV** exporta o que está filtrado (`;` e vírgula decimal, abre direto no Excel).

## Rodar local

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env     # ajuste ETL_PATH e a dim_calendario
set -a; source .env; set +a
python manage.py test    # não precisa de banco
DJANGO_DEBUG=1 python manage.py runserver 0.0.0.0:8000
```

`ETL_PATH` precisa apontar para a pasta do `auth.py` do ETL — a página reaproveita
`conecta_altovalor()` e `conecta_databricks()` de lá, sem duplicar credenciais.

## Deploy na VM (gunicorn + systemd + nginx)

```bash
sudo mkdir -p /opt/produtividade_ftta && sudo cp -r . /opt/produtividade_ftta
cd /opt/produtividade_ftta
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env && nano .env            # DJANGO_SECRET_KEY, ALLOWED_HOSTS, ETL_PATH...
sudo cp deploy/produtividade.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now produtividade
sudo cp deploy/nginx.conf /etc/nginx/sites-available/produtividade
sudo ln -s /etc/nginx/sites-available/produtividade /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

O resultado fica em cache por `CACHE_SEGUNDOS` (padrão 10 min) e o `du_acc` por 6 h, por
processo — por isso o service usa 1 worker com threads. A página não tem login; se precisar,
coloque `auth_basic` no nginx.
