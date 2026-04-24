# CSA Quiz App

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

App runs at `http://localhost:3000`.

Configure Event Hub in `.env`:

```
EVENTHUB_CONNECTION_STRING=Endpoint=sb://...
EVENTHUB_NAME=your-hub-name
```

## Deploy to Azure Web App

```bash
az login
az webapp up --name webapp-csa --runtime "PYTHON:3.11" --sku B1 --location italynorth
```

Set startup command:

```bash
az webapp config set --name webapp-csa --resource-group RG_Angandin_CSA --startup-file "gunicorn app:app"
```

Set Event Hub settings:

```bash
az webapp config appsettings set --name webapp-csa --resource-group RG_Angandin_CSA --settings EVENTHUB_CONNECTION_STRING="Endpoint=sb://..." EVENTHUB_NAME="es_b5..."
```

Redeploy after changes:

```bash
az webapp up
```

Restart the web app:

```bash
az webapp restart --name webapp-csa --resource-group RG_Angandin_CSA
```
