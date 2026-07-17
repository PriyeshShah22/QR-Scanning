import os

import pyodbc
from dotenv import load_dotenv

load_dotenv()


def build_connection_string() -> str:
    """Build the SQL Server connection string from environment variables."""
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    server = os.getenv("DB_SERVER", "localhost\SQLEXPRESS")
    database = os.getenv("DB_NAME", "ApplicationProject")
    username = os.getenv("DB_USERNAME", "")
    password = os.getenv("DB_PASSWORD", "")
    trusted_connection = os.getenv("DB_TRUSTED_CONNECTION", "yes")
    encrypt = os.getenv("DB_ENCRYPT", "yes")
    trust_server_certificate = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")

    parts = [
        f"DRIVER={{{driver}}}",
        f"SERVER={server}",
        f"DATABASE={database}",
        f"Encrypt={encrypt}",
        f"TrustServerCertificate={trust_server_certificate}",
    ]

    if username and password:
        parts.append(f"UID={username}")
        parts.append(f"PWD={password}")
    else:
        parts.append(f"Trusted_Connection={trusted_connection}")

    return ";".join(parts)


def get_connection() -> pyodbc.Connection:
    """Return a pyodbc connection with autocommit disabled for safety."""
    return pyodbc.connect(build_connection_string(), autocommit=False)
