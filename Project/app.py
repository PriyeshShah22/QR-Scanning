import hashlib
import os
import uuid
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename

from database import get_connection

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "change-this-in-production")
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


class AppError(Exception):
    """Application-level exception with an HTTP status code."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@app.errorhandler(AppError)
def handle_app_error(error: AppError):
    return jsonify({"success": False, "message": error.message}), error.status_code


@app.errorhandler(413)
def handle_file_too_large(_error):
    return jsonify({"success": False, "message": "Image must be less than 2 MB."}), 413


@app.errorhandler(Exception)
def handle_unexpected_error(error: Exception):
    if isinstance(error, HTTPException):
        return error

    app.logger.exception("Unhandled error: %s", error)
    return jsonify({"success": False, "message": "An unexpected server error occurred."}), 500


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            raise AppError("Please login first.", 401)
        return view_func(*args, **kwargs)

    return wrapped


def hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode("utf-8")).hexdigest()


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_file_size(file_storage) -> int:
    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    return size


def save_uploaded_image(file_storage) -> str | None:
    if not file_storage or not file_storage.filename:
        return None

    if not allowed_file(file_storage.filename):
        raise AppError("Please upload a valid image file.")

    if get_file_size(file_storage) > MAX_IMAGE_SIZE_BYTES:
        raise AppError("Image must be less than 2 MB.")

    safe_name = secure_filename(file_storage.filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    destination = UPLOAD_FOLDER / unique_name
    file_storage.save(destination)
    return f"uploads/{unique_name}"


def build_image_url(image_path: str | None) -> str | None:
    if not image_path:
        return None
    return url_for("uploaded_file", filename=Path(image_path).name)


def map_transaction_row(row) -> dict:
    return {
        "transaction_id": row.TransactionID,
        "user_id": row.UserID,
        "mobile_no": row.MobileNo,
        "qr_label": row.QRLabel,
        "qr_text": row.QRText,
        "image_path": row.ImagePath,
        "image_url": build_image_url(row.ImagePath),
        "transaction_date": row.TransactionDate.isoformat() if row.TransactionDate else None,
        "last_modified": row.LastModified.isoformat() if row.LastModified else None,
    }


def get_transaction_for_user(transaction_id: int, user_id: int):
    query = """
        SELECT
            TransactionID,
            UserID,
            MobileNo,
            QRLabel,
            QRText,
            ImagePath,
            TransactionDate,
            LastModified
        FROM vw_UserTransactionHistory
        WHERE TransactionID = ? AND UserID = ?
    """

    with get_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(query, (transaction_id, user_id)).fetchone()
        return row


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/uploads/<path:filename>")
@login_required
def uploaded_file(filename: str):
    relative_path = f"uploads/{Path(filename).name}"
    query = """
        SELECT TOP 1 ImagePath
        FROM vw_UserTransactionHistory
        WHERE UserID = ? AND ImagePath = ?
    """

    with get_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(query, (session["user_id"], relative_path)).fetchone()

    if not row:
        raise AppError("Image not found.", 404)

    return send_from_directory(app.config["UPLOAD_FOLDER"], Path(filename).name)


@app.get("/api/session")
def get_session_details():
    if not session.get("user_id"):
        return jsonify({"authenticated": False})

    return jsonify(
        {
            "authenticated": True,
            "user": {
                "user_id": session["user_id"],
                "mobile_no": session["mobile_no"],
            },
        }
    )


@app.post("/api/auth")
def authenticate_or_register():
    data = request.get_json(silent=True) or {}
    mobile_no = (data.get("mobileNo") or "").strip()
    password = data.get("password") or ""

    if not mobile_no.isdigit() or len(mobile_no) != 10:
        raise AppError("Mobile number must contain exactly 10 digits.")

    if len(password) < 8 or len(password) > 32:
        raise AppError("Password must be between 8 and 32 characters.")

    password_hash = hash_password(password)

    with get_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "EXEC sp_AuthenticateOrRegister ?, ?",
            (mobile_no, password_hash),
        ).fetchone()

    if not row:
        raise AppError("Authentication failed. No response returned from the database.", 500)

    status = row.Status
    if status == "INVALID_CREDENTIALS":
        raise AppError("Invalid mobile number or password.", 401)

    session["user_id"] = row.UserID
    session["mobile_no"] = row.MobileNo

    return jsonify(
        {
            "success": True,
            "status": status,
            "user": {
                "user_id": row.UserID,
                "mobile_no": row.MobileNo,
            },
        }
    )


@app.post("/api/logout")
@login_required
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})


@app.get("/api/transactions")
@login_required
def list_transactions():
    query = """
        SELECT
            TransactionID,
            UserID,
            MobileNo,
            QRLabel,
            QRText,
            ImagePath,
            TransactionDate,
            LastModified
        FROM vw_UserTransactionHistory
        WHERE UserID = ?
        ORDER BY TransactionDate DESC, TransactionID DESC
    """

    with get_connection() as conn:
        cursor = conn.cursor()
        rows = cursor.execute(query, (session["user_id"],)).fetchall()

    return jsonify({"success": True, "transactions": [map_transaction_row(row) for row in rows]})


@app.get("/api/transactions/<int:transaction_id>")
@login_required
def get_transaction(transaction_id: int):
    row = get_transaction_for_user(transaction_id, session["user_id"])
    if not row:
        raise AppError("Transaction not found.", 404)

    return jsonify({"success": True, "transaction": map_transaction_row(row)})


@app.post("/api/transactions")
@login_required
def create_transaction():
    qr_label = (request.form.get("qr_label") or "").strip()
    qr_text = (request.form.get("qr_text") or "").strip()

    if not qr_text:
        raise AppError("Please scan or enter a QR payload before saving.")

    image_path = save_uploaded_image(request.files.get("image"))

    with get_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "EXEC sp_SaveOrUpdateTransaction ?, ?, ?, ?, ?",
            (None, session["user_id"], qr_label, qr_text, image_path),
        ).fetchone()
        conn.commit()

    if not row:
        raise AppError("Transaction could not be saved.", 500)

    if row.Status == "DUPLICATE_QR_CODE":
        raise AppError("This QR code already exists and cannot be saved again.", 409)

    if row.Status != "TRANSACTION_SAVED":
        raise AppError("The transaction could not be saved.", 500)

    saved_row = get_transaction_for_user(row.TransactionID, session["user_id"])
    return jsonify(
        {
            "success": True,
            "message": "Transaction saved successfully.",
            "transaction": map_transaction_row(saved_row),
        }
    )


@app.put("/api/transactions/<int:transaction_id>")
@login_required
def update_transaction(transaction_id: int):
    existing = get_transaction_for_user(transaction_id, session["user_id"])
    if not existing:
        raise AppError("Transaction not found or access denied.", 404)

    qr_label = (request.form.get("qr_label") or "").strip()
    qr_text = (request.form.get("qr_text") or "").strip()

    if not qr_text:
        raise AppError("Please scan or enter a QR payload before updating.")

    image_path = save_uploaded_image(request.files.get("image"))

    with get_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "EXEC sp_SaveOrUpdateTransaction ?, ?, ?, ?, ?",
            (transaction_id, session["user_id"], qr_label, qr_text, image_path),
        ).fetchone()
        conn.commit()

    if not row:
        raise AppError("Transaction could not be updated.", 500)

    if row.Status == "DUPLICATE_QR_CODE":
        raise AppError("This QR code already exists and cannot be saved again.", 409)

    if row.Status != "TRANSACTION_UPDATED":
        raise AppError("The transaction could not be updated.", 500)

    updated_row = get_transaction_for_user(transaction_id, session["user_id"])
    return jsonify(
        {
            "success": True,
            "message": "Transaction updated successfully.",
            "transaction": map_transaction_row(updated_row),
        }
    )


@app.delete("/api/transactions/<int:transaction_id>")
@login_required
def delete_transaction(transaction_id: int):
    existing = get_transaction_for_user(transaction_id, session["user_id"])
    if not existing:
        raise AppError("Transaction not found or access denied.", 404)

    with get_connection() as conn:
        cursor = conn.cursor()
        row = cursor.execute(
            "EXEC sp_DeleteTransaction ?, ?",
            (transaction_id, session["user_id"]),
        ).fetchone()
        conn.commit()

    return jsonify(
        {
            "success": True,
            "message": row.Status if row else "TRANSACTION_DELETED",
        }
    )

if __name__ == "__main__":
    app.run(debug=True)
