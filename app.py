import os
import json
from flask import Flask, send_from_directory, jsonify, request
from azure.eventhub import EventHubProducerClient, EventData
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="public", static_url_path="")

# Load questions config
with open(os.path.join(os.path.dirname(__file__), "questions.json"), encoding="utf-8") as f:
    questions_config = json.load(f)

# Event Hub configuration
connection_string = os.getenv("EVENTHUB_CONNECTION_STRING")
eventhub_name = os.getenv("EVENTHUB_NAME")

producer_client = None
if connection_string and eventhub_name:
    producer_client = EventHubProducerClient.from_connection_string(
        connection_string, eventhub_name=eventhub_name
    )


@app.route("/")
def index():
    return send_from_directory("public", "index.html")


@app.route("/api/questions")
def get_questions():
    return jsonify(questions_config)


@app.route("/api/answer", methods=["POST"])
def post_answer():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    username = data.get("username")
    question_id = data.get("question_id")
    value = data.get("value")

    if not username or not question_id or value is None:
        return jsonify({"error": "Missing required fields"}), 400

    payload = {"username": username, "question_id": question_id, "value": value}

    if producer_client:
        try:
            batch = producer_client.create_batch()
            batch.add(EventData(json.dumps(payload)))
            producer_client.send_batch(batch)
            print(f"Sent to Event Hub: {json.dumps(payload)}")
        except Exception as e:
            print(f"Event Hub send error: {e}")
            return jsonify({"error": "Failed to send to Event Hub"}), 500
    else:
        print(f"Event Hub not configured. Payload: {json.dumps(payload)}")

    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3000))
    app.run(host="0.0.0.0", port=port)
