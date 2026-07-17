# QR Code Data Management System (Flask + SQL Server)

A web-based QR Code Data Management System developed using **Flask**, **SQL Server**, and **pyodbc**. The application allows users to scan QR codes using the device camera, add additional information, upload images, and securely store and manage records through a centralized web interface. The system is designed with a scalable architecture that can be extended into a mobile application in the future.

---

## Features

- User Registration and Login
- QR Code scanning using the device camera
- Automatic QR code decoding and validation
- Add custom text/details for scanned QR codes
- Upload supporting images
- Secure data storage in SQL Server
- User-specific record management
- Edit and update existing records
- Soft delete functionality
- Image thumbnail preview with full-size viewing
- Responsive single-page web application
- Future-ready architecture for Android application development

---

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript
- HTML5 Camera API

### Backend
- Flask
- Python
- pyodbc

### Database
- Microsoft SQL Server
- Stored Procedures
- SQL Views

---

## Project Structure

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

---

## Core Functionalities

### User Authentication

- Secure Login/Register
- Password hashing
- Session management

### QR Code Scanner

- Scan QR codes directly using the device camera
- Decode QR information instantly
- Validate scanned data before saving

### Data Entry

Users can:
- Scan a QR code
- Enter additional details through text fields
- Upload an image
- Save all information into SQL Server

### Record Management

Users can:
- View all saved records
- Edit existing records
- Update uploaded images
- Soft delete records
- View uploaded image thumbnails

---

## Database

The application uses **Microsoft SQL Server** with:

- Users Table
- QR Records Table
- Stored Procedures
- SQL Views

All Create, Read, Update, and Delete operations are handled through SQL Server.

---

## Prerequisites

Install the following before running the project:

- Python 3.10 or newer
- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- ODBC Driver 18 for SQL Server

---

## Database Setup

1. Open SQL Server Management Studio.
2. Execute:

```text
database_schema.sql
```

This script creates:

- Database
- Tables
- Stored Procedures
- Views

---

## Configure Database Connection

### Windows Authentication

```powershell
set FLASK_SECRET_KEY=replace-with-a-secret-key
set DB_DRIVER=ODBC Driver 18 for SQL Server
set DB_SERVER=localhost
set DB_NAME=ApplicationProject
set DB_TRUSTED_CONNECTION=yes
set DB_ENCRYPT=no
set DB_TRUST_SERVER_CERTIFICATE=yes
```

### SQL Server Authentication

```powershell
set FLASK_SECRET_KEY=replace-with-a-secret-key
set DB_DRIVER=ODBC Driver 18 for SQL Server
set DB_SERVER=localhost
set DB_NAME=ApplicationProject
set DB_USERNAME=your_username
set DB_PASSWORD=your_password
set DB_ENCRYPT=no
set DB_TRUST_SERVER_CERTIFICATE=yes
```

---

## Create Virtual Environment

```powershell
python -m venv .venv
```

Activate the environment:

```powershell
.venv\Scripts\activate
```

---

## Install Dependencies

```powershell
pip install -r requirements.txt
```

---

## Run the Application

```powershell
python app.py
```

Open your browser and navigate to:

```
http://127.0.0.1:5000
```

---

## Application Workflow

### 1. Login / Register

- Register using your mobile number and password.
- Existing users can securely log in.

### 2. Scan QR Code

- Open the QR Scanner.
- Scan a QR code using the device camera.
- The application automatically decodes and validates the QR data.

### 3. Save Data

- Enter additional information in the text fields.
- Upload an image (optional).
- Save the record into SQL Server.

### 4. Manage Records

Users can:

- View saved records
- Edit QR details
- Replace uploaded images
- Soft delete records
- View image thumbnails

---

## Security Features

- Password hashing
- Secure Flask session management
- User-specific access control
- Record ownership verification
- Duplicate QR code validation
- SQL Server Stored Procedures

---

## Troubleshooting

### SQL Connection Failed

Verify:

- SQL Server service is running
- Correct server name
- Correct database name
- ODBC Driver 18 is installed
- Authentication settings are correct

### Images Not Displaying

Check that:

- The `uploads` folder exists
- Flask has permission to write files
- Image paths are stored correctly

### Duplicate QR Code

Duplicate QR codes are prevented through SQL Server validation and stored procedure checks.

---

## Future Enhancements

- Android Mobile Application
- Barcode Scanning Support
- Cloud Storage Integration
- Export Records to Excel/PDF
- Advanced Search & Filtering
- QR Code Generation
- OCR-based Data Extraction
- Real-time Data Synchronization

---

## Project Highlights

- QR Code Scanning using Device Camera
- Secure User Authentication
- Image Upload and Management
- SQL Server Integration
- Flask Backend
- Stored Procedure-Based Database Operations
- User-Specific Data Management
- Responsive Web Interface
- Future-Ready Mobile Application Architecture
