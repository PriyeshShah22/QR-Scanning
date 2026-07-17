# Transaction Manager App (Flask + SQL Server)

This project keeps your existing frontend layout and behavior intact while connecting it to a Flask backend and your SQL Server database through `pyodbc`.

## What was completed

- Connected the existing HTML/CSS/JavaScript UI to Flask endpoints
- Integrated SQL Server using your existing schema, stored procedures, and view exactly as provided
- Replaced browser `localStorage` CRUD with database-backed CRUD
- Added secure server-side session handling
- Enforced user ownership for view, edit, and delete operations
- Kept soft-delete behavior through `sp_DeleteTransaction`
- Updated the records table image column to show a real thumbnail instead of only the filename
- Kept the page layout, section positions, spacing, navigation, and overall UI structure unchanged
- Limited CSS work to polish only: colors, hover effects, shadows, borders, focus states, rounded corners, and table styling

## Project structure

```text
Project/
├── app.py
├── database.py
├── database_schema.sql
├── requirements.txt
├── uploads/
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── styles.css
    └── js/
        └── app.js
```

> Note: The frontend remains a single-page interface in order to preserve your existing design and functionality with minimal structural change.

## Prerequisites

Install the following before running the app:

1. Python 3.10 or newer
2. SQL Server
3. SQL Server Management Studio (recommended)
4. ODBC Driver 18 for SQL Server
5. A Windows user account or SQL login with access to create and use the `ApplicationProject` database

## SQL Server setup

### 1) Create the database and objects

Open SQL Server Management Studio and run:

- `database_schema.sql`

This file contains your original database script unchanged:

- `Users`
- `Transactions`
- `sp_AuthenticateOrRegister`
- `sp_SaveOrUpdateTransaction`
- `sp_DeleteTransaction`
- `vw_UserTransactionHistory`

### 2) Confirm the database exists

Make sure the database name is:

- `ApplicationProject`

## Connection string configuration

The application reads database settings from environment variables.

### Option A: Windows Authentication

Set:

```powershell
set FLASK_SECRET_KEY= replace-with-a-real-secret
set DB_DRIVER=ODBC Driver 18 for SQL Server
set DB_SERVER=localhost
set DB_NAME=ApplicationProject
set DB_TRUSTED_CONNECTION=yes
set DB_ENCRYPT=no
set DB_TRUST_SERVER_CERTIFICATE=yes
```

### Option B: SQL Server Authentication

Set:

```powershell
set FLASK_SECRET_KEY= replace-with-a-real-secret
set DB_DRIVER=ODBC Driver 18 for SQL Server
set DB_SERVER=localhost
set DB_NAME=ApplicationProject
set DB_USERNAME=your_sql_username
set DB_PASSWORD=your_sql_password
set DB_ENCRYPT=no
set DB_TRUST_SERVER_CERTIFICATE=yes
```

> If your SQL Server instance is named, use something like `localhost\SQLEXPRESS` for `DB_SERVER`.

## Virtual environment creation

From the project folder:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## Dependency installation

Install the Python packages:

```powershell
pip install -r requirements.txt
```

## Upload folder setup

The `uploads` folder is already included. Uploaded transaction images are stored there automatically.

If you recreate the project manually, ensure this folder exists before running Flask:

```powershell
mkdir uploads
```

## How to run Flask

From the project root:

```powershell
set FLASK_APP=app.py
flask run
```

Or simply:

```powershell
python app.py
```

Default local URL:

- `http://127.0.0.1:5000`

## Step-by-step installation and test flow

### 1. Install Python

Install Python 3.10+ and verify:

```powershell
python --version
```

### 2. Install SQL Server

Install SQL Server and confirm the service is running.

### 3. Install the ODBC driver

Install **ODBC Driver 18 for SQL Server**.

### 4. Create the database

Open SSMS and create the database by running `database_schema.sql`.

### 5. Run the SQL script

Execute the full script to create tables, stored procedures, and the view.

### 6. Configure the connection string

Set the environment variables shown above.

### 7. Install requirements

```powershell
pip install -r requirements.txt
```

### 8. Start Flask

```powershell
python app.py
```

### 9. Open the browser

Go to:

- `http://127.0.0.1:5000`

### 10. Test Login/Register

- Enter a 10-digit mobile number
- Enter a password between 8 and 32 characters
- If the mobile number does not exist, the stored procedure registers the user
- If it already exists and the password hash matches, the stored procedure logs the user in

### 11. Test Add Transaction

- Click **Add New**
- Scan a QR code or enter QR content through the scanner
- Add a label
- Upload an image (optional)
- Click **Save Entry**

### 12. Test View Records

- Click **View Records**
- Only the logged-in user's active transactions should appear
- The Image column should show an 80×80 thumbnail
- Clicking a thumbnail should open the original image in a new tab
- If there is no image, the table shows **No Image**

### 13. Test Update

- Click the edit icon
- Change the label and/or QR text
- Optionally upload a new image
- Click **Update Entry**

### 14. Test Delete

- Click the delete icon
- Confirm deletion
- The record is soft deleted through `sp_DeleteTransaction`
- Deleted rows should no longer appear in **View Records**

## Security and behavior notes

- Passwords are never stored in plain text by the Flask app
- The app hashes the submitted password before calling `sp_AuthenticateOrRegister`
- Session data is stored server-side via Flask secure cookies
- Transaction listing is filtered by the logged-in `UserID`
- Update and delete requests are verified against the logged-in `UserID` before the stored procedures are executed
- Duplicate QR values are prevented by your existing unique constraint and procedure handling

## Important implementation note

Your `sp_SaveOrUpdateTransaction` procedure inserts a row when a transaction ID is not found for the current user. To prevent unauthorized updates from accidentally becoming inserts, the Flask app first verifies that the transaction belongs to the logged-in user before calling the update path.

This keeps your SQL exactly as provided while safely enforcing ownership.

## Troubleshooting

### `pyodbc.InterfaceError` or driver not found

Make sure **ODBC Driver 18 for SQL Server** is installed and `DB_DRIVER` matches the installed driver name.

### Login works for registration but not later

This usually means the connection is pointing to a different SQL Server instance or database than the one where the procedure created the user.

### SQL connection failed

Check:

- SQL Server service is running
- `DB_SERVER` is correct
- `DB_NAME` is `ApplicationProject`
- Authentication mode is correct
- Firewall/network settings allow local access

### Images do not load

Check:

- the `uploads` folder exists
- the Flask process has permission to write to it
- uploaded filenames were saved successfully in the `ImagePath` column

### Duplicate QR code error

This is expected if the same `QRText` already exists in the database because your schema uses a unique constraint on `Transactions.QRText`.

## Production recommendations

Before deployment:

- replace the default `FLASK_SECRET_KEY`
- run Flask behind a production WSGI server
- use HTTPS
- move uploads to persistent storage if needed
- set `DB_ENCRYPT=yes` when your SQL Server TLS configuration is ready
